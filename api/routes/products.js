/**
 * api/routes/products.js
 * * Define as rotas para o CRUD de Produtos (/api/products)
 */
const express = require('express');
const router = express.Router();
const { pool, handleError } = require('../db'); // Importa de ../db.js

// ROTA 1: Obter todos os produtos (GET /api/products)
router.get('/', async (req, res) => {
    console.log("ROTA: GET /api/products foi acionada"); // <-- LOG DE DEPURACAO
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY name ASC');
        console.log(`Sucesso: GET /api/products, encontrados ${result.rows.length} produtos.`); // <-- LOG DE DEPURACAO
        res.status(200).json(result.rows);
    } catch (err) {
        // Garantir que o handleError seja chamado
        handleError(res, err, "Erro ao buscar produtos.");
    }
});

// ROTA 2: Criar/Atualizar um produto (POST /api/products)
router.post('/', async (req, res) => {
    console.log("ROTA: POST /api/products foi acionado"); // <-- LOG DE DEPURACAO
    const p = req.body;
    try {
        const query = `
            INSERT INTO products (id, name, sku, price, stock, min_stock, margin, ncm_code, cst, origem, tributacao, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE 
            SET name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock, min_stock = EXCLUDED.min_stock, margin = EXCLUDED.margin, ncm_code = EXCLUDED.ncm_code, cst = EXCLUDED.cst, origem = EXCLUDED.origem, tributacao = EXCLUDED.tributacao, description = EXCLUDED.description
            RETURNING *;
        `;
        const result = await pool.query(query, [
            p.sku, p.name, p.sku, p.price, p.stock, p.min_stock, p.margin, p.ncm_code, p.cst, p.origem, p.tributacao, p.description
        ]);
        console.log(`Sucesso: POST /api/products, produto salvo: ${result.rows[0].id}`); // <-- LOG DE DEPURACAO
        res.status(201).json({ success: true, product: result.rows[0] });
    } catch (err) {
        // Garantir que o handleError seja chamado
        handleError(res, err, "Erro ao salvar produto.");
    }
});

module.exports = router;
