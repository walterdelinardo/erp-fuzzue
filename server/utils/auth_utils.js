/**
 * server/utils/auth_utils.js
 *
 * Funções auxiliares relacionadas a autenticação/autorização.
 * - Consulta permissões de um perfil (role)
 * - Futuramente: validação de token JWT
 */

const db = require('../config/db');

/**
 * Verifica se um determinado perfil (role) possui uma permissão nominal específica.
 *
 * @param {string} role - Papel do usuário (ex: 'admin', 'pdv', 'financeiro')
 * @param {string} permission - Nome da permissão (ex: 'pdv.finalizar_venda')
 *
 * @returns {Promise<boolean>} true se o perfil possuir a permissão ativa.
 */
async function userHasPermission(role, permission) {
    if (!role || !permission) {
        return false;
    }

    const sql = `
        SELECT 1
        FROM roles_permissions
        WHERE role = $1
        AND permissao = $2
        AND ativo = TRUE
        LIMIT 1
    `;

    try {
        const result = await db.query(sql, [role, permission]);
        return result.rowCount > 0;
    } catch (err) {
        console.error(`[AuthUtils] Erro ao checar permissão (${role} -> ${permission}):`, err);
        return false;
    }
}

/**
 * [FUTURO] Extrai informações do usuário autenticado a partir do token (JWT, sessão etc.)
 * No momento, ainda não temos JWT implementado.
 *
 * Hoje retornaremos um objeto mínimo baseado em header manual, apenas para
 * desenvolvimento/validação de permissão em endpoints protegidos.
 *
 * @param {object} req - Express Request
 *
 * @returns {object|null} userCtx
 *  {
 *    id: number | null,
 *    role: string,
 *    username: string | null
 *  }
 */
function getRequestUserContext(req) {
    // Modo DEV atual:
    // Aceita cabeçalho `x-user-role` para simular o papel do usuário.
    // Exemplo de requisição no front/fetch:
    // fetch('/api/pdv/finalizar-venda', { headers: { 'x-user-role': 'pdv', ... } })
    //
    // IMPORTANTE:
    // Isso NÃO é seguro e NÃO deve ir para produção final sem JWT.

    const simulatedRole = req.headers['x-user-role'];

    if (!simulatedRole) {
        return null;
    }

    return {
        id: null,           // ainda não temos ID amarrado ao token/cabeçalho
        role: simulatedRole,
        username: null
    };
}

module.exports = {
    userHasPermission,
    getRequestUserContext
};
