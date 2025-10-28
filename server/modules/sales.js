/**
 * api/routes/sales.js
 * Controle de Vendas / PDV
 */
const express = require('express');
const { pool, handleError } = require('../config/db');

const router = express.Router();

/**
 * GET /api/sales
 * Lista vendas realizadas
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.id,
                s.customer_name,
                s.status,
                s.total,
                s.created_at,
                u.full_name AS created_by_name
             FROM sales s
             LEFT JOIN users u ON u.id = s.created_by
             ORDER BY s.id DESC`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        handleError(res, err, "Erro ao listar vendas.");
    }
});


/**
 * GET /api/sales/:id
 * Retorna uma venda com os itens
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        // pega cabeçalho da venda
        const saleRes = await client.query(
            `SELECT 
                s.id,
                s.customer_name,
                s.status,
                s.total,
                s.created_at,
                u.full_name AS created_by_name
             FROM sales s
             LEFT JOIN users u ON u.id = s.created_by
             WHERE s.id = $1`,
            [id]
        );

        if (saleRes.rows.length === 0) {
            client.release();
            return res.status(404).json({
                success: false,
                message: "Venda não encontrada."
            });
        }

        // pega itens
        const itemsRes = await client.query(
            `SELECT
                si.id,
                si.product_id,
                p.name AS product_name,
                si.quantity,
                si.unit_price,
                si.total
             FROM sale_items si
             LEFT JOIN products p ON p.id = si.product_id
             WHERE si.sale_id = $1`,
            [id]
        );

        client.release();

        res.json({
            success: true,
            data: {
                sale: saleRes.rows[0],
                items: itemsRes.rows
            }
        });

    } catch (err) {
        client.release();
        handleError(res, err, "Erro ao buscar venda.");
    }
});


/**
 * POST /api/sales
 * Cria uma venda, registra itens e baixa estoque
 *
 * body esperado:
 * {
 *   "customer_name": "Fulano",
 *   "created_by": 1,
 *   "items": [
 *      { "product_id": 12, "quantity": 3, "unit_price": 15.90 },
 *      { "product_id": 5,  "quantity": 1, "unit_price": 120.00 }
 *   ]
 * }
 */
router.post('/', async (req, res) => {
    const { customer_name, created_by, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "A venda precisa ter pelo menos 1 item."
        });
    }

    // vamos trabalhar com transação
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. cria cabeçalho da venda com total temporário 0
        const saleInsertRes = await client.query(
            `INSERT INTO sales (customer_name, status, total, created_by)
             VALUES ($1, 'closed', 0, $2)
             RETURNING id, created_at`,
            [
                customer_name || null,
                created_by || null
            ]
        );

        const saleId = saleInsertRes.rows[0].id;

        let runningTotal = 0;

        // 2. para cada item da venda
        for (const item of items) {
            const { product_id, quantity, unit_price } = item;

            const qty = parseFloat(quantity);
            const price = parseFloat(unit_price);

            if (!product_id || !qty || !price || qty <= 0 || price < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: "Item inválido na venda."
                });
            }

            // 2.1 checar e bloquear o produto + estoque atual
            const prodRes = await client.query(
                `SELECT id, name, stock
                 FROM products
                 WHERE id = $1
                 FOR UPDATE`,
                [product_id]
            );

            if (prodRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: `Produto ${product_id} não encontrado.`
                });
            }

            const currentStock = parseFloat(prodRes.rows[0].stock) || 0;
            const newStock = currentStock - qty;

            if (newStock < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente para o produto '${prodRes.rows[0].name}'.`
                });
            }

            // 2.2 inserir o item da venda
            const itemInsertRes = await client.query(
                `INSERT INTO sale_items
                    (sale_id, product_id, quantity, unit_price)
                 VALUES
                    ($1, $2, $3, $4)
                 RETURNING id, quantity, unit_price`,
                [saleId, product_id, qty, price]
            );

            // totaliza
            const lineTotal = qty * price;
            runningTotal += lineTotal;

            // 2.3 registrar saída no histórico de estoque
            await client.query(
                `INSERT INTO inventory_movements
                    (product_id, type, quantity, reason, branch, created_by)
                 VALUES
                    ($1, 'saida', $2, $3, $4, $5)`,
                [
                    product_id,
                    qty,
                    `Venda #${saleId}`,
                    null,            // branch: podemos preencher depois com filial do PDV
                    created_by || null
                ]
            );

            // 2.4 atualizar estoque do produto
            await client.query(
                `UPDATE products
                 SET stock = $1
                 WHERE id = $2`,
                [newStock, product_id]
            );
        }

        // 3. atualizar total da venda
        await client.query(
            `UPDATE sales
             SET total = $1
             WHERE id = $2`,
            [runningTotal, saleId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: "Venda registrada com sucesso.",
            data: {
                sale_id: saleId,
                total: runningTotal
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, "Erro ao registrar venda.");
    } finally {
        client.release();
    }
});

module.exports = router;
