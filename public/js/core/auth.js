// public/js/core/auth.js
// Camada de autenticação / sessão do ERP Fuzzue (frontend).
// - Faz login e salva { user, token } no sessionStorage
// - Valida sessão ao carregar app
// - Fornece helpers para fazer fetch autenticado

const SESSION_KEY = 'fuzzue_user';
const TOKEN_KEY = 'fuzzue_token';

// Lê o usuário logado salvo
function getCurrentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// Salva user
function setCurrentUser(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

// Lê token JWT
function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || null;
}

// Salva token JWT
function setToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

// Limpa sessão (logout)
function clearCurrentUser() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Faz login na API:
 * - POST /api/auth/login
 * - Espera retorno no formato padrão:
 *
 * {
 *   success: true,
 *   data: {
 *     user: { id, username, fullName, role },
 *     token: "JWT..."
 *   }
 * }
 *
 * Se ok:
 *   - salva user e token
 *   - redireciona para /index.html
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

    if (!resp.ok || !data.success) {
        throw new Error(
            data?.message ||
            data?.error ||
            'Falha na autenticação.'
        );
    }

    // Esperamos data.data.user e data.data.token
    const safeUser = data.data?.user;
    const token = data.data?.token;

    if (!safeUser || !token) {
        throw new Error('Resposta de login incompleta.');
    }

    // salva sessão
    setCurrentUser(safeUser);
    setToken(token);

    // vai para app principal
    window.location.href = '/index.html';
}

/**
 * Garante que o usuário está autenticado:
 * - Se não houver user/token, manda pra /login.html
 * - Se houver, mostra a UI principal
 */
async function initializeAuth() {
    const user = getCurrentUser();
    const token = getToken();
    const appWrapper = document.getElementById('app-wrapper');

    if (!user || !token) {
        window.location.href = '/login.html';
        return;
    }

    if (appWrapper) {
        appWrapper.classList.remove('hidden');
    }
}

/**
 * Helper para fazer requisições autenticadas para a API.
 * Já injeta Authorization: Bearer <token>.
 *
 * Exemplo de uso:
 *
 *   const resp = await authedFetch('/api/pdv/finalizar-venda', {
 *     method: 'POST',
 *     body: JSON.stringify(payload),
 *     headers: { 'Content-Type': 'application/json' }
 *   });
 *
 *   const data = await resp.json();
 */
async function authedFetch(url, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
    };

    return fetch(url, {
        ...options,
        headers
    });
}

export {
    initializeAuth,
    attemptLogin,
    getCurrentUser,
    getToken,
    setCurrentUser,
    setToken,
    clearCurrentUser,
    authedFetch
};