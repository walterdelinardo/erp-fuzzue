// public/js/core/auth.js
// Camada de autenticação / sessão do ERP Fuzzue (frontend).

const SESSION_KEY = 'fuzzue_user';
const TOKEN_KEY   = 'fuzzue_token';

// ---------- sessão ----------
function getCurrentUser() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || null;
}

function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearCurrentUser() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// ---------- login ----------
/**
 * Faz login na API:
 * backend atual responde assim:
 * {
 *   success: true,
 *   message: 'Login bem-sucedido!',
 *   user: { ... }
 * }
 *
 * então aqui tratamos os 2 formatos:
 * - formato novo (com data.user / data.token)
 * - formato atual (com user direto na raiz)
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

  if (!resp.ok || data.success === false) {
    throw new Error(
      data?.message ||
      data?.error ||
      'Falha na autenticação.'
    );
  }

  // tenta ler nos dois formatos
  const userFromNewFormat = data?.data?.user;
  const tokenFromNewFormat = data?.data?.token;
  const userFromOldFormat = data?.user;

  const userToSave = userFromNewFormat || userFromOldFormat;
  const tokenToSave = tokenFromNewFormat || null;

  if (!userToSave) {
    throw new Error('Resposta de login não contém usuário.');
  }

  setCurrentUser(userToSave);

  // se o backend um dia passar a devolver token, já salvamos
  if (tokenToSave) {
    setToken(tokenToSave);
  }

  // vai pro app
  window.location.href = '/index.html';
}

// ---------- init ----------
/**
 * Garante que o usuário está autenticado:
 * - Se não houver user, manda pra /login.html
 * - Se houver, mostra a UI principal
 */
async function initializeAuth() {
  const user  = getCurrentUser();
  const token = getToken(); // pode ser null

  const appWrapper = document.getElementById('app-wrapper');

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  if (appWrapper) {
    appWrapper.classList.remove('hidden');
  }
}

// ---------- fetch autenticado ----------
/**
 * Wrapper de fetch.
 * - Se tivermos token salvo, manda Authorization: Bearer <token>
 * - Se não tivermos, faz fetch normal
 * - Se vier 401/403, podemos redirecionar (comentado por enquanto)
 */
async function authedFetch(url, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  // se quiser forçar logout:
  // if (res.status === 401 || res.status === 403) {
  //   clearCurrentUser();
  //   window.location.href = '/login.html';
  // }

  return res;
}

// ---------- exports ----------
export {
  initializeAuth,
  attemptLogin,
  getCurrentUser,
  getToken,
  setCurrentUser,
  setToken,
  clearCurrentUser,
  authedFetch,
};
