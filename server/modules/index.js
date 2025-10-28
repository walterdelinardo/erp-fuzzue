/**
 * api/routes/index.js
 * Roteador principal da API.
 * Agrupa e expõe todos os módulos de rota sob /api
 */

const express = require('express');
const router = express.Router();

const { pool, handleError } = require('../config/db');

// Importa sub-rotas
const authRoutes = require('./auth');
const productRoutes = require('./products');
const supplierRoutes = require('./suppliers');
const salesRoutes = require('./sales');
const inventoryRoutes = require('./inventory');
const dashboardRoutes = require('./dashboard');
const purchaseRoutes = require('./purchase');

// PDV (novo módulo)
const pdvRoutes = require('./pdv');

// Se você ainda usa essa rota antiga "produtos.js", mantém.
// Se NÃO usa mais (products.js já substituiu), pode remover essas 2 linhas.
try {
    const produtosRoutes = require('./produtos');
    router.use('/produtos', produtosRoutes);
} catch (err) {
    // Se não existir ./produtos.js, ignoramos silenciosamente.
    // Isso evita travar o servidor.
    console.warn('Rota ./produtos não encontrada (ok se você já migrou para /products).');
}


/**
 * GET /api/status
 * Usado pra health check de servidor + banco.
 */
router.get('/status', async (req, res) => {
    try {
        await pool.query('SELECT 1'); // Teste rápido
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
 * AGRUPAMENTO DE ROTAS /api/*
 * Cada rota filha aqui já está sob /api
 *
 * Exemplo:
 * - /api/auth        -> authRoutes
 * - /api/products    -> productRoutes
 * - /api/suppliers   -> supplierRoutes
 * - /api/sales       -> salesRoutes
 * - /api/inventory   -> inventoryRoutes
 * - /api/dashboard   -> dashboardRoutes
 * - /api/purchase    -> purchaseRoutes
 * - /api/modules/pdv -> pdvRoutes
 */

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/sales', salesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/purchase', purchaseRoutes);

// módulo PDV
router.use('/modules/pdv', pdvRoutes);

module.exports = router;
