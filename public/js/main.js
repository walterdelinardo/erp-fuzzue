    /**
     * public/js/main.js
     * * Ponto de entrada principal da aplicação frontend.
     * Responsável pela inicialização, autenticação e configuração dos listeners globais.
     */
    
    // Importações Essenciais
    import { db, auth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from './config.js'; // Configurações e Firebase
    import { loadInitialData } from './api.js'; // Carregamento de dados
    import { handleLogin, handleLogout, setCurrentUserId, getCurrentUserId } from './auth.js'; // Lógica de Autenticação
    import { setupUIListeners, showLoginScreen, showAppContainer, updateWelcomeMessage, showLoadingMessage, showErrorMessage } from './ui.js'; // Lógica da UI
    import { navigate } from './router.js'; // Navegação
    import { currentRoute } from './state.js'; // Estado global (para saber a rota inicial)
    
    // --- Inicialização da Aplicação ---
    
    window.onload = () => {
        console.log("App Fuzzue: Iniciando...");
        
        // Configura os listeners da UI (botões de login/logout, menu, etc.)
        setupUIListeners(handleLogin, handleLogout, navigate);
    
        // Tenta autenticar no Firebase (Anônimo ou com Token)
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            signInWithCustomToken(auth, __initial_auth_token)
                .catch(error => {
                    console.error("Firebase: Erro no token customizado. Entrando como anônimo.", error);
                    signInAnonymously(auth);
                });
        } else {
            signInAnonymously(auth).catch(error => {
                console.error("Firebase: Erro ao autenticar anonimamente.", error);
                // Mesmo com erro, tentamos continuar, a tela de login será exibida.
            });
        }
        
        // Listener PRINCIPAL do estado de autenticação Firebase
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUserId(user.uid);
                console.log(`Firebase: Sessão pronta. UID: ${getCurrentUserId()}`);
                
                // --- Lógica de Login da Aplicação ---
                // Neste ponto, temos uma sessão Firebase, mas precisamos do login manual
                // A função startApp() é chamada pelo handleLogin() APÓS a senha correta.
                // Aqui, apenas garantimos que a tela correta (login ou app) seja mostrada
                // Se o usuário já fez login antes (simulado), poderíamos tentar iniciar direto,
                // mas mantemos o login manual por enquanto.
                // showLoginScreen(); // Mostra a tela de login por padrão
    
            } else {
                setCurrentUserId(null);
                console.log("Firebase: Usuário deslogado.");
                showLoginScreen(); // Mostra a tela de login
            }
        });
    };
    
    /**
     * Inicia a aplicação DEPOIS que o login manual foi bem-sucedido.
     * Esta função é chamada DENTRO do handleLogin() em auth.js.
     * @param {string} role - O "cargo" do usuário (ex: 'Administrador')
     */
    export async function startApp(role) {
        console.log(`App Fuzzue: Iniciando aplicação para ${role}...`);
        showLoadingMessage("Carregando dados iniciais..."); // Mostra loader na área de conteúdo
        showAppContainer(); // Mostra o container principal do app (sidebar + main)
        updateWelcomeMessage(role); // Atualiza a mensagem de boas-vindas
    
        try {
            await loadInitialData(); // Carrega produtos e fornecedores da API
            console.log("App Fuzzue: Dados iniciais carregados.");
            
            // Navega para a rota inicial (geralmente 'dashboard')
            navigate(currentRoute); 
    
        } catch (error) {
            console.error("App Fuzzue: Erro crítico ao iniciar aplicação.", error);
            showErrorMessage("Erro Crítico ao Carregar Dados", error.message);
        }
    }
    

