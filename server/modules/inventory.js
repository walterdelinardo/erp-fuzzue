/**
 * api/routes/inventory.js
 * Controle de Estoque (movimentações)
 */
const express = require('express');
const { pool, handleError } = require('../config/db');

const router = express.Router();

/**
 * GET /api/inventory/stock/:productId
 * Retorna o saldo atual (stock) do produto
 */
router.get('/stock/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const result = await pool.query(
            `SELECT id, name, stock, unit
             FROM products
             WHERE id = $1`,
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Produto não encontrado."
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        handleError(res, err, "Erro ao consultar saldo de estoque.");
    }
});


/**
 * GET /api/inventory/movements/:productId
 * Lista histórico de movimentos de estoque desse produto
 */
router.get('/movements/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                im.id,
                im.type,
                im.quantity,
                im.reason,
                im.branch,
                im.created_at,
                u.full_name AS created_by_name
             FROM inventory_movements im
             LEFT JOIN users u ON u.id = im.created_by
             WHERE im.product_id = $1
             ORDER BY im.created_at DESC`,
            [productId]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (err) {
        handleError(res, err, "Erro ao consultar histórico de movimentações.");
    }
});


/**
 * POST /api/inventory/movement
 * Registra uma movimentação (entrada ou saída) e atualiza o estoque atual do produto
 *
 * body esperado:
 * {
 *   "product_id": 12,
 *   "type": "entrada" | "saida",
 *   "quantity": 5.5,
 *   "reason": "Devolução pedido #5431",
 *   "branch": "Loja Central",
 *   "created_by": 1
 * }
 */
router.post('/movement', async (req, res) => {
    const {
        product_id,
        type,
        quantity,
        reason,
        branch,
        created_by
    } = req.body;

    // validação básica
    if (!product_id || !type || !quantity) {
        return res.status(400).json({
            success: false,
            message: "Campos obrigatórios: product_id, type, quantity."
        });
    }

    if (!['entrada', 'saida'].includes(type)) {
        return res.status(400).json({
            success: false,
            message: "type deve ser 'entrada' ou 'saida'."
        });
    }

    // quantidade positiva SEMPRE. O sinal (+/-) a gente aplica depois.
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
            success: false,
            message: "quantity deve ser número maior que zero."
        });
    }

    // início da transação
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. pegar estoque atual
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
                message: "Produto não encontrado."
            });
        }

        const currentStock = parseFloat(prodRes.rows[0].stock) || 0;

        // 2. calcular novo estoque
        let newStock;
        if (type === 'entrada') {
            newStock = currentStock + qty;
        } else {
            newStock = currentStock - qty;
            if (newStock < 0) {
                // regra: não deixa ficar negativo
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: "Estoque insuficiente para saída."
                });
            }
        }

        // 3. inserir movimento no histórico
        const movRes = await client.query(
            `INSERT INTO inventory_movements
                (product_id, type, quantity, reason, branch, created_by)
             VALUES
                ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                product_id,
                type,
                qty,
                reason || null,
                branch || null,
                created_by || null
            ]
        );

        // 4. atualizar estoque no produto
        await client.query(
            `UPDATE products
             SET stock = $1
             WHERE id = $2`,
            [newStock, product_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Movimentação registrada com sucesso.',
            data: {
                movement: movRes.rows[0],
                new_stock: newStock
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, "Erro ao registrar movimentação de estoque.");
    } finally {
        client.release();
    }
});

module.exports = router;
