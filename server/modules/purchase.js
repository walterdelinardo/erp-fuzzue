/**
 * server/modules/purchase.js
 *
 * Rotas para Ordens de Compra
 * Base: /api/purchase
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const checkPermission = require('../middleware/checkPermission');

/**
 * GET /api/purchase
 * Lista ordens de compra (cabeçalho resumido)
 */
router.get(
    '/',
    requireAuth,
    checkPermission('ordens_compra.ver'),
    async (req, res) => {
        try {
            const sql = `
                SELECT
                    po.id,
                    po.status,
                    po.total_bruto,
                    po.desconto_total,
                    po.total_final,
                    po.created_at,
                    po.received_at,
                    s.name AS supplier_name
                FROM purchase_orders po
                JOIN suppliers s ON s.id = po.supplier_id
                WHERE po.ativo = TRUE
                ORDER BY po.created_at DESC
                LIMIT 200
            `;

            const result = await db.query(sql);

            const rows = result.rows.map(r => ({
                id: r.id,
                status: r.status,
                supplier_name: r.supplier_name,
                total_bruto: r.total_bruto,
                desconto_total: r.desconto_total,
                total_final: r.total_final,
                created_at: r.created_at,
                received_at: r.received_at
            }));

            return res.json({
                success: true,
                message: 'Ordens de compra carregadas',
                data: rows,
                error: null
            });
        } catch (err) {
            console.error('[Purchase] Erro listando OCs:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao listar ordens de compra',
                data: null,
                error: err.message
            });
        }
    }
);

/**
 * POST /api/purchase
 * Cria uma nova ordem de compra (cabeçalho + itens)
 *
 * body esperado:
 * {
 *   "supplier_id": 3,
 *   "notes_internal": "Negociado frete incluso",
 *   "notes_supplier": "Favor enviar NF com desconto",
 *   "itens": [
 *     {
 *       "product_id": 1,
 *       "descricao_item": "Camiseta Preta Básica",
 *       "quantidade": 50,
 *       "unidade": "un",
 *       "custo_unitario": 18.5
 *     }
 *   ],
 *   "desconto_total": 20.00
 * }
 *
 * Calculamos internamente:
 * - total_bruto = soma(quantidade * custo_unitario)
 * - total_final = total_bruto - desconto_total
 * - status inicial = 'ordered'
 * - created_by = req.user.id
 */
router.post(
    '/',
    requireAuth,
    checkPermission('ordens_compra.criar'),
    async (req, res) => {
        const {
            supplier_id,
            notes_internal,
            notes_supplier,
            itens,
            desconto_total
        } = req.body;

        if (!supplier_id) {
            return res.status(400).json({
                success: false,
                message: 'Fornecedor obrigatório.',
                data: null,
                error: 'PO_MISSING_SUPPLIER'
            });
        }

        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum item informado.',
                data: null,
                error: 'PO_NO_ITEMS'
            });
        }

        const usuarioLogadoId = (req.user && req.user.id) ? req.user.id : null;

        // calcula totais
        let totalBruto = 0;
        itens.forEach(item => {
            const q = Number(item.quantidade);
            const c = Number(item.custo_unitario);
            totalBruto += q * c;
        });

        const descontoTotal = Number(desconto_total || 0);
        const totalFinal = totalBruto - descontoTotal;

        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // cria cabeçalho purchase_orders
            const insertHeaderSql = `
                INSERT INTO purchase_orders (
                    supplier_id,
                    status,
                    total_bruto,
                    desconto_total,
                    total_final,
                    notes_internal,
                    notes_supplier,
                    created_at,
                    created_by,
                    ativo
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,TRUE)
                RETURNING id
            `;

            const headerValues = [
                supplier_id,
                'ordered',
                totalBruto,
                descontoTotal,
                totalFinal,
                notes_internal || null,
                notes_supplier || null,
                usuarioLogadoId
            ];

            const headerResult = await client.query(insertHeaderSql, headerValues);
            const poId = headerResult.rows[0].id;

            // cria itens em purchase_order_items
            for (const item of itens) {
                const q = Number(item.quantidade);
                const c = Number(item.custo_unitario);
                const totalItem = q * c;

                const insertItemSql = `
                    INSERT INTO purchase_order_items (
                        purchase_order_id,
                        product_id,
                        descricao_item,
                        quantidade,
                        unidade,
                        custo_unitario,
                        total_item
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                `;

                const itemValues = [
                    poId,
                    item.product_id,
                    item.descricao_item || null,
                    q,
                    item.unidade || null,
                    c,
                    totalItem
                ];

                await client.query(insertItemSql, itemValues);
            }

            await client.query('COMMIT');

            return res.status(201).json({
                success: true,
                message: 'Ordem de compra criada com sucesso.',
                data: {
                    purchase_order_id: poId,
                    total_bruto: totalBruto,
                    desconto_total: descontoTotal,
                    total_final: totalFinal
                },
                error: null
            });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[Purchase] Erro criando ordem de compra:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao criar ordem de compra',
                data: null,
                error: err.message
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;
