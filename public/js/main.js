/**
 * public/js/main.js
 * * Ponto de entrada principal da aplicação frontend.
 * Responsável por inicializar módulos, configurar listeners globais
 * e iniciar o fluxo de autenticação/aplicação.
 */

// Importa funções essenciais de outros módulos
import { initializeAuth, handleLogin, handleLogout } from './auth.js'; // Funções de autenticação
import { setupUIEventListeners } from './ui.js'; // Configura listeners da UI (menu, sidebar, etc.)
import { navigate } from './router.js'; // Função de navegação inicial
import { currentRoute } from './state.js'; // Para obter a rota inicial (se houver)

/**
 * Função principal que inicia a aplicação.
 * É chamada após o login bem-sucedido.
 * AGORA É EXPORTADA para que auth.js possa chamá-la.
 */
export async function startApp(role) {
    // A lógica de startApp foi movida para auth.js
    // Esta função agora está em auth.js e é importada por ele mesmo
    // para evitar dependência circular. Deixaremos esta exportação
    // caso outro módulo precise dela, mas a implementação está em auth.js
    // que por sua vez chama loadInitialData e navigate.
    console.log("Chamando startApp de auth.js...");
    // Importa dinamicamente para evitar dependência circular na carga inicial
    const authModule = await import('./auth.js');
    await authModule.startApp(role);
}


// --- Ponto de Entrada da Aplicação ---
window.onload = async () => {
    console.log("DOM carregado. Iniciando aplicação...");

    // 1. Configura listeners básicos da UI (menu, sidebar, logout)
    setupUIEventListeners();

    // 2. Tenta inicializar a autenticação (Firebase ou Mock)
    //    Isso vai definir se mostra a tela de login ou tenta iniciar o app
    await initializeAuth();

    // 3. **CORREÇÃO:** Adiciona o listener para o botão de LOGIN
    const loginButton = document.getElementById('btn-login');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
        console.log("Listener do botão de login adicionado.");
    } else {
        console.error("Botão de login (#btn-login) não encontrado!");
    }

    // Adiciona listener para Enter no campo de senha (opcional, mas útil)
    const passwordInput = document.getElementById('login-password');
    if(passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }

    // Nota: A navegação inicial (navigate) agora é chamada DENTRO do startApp em auth.js,
    // APÓS o login bem-sucedido e o carregamento dos dados.
    console.log("Inicialização do main.js concluída.");
};

