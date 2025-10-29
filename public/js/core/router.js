/**
 * public/js/core/router.js
 * Responsável por:
 *  - carregar módulos dinâmicos (HTML + JS) dentro de #app-content
 *  - gerenciar navegação da sidebar via data-module="..."
 *  - atualizar UI ativa na sidebar
 *  - preencher nome do usuário logado no header lateral
 *
 * Este arquivo NÃO inicializa sozinho.
 * O main.js chama initRouter() depois que a autenticação estiver pronta.
 */

import { initializeAuth, clearCurrentUser, getCurrentUser } from './auth.js';

const appWrapper  = document.getElementById('app-wrapper');
const appContent  = document.getElementById('app-content');
const welcomeUser = document.getElementById('welcome-user');
const logoutBtn   = document.getElementById('btn-logout');

/**
 * Carrega um módulo específico:
 * - Busca o HTML /js/modules/<mod>/<mod>.html
 * - Injeta no #app-content
 * - Importa o JS /js/modules/<mod>/<mod>.js
 * - Se o módulo exportar initPage(), chamamos
 */
async function loadModule(moduleName) {
    try {
        // Carrega HTML
        const htmlRes = await fetch(`/js/modules/${moduleName}/${moduleName}.html`);
        if (!htmlRes.ok) {
            console.error(`Erro carregando HTML do módulo ${moduleName}:`, htmlRes.status);
            appContent.innerHTML = `
                <div class="p-4 bg-red-100 text-red-700 rounded">
                    Falha ao carregar módulo <b>${moduleName}</b> (${htmlRes.status}).
                </div>`;
            return;
        }

        const html = await htmlRes.text();
        appContent.innerHTML = html;

        // Importa o JS do módulo dinamicamente
        const mod = await import(`/js/modules/${moduleName}/${moduleName}.js`);

        // Se o módulo definir initPage(), chamamos
        if (mod && typeof mod.initPage === 'function') {
            mod.initPage();
        }

    } catch (err) {
        console.error(`Erro fatal ao carregar módulo ${moduleName}:`, err);
        appContent.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded">
                Erro interno ao carregar módulo <b>${moduleName}</b>.
            </div>`;
    }
}

/**
 * Destaca o botão ativo na sidebar.
 */
function highlightSidebar(route) {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-white');
    });
    const active = document.querySelector(`[data-module="${route}"]`);
    if (active) {
        active.classList.add('bg-gray-800', 'text-white');
    }
}

/**
 * Faz navegação para um módulo (atualiza sidebar + carrega o módulo)
 */
function navigate(route) {
    highlightSidebar(route);
    loadModule(route);
}

/**
 * Associa cliques da sidebar aos módulos
 */
function bindSidebar() {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.getAttribute('data-module');
            navigate(route);
        });
    });
}

/**
 * Configura botão de logout
 */
function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = '/login.html';
    });
}

/**
 * Inicializa a camada de navegação após a autenticação.
 * - Garante que o usuário está autenticado
 * - Mostra o wrapper principal (#app-wrapper)
 * - Injeta nome do usuário logado
 * - Liga eventos de navegação
 * - Carrega o primeiro módulo ("dashboard" por padrão)
 */
async function initRouter() {
    // garante estado de auth e visibilidade do app
    await initializeAuth();

    // Preenche nome do usuário logado na sidebar
    const user = getCurrentUser();
    if (user && welcomeUser) {
        welcomeUser.textContent = `Olá, ${user.fullName || user.username || ''}`;
    }

    // Garante que o app wrapper aparece
    if (appWrapper) {
        appWrapper.classList.remove('hidden');
    }

    // Liga eventos
    bindSidebar();
    bindLogout();

    // Carrega o primeiro módulo visível
    navigate('dashboard'); // ou 'pdv' se você quiser abrir direto o caixa
}

export { initRouter, navigate, loadModule };
