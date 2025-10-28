// public/js/core/auth.js
// Camada de autenticação e sessão do ERP Fuzzue (frontend).
// - Gerencia sessão do usuário via sessionStorage
// - Faz login via /api/auth/login
// - Controla visibilidade do app-wrapper (interface principal)

const SESSION_KEY = 'fuzzue_user';

// Lê o usuário logado salvo no sessionStorage
function getCurrentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// Salva usuário logado (chamado no login)
function setCurrentUser(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

// Remove sessão (logout)
function clearCurrentUser() {
    sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Tenta login na API.
 * Espera que o backend responda no formato padrão ERP:
 * {
 *   success: true/false,
 *   message: "...",
 *   data: { id, fullName, username, ... } | null,
 *   error: null | "detalhe"
 * }
 *
 * Se login OK:
 *  - salva o usuário em sessionStorage
 *  - redireciona para /index.html
 */
async function attemptLogin(username, password) {
    const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    let data;
    try {
        data = await resp.json();
    } catch (e) {
        throw new Error('Resposta inválida do servidor de autenticação.');
    }

    // Falha HTTP explícita (ex.: 401)
    if (!resp.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            'Falha na autenticação.'
        );
    }

    // Falha lógica segundo o contrato da API
    if (!data.success) {
        throw new Error(
            data?.message ||
            data?.error ||
            'Credenciais inválidas.'
        );
    }

    // OK → salva usuário
    // No padrão oficial, o usuário vem em data.data
    const userPayload = data.data || {};
    setCurrentUser(userPayload);

    // Redireciona para o app principal
    window.location.href = '/index.html';
}

/**
 * Checa se há um usuário logado.
 *  - Se NÃO houver, redireciona para /login.html
 *  - Se houver, remove "hidden" do #app-wrapper
 *
 * Essa função deve ser chamada no início da aplicação (main.js / router.js)
 */
async function initializeAuth() {
    const user = getCurrentUser();
    const appWrapper = document.getElementById('app-wrapper');

    if (!user) {
        // Não autenticado → manda pro login
        window.location.href = '/login.html';
        return;
    }

    // Autenticado → revela interface principal
    if (appWrapper) {
        appWrapper.classList.remove('hidden');
    }
}

export {
    initializeAuth,
    attemptLogin,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
};
