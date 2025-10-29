/**
 * server.js
 * Ponto de entrada principal da aplicação ERP Fuzzue.
 */

require('dotenv').config(); // Carrega variáveis de ambiente do .env

const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./modules');                 // /server/modules/index.js (rotas gerais da API)
const authRoutes = require('./modules/auth');           // /server/modules/auth.js (login, logout, sessão)
const pdvRoutes = require('./modules/pdv');             // /server/modules/pdv.js (módulo PDV)
const suppliersRoutes = require('./modules/suppliers'); // /server/modules/suppliers.js (módulo Fornecedores)
const purchaseRoutes  = require('./modules/purchase');  // /server/modules/suppliers.js (módulo ordens de compra)

const app = express();
const PORT = process.env.PORT || 40011;

// --- Middlewares Essenciais ---
app.use(express.json());
app.use(cors({ origin: '*' }));

// --- ORDEM DAS ROTAS ---

// 1. Rotas de autenticação
console.log("Registrando rotas de autenticação em /api/auth");
app.use('/api/auth', authRoutes);

// 2. Rotas específicas de módulos
console.log("Registrando rotas do PDV em /api/pdv");
app.use('/api/pdv', pdvRoutes);

// 3. Demais rotas genéricas da API
console.log("Registrando rotas gerais em /api");
app.use('/api', apiRoutes);

// 4. Arquivos estáticos do frontend (pasta /public)
console.log("Registrando arquivos estáticos de /public");
app.use(express.static(path.resolve(__dirname, '../public')));

// 5. Catch-all: envia index.html para qualquer rota não tratada (SPA)
app.get('*', (req, res) => {
    console.log(`Catch-all: Servindo index.html para a rota: ${req.path}`);
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor Fuzzue rodando na porta ${PORT}`);
});

app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchase', purchaseRoutes);