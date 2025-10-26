/**
 * api/routes/suppliers.js
 * * Define as rotas para o CRUD de Fornecedores (/api/suppliers)
 */
const express = require('express');
const { pool, handleError } = require('../db'); // Importa o pool e o handler de erro

const router = express.Router();

// ROTA: GET /api/suppliers
// (Lógica movida do server.js original)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        handleError(res, err, "Erro ao buscar fornecedores.");
    }
});

// ROTA: POST /api/suppliers
// (Lógica movida do server.js original)
router.post('/', async (req, res) => {
    const s = req.body;
    try {
        const query = `
            INSERT INTO suppliers (name, cnpj, contact_person, phone, email, cep, address, observations)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const result = await pool.query(query, [
            s.name, s.cnpj, s.contact_person, s.phone, s.email, s.cep, s.address, s.observations
        ]);
        res.status(201).json({ success: true, supplier: result.rows[0] });
    } catch (err) {
        handleError(res, err, "Erro ao adicionar fornecedor.");
    }
});

module.exports = router;
