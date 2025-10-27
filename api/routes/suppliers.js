/**
 * api/routes/suppliers.js
 * CRUD de Fornecedores
 */
const express = require('express');
const { pool, handleError } = require('../db');

const router = express.Router();

/**
 * GET /api/suppliers
 * Lista todos os fornecedores
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, document, email, phone, address, created_at
             FROM suppliers
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        handleError(res, err, "Erro ao listar fornecedores.");
    }
});

/**
 * GET /api/suppliers/:id
 * Busca fornecedor específico
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT id, name, document, email, phone, address, created_at
             FROM suppliers
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Fornecedor não encontrado."
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        handleError(res, err, "Erro ao buscar fornecedor.");
    }
});

/**
 * POST /api/suppliers
 * Cria um fornecedor
 */
router.post('/', async (req, res) => {
    const { name, document, email, phone, address } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Nome do fornecedor é obrigatório."
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO suppliers
                (name, document, email, phone, address)
             VALUES
                ($1,   $2,       $3,    $4,    $5)
             RETURNING id, name, document, email, phone, address, created_at`,
            [
                name,
                document || null,
                email || null,
                phone || null,
                address || null
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        handleError(res, err, "Erro ao criar fornecedor.");
    }
});

/**
 * PUT /api/suppliers/:id
 * Atualiza um fornecedor
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, document, email, phone, address } = req.body;

    try {
        const result = await pool.query(
            `UPDATE suppliers
             SET name=$1,
                 document=$2,
                 email=$3,
                 phone=$4,
                 address=$5
             WHERE id=$6
             RETURNING id, name, document, email, phone, address, created_at`,
            [
                name,
                document,
                email,
                phone,
                address,
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Fornecedor não encontrado."
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        handleError(res, err, "Erro ao atualizar fornecedor.");
    }
});

/**
 * DELETE /api/suppliers/:id
 * Remove fornecedor
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Regra: se você quiser impedir excluir fornecedor ainda vinculado a produto,
        // podemos validar aqui antes de excluir. Por enquanto: exclui direto.
        const result = await pool.query(
            `DELETE FROM suppliers WHERE id=$1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Fornecedor não encontrado."
            });
        }

        res.json({
            success: true,
            message: "Fornecedor removido com sucesso."
        });

    } catch (err) {
        handleError(res, err, "Erro ao excluir fornecedor.");
    }
});

module.exports = router;
