import { initializeAuth, clearCurrentUser, getCurrentUser } from '/js/auth.js';

const appWrapper  = document.getElementById('app-wrapper');
const appContent  = document.getElementById('app-content');
const welcomeUser = document.getElementById('welcome-user');
const logoutBtn   = document.getElementById('btn-logout');

async function loadModule(moduleName) {
    // carrega HTML do módulo
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

    // importa o JS do módulo dinamicamente
    const mod = await import(`/js/modules/${moduleName}/${moduleName}.js`);

    if (mod && typeof mod.initPage === 'function') {
        mod.initPage();
    }
}

function highlightSidebar(route) {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-white');
    });
    const active = document.querySelector(`[data-module="${route}"]`);
    if (active) {
        active.classList.add('bg-gray-800', 'text-white');
    }
}

function navigate(route) {
    highlightSidebar(route);
    loadModule(route);
}

function bindSidebar() {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.getAttribute('data-module');
            navigate(route);
        });
    });
}

function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = '/login.html';
    });
}

(async () => {
    await initializeAuth();

    const user = getCurrentUser();
    if (user && welcomeUser) {
        welcomeUser.textContent = `Olá, ${user.fullName || user.username}`;
    }

    bindSidebar();
    bindLogout();

    navigate('dashboard');
})();

export { navigate };
