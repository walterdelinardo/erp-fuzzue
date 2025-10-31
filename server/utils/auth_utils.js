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
 * Extrai informações do usuário autenticado a partir do token (JWT, sessão etc.)
 *
 * A informação do usuário (req.user) já deve ter sido injetada pelo middleware requireAuth.
 * Esta função é apenas um fallback ou um helper para extrair o contexto.
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
    // A informação do usuário (req.user) já deve ter sido injetada pelo middleware requireAuth.
    // O middleware checkPermission foi modificado para usar diretamente req.user.
    // Esta função não deve mais ser usada pelo checkPermission.
    // Mantida apenas para compatibilidade ou uso futuro.

    if (req.user && req.user.role) {
        return {
            id: req.user.id,
            role: req.user.role,
            username: req.user.username,
            fullName: req.user.fullName
        };
    }

    // Fallback para simulação em desenvolvimento (DEVE SER REMOVIDO EM PRODUÇÃO)
    const simulatedRole = req.headers['x-user-role'];
    if (simulatedRole) {
        console.warn("[AuthUtils] Usando simulação de role via header 'x-user-role'.");
        return {
            id: null,
            role: simulatedRole,
            username: null,
            fullName: 'Usuário Simulado'
        };
    }

    return null;
}

module.exports = {
    userHasPermission,
    getRequestUserContext
};