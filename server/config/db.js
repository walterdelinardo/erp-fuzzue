/**
 * server/config/db.js
 * Conexão centralizada com PostgreSQL + helpers de query e transação.
 */

require('dotenv').config();
const { Pool } = require('pg');

// Validação básica das envs
if (!process.env.DATABASE_URL) {
    console.error("ERRO CRÍTICO: A variável de ambiente DATABASE_URL não está definida.");
    console.error("Verifique se você criou o arquivo .env e reiniciou o servidor.");
    process.exit(1);
}

// Cria pool compartilhado
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});

/**
 * Execução direta de query (uso rápido, sem transação dedicada).
 * @param {string} text - SQL com placeholders $1, $2...
 * @param {Array} params - valores para os placeholders
 * @returns {Promise<QueryResult>}
 */
async function query(text, params) {
    return pool.query(text, params);
}

/**
 * Retorna um client dedicado para transações manuais.
 * Uso típico:
 *
 *  const client = await db.getClient();
 *  try {
 *    await client.query('BEGIN');
 *    await client.query('SQL1', [...]);
 *    await client.query('SQL2', [...]);
 *    await client.query('COMMIT');
 *  } catch (err) {
 *    await client.query('ROLLBACK');
 *    ...
 *  } finally {
 *    client.release();
 *  }
 *
 * @returns {Promise<PoolClient>}
 */
async function getClient() {
    const client = await pool.connect();
    return client;
}

/**
 * Resposta de erro padronizada no formato ERP Fuzzue.
 * Garante consistência entre todos os módulos da API.
 */
function handleError(res, error, message = "Erro interno") {
    console.error(message, error);

    res.status(500).json({
        success: false,
        message: message,
        data: null,
        error: error?.message || String(error)
    });
}

module.exports = {
    pool,         // acesso bruto ao pool
    query,        // operações simples (SELECT, INSERT, UPDATE, DELETE)
    getClient,    // transações complexas
    handleError   // resposta de erro padronizada da API
};
