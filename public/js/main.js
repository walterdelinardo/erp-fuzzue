/**
 * public/js/main.js
 * Ponto de entrada principal da aplicação frontend (ERP Fuzzue).
 * Responsável por:
 *  - configurar listeners globais da UI (sidebar, logout, etc.)
 *  - inicializar/authenticar o usuário
 *  - ativar o roteador de módulos (dashboard, pdv, etc.)
 *
 * Este arquivo é carregado diretamente em /public/index.html:
 * <script type="module" src="/js/main.js"></script>
 */

import { initializeAuth } from './core/auth.js';           // controla login/logout e exibe/esconde #app-wrapper
import { setupUIEventListeners } from './core/ui.js';      // listeners globais da interface (sidebar, botões, modais)
import { initRouter } from './core/router.js';             // carregamento dinâmico de módulos em #app-content

window.onload = async () => {
    console.log("DOM carregado. Iniciando aplicação Fuzzue...");

    // 1. Configura listeners de UI que sempre existem (ex: sidebar, logout, modais globais)
    setupUIEventListeners();

    // 2. Inicializa autenticação:
    //    - valida se o usuário está logado
    //    - se estiver, remove 'hidden' de #app-wrapper
    //    - popula dados do usuário em #welcome-user
    //    - se não estiver, redireciona / mostra tela de login (dependendo da sua lógica em auth.js)
    await initializeAuth();

    // 3. Ativa roteador:
    //    - conecta os botões data-module="..."
    //    - injeta o HTML inicial (ex.: dashboard ou pdv)
    //    - garante que ao clicar em "PDV" ele carregue /public/js/modules/pdv/pdv.html
    initRouter();

    console.log("Inicialização do main.js concluída.");
};
