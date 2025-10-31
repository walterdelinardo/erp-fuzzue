/**
 * server/middleware/checkPermission.js
 *
 * Middleware de autorização baseado em permissão nominal.
 *
 * Uso:
 *
 * const checkPermission = require('../middleware/checkPermission');
 *
 * router.post(
 *   '/finalizar-venda',
 *   checkPermission('pdv.finalizar_venda'),
 *   async (req, res) => { ... }
 * );
 *
 */

const { userHasPermission } = require('../utils/auth_utils');

/**
 * Gera um middleware que exige uma permissão específica.
 *
 * @param {string} requiredPermission - Ex: 'pdv.finalizar_venda'
 */
function checkPermission(requiredPermission) {
    return async (req, res, next) => {
        // 1. O contexto do usuário (req.user) deve ter sido injetado pelo requireAuth (JWT)
        const userCtx = req.user;

        // Se req.user não existe, significa que requireAuth não foi executado ou falhou.
        // Como checkPermission é sempre executado DEPOIS de requireAuth,
        // se chegamos aqui sem req.user é um erro de implementação (ou requireAuth falhou).
        // Vamos checar apenas se o role existe, pois o requireAuth já garantiu a autenticação.
        if (!userCtx || !userCtx.role) {
             // Este bloco só deve ser atingido se a ordem dos middlewares estiver errada
             // ou se requireAuth não injetou req.user.
             console.error("[CheckPermission] req.user ou req.user.role ausente. A rota está usando requireAuth?");
             return res.status(401).json({
                 success: false,
                 message: 'Requer autenticação válida (Token JWT).',
                 data: null,
                 error: 'AUTH_REQUIRED_JWT'
             });
        }

        // 2. Checa se o perfil do usuário tem a permissão solicitada
        const allowed = await userHasPermission(userCtx.role, requiredPermission);

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: 'Permissão negada.',
                data: null,
                error: `MISSING_PERMISSION:${requiredPermission}`
            });
        }

        // 3. O contexto do usuário (req.user) já foi injetado pelo requireAuth.
        //    Continua para a rota.
        next();
    };
}

module.exports = checkPermission;