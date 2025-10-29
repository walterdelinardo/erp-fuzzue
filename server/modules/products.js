/**
 * server/modules/products.js
 *
 * Rotas de gerenciamento de produtos / estoque básico
 * Base: /api/products
 *
 * Permissões esperadas (seed em roles_permissions):
 * - produtos.ver
 * - produtos.criar
 * - produtos.editar
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const checkPermission = require('../middleware/checkPermission');

/**
 * Normaliza um produto vindo do DB para o formato esperado pelo frontend
 */
function mapProductRow(row) {
    return {
        id: row.id,
        sku: row.sku,
        barcode: row.barcode,
        name: row.name,
        description: row.description,
        category: row.category,
        ncm: row.ncm,
        unit: row.unit,
        cost_price: row.cost_price,
        sale_price: row.sale_price,
        stock: row.stock,
        supplier_id: row.supplier_id,
        ativo: row.ativo,
        data_criacao: row.data_criacao,
        data_atualizacao: row.data_atualizacao
    };
}

/**
 * GET /api/products
 * Lista básica de produtos (paginável futuramente)
 */
router.get(
    '/',
    requireAuth,
    checkPermission('produtos.ver'),
    async (req, res) => {
        try {
            const sql = `
                SELECT
                    id, sku, barcode, name, description, category, ncm, unit,
                    cost_price, sale_price, stock, supplier_id,
                    data_criacao, data_atualizacao, ativo
                FROM products
                WHERE ativo = TRUE
                ORDER BY name ASC
                LIMIT 200
            `;

            const result = await db.query(sql);
            const produtos = result.rows.map(mapProductRow);

            return res.json({
                success: true,
                message: 'Produtos carregados',
                data: produtos,
                error: null
            });

        } catch (err) {
            console.error('[Products] Erro listando produtos:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao listar produtos',
                data: null,
                error: err.message
            });
        }
    }
);

/**
 * POST /api/products
 * Cria um novo produto
 *
 * body esperado:
 * {
 *   "sku": "ABC123",
 *   "barcode": "7891231231234",
 *   "name": "Camiseta Preta",
 *   "description": "algodão 100%",
 *   "category": "Vestuário",
 *   "ncm": "6109.10.00",
 *   "unit": "un",
 *   "cost_price": 20.00,
 *   "sale_price": 49.90,
 *   "stock": 100,
 *   "supplier_id": 3
 * }
 */
router.post(
    '/',
    requireAuth,
    checkPermission('produtos.criar'),
    async (req, res) => {
        const {
            sku,
            barcode,
            name,
            description,
            category,
            ncm,
            unit,
            cost_price,
            sale_price,
            stock,
            supplier_id
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Nome do produto é obrigatório.',
                data: null,
                error: 'PROD_MISSING_NAME'
            });
        }

        try {
            const insertSql = `
                INSERT INTO products (
                    sku, barcode, name, description,
                    category, ncm, unit,
                    cost_price, sale_price, stock,
                    supplier_id, data_criacao, ativo
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), TRUE)
                RETURNING *
            `;

            const values = [
                sku || null,
                barcode || null,
                name,
                description || null,
                category || null,
                ncm || null,
                unit || null,
                cost_price || null,
                sale_price || null,
                stock || 0,
                supplier_id || null
            ];

            const result = await db.query(insertSql, values);
            const newProd = mapProductRow(result.rows[0]);

            return res.status(201).json({
                success: true,
                message: 'Produto criado com sucesso.',
                data: newProd,
                error: null
            });

        } catch (err) {
            console.error('[Products] Erro criando produto:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao criar produto',
                data: null,
                error: err.message
            });
        }
    }
);

/**
 * PUT /api/products/:id
 * Atualiza dados de um produto existente
 */
router.put(
    '/:id',
    requireAuth,
    checkPermission('produtos.editar'),
    async (req, res) => {
        const { id } = req.params;

        const {
            sku,
            barcode,
            name,
            description,
            category,
            ncm,
            unit,
            cost_price,
            sale_price,
            stock,
            supplier_id,
            ativo
        } = req.body;

        try {
            const updateSql = `
                UPDATE products
                SET
                    sku = $1,
                    barcode = $2,
                    name = $3,
                    description = $4,
                    category = $5,
                    ncm = $6,
                    unit = $7,
                    cost_price = $8,
                    sale_price = $9,
                    stock = $10,
                    supplier_id = $11,
                    ativo = $12,
                    data_atualizacao = NOW()
                WHERE id = $13
                RETURNING *
            `;

            const values = [
                sku || null,
                barcode || null,
                name || null,
                description || null,
                category || null,
                ncm || null,
                unit || null,
                cost_price || null,
                sale_price || null,
                stock || 0,
                supplier_id || null,
                (ativo !== undefined ? ativo : true),
                id
            ];

            const result = await db.query(updateSql, values);

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado.',
                    data: null,
                    error: 'PROD_NOT_FOUND'
                });
            }

            const updated = mapProductRow(result.rows[0]);

            return res.json({
                success: true,
                message: 'Produto atualizado com sucesso.',
                data: updated,
                error: null
            });

        } catch (err) {
            console.error('[Products] Erro atualizando produto:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao atualizar produto',
                data: null,
                error: err.message
            });
        }
    }
);

// (Opcional futuro)
// router.delete('/:id', requireAuth, checkPermission('produtos.editar'), ...)

module.exports = router;
