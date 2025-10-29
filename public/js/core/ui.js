/**
 * public/js/core/ui.js
 * Responsável por interações globais de interface (sidebar, logout, highlight de menu).
 * Compatível com o layout atual (index.html).
 */

import { clearCurrentUser, getCurrentUser } from './auth.js';
import { navigate } from './router.js';

// Referências reais do layout atual
const appWrapper   = document.getElementById('app-wrapper');
const appContent   = document.getElementById('app-content');
const welcomeUser  = document.getElementById('welcome-user');
const logoutBtn    = document.getElementById('btn-logout');

// (opcional futuramente: hambúrguer mobile se você criar um botão com id="menu-toggle"
// e der um id="sidebar" pro <aside>. Por enquanto não temos esses elementos.)
const menuToggle   = document.getElementById('menu-toggle');
const sidebar      = document.getElementById('sidebar'); // ainda não existe no HTML atual

/**
 * Atualiza o header "Olá, Fulano".
 */
function renderWelcomeUser() {
    const user = getCurrentUser();
    if (user && welcomeUser) {
        welcomeUser.textContent = `Olá, ${user.fullName || user.username}`;
    }
}

/**
 * Destaca no sidebar o módulo atual.
 */
function highlightActiveModule(route) {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-white');
    });
    const active = document.querySelector(`[data-module="${route}"]`);
    if (active) {
        active.classList.add('bg-gray-800', 'text-white');
    }
}

/**
 * Liga os cliques nos botões do menu lateral para navegar via router.
 */
function bindSidebarNavigation() {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.getAttribute('data-module');
            navigate(route);
        });
    });
}

/**
 * Liga o botão de logout.
 * Faz logout simples (limpa sessão e volta pro login).
 */
function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = '/login.html';
    });
}

/**
 * (Opcional) Toggle do menu lateral em mobile.
 * Só vai funcionar quando você der id="sidebar" pro <aside class="..."> 
 * e adicionar um botão hambúrguer com id="menu-toggle".
 */
function bindMobileSidebarToggle() {
    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');

        if (!sidebar.classList.contains('hidden')) {
            sidebar.classList.add('absolute', 'z-40', 'h-full');
        } else {
            sidebar.classList.remove('absolute', 'z-40', 'h-full');
        }
    });
}

/**
 * Inicialização geral de UI.
 * Chame isso depois que o usuário estiver autenticado.
 */
function initUI(routeToHighlight = null) {
    renderWelcomeUser();
    bindSidebarNavigation();
    bindLogout();
    bindMobileSidebarToggle();

    if (routeToHighlight) {
        highlightActiveModule(routeToHighlight);
    }
}

// Exportamos o que faz sentido hoje
export {
    initUI,
    highlightActiveModule,
    renderWelcomeUser,
    appWrapper,
    appContent
};
