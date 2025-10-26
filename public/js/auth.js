/**
 * public/js/auth.js
 * * Gerencia a autenticação (Firebase ou Mock) e o fluxo inicial da aplicação.
 */
import { auth, initialAuthToken } from './config.js'; // Config Firebase
// CORRIGIDO: Importa as funções corretas do state.js
import { setUserId, setAuthReady, currentRoute, clearSale, isAuthReady, setCurrentRoute } from './state.js'; // Estado global
import { loadInitialData } from './api.js'; // Carregar dados da API
// CORRIGIDO: Importa showAppScreen em vez de showAppContainer
import { showLoginScreen, showAppScreen, updateWelcomeMessage, loginMessageEl } from './ui.js'; // Controles da UI
import { navigate } from './router.js'; // Função de navegação

/**
 * Tenta autenticar o usuário via Firebase (Token customizado ou Anônimo).
 * Atualiza o estado de autenticação.
 */
async function initializeAuth() {
    console.log("[Auth] Iniciando initializeAuth...");
    const loginButton = document.getElementById('btn-login');

    if (!auth) {
        console.warn("[Auth] Firebase Auth não inicializado. Usando modo offline/mock.");
        setAuthReady(true);
        showLoginScreen(); // Mostra a tela de login
        // Adiciona o listener do botão de login mesmo em modo offline
        if (loginButton) {
            console.log("[Auth] Adicionando listener de clique (modo offline) ao botão Login.");
            loginButton.addEventListener('click', handleLogin);
        } else {
             console.error("[Auth] Botão de login não encontrado para adicionar listener (modo offline).");
        }
        return;
    }

    // Adiciona listener do botão de login aqui, garantindo que ele exista
    if (loginButton) {
        console.log("[Auth] Adicionando listener de clique ao botão Login.");
        loginButton.addEventListener('click', handleLogin);
        // Adiciona listener para Enter no campo de senha
        const passwordInput = document.getElementById('login-password');
        if (passwordInput) {
            passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                     console.log("[Auth] Enter pressionado na senha, chamando handleLogin...");
                     handleLogin();
                }
            });
             console.log("[Auth] Adicionado listener de keydown ao input de senha.");
        } else {
            console.warn("[Auth] Input de senha não encontrado para adicionar listener de Enter.");
        }

    } else {
        console.error("[Auth] Botão de login não encontrado para adicionar listener.");
    }

    try {
        // Se existe um token inicial (vindo do ambiente Canvas)
        if (initialAuthToken) {
            console.log("[Auth] Tentando autenticar com token customizado...");
            await auth.signInWithCustomToken(initialAuthToken);
            console.log("[Auth] Firebase: Autenticado via token customizado.");
        } else {
            // Tenta login anônimo como fallback
             console.log("[Auth] Tentando autenticar anonimamente...");
            await auth.signInAnonymously();
            console.log("[Auth] Firebase: Autenticado anonimamente.");
        }
    } catch (error) {
        console.error("[Auth] Firebase: Falha na autenticação inicial (Token ou Anônimo).", error);
        setAuthReady(true); // Marca como pronto mesmo em erro para fluxo offline
        showLoginScreen();
        return;
    }

    // Listener principal do Firebase Auth
    auth.onAuthStateChanged((user) => {
         console.log("[Auth] onAuthStateChanged disparado. User:", user ? user.uid : 'null');
        if (user) {
            setUserId(user.uid);
             console.log(`[Auth] Firebase: Usuário ${user.isAnonymous ? 'anônimo' : 'autenticado'} pronto. UID: ${user.uid}`);
        } else {
            setUserId(null);
             console.log("[Auth] Firebase: Usuário deslogado.");
            // Não chama handleLogout aqui para evitar loop, showLoginScreen cuida disso
        }
        // Marca como pronto DEPOIS da primeira verificação do listener
        if (!isAuthReady()) { // Verifica o estado antes de setar
             console.log("[Auth] Marcando authReady como true.");
             setAuthReady(true);
             // Se não há usuário após a verificação inicial, mostra login
             if (!user) {
                  console.log("[Auth] Nenhum usuário após verificação inicial, mostrando tela de login.");
                 showLoginScreen();
             }
             // Se houver usuário, o fluxo normal continua (usuário tentará fazer login manualmente)
        }
    });
}

/**
 * Lida com a tentativa de login do usuário via API.
 */
async function handleLogin() {
    console.log("[Auth] handleLogin chamado!");
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('btn-login');

    if (!usernameInput || !passwordInput || !loginMessageEl || !loginButton) {
        console.error("[Auth] Elementos de login essenciais não encontrados.");
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Limpa mensagens anteriores e desabilita botão
    loginMessageEl.textContent = 'A verificar...';
    loginMessageEl.className = 'mt-4 text-sm font-medium text-gray-500';
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>A entrar...'; // Feedback visual

    if (!username || !password) {
        loginMessageEl.textContent = 'Por favor, preencha usuário e senha.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
        return;
    }

     console.log(`[Auth] Tentando login com: user='${username}', pass='***'`);

    try {
        // Chama a nova rota de login do backend
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || `Erro ${response.status}`);
        }

        // Login bem-sucedido
        console.log("[Auth] Credenciais CORRETAS.");
        loginMessageEl.textContent = 'Autenticado com sucesso. Carregando...';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-green-600';

        // O UID do Firebase não é relevante aqui, usamos os dados do usuário da API
        // Passamos os dados do usuário (nome, cargo) para startApp
        await startApp(result.user.role || result.user.username); // Usa role ou username

    } catch (error) {
        console.error("[Auth] Erro durante handleLogin:", error);
        loginMessageEl.textContent = `Falha no login: ${error.message}`;
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        loginButton.disabled = false; // Reabilita o botão
        loginButton.textContent = 'Entrar';
    }
}

/**
 * Inicia a aplicação principal após o login bem-sucedido.
 * Carrega dados da API e navega para a rota inicial.
 * @param {string} roleOrName - O cargo ou nome do usuário logado.
 * @throws {Error} Se o carregamento de dados falhar.
 */
async function startApp(roleOrName) {
     console.log("[Auth] Iniciando startApp para:", roleOrName);
    updateWelcomeMessage(roleOrName); // Atualiza a mensagem de boas-vindas na UI

    try {
        // Etapa Crítica: Carrega os dados da API (produtos, fornecedores, etc.)
         console.log("[Auth] Chamando loadInitialData...");
        await loadInitialData();
         console.log("[Auth] loadInitialData concluído.");

        // Se os dados carregaram com sucesso, mostra a tela principal
         console.log("[Auth] Chamando showAppScreen...");
        showAppScreen();

        // Navega para a rota atual ou para o dashboard como padrão
         console.log("[Auth] Chamando navigate para:", currentRoute || 'dashboard');
        navigate(currentRoute || 'dashboard');
         console.log("[Auth] startApp concluído com sucesso.");

    } catch (error) {
        // loadInitialData já exibe uma mensagem de erro na contentArea
        console.error("[Auth] Falha ao iniciar a aplicação (startApp) devido a erro no carregamento de dados.", error);
        // Garante que a tela de login seja re-exibida ou mantida se loadInitialData falhar
        showLoginScreen();
        // Reabilita o botão de login em caso de falha ao carregar dados
        const loginButton = document.getElementById('btn-login');
        if (loginButton) {
             loginButton.disabled = false;
             loginButton.textContent = 'Entrar';
        }
        // Lança o erro novamente para que handleLogin possa tratá-lo se necessário
        throw error;
    }
}

/**
 * Lida com o logout do usuário.
 */
function handleLogout() {
     console.log("[Auth] handleLogout chamado.");
    setUserId(null); // Limpa o ID do usuário no estado
    setAuthReady(false); // Considera não pronto até nova autenticação
    clearSale(); // Limpa dados da venda atual e outros estados relacionados à sessão
    setCurrentRoute('dashboard'); // Reseta a rota padrão

    showLoginScreen(); // Mostra a tela de login

    // Se estiver usando Firebase Auth real, desloga
    if (auth && auth.currentUser) {
         console.log("[Auth] Deslogando do Firebase...");
        auth.signOut().catch(error => console.error("[Auth] Erro ao deslogar do Firebase:", error));
    }
}

export { initializeAuth, handleLogin, handleLogout };

