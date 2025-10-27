/**
 * api/db.js
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
 * Pega um client dedicado para transações MANUAIS:
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
 * Função utilitária para resposta de erro em rotas HTTP.
 */
function handleError(res, error, message) {
    console.error(message, error);
    res.status(500).json({
        success: false,
        message: `${message}: ${error.message}`
    });
}

module.exports = {
    pool,         // caso alguém precise do pool cru
    query,        // para SELECT/UPDATE simples fora de transação
    getClient,    // para transações complexas (PDV)
    handleError
};
