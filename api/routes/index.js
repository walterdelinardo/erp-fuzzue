/**
 * api/routes/index.js
 * * Este arquivo é o roteador principal da API.
 * Ele importa todos os módulos de rotas (produtos, vendas, etc.)
 * e os exporta para o server.js principal.
 */
const express = require('express');
const { pool, handleError } = require('../db'); // Importa do db.js

// Importa os roteadores dos módulos
const productRoutes = require('./products');
const supplierRoutes = require('./suppliers');
const salesRoutes = require('./sales');

const router = express.Router();

// --- Rota de Status ---
// (Movida do server.js para cá)
router.get('/status', async (req, res) => {
    try {
        await pool.query('SELECT 1'); // Tenta uma consulta simples
        res.status(200).json({ 
            status: "OK", 
            database: "PostgreSQL Conectado com Sucesso", 
            server: "Servidor Node.js Ativo" 
        });
    } catch (err) {
        // Usamos o handleError centralizado
        handleError(res, err, "Erro de Conexão com o Banco de Dados. Verifique as credenciais DATABASE_URL.");
    }
});

// --- Agrupamento das Rotas ---
// Qualquer requisição para /api/products será gerenciada por productRoutes
router.use('/products', productRoutes);
// Qualquer requisição para /api/suppliers será gerenciada por supplierRoutes
router.use('/suppliers', supplierRoutes);
// Qualquer requisição para /api/sales será gerenciada por salesRoutes
router.use('/sales', salesRoutes);

// Exporta o roteador principal
module.exports = router;