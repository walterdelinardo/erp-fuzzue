/**
 * api/routes/index.js
 * * Roteador principal da API.
 * Agrupa e expõe todos os módulos de rota sob /api
 */
const express = require('express');
const { pool, handleError } = require('../db'); // Importa do db.js

// Importa os roteadores dos módulos
const authRoutes = require('./auth');        // <-- ADICIONADO
const productRoutes = require('./products');
const supplierRoutes = require('./suppliers');
const salesRoutes = require('./sales');
const inventoryRoutes = require('./inventory');
const dashboardRoutes = require('./dashboard');
const purchaseRoutes = require('./purchase');


const router = express.Router();

/**
 * ROTA DE STATUS
 * GET /api/status
 * Retorna se o servidor e o banco estão respondendo
 */
router.get('/status', async (req, res) => {
    try {
        await pool.query('SELECT 1'); // Teste simples no banco
        res.status(200).json({ 
            status: "OK",
            database: "PostgreSQL Conectado com Sucesso",
            server: "Servidor Node.js Ativo"
        });
    } catch (err) {
        handleError(res, err, "Erro de Conexão com o Banco de Dados. Verifique as credenciais DATABASE_URL.");
    }
});

/**
 * AGRUPAMENTO DE ROTAS
 * Essas linhas definem os prefixos:
 * /api/auth      -> authRoutes
 * /api/products  -> productRoutes
 * /api/suppliers -> supplierRoutes
 * /api/sales     -> salesRoutes
 * /api/inventory   -> inventoryRoutes
 * /api/dashboard   -> dashboardRoutes
 */

router.use('/auth', authRoutes);        // <-- ADICIONADO (POST /api/auth/login passa a existir)
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/sales', salesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/purchase', purchaseRoutes);

module.exports = router;
