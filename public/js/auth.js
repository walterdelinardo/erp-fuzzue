/**
 * public/js/auth.js
 * * Gerencia a autenticação (Firebase ou Mock) e o fluxo inicial da aplicação.
 * api/routes/auth.js
 * * Define as rotas para Autenticação (/api/auth)
*/
import { auth, initialAuthToken } from './config.js'; // Config Firebase
// ATENÇÃO: Corrigido - Importa TUDO de state.js
import * as state from './state.js';
import { loadInitialData } from './api.js'; // Carregar dados da API
import { showLoginScreen, showAppScreen, updateWelcomeMessage, loginMessageEl } from './ui.js'; // Controles da UI
import { navigate } from './router.js'; // Função de navegação
const express = require('express');
const { pool, handleError } = require('../db'); // Importa o pool e o handler de erro

/**
 * Tenta autenticar o usuário via Firebase (Token customizado ou Anônimo).
 * Atualiza o estado de autenticação e adiciona listener ao botão de login.
 */
async function initializeAuth() {
    console.log("[Auth] Iniciando initializeAuth..."); // Log 1
    const loginButton = document.getElementById('btn-login');
    const passwordInput = document.getElementById('login-password');
const router = express.Router();

    // **SIMPLIFICADO:** Adiciona listener diretamente ao botão de LOGIN
    if (loginButton) {
        console.log("[Auth] Botão #btn-login encontrado."); // Log 2
        // Remove listener antigo (caso exista de alguma forma) antes de adicionar
        loginButton.removeEventListener('click', handleLogin); // Tenta remover
        // Adiciona o listener diretamente
        loginButton.addEventListener('click', handleLogin);
        console.log("[Auth] Listener de clique ADICIONADO DIRETAMENTE ao #btn-login."); // Log 3
    } else {
        console.error("[Auth] Botão de login (#btn-login) NÃO encontrado durante inicialização!");
    }
    // Adiciona listener para Enter no campo de senha
     if(passwordInput) {
        console.log("[Auth] Input #login-password encontrado, adicionando listener keydown."); // Log 4
        // Remove listener antigo (caso exista)
        passwordInput.removeEventListener('keydown', handlePasswordEnter);
        // Adiciona o novo listener
        passwordInput.addEventListener('keydown', handlePasswordEnter);
    } else {
         console.error("[Auth] Input #login-password NÃO encontrado!");
    }
// ROTA: POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Lógica Firebase (mantida, mas o fluxo principal agora depende do handleLogin manual)
    if (!auth) {
        console.warn("[Auth] Firebase Auth não inicializado. Usando modo offline/mock.");
        state.setAuthReady(true);
        showLoginScreen(); // Mostra a tela de login
        return;
    // Validação básica de entrada
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios.' });
}

    // Listener principal do Firebase Auth
    // Usamos uma flag para garantir que a lógica inicial rode apenas uma vez
    let initialCheckComplete = false;
    const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log("[Auth] Firebase onAuthStateChanged:", user ? `User UID: ${user.uid}` : 'No user');
        if (user) {
            state.setUserId(user.uid);
        } else {
            state.setUserId(null);
            // Se for a verificação inicial E não houver user, mostra login
            if (!initialCheckComplete) {
                 showLoginScreen();
            } else {
            // Se o user deslogar DEPOIS da app iniciar, chama handleLogout completo
                 if(state.isAuthReady()){ // Evita chamar logout antes da app iniciar
                    handleLogout();
                 }
            }
        }
        // Marca como pronto e só mostra o login se não houver user
        if (!initialCheckComplete) {
            state.setAuthReady(true);
             if (!user) {
                 showLoginScreen();
            }
            initialCheckComplete = true;
            // Se houver user (anônimo/token), esperamos o handleLogin manual
        }
    });
    console.log(`[Auth] Tentativa de login para usuário: ${username}`);

     // Tenta autenticar com token ou anonimamente (como antes)
try {
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken);
            console.log("[Auth] Firebase: Autenticado via token customizado.");
        } else {
            await auth.signInAnonymously();
            console.log("[Auth] Firebase: Autenticado anonimamente.");
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
    } catch (error) {
        console.error("[Auth] Firebase: Falha na autenticação inicial. Mostrando tela de login.", error);
        // Garante que o estado está pronto e a tela de login é exibida
        if (!initialCheckComplete) {
             state.setAuthReady(true);
             showLoginScreen();
             initialCheckComplete = true; // Marca como completo mesmo em erro
        }
    }
    console.log("[Auth] initializeAuth concluído."); // Log 6
}

/**
 * Função separada para lidar com o Enter na senha.
 * @param {KeyboardEvent} e - O evento do teclado.
 */
function handlePasswordEnter(e) {
    if (e.key === 'Enter') {
        console.log("[Auth] Enter pressionado na senha, chamando handleLogin..."); // Log 5
        handleLogin();
    }
}


/**
 * Lida com a tentativa de login do usuário (atualmente, mock).
 */
async function handleLogin() {
    console.log("[Auth] handleLogin INICIADO!"); // Log 7
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    if (!usernameInput || !passwordInput || !loginMessageEl) {
        console.error("[Auth] Elementos de login não encontrados em handleLogin.");
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Credenciais de demonstração
    const demoUser = 'admin';
    const demoPass = 'gbl12024';

    // Limpa mensagens anteriores
    loginMessageEl.textContent = '';
    loginMessageEl.className = 'mt-4 text-sm font-medium'; // Reset classes

    if (!username || !password) {
        loginMessageEl.textContent = 'Por favor, preencha usuário e senha.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        console.log("[Auth] handleLogin: Campos vazios."); // Log 8
        return;
    }

    console.log(`[Auth] Tentando login com: User='${username}', Pass='${password === demoPass ? '***CORRETA***' : '***INCORRETA***'}'`); // Log 9

    if (username === demoUser && password === demoPass) {
        // Simulação de login bem-sucedido
        console.log("[Auth] Credenciais CORRETAS."); // Log 10
        loginMessageEl.textContent = 'Autenticado com sucesso. Carregando...';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-green-600';

        // Desabilita o botão para evitar cliques múltiplos
        const loginButton = document.getElementById('btn-login');
        if (loginButton) loginButton.disabled = true;

        try {
            // Chama a função startApp DESTE MÓDULO (auth.js)
            console.log("[Auth] Chamando startApp..."); // Log 11
            await startApp('Administrador');
            console.log("[Auth] startApp concluído com sucesso."); // Log 12
        } catch (error) {
            // Se startApp falhar (provavelmente ao carregar dados)
            console.error("[Auth] Erro durante startApp:", error); // Log 13
            loginMessageEl.textContent = `Erro ao iniciar: ${error.message}`;
            loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
            if (loginButton) loginButton.disabled = false; // Reabilita o botão
        // Verifica se o usuário está ativo
        if (!user.is_active) {
            console.log(`[Auth] Falha: Usuário '${username}' está inativo.`);
            return res.status(403).json({ success: false, message: 'Este usuário está desativado.' });
}
    } else {
        console.log("[Auth] Credenciais INCORRETAS."); // Log 14
        loginMessageEl.textContent = 'Credenciais inválidas.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
    }
    console.log("[Auth] handleLogin FINALIZADO."); // Log 15
}

/**
 * Inicia a aplicação principal após o login bem-sucedido.
 * Carrega dados da API e navega para a rota inicial.
 * @param {string} role - O "cargo" ou nome do usuário logado (ex: 'Administrador').
 * @throws {Error} Se o carregamento de dados falhar.
 */
// **NOVO:** Esta função agora está DEFINIDA aqui em auth.js
async function startApp(role) {
    console.log("[Auth] Iniciando startApp para:", role); // Log 16
    updateWelcomeMessage(role); // Atualiza a mensagem de boas-vindas na UI

    try {
        // Etapa Crítica: Carrega os dados da API (produtos, fornecedores, etc.)
        console.log("[Auth] Chamando loadInitialData..."); // Log 17
        await loadInitialData();
        console.log("[Auth] loadInitialData concluído."); // Log 18

        // Se os dados carregaram com sucesso, mostra a tela principal
        console.log("[Auth] Chamando showAppScreen..."); // Log 19
        showAppScreen();

        // Navega para a rota atual ou para o dashboard como padrão
        const routeToNavigate = state.currentRoute || 'dashboard';
        console.log(`[Auth] Chamando navigate para: ${routeToNavigate}`); // Log 20
        navigate(routeToNavigate); // Usa currentRoute de state.js

    } catch (error) {
        // loadInitialData já exibe uma mensagem de erro na contentArea
        console.error("[Auth] Falha no startApp (provavelmente em loadInitialData):", error); // Log 21
        // Garante que a tela de login seja re-exibida ou mantida se loadInitialData falhar
        showLoginScreen();
        // Lança o erro novamente para que handleLogin possa tratá-lo (ex: reabilitar botão)
        throw error;
    }
}
        // !! COMPARAÇÃO DE SENHA (TEXTO SIMPLES - NÃO SEGURO!) !!
        // !! TODO: Substituir por comparação de hash (ex: bcrypt.compare) !!
        const isPasswordCorrect = (password === user.password_hash);

/**
 * Lida com o logout do usuário.
 */
function handleLogout() {
    console.log("[Auth] handleLogout chamado.");
    state.setUserId(null); // Limpa o ID do usuário no estado
    state.setAuthReady(false); // Considera não pronto até nova autenticação
    // Limpa dados sensíveis do estado
    // As funções setProducts/setSuppliers precisam ser importadas diretamente
    state.setProducts([]);
    state.setSuppliers([]);
    // Limpa estado da venda atual (importa a função de state.js)
    state.clearSale();
    state.setCurrentRoute('dashboard'); // Reseta a rota padrão
        if (!isPasswordCorrect) {
            console.log(`[Auth] Falha: Senha incorreta para usuário '${username}'.`);
            return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }

    showLoginScreen(); // Mostra a tela de login
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

    // Se estiver usando Firebase Auth real, desloga
    if (auth) {
        auth.signOut().catch(error => console.error("Erro ao deslogar do Firebase:", error));
    } catch (err) {
        handleError(res, err, `Erro durante o processo de login para ${username}.`);
}
}

// Exporta apenas o que main.js precisa
export { initializeAuth, handleLogin, handleLogout };
});

module.exports = router;
