/**
 * server/middleware/requireAuth.js
 *
 * Middleware que valida o JWT enviado pelo cliente.
 * - Espera header Authorization: Bearer <token>
 * - Se válido, injeta req.user
 * - Se inválido, retorna 401
 *
 * IMPORTANTE:
 *   Você precisa definir JWT_SECRET no .env
 *
 * Exemplo de .env:
 *   JWT_SECRET=uma_senha_bem_grande_e_aleatoria
 */

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Token ausente.',
            data: null,
            error: 'AUTH_NO_TOKEN'
        });
    }

    // Esperado: "Bearer abc.def.ghi"
    const [scheme, token] = authHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'Formato de autorização inválido.',
            data: null,
            error: 'AUTH_BAD_SCHEME'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // decoded deve ser algo como:
        // { id, username, role, fullName, iat, exp }
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            fullName: decoded.fullName
        };

        return next();
    } catch (err) {
        console.error('[Auth] Falha ao validar token:', err);
        return res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado.',
            data: null,
            error: 'AUTH_INVALID_TOKEN'
        });
    }
}

module.exports = requireAuth;
