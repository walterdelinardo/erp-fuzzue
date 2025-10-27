// public/js/router.js

import { initializeAuth } from './auth.js';

// onde vamos injetar o HTML do módulo
const appWrapper = document.getElementById('app-wrapper');
const appContent = document.getElementById('app-content');

// carrega o HTML e o JS de um módulo e roda initPage()
async function loadModule(moduleName) {
    // 1. busca o HTML
    const htmlRes = await fetch(`./modules/${moduleName}/${moduleName}.html`);
    const html = await htmlRes.text();
    appContent.innerHTML = html;

    // 2. importa o JS
    const mod = await import(`../modules/${moduleName}/${moduleName}.js`);

    // 3. se existir initPage, chama
    if (mod && typeof mod.initPage === 'function') {
        mod.initPage();
    }
}

// configura os botões da sidebar
function bindSidebar() {
    document.querySelectorAll('[data-module]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mod = btn.getAttribute('data-module');
            loadModule(mod);
        });
    });
}

// fluxo inicial
(async () => {
    // Primeiro garante login e mostra o app
    await initializeAuth(); // isso deve exibir #app-wrapper se o usuário estiver logado

    // Liga cliques da sidebar
    bindSidebar();

    // Carrega dashboard como tela inicial
    loadModule('dashboard');
})();
