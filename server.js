/**
 * server.js
 * * Ponto de entrada principal da aplicação.
 */
require('dotenv').config(); // Garante que o .env seja lido primeiro
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api/routes'); // Importa o index.js de /api/routes

const app = express();
const PORT = process.env.PORT || 40011;

// --- Middlewares Essenciais ---
// 1. Parser de JSON (para req.body)
app.use(express.json());
// 2. CORS (para permitir requisições do frontend)
app.use(cors({ origin: '*' }));

// --- ORDEM DAS ROTAS (MUITO IMPORTANTE) ---

// 3. Rotas da API (Backend)
// Qualquer requisição para /api/... deve ser tratada aqui PRIMEIRO
console.log("Registrando rotas da API em /api"); // <-- NOVO LOG
app.use('/api', apiRoutes);

// 4. Servir arquivos estáticos (Frontend)
// O Express servirá 'index.html' automaticamente da raiz de 'public'
console.log("Registrando arquivos estáticos de /public"); // <-- NOVO LOG
app.use(express.static(path.resolve(__dirname, 'public')));

// 5. Rota "Catch-all" (Tratamento de Rota do Lado do Cliente)
// DEVE SER A ÚLTIMA ROTA (depois de /api e /)
// Se a requisição não for para /api e não for um arquivo estático,
// ela "cai" aqui e serve o index.html (para o React Router, etc.)
app.get('*', (req, res) => {
    console.log(`Catch-all: Servindo index.html para a rota: ${req.path}`); // <-- NOVO LOG
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Fuzzue rodando na porta ${PORT}`);
});

