/**
 * server/modules/auth.js
 * Rotas de autenticação (/api/auth)
 *
 * - POST /api/auth/login
 *   Faz login, valida credenciais, gera JWT.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// Tempo de expiração do token (ajustável)
const TOKEN_EXPIRATION = '8h'; // ex.: "8h", "1d", "30m"

/**
 * Gera o token JWT assinado com os dados essenciais do usuário.
 */
function generateJwtToken(userRow) {
    return jwt.sign(
        {
            id: userRow.id,
            username: userRow.username,
            fullName: userRow.full_name,
            role: userRow.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: TOKEN_EXPIRATION
        }
    );
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validação básica de entrada
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Usuário e senha são obrigatórios.',
            data: null,
            error: 'LOGIN_MISSING_FIELDS'
        });
    }

    console.log(`[Auth] Tentativa de login para usuário: ${username}`);

    try {
        // Buscar usuário
        const result = await db.query(
            `SELECT 
                id,
                username,
                password_hash,
                full_name,
                role,
                is_active
             FROM users
             WHERE username = $1`,
            [username]
        );

        const user = result.rows[0];

        if (!user) {
            console.log(`[Auth] Falha: Usuário '${username}' não encontrado.`);
            return res.status(401).json({
                success: false,
                message: 'Usuário ou senha inválidos.',
                data: null,
                error: 'LOGIN_USER_NOT_FOUND'
            });
        }

        if (!user.is_active) {
            console.log(`[Auth] Falha: Usuário '${username}' inativo.`);
            return res.status(403).json({
                success: false,
                message: 'Este usuário está desativado.',
                data: null,
                error: 'LOGIN_USER_INACTIVE'
            });
        }

        // TODO Segurança real:
        // Trocar essa comparação simples por bcrypt.compare(password, user.password_hash)
        const isPasswordCorrect = (password === user.password_hash);
        if (!isPasswordCorrect) {
            console.log(`[Auth] Falha: Senha incorreta para '${username}'.`);
            return res.status(401).json({
                success: false,
                message: 'Usuário ou senha inválidos.',
                data: null,
                error: 'LOGIN_BAD_PASSWORD'
            });
        }

        // Login OK
        console.log(`[Auth] Sucesso: Login OK para '${username}'.`);

        // Gera token JWT
        const token = generateJwtToken(user);

        // Monta payload seguro para o frontend
        const safeUser = {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role
        };

        return res.status(200).json({
            success: true,
            message: 'Login bem-sucedido!',
            data: {
                user: safeUser,
                token
            },
            error: null
        });

    } catch (err) {
        console.error('[Auth] Erro de login:', err);
        return db.handleError(
            res,
            err,
            `Erro durante o processo de login para ${username}.`
        );
    }
});

module.exports = router;
