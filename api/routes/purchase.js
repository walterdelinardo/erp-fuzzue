/**
 * api/routes/purchase.js
 * Gestão de Ordens de Compra (OC)
 */
const express = require('express');
const { pool, handleError } = require('../db');

const router = express.Router();

/**
 * GET /api/purchase
 * Lista ordens de compra
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                po.id,
                po.status,
                po.total,
                po.created_at,
                s.name AS supplier_name,
                u.full_name AS created_by_name
             FROM purchase_orders po
             LEFT JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN users u ON u.id = po.created_by
             ORDER BY po.id DESC`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        handleError(res, err, "Erro ao listar ordens de compra.");
    }
});


/**
 * GET /api/purchase/:id
 * Detalhes da OC:
 *  - cabeçalho
 *  - itens solicitados
 *  - recebimentos já registrados
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        // Cabeçalho
        const headerRes = await client.query(
            `SELECT
                po.id,
                po.status,
                po.total,
                po.notes,
                po.created_at,
                s.id AS supplier_id,
                s.name AS supplier_name,
                s.document AS supplier_document,
                u.full_name AS created_by_name
             FROM purchase_orders po
             LEFT JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN users u ON u.id = po.created_by
             WHERE po.id = $1`,
            [id]
        );

        if (headerRes.rows.length === 0) {
            client.release();
            return res.status(404).json({
                success: false,
                message: "Ordem de compra não encontrada."
            });
        }

        // Itens solicitados
        const itemsRes = await client.query(
            `SELECT
                poi.id,
                poi.product_id,
                p.name AS product_name,
                poi.quantity,
                poi.unit_cost,
                poi.total_cost
             FROM purchase_order_items poi
             LEFT JOIN products p ON p.id = poi.product_id
             WHERE poi.purchase_order_id = $1`,
            [id]
        );

        // Recebimentos dessa OC
        const receiptsRes = await client.query(
            `SELECT
                pr.id,
                pr.product_id,
                p.name AS product_name,
                pr.received_qty,
                pr.branch,
                pr.received_at,
                u.full_name AS received_by_name,
                pr.note
             FROM purchase_receipts pr
             LEFT JOIN products p ON p.id = pr.product_id
             LEFT JOIN users u ON u.id = pr.received_by
             WHERE pr.purchase_order_id = $1
             ORDER BY pr.received_at DESC`,
            [id]
        );

        client.release();

        res.json({
            success: true,
            data: {
                order: headerRes.rows[0],
                items: itemsRes.rows,
                receipts: receiptsRes.rows
            }
        });

    } catch (err) {
        client.release();
        handleError(res, err, "Erro ao consultar ordem de compra.");
    }
});


/**
 * POST /api/purchase
 * Cria uma OC nova (status 'draft')
 *
 * body esperado:
 * {
 *   "supplier_id": 3,
 *   "created_by": 1,
 *   "notes": "Pagamento 30 dias, frete CIF",
 *   "items": [
 *     { "product_id": 12, "quantity": 100, "unit_cost": 4.50 },
 *     { "product_id": 8,  "quantity": 20,  "unit_cost": 120.00 }
 *   ]
 * }
 */
router.post('/', async (req, res) => {
    const { supplier_id, created_by, notes, items } = req.body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "supplier_id e pelo menos 1 item são obrigatórios."
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // cria cabeçalho com total=0 inicialmente
        const orderRes = await client.query(
            `INSERT INTO purchase_orders
                (supplier_id, status, total, notes, created_by)
             VALUES
                ($1, 'draft', 0, $2, $3)
             RETURNING id, created_at`,
            [
                supplier_id,
                notes || null,
                created_by || null
            ]
        );

        const poId = orderRes.rows[0].id;
        let runningTotal = 0;

        // insere itens
        for (const item of items) {
            const { product_id, quantity, unit_cost } = item;

            const qty = parseFloat(quantity);
            const cost = parseFloat(unit_cost);

            if (!product_id || !qty || !cost || qty <= 0 || cost < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: "Item inválido na ordem de compra."
                });
            }

            // cria linha na purchase_order_items
            await client.query(
                `INSERT INTO purchase_order_items
                    (purchase_order_id, product_id, quantity, unit_cost)
                 VALUES
                    ($1, $2, $3, $4)`,
                [poId, product_id, qty, cost]
            );

            runningTotal += qty * cost;
        }

        // atualiza total da ordem
        await client.query(
            `UPDATE purchase_orders
             SET total = $1
             WHERE id = $2`,
            [runningTotal, poId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: "Ordem de compra criada.",
            data: {
                purchase_order_id: poId,
                total: runningTotal
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, "Erro ao criar ordem de compra.");
    } finally {
        client.release();
    }
});


/**
 * POST /api/purchase/receive
 * Registrar recebimento (parcial ou total) de itens da OC.
 *
 * body esperado:
 * {
 *   "purchase_order_id": 10,
 *   "product_id": 12,
 *   "received_qty": 50,
 *   "branch": "Depósito Zona Oeste",
 *   "received_by": 1,
 *   "note": "NF 5512 recebida 24/10"
 * }
 *
 * O que faz:
 * - registra em purchase_receipts
 * - gera movimentação de estoque (entrada)
 * - atualiza products.stock
 * - recalcula status da OC: draft -> partial/received
 */
router.post('/receive', async (req, res) => {
    const {
        purchase_order_id,
        product_id,
        received_qty,
        branch,
        received_by,
        note
    } = req.body;

    const qty = parseFloat(received_qty);

    if (!purchase_order_id || !product_id || !qty || qty <= 0) {
        return res.status(400).json({
            success: false,
            message: "purchase_order_id, product_id e received_qty (>0) são obrigatórios."
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. validar ordem existe
        const orderRes = await client.query(
            `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
            [purchase_order_id]
        );
        if (orderRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Ordem de compra não encontrada."
            });
        }

        // 2. validar item existe nessa ordem
        const itemRes = await client.query(
            `SELECT
                poi.id,
                poi.quantity AS ordered_qty,
                poi.product_id,
                p.stock AS current_stock
             FROM purchase_order_items poi
             JOIN products p ON p.id = poi.product_id
             WHERE poi.purchase_order_id = $1
             AND poi.product_id = $2
             FOR UPDATE`,
            [purchase_order_id, product_id]
        );

        if (itemRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Este produto não faz parte dessa ordem de compra."
            });
        }

        const orderedQty = parseFloat(itemRes.rows[0].ordered_qty) || 0;
        const currentStock = parseFloat(itemRes.rows[0].current_stock) || 0;

        // 3. registrar recebimento
        const receiptRes = await client.query(
            `INSERT INTO purchase_receipts
                (purchase_order_id, product_id, received_qty, branch, received_by, note)
             VALUES
                ($1, $2, $3, $4, $5, $6)
             RETURNING id, received_at`,
            [
                purchase_order_id,
                product_id,
                qty,
                branch || null,
                received_by || null,
                note || null
            ]
        );

        // 4. atualizar estoque do produto (entrada)
        const newStock = currentStock + qty;
        await client.query(
            `UPDATE products
             SET stock = $1
             WHERE id = $2`,
            [newStock, product_id]
        );

        // 5. registrar movimentação de estoque
        await client.query(
            `INSERT INTO inventory_movements
                (product_id, type, quantity, reason, branch, created_by)
             VALUES
                ($1, 'entrada', $2, $3, $4, $5)`,
            [
                product_id,
                qty,
                `Recebimento OC #${purchase_order_id}`,
                branch || null,
                received_by || null
            ]
        );

        // 6. checar se a OC já foi toda recebida
        // soma tudo que já recebemos por produto vs tudo que foi pedido
        const fullCheckRes = await client.query(
            `WITH ordered AS (
                SELECT product_id, SUM(quantity) AS ordered_qty
                FROM purchase_order_items
                WHERE purchase_order_id = $1
                GROUP BY product_id
            ),
            received AS (
                SELECT product_id, SUM(received_qty) AS received_qty
                FROM purchase_receipts
                WHERE purchase_order_id = $1
                GROUP BY product_id
            )
            SELECT
                o.product_id,
                o.ordered_qty,
                COALESCE(r.received_qty, 0) AS received_qty
            FROM ordered o
            LEFT JOIN received r ON r.product_id = o.product_id`,
            [purchase_order_id]
        );

        // Se algum item ainda não atingiu a quantidade total pedida -> status partial
        // Se todos atingiram ou passaram -> status received
        let fullyReceived = true;
        for (const row of fullCheckRes.rows) {
            const ordered = parseFloat(row.ordered_qty) || 0;
            const got = parseFloat(row.received_qty) || 0;
            if (got < ordered) {
                fullyReceived = false;
                break;
            }
        }

        const newStatus = fullyReceived ? 'received' : 'partial';

        await client.query(
            `UPDATE purchase_orders
             SET status = $1
             WHERE id = $2`,
            [newStatus, purchase_order_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Recebimento registrado com sucesso.',
            data: {
                receipt_id: receiptRes.rows[0].id,
                new_stock: newStock,
                order_status: newStatus
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, "Erro ao registrar recebimento da ordem de compra.");
    } finally {
        client.release();
    }
});

module.exports = router;
