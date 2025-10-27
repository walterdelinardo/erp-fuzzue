/**
 * server.js
 * * Ponto de entrada principal da aplicação.
 */
require('dotenv').config(); // Garante que o .env seja lido primeiro
const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./api/routes');       // index.js dentro de api/routes
const authRoutes = require('./api/routes/auth'); // rota de auth que você me mandou
const pdvRoutes = require('./server/modules/pdv');

const app = express();
const PORT = process.env.PORT || 40011;

// --- Middlewares Essenciais ---
app.use(express.json());
app.use(cors({ origin: '*' }));

// Rotas do PDV (antes do static e antes do catch-all!)
app.use('/modules/pdv', pdvRoutes);

// --- ORDEM DAS ROTAS ---

// 1. Rotas específicas de autenticação
console.log("Registrando rotas de autenticação em /api/auth");
app.use('/api/auth', authRoutes);

// 2. Demais rotas da API
console.log("Registrando rotas da API em /api");
app.use('/api', apiRoutes);

// 3. Arquivos estáticos (frontend)
console.log("Registrando arquivos estáticos de /public");
app.use(express.static(path.resolve(__dirname, 'public')));

// 4. Catch-all (SPA)
app.get('*', (req, res) => {
    console.log(`Catch-all: Servindo index.html para a rota: ${req.path}`);
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Fuzzue rodando na porta ${PORT}`);
});
