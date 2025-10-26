/**
 * api/db.js
 * * Configuração centralizada e exportação do Pool de conexão do PostgreSQL.
 */
require('dotenv').config(); // Carrega as variáveis do .env
const { Pool } = require('pg');

// Validação da variável de ambiente
if (!process.env.DATABASE_URL) {
    console.error("ERRO CRÍTICO: A variável de ambiente DATABASE_URL não está definida.");
    console.error("Verifique se você criou o arquivo .env e reiniciou o servidor.");
    process.exit(1); // Encerra a aplicação se o banco não estiver configurado
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    
    // --- CORREÇÃO ADICIONADA AQUI ---
    // Esta é a linha que estava faltando, copiada do seu server.js original.
    // Ela habilita SSL em produção (necessário para Coolify, Heroku, etc.)
    // e desabilita em desenvolvimento (local/codespace).
    ssl: process.env.NODE_ENV === 'production' 
         ? { rejectUnauthorized: false } 
         : false
});

/**
 * Função utilitária para tratamento de erros de API.
 * @param {Response} res - O objeto de resposta do Express.
 * @param {Error} error - O objeto de erro.
 * @param {string} message - A mensagem de contexto.
 */
function handleError(res, error, message) {
    console.error(message, error);
    res.status(500).json({ success: false, message: `${message}: ${error.message}` });
}

// Exporta o pool de conexão e o handler de erro
module.exports = {
    pool,
    handleError
};

