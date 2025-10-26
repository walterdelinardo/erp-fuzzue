const express = require('express');
const { pool, handleError } = require('../db');
const router = express.Router();

/**
 * GET /api/products
 * Lista todos os produtos
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, s.name AS supplier_name 
             FROM products p 
             LEFT JOIN suppliers s ON s.id = p.supplier_id
             ORDER BY p.id DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        handleError(res, err, "Erro ao listar produtos.");
    }
});

/**
 * POST /api/products
 * Cria um novo produto
 */
router.post('/', async (req, res) => {
    const { name, sku, ncm, unit, cost_price, sale_price, supplier_id } = req.body;

    if (!name)
        return res.status(400).json({ success: false, message: "Nome é obrigatório." });

    try {
        const result = await pool.query(
            `INSERT INTO products (name, sku, ncm, unit, cost_price, sale_price, supplier_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             RETURNING *`,
            [name, sku, ncm, unit, cost_price, sale_price, supplier_id]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        handleError(res, err, "Erro ao criar produto.");
    }
});

/**
 * PUT /api/products/:id
 * Atualiza um produto
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, sku, ncm, unit, cost_price, sale_price, supplier_id, stock } = req.body;

    try {
        const result = await pool.query(
            `UPDATE products
             SET name=$1, sku=$2, ncm=$3, unit=$4, cost_price=$5,
                 sale_price=$6, supplier_id=$7, stock=$8
             WHERE id=$9 RETURNING *`,
            [name, sku, ncm, unit, cost_price, sale_price, supplier_id, stock, id]
        );

        if (result.rowCount === 0)
            return res.status(404).json({ success: false, message: "Produto não encontrado." });

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        handleError(res, err, "Erro ao atualizar produto.");
    }
});

/**
 * DELETE /api/products/:id
 * Remove produto
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM products WHERE id=$1', [id]);
        if (result.rowCount === 0)
            return res.status(404).json({ success: false, message: "Produto não encontrado." });

        res.json({ success: true, message: "Produto removido com sucesso." });
    } catch (err) {
        handleError(res, err, "Erro ao excluir produto.");
    }
});

module.exports = router;
