// public/js/auth.js

/**
 * Autenticação local (sem Firebase) + fluxo de login/logout + inicialização.
 */

import { 
    setUserId,
    setAuthReady,
    isAuthReady,
    currentRoute,
    setCurrentRoute,
    clearSale
} from './state.js';

import { loadInitialData } from './api.js';
import { 
    showLoginScreen,
    showAppScreen,
    updateWelcomeMessage,
    loginMessageEl
} from './ui.js';

import { navigate } from './router.js';

/**
 * Inicializa a parte de autenticação quando o app carrega.
 * - Mostra a tela de login
 * - Conecta o clique do botão "Entrar" ao handleLogin()
 * - Adiciona Enter no campo de senha
 */
async function initializeAuth() {
    console.log("[Auth] initializeAuth() chamado.");

    // Sempre começa na tela de login
    showLoginScreen();

    const loginButton   = document.getElementById('btn-login');
    const passwordInput = document.getElementById('login-password');

    if (!loginButton) {
        console.error("[Auth] btn-login não encontrado no DOM.");
        return;
    }

    // Garante que só registra uma vez
    loginButton.onclick = null;
    loginButton.addEventListener('click', handleLogin);

    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }

    // marca app pronto para receber login
    setAuthReady(true);
    console.log("[Auth] Autenticação pronta para uso (modo local).");
}

/**
 * Faz login usando a API backend /api/auth/login
 */
async function handleLogin() {
    console.log("[Auth] handleLogin() disparado.");

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginButton   = document.getElementById('btn-login');

    if (!usernameInput || !passwordInput || !loginMessageEl || !loginButton) {
        console.error("[Auth] Elementos essenciais do formulário de login não encontrados.");
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // feedback visual
    loginMessageEl.textContent = 'Verificando...';
    loginMessageEl.className = 'mt-4 text-sm font-medium text-gray-500';
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Entrando...';

    if (!username || !password) {
        loginMessageEl.textContent = 'Por favor, preencha usuário e senha.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
        return;
    }

    console.log(`[Auth] Tentando login com usuário='${username}'`);

    let respJson;
    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password
            })
        });

        respJson = await resp.json();
        console.log("[Auth] Resposta /api/auth/login:", resp.status, respJson);

    } catch (err) {
        console.error("[Auth] Erro de rede ao chamar /api/auth/login:", err);
        loginMessageEl.textContent = 'Falha de conexão com o servidor.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
        return;
    }

    if (!respJson || respJson.success !== true || !respJson.user) {
        // login inválido
        loginMessageEl.textContent = respJson && respJson.message 
            ? respJson.message 
            : 'Usuário ou senha inválidos.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
        return;
    }

    // login OK
    const { id, fullName, role } = respJson.user;
    setUserId(id || fullName || username); // guarda algo identificável
    setAuthReady(true);
    setCurrentRoute('dashboard');
    clearSale(); // zera venda atual etc.

    // feedback pro usuário
    loginMessageEl.textContent = 'Login realizado com sucesso.';
    loginMessageEl.className = 'mt-4 text-sm font-medium text-green-600';

    // mostra app real
    showAppScreen();
    updateWelcomeMessage(fullName || role || username);

    // carrega dados iniciais (produtos, fornecedores etc)
    try {
        await loadInitialData();
    } catch (err) {
        console.error("[Auth] Erro ao carregar dados iniciais:", err);
        // se falhar aqui, ainda estamos logados, só não carregou dashboard direito
    }

    // manda pro dashboard
    console.log("[Auth] Navegando para dashboard...");
    navigate('dashboard');

    // reseta botão visual depois que já logou
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
}

/**
 * Logout simples local
 */
function handleLogout() {
    console.log("[Auth] handleLogout() chamado. Limpando sessão.");
    setUserId(null);
    setAuthReady(false);
    setCurrentRoute('dashboard');
    clearSale();

    // volta pra tela de login
    showLoginScreen();
}

export {
    initializeAuth,
    handleLogin,
    handleLogout
};
