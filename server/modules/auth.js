/**
 * server/modules/auth.js
 * Rotas de autenticação (/api/auth)
 *
 * Responsabilidade:
 * - POST /api/auth/login
 *   Valida credenciais e retorna dados básicos do usuário logado.
 *
 * Observação: a senha ainda está sendo comparada em texto puro (não seguro).
 * TODO: implementar hash seguro (ex: bcrypt.compare).
 */

const express = require('express');
const db = require('../config/db');

const router = express.Router();

// ROTA: POST /api/auth/login
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
        // Busca o usuário no banco de dados pelo username
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

        // Verifica se o usuário existe
        if (!user) {
            console.log(`[Auth] Falha: Usuário '${username}' não encontrado.`);
            return res.status(401).json({
                success: false,
                message: 'Usuário ou senha inválidos.',
                data: null,
                error: 'LOGIN_USER_NOT_FOUND'
            });
        }

        // Verifica se o usuário está ativo
        if (!user.is_active) {
            console.log(`[Auth] Falha: Usuário '${username}' está inativo.`);
            return res.status(403).json({
                success: false,
                message: 'Este usuário está desativado.',
                data: null,
                error: 'LOGIN_USER_INACTIVE'
            });
        }

        // COMPARAÇÃO DE SENHA (texto simples)
        // TODO: substituir por hash seguro com bcrypt.compare
        const isPasswordCorrect = (password === user.password_hash);

        if (!isPasswordCorrect) {
            console.log(`[Auth] Falha: Senha incorreta para usuário '${username}'.`);
            return res.status(401).json({
                success: false,
                message: 'Usuário ou senha inválidos.',
                data: null,
                error: 'LOGIN_BAD_PASSWORD'
            });
        }

        // Login OK
        console.log(`[Auth] Sucesso: Login bem-sucedido para usuário '${username}'.`);

        // Monta payload enxuto que irá para o frontend
        const safeUser = {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role
        };

        return res.status(200).json({
            success: true,
            message: 'Login bem-sucedido!',
            data: safeUser,
            error: null
            // Em produção real: gerar e retornar token JWT aqui.
            // token: generateJwtToken(user)
        });

    } catch (err) {
        // Usa o handler padronizado do projeto
        return db.handleError(
            res,
            err,
            `Erro durante o processo de login para ${username}.`
        );
    }
});

module.exports = router;
