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

const { userHasPermission, getRequestUserContext } = require('../utils/auth_utils');

/**
 * Gera um middleware que exige uma permissão específica.
 *
 * @param {string} requiredPermission - Ex: 'pdv.finalizar_venda'
 */
function checkPermission(requiredPermission) {
    return async (req, res, next) => {
        // 1. Extrai o "contexto do usuário" da requisição
        //    (por enquanto via header x-user-role, futuro via JWT)
        const userCtx = getRequestUserContext(req);

        if (!userCtx || !userCtx.role) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado.',
                data: null,
                error: 'AUTH_REQUIRED'
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

        // 3. Injeta o contexto do usuário na request para os handlers usarem
        //    Ex: req.user.role, req.user.id
        req.user = userCtx;

        // 4. Continua para a rota
        next();
    };
}

module.exports = checkPermission;
