// public/js/auth.js

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

// Tenta login na API e, se der certo, salva o user e redireciona para o sistema
async function attemptLogin(username, password) {
    const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await resp.json();

    if (!data.success) {
        throw new Error(data.message || 'Falha no login');
    }

    // salva user na sessão
    setCurrentUser(data.user);

    // manda pro painel
    window.location.href = '/index.html';
}

// Checa se tem usuário logado.
// - Se NÃO tiver, manda pra /login.html
// - Se tiver, mostra o app-wrapper (remove hidden)
async function initializeAuth() {
    const user = getCurrentUser();
    const appWrapper = document.getElementById('app-wrapper');

    if (!user) {
        // não autenticado -> volta pro login
        window.location.href = '/login.html';
        return;
    }

    // autenticado -> libera a interface principal
    if (appWrapper) {
        appWrapper.classList.remove('hidden');
    }
}

// exporta tudo que o resto do app usa
export {
    initializeAuth,
    attemptLogin,
    getCurrentUser,
    clearCurrentUser,
};
