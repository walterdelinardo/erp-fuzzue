/**
 * public/js/ui.js
 * * Funções para manipular elementos da interface do usuário (DOM).
 */
import { handleLogout } from './auth.js'; // Para o botão de logout
import { showCustomModal } from './utils.js'; // Para confirmação de logout
import { navigate } from './router.js'; // Para navegação pelos links

// Referências a elementos DOM comuns (cache para performance)
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app');
const contentArea = document.getElementById('content-area');
const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const loginMessageEl = document.getElementById('login-message'); // Elemento para mensagens de erro/sucesso no login

/**
 * Mostra a tela de login e esconde a aplicação principal.
 */
function showLoginScreen() {
    if (loginScreen) {
        loginScreen.classList.remove('hidden', 'opacity-0');
    }
    if (appContainer) {
        appContainer.classList.add('hidden');
    }
    // Limpa a área de conteúdo principal para evitar mostrar dados antigos rapidamente
    if (contentArea) {
        contentArea.innerHTML = '';
    }
     // Limpa campos de login e mensagens
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('btn-login');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (loginMessageEl) loginMessageEl.textContent = '';
    if (loginButton) loginButton.disabled = false; // Garante que o botão esteja habilitado
}

/**
 * Mostra a aplicação principal e esconde a tela de login.
 */
function showAppScreen() {
    if (appContainer) {
        appContainer.classList.remove('hidden');
    }
    if (loginScreen) {
        loginScreen.classList.add('opacity-0'); // Inicia fade-out
        // Usa setTimeout para esconder completamente após a transição CSS
        setTimeout(() => {
            if (loginScreen) loginScreen.classList.add('hidden');
        }, 300); // Deve corresponder à duração da transição no CSS (se houver)
    }
}

/**
 * Atualiza a mensagem de boas-vindas na barra superior.
 * @param {string} userName - O nome ou cargo do usuário.
 */
function updateWelcomeMessage(userName) {
    if (welcomeMessage) {
        welcomeMessage.textContent = `Bem-vindo(a), ${userName}`;
    }
}

/**
 * Atualiza a aparência dos links da sidebar para destacar o ativo.
 * @param {string} activeRoute - A rota que deve ser destacada.
 */
function updateSidebarActiveLink(activeRoute) {
    if (!sidebar) return;

    // Remove a classe ativa de todos os links primeiro
    sidebar.querySelectorAll('li[data-route] a').forEach(link => {
        link.classList.remove('bg-orange-600', 'text-white', 'shadow-lg');
        // Garante que a classe de hover seja re-adicionada se não for link ativo
        if (!link.classList.contains('menu-link')) { // Evita adicionar duplicado
            link.classList.add('menu-link', 'hover:bg-gray-700');
        }
    });

    // Adiciona a classe ativa ao link correspondente à rota
    const activeLink = sidebar.querySelector(`li[data-route="${activeRoute}"] a`);
    if (activeLink) {
        activeLink.classList.add('bg-orange-600', 'text-white', 'shadow-lg');
        activeLink.classList.remove('menu-link', 'hover:bg-gray-700'); // Remove classes de estado normal/hover
    }
}

/**
 * Configura os event listeners globais da UI (menu, logout, links de navegação).
 */
function setupUIEventListeners() {
    // Menu Hamburguer (Mobile)
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            // Lógica para sobreposição em mobile
            if (!sidebar.classList.contains('hidden')) {
                sidebar.classList.add('absolute', 'z-40', 'h-full');
            } else {
                sidebar.classList.remove('absolute', 'z-40', 'h-full');
            }
        });
    } else {
        console.warn("Elemento menuToggle ou sidebar não encontrado.");
    }

    // Botão de Logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            showCustomModal("Sair do Sistema", "Você será desconectado. Continuar?", () => {
                handleLogout(); // Chama a função de logout do módulo auth
            });
        });
    } else {
        console.warn("Elemento logoutButton não encontrado.");
    }

    // Links de Navegação na Sidebar
    if (sidebar) {
        sidebar.querySelectorAll('li[data-route]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const route = item.getAttribute('data-route');
                if (route) {
                    navigate(route); // Chama a função de navegação do router
                     // Fecha o menu em telas pequenas após clicar
                    if (window.innerWidth < 768 && !sidebar.classList.contains('hidden')) {
                        sidebar.classList.add('hidden');
                        sidebar.classList.remove('absolute', 'z-40', 'h-full');
                    }
                } else {
                    console.warn("Link da sidebar sem atributo data-route:", item);
                }
            });
        });
    } else {
        console.warn("Elemento sidebar não encontrado para adicionar listeners de navegação.");
    }
}


// Exporta as funções e referências necessárias para outros módulos
export {
    showLoginScreen,
    showAppScreen,
    updateWelcomeMessage,
    updateSidebarActiveLink,
    setupUIEventListeners,
    contentArea, // Exporta a referência direta para quem precisar (ex: módulos de render)
    loginMessageEl // Exporta para auth.js poder usar
};
