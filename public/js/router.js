// public/js/router.js

import { initializeAuth, clearCurrentUser, getCurrentUser } from '/js/auth.js';

const appWrapper  = document.getElementById('app-wrapper');
const appContent  = document.getElementById('app-content');
const welcomeUser = document.getElementById('welcome-user');
const logoutBtn   = document.getElementById('btn-logout');

// carrega o HTML e JS dinamicamente de um módulo
async function loadModule(moduleName) {
    // busca HTML do módulo
    const htmlRes = await fetch(`/js/modules/${moduleName}/${moduleName}.html`);
    if (!htmlRes.ok) {
        console.error(`Erro carregando HTML do módulo ${moduleName}:`, htmlRes.status);
        appContent.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded">
            Falha ao carregar módulo <b>${moduleName}</b> (${htmlRes.status}).
        </div>`;
        return;
    }
    const html = await htmlRes.text();
    appContent.innerHTML = html;

    // importa o JS do módulo
    const mod = await import(`/js/modules/${moduleName}/${moduleName}.js`);

    // chama initPage do módulo se existir
    if (mod && typeof mod.initPage === 'function') {
        mod.initPage();
    }
}

// destacar botão ativo na sidebar
function highlightSidebar(route) {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-white');
    });
    const active = document.querySelector(`[data-module="${route}"]`);
    if (active) {
        active.classList.add('bg-gray-800', 'text-white');
    }
}

// navegação pública pra outros módulos chamarem
function navigate(route) {
    highlightSidebar(route);
    loadModule(route);
}

// configura os botões da sidebar
function bindSidebar() {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.getAttribute('data-module');
            navigate(route);
        });
    });
}

// configura logout
function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = '/login.html';
    });
}

// fluxo inicial
(async () => {
    // 1. garante autenticação e mostra o wrapper
    await initializeAuth();

    // 2. mostra nome do usuário
    const user = getCurrentUser();
    if (user && welcomeUser) {
        welcomeUser.textContent = `Olá, ${user.fullName || user.username}`;
    }

    // 3. bind navegação e logout
    bindSidebar();
    bindLogout();

    // 4. rota inicial padrão
    navigate('dashboard');
})();

// exporta navigate caso algum módulo queira chamar navegação
export { navigate };
