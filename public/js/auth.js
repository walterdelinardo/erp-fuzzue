/**
 * public/js/auth.js
 * * Gerencia a autenticação (Firebase ou Mock) e o fluxo inicial da aplicação.
 */
import { auth, initialAuthToken } from './config.js'; // Config Firebase
import { setUserId, setAuthReady, setCurrentRoute, currentRoute } from './state.js'; // Estado global
import { loadInitialData } from './api.js'; // Carregar dados da API
import { showLoginScreen, showAppScreen, updateWelcomeMessage, loginMessageEl } from './ui.js'; // Controles da UI
import { navigate } from './router.js'; // Função de navegação

/**
 * Tenta autenticar o usuário via Firebase (Token customizado ou Anônimo).
 * Atualiza o estado de autenticação.
 */
async function initializeAuth() {
    if (!auth) {
        console.warn("Firebase Auth não inicializado. Usando modo offline/mock.");
        setAuthReady(true);
        showLoginScreen(); // Mostra a tela de login mesmo sem Firebase Auth
        return;
    }

    try {
        // Se existe um token inicial (vindo do ambiente Canvas)
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken);
            console.log("Firebase: Autenticado via token customizado.");
        } else {
            // Tenta login anônimo como fallback
            await auth.signInAnonymously();
            console.log("Firebase: Autenticado anonimamente.");
        }
    } catch (error) {
        console.error("Firebase: Falha na autenticação inicial (Token ou Anônimo).", error);
        // Mesmo em caso de erro, consideramos 'authReady' para permitir fluxo offline
        setAuthReady(true);
        showLoginScreen();
        return; // Interrompe se a autenticação inicial falhar criticamente
    }

    // Listener principal do Firebase Auth
    auth.onAuthStateChanged((user) => {
        if (user) {
            setUserId(user.uid);
            console.log(`Firebase: Usuário ${user.isAnonymous ? 'anônimo' : 'autenticado'} pronto. UID: ${user.uid}`);
        } else {
            setUserId(null);
            console.log("Firebase: Usuário deslogado.");
            handleLogout(); // Garante que a tela de login seja exibida
        }
        // Marca como pronto DEPOIS da primeira verificação do listener
        if (!authReady) { // Evita chamar showLoginScreen múltiplas vezes se o estado mudar rápido
             setAuthReady(true);
             // Se não há usuário após a verificação inicial, mostra login
             if (!user) {
                 showLoginScreen();
             }
             // Se houver usuário (anônimo ou token), o fluxo continua para handleLogin/startApp
        }
    });
}

/**
 * Lida com a tentativa de login do usuário (atualmente, mock).
 */
async function handleLogin() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    if (!usernameInput || !passwordInput || !loginMessageEl) {
        console.error("Elementos de login não encontrados.");
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value; // Senha não precisa de trim

    // Credenciais de demonstração
    const demoUser = 'admin';
    const demoPass = 'gbl12024';

    // Limpa mensagens anteriores
    loginMessageEl.textContent = '';
    loginMessageEl.className = 'mt-4 text-sm font-medium'; // Reset classes

    if (!username || !password) {
        loginMessageEl.textContent = 'Por favor, preencha usuário e senha.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        return;
    }

    if (username === demoUser && password === demoPass) {
        // Simulação de login bem-sucedido
        loginMessageEl.textContent = 'Autenticado com sucesso. Carregando...';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-green-600';

        // Desabilita o botão para evitar cliques múltiplos
        const loginButton = document.getElementById('btn-login');
        if (loginButton) loginButton.disabled = true;

        try {
            // O UID do Firebase (anônimo ou custom) já deve estar em state.currentUserId
            // Passamos o "cargo" mockado para a função startApp
            await startApp('Administrador');
        } catch (error) {
            // Se startApp falhar (provavelmente ao carregar dados)
            loginMessageEl.textContent = `Erro ao iniciar: ${error.message}`;
            loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
            if (loginButton) loginButton.disabled = false; // Reabilita o botão
        }
    } else {
        loginMessageEl.textContent = 'Credenciais inválidas.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
    }
}

/**
 * Inicia a aplicação principal após o login bem-sucedido.
 * Carrega dados da API e navega para a rota inicial.
 * @param {string} role - O "cargo" ou nome do usuário logado (ex: 'Administrador').
 * @throws {Error} Se o carregamento de dados falhar.
 */
async function startApp(role) {
    console.log("Iniciando aplicação para:", role);
    updateWelcomeMessage(role); // Atualiza a mensagem de boas-vindas na UI

    try {
        // Etapa Crítica: Carrega os dados da API (produtos, fornecedores, etc.)
        await loadInitialData();

        // Se os dados carregaram com sucesso, mostra a tela principal
        showAppScreen();

        // Navega para a rota atual ou para o dashboard como padrão
        navigate(currentRoute || 'dashboard');

    } catch (error) {
        // loadInitialData já exibe uma mensagem de erro na contentArea
        console.error("Falha ao iniciar a aplicação devido a erro no carregamento de dados.", error);
        // Garante que a tela de login seja re-exibida ou mantida se loadInitialData falhar
        showLoginScreen();
        // Lança o erro novamente para que handleLogin possa tratá-lo (ex: reabilitar botão)
        throw error;
    }
}

/**
 * Lida com o logout do usuário.
 */
function handleLogout() {
    setUserId(null); // Limpa o ID do usuário no estado
    setAuthReady(false); // Considera não pronto até nova autenticação
    // Limpa dados sensíveis do estado (serão recarregados no próximo login)
    setProducts([]);
    setSuppliers([]);
    setCurrentSale([]);
    setCurrentPayments([]);
    setCurrentSaleTotal(0);
    setCurrentRoute('dashboard'); // Reseta a rota padrão

    showLoginScreen(); // Mostra a tela de login

    // Se estiver usando Firebase Auth real, desloga
    if (auth) {
        auth.signOut().catch(error => console.error("Erro ao deslogar do Firebase:", error));
    }
}

export { initializeAuth, handleLogin, handleLogout, startApp };
