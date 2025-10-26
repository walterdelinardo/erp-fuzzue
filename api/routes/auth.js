/**
 * api/routes/auth.js
 * * Define as rotas para Autenticação (/api/auth)
 */
const express = require('express');
const { pool, handleError } = require('../db'); // Importa o pool e o handler de erro

const router = express.Router();

// ROTA: POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validação básica de entrada
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios.' });
    }

    console.log(`[Auth] Tentativa de login para usuário: ${username}`);

    try {
        // Busca o usuário no banco de dados pelo username
        const result = await pool.query(
            'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE username = $1',
            [username]
        );

        const user = result.rows[0];

        // Verifica se o usuário existe
        if (!user) {
            console.log(`[Auth] Falha: Usuário '${username}' não encontrado.`);
            return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }

        // Verifica se o usuário está ativo
        if (!user.is_active) {
            console.log(`[Auth] Falha: Usuário '${username}' está inativo.`);
            return res.status(403).json({ success: false, message: 'Este usuário está desativado.' });
        }

        // !! COMPARAÇÃO DE SENHA (TEXTO SIMPLES - NÃO SEGURO!) !!
        // !! TODO: Substituir por comparação de hash (ex: bcrypt.compare) !!
        const isPasswordCorrect = (password === user.password_hash);

        if (!isPasswordCorrect) {
            console.log(`[Auth] Falha: Senha incorreta para usuário '${username}'.`);
            return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }

        // Se chegou até aqui, o login foi bem-sucedido
        console.log(`[Auth] Sucesso: Login bem-sucedido para usuário '${username}'.`);

        // Retorna informações úteis (NÃO A SENHA OU HASH!)
        res.status(200).json({
            success: true,
            message: 'Login bem-sucedido!',
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            }
            // Em um sistema real, aqui você geraria um token JWT (JSON Web Token)
            // e o enviaria de volta para o cliente usar em requisições futuras.
            // token: generateJwtToken(user)
        });

    } catch (err) {
        handleError(res, err, `Erro durante o processo de login para ${username}.`);
    }
});

module.exports = router;
