/**
 * public/js/main.js
 * * Ponto de entrada principal da aplicação frontend.
 * Responsável por inicializar módulos e configurar listeners globais.
 */

// Importa funções essenciais de outros módulos
import { initializeAuth } from './auth.js'; // Apenas inicializa a autenticação
import { setupUIEventListeners } from './ui.js'; // Configura listeners da UI (menu, sidebar, etc.)

// --- Ponto de Entrada da Aplicação ---
window.onload = async () => {
    console.log("DOM carregado. Iniciando aplicação...");

    // 1. Configura listeners básicos da UI (menu, sidebar, logout)
    //    NOTA: O listener do botão de login foi movido para initializeAuth em auth.js
    setupUIEventListeners();

    // 2. Tenta inicializar a autenticação (Firebase ou Mock)
    //    Esta função agora também adiciona o listener do botão de login
    //    e decide qual ecrã mostrar inicialmente.
    await initializeAuth();

    console.log("Inicialização do main.js concluída.");
};

// NOTA: A função startApp agora existe apenas em auth.js e é chamada internamente por handleLogin.
// Não precisamos mais exportá-la daqui.

