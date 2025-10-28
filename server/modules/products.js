/**
 * api/routes/products.js
 * Rotas de Produtos
 */
const express = require('express');
const { pool, handleError } = require('../config/db');

const router = express.Router();

/**
 * GET /api/products
 * Lista todos os produtos
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.ncm,
                p.unit,
                p.category,
                p.description,
                p.cost_price,
                p.sale_price,
                p.stock,
                p.created_at,
                p.supplier_id,
                s.name AS supplier_name
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            ORDER BY p.id DESC
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        handleError(res, err, "Erro ao listar produtos.");
    }
});

/**
 * GET /api/products/:id
 * Retorna um produto específico
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.ncm,
                p.unit,
                p.category,
                p.description,
                p.cost_price,
                p.sale_price,
                p.stock,
                p.created_at,
                p.supplier_id,
                s.name AS supplier_name
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            WHERE p.id = $1
        `, [id]);

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
        handleError(res, err, "Erro ao buscar produto.");
    }
});

/**
 * POST /api/products
 * Cria um novo produto
 */
router.post('/', async (req, res) => {
    const {
        name,
        sku,
        ncm,
        unit,
        category,
        description,
        cost_price,
        sale_price,
        stock,
        supplier_id
    } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Nome é obrigatório."
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO products
                (name, sku, ncm, unit, category, description, cost_price, sale_price, stock, supplier_id)
             VALUES
                ($1,   $2,  $3,  $4,   $5,       $6,          $7,         $8,        $9,    $10)
             RETURNING *`,
            [
                name,
                sku || null,
                ncm || null,
                unit || 'un',
                category || null,
                description || null,
                cost_price || 0,
                sale_price || 0,
                stock || 0,
                supplier_id || null
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        handleError(res, err, "Erro ao criar produto.");
    }
});

/**
 * PUT /api/products/:id
 * Atualiza um produto existente
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    const {
        name,
        sku,
        ncm,
        unit,
        category,
        description,
        cost_price,
        sale_price,
        stock,
        supplier_id
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE products
             SET
                name = $1,
                sku = $2,
                ncm = $3,
                unit = $4,
                category = $5,
                description = $6,
                cost_price = $7,
                sale_price = $8,
                stock = $9,
                supplier_id = $10
             WHERE id = $11
             RETURNING *`,
            [
                name,
                sku,
                ncm,
                unit,
                category,
                description,
                cost_price,
                sale_price,
                stock,
                supplier_id,
                id
            ]
        );

        if (result.rowCount === 0) {
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
        handleError(res, err, "Erro ao atualizar produto.");
    }
});

/**
 * DELETE /api/products/:id
 * Remove um produto
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const delRes = await pool.query(
            'DELETE FROM products WHERE id = $1',
            [id]
        );

        if (delRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Produto não encontrado."
            });
        }

        res.json({
            success: true,
            message: "Produto removido com sucesso."
        });

    } catch (err) {
        handleError(res, err, "Erro ao excluir produto.");
    }
});

module.exports = router;
