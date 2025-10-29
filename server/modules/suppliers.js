/**
 * server/modules/suppliers.js
 *
 * Rotas de Fornecedores
 * Base: /api/suppliers
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const checkPermission = require('../middleware/checkPermission');

function mapSupplierRow(row) {
    return {
        id: row.id,
        name: row.name,
        document: row.document,
        phone: row.phone,
        email: row.email,
        address: row.address,
        notes: row.notes,
        is_active: row.is_active,
        data_criacao: row.data_criacao,
        data_atualizacao: row.data_atualizacao
    };
}

// GET /api/suppliers
router.get(
    '/',
    requireAuth,
    checkPermission('fornecedores.ver'),
    async (req, res) => {
        try {
            const result = await db.query(`
                SELECT
                    id, name, document, phone, email, address,
                    notes, is_active,
                    data_criacao, data_atualizacao
                FROM suppliers
                WHERE ativo = TRUE
                ORDER BY name ASC
                LIMIT 200
            `);

            const suppliers = result.rows.map(mapSupplierRow);

            return res.json({
                success: true,
                message: 'Fornecedores carregados',
                data: suppliers,
                error: null
            });
        } catch (err) {
            console.error('[Suppliers] Erro listando fornecedores:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao listar fornecedores',
                data: null,
                error: err.message
            });
        }
    }
);

// POST /api/suppliers
router.post(
    '/',
    requireAuth,
    checkPermission('fornecedores.criar'),
    async (req, res) => {
        const {
            name,
            document,
            phone,
            email,
            address,
            notes
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Nome do fornecedor é obrigatório.',
                data: null,
                error: 'SUPPLIER_MISSING_NAME'
            });
        }

        try {
            const insertSql = `
                INSERT INTO suppliers (
                    name, document, phone, email,
                    address, notes,
                    is_active,
                    data_criacao,
                    ativo
                )
                VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW(),TRUE)
                RETURNING *
            `;

            const values = [
                name,
                document || null,
                phone || null,
                email || null,
                address || null,
                notes || null
            ];

            const result = await db.query(insertSql, values);
            const newSupplier = mapSupplierRow(result.rows[0]);

            return res.status(201).json({
                success: true,
                message: 'Fornecedor criado com sucesso.',
                data: newSupplier,
                error: null
            });

        } catch (err) {
            console.error('[Suppliers] Erro criando fornecedor:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao criar fornecedor',
                data: null,
                error: err.message
            });
        }
    }
);

// PUT /api/suppliers/:id
router.put(
    '/:id',
    requireAuth,
    checkPermission('fornecedores.editar'),
    async (req, res) => {
        const { id } = req.params;
        const {
            name,
            document,
            phone,
            email,
            address,
            notes,
            is_active
        } = req.body;

        try {
            const updateSql = `
                UPDATE suppliers
                SET
                    name = $1,
                    document = $2,
                    phone = $3,
                    email = $4,
                    address = $5,
                    notes = $6,
                    is_active = $7,
                    data_atualizacao = NOW()
                WHERE id = $8
                RETURNING *
            `;

            const values = [
                name || null,
                document || null,
                phone || null,
                email || null,
                address || null,
                notes || null,
                (is_active !== undefined ? is_active : true),
                id
            ];

            const result = await db.query(updateSql, values);

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fornecedor não encontrado.',
                    data: null,
                    error: 'SUPPLIER_NOT_FOUND'
                });
            }

            const updated = mapSupplierRow(result.rows[0]);

            return res.json({
                success: true,
                message: 'Fornecedor atualizado com sucesso.',
                data: updated,
                error: null
            });

        } catch (err) {
            console.error('[Suppliers] Erro atualizando fornecedor:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao atualizar fornecedor',
                data: null,
                error: err.message
            });
        }
    }
);

module.exports = router;
