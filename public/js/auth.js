/**
 * public/js/auth.js
 * * Gerencia a autenticação (Firebase ou Mock) e o fluxo inicial da aplicação.
 */
import { auth, initialAuthToken } from './config.js'; // Config Firebase
// ATENÇÃO: Corrigido - Importa TUDO de state.js
import * as state from './state.js';
import { loadInitialData } from './api.js'; // Carregar dados da API
import { showLoginScreen, showAppScreen, updateWelcomeMessage, loginMessageEl } from './ui.js'; // Controles da UI
import { navigate } from './router.js'; // Função de navegação

/**
 * Tenta autenticar o usuário via Firebase (Token customizado ou Anônimo).
 * Atualiza o estado de autenticação e adiciona listener ao botão de login.
 */
async function initializeAuth() {
    console.log("[Auth] Iniciando initializeAuth..."); // Log 1
    const loginButton = document.getElementById('btn-login');
    const passwordInput = document.getElementById('login-password');

    // **NOVO:** Adiciona listener para o botão de LOGIN AQUI
    if (loginButton) {
        console.log("[Auth] Botão #btn-login encontrado."); // Log 2
        // Remove listener antigo para garantir que não haja duplicados
        const newLoginButton = loginButton.cloneNode(true); // Clona o botão
        loginButton.parentNode.replaceChild(newLoginButton, loginButton); // Substitui o antigo pelo clone
        
        // Adiciona o listener AO CLONE
        newLoginButton.addEventListener('click', handleLogin);
        console.log("[Auth] Listener de clique ADICIONADO ao #btn-login."); // Log 3
    } else {
        console.error("[Auth] Botão de login (#btn-login) NÃO encontrado durante inicialização!");
    }
    // Adiciona listener para Enter no campo de senha
     if(passwordInput) {
        console.log("[Auth] Input #login-password encontrado, adicionando listener keydown."); // Log 4
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                console.log("[Auth] Enter pressionado na senha, chamando handleLogin..."); // Log 5
                handleLogin();
            }
        });
    } else {
         console.error("[Auth] Input #login-password NÃO encontrado!");
    }

    // Lógica Firebase (mantida, mas o fluxo principal agora depende do handleLogin manual)
    if (!auth) {
        console.warn("[Auth] Firebase Auth não inicializado. Usando modo offline/mock.");
        state.setAuthReady(true);
        showLoginScreen(); // Mostra a tela de login
        return;
    }

    // Listener principal do Firebase Auth
    // Usamos uma flag para garantir que a lógica inicial rode apenas uma vez
    let initialCheckComplete = false;
    const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log("[Auth] Firebase onAuthStateChanged:", user ? `User UID: ${user.uid}` : 'No user');
        if (user) {
            state.setUserId(user.uid);
        } else {
            state.setUserId(null);
            // Se for a verificação inicial E não houver user, mostra login
            if (!initialCheckComplete) {
                 showLoginScreen();
            } else {
            // Se o user deslogar DEPOIS da app iniciar, chama handleLogout completo
                 if(state.isAuthReady()){ // Evita chamar logout antes da app iniciar
                    handleLogout();
                 }
            }
        }
        // Marca como pronto e só mostra o login se não houver user
        if (!initialCheckComplete) {
            state.setAuthReady(true);
             if (!user) {
                 showLoginScreen();
            }
            initialCheckComplete = true;
            // Se houver user (anônimo/token), esperamos o handleLogin manual
        }
    });

     // Tenta autenticar com token ou anonimamente (como antes)
    try {
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken);
            console.log("[Auth] Firebase: Autenticado via token customizado.");
        } else {
            await auth.signInAnonymously();
            console.log("[Auth] Firebase: Autenticado anonimamente.");
        }
    } catch (error) {
        console.error("[Auth] Firebase: Falha na autenticação inicial. Mostrando tela de login.", error);
        // Garante que o estado está pronto e a tela de login é exibida
        if (!initialCheckComplete) {
             state.setAuthReady(true);
             showLoginScreen();
             initialCheckComplete = true; // Marca como completo mesmo em erro
        }
    }
    console.log("[Auth] initializeAuth concluído."); // Log 6
}


/**
 * Lida com a tentativa de login do usuário (atualmente, mock).
 */
async function handleLogin() {
    console.log("[Auth] handleLogin INICIADO!"); // Log 7
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    if (!usernameInput || !passwordInput || !loginMessageEl) {
        console.error("[Auth] Elementos de login não encontrados em handleLogin.");
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Credenciais de demonstração
    const demoUser = 'admin';
    const demoPass = 'gbl12024';

    // Limpa mensagens anteriores
    loginMessageEl.textContent = '';
    loginMessageEl.className = 'mt-4 text-sm font-medium'; // Reset classes

    if (!username || !password) {
        loginMessageEl.textContent = 'Por favor, preencha usuário e senha.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
        console.log("[Auth] handleLogin: Campos vazios."); // Log 8
        return;
    }

    console.log(`[Auth] Tentando login com: User='${username}', Pass='${password === demoPass ? '***CORRETA***' : '***INCORRETA***'}'`); // Log 9

    if (username === demoUser && password === demoPass) {
        // Simulação de login bem-sucedido
        console.log("[Auth] Credenciais CORRETAS."); // Log 10
        loginMessageEl.textContent = 'Autenticado com sucesso. Carregando...';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-green-600';

        // Desabilita o botão para evitar cliques múltiplos
        const loginButton = document.getElementById('btn-login');
        if (loginButton) loginButton.disabled = true;

        try {
            // Chama a função startApp DESTE MÓDULO (auth.js)
            console.log("[Auth] Chamando startApp..."); // Log 11
            await startApp('Administrador');
            console.log("[Auth] startApp concluído com sucesso."); // Log 12
        } catch (error) {
            // Se startApp falhar (provavelmente ao carregar dados)
            console.error("[Auth] Erro durante startApp:", error); // Log 13
            loginMessageEl.textContent = `Erro ao iniciar: ${error.message}`;
            loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
            if (loginButton) loginButton.disabled = false; // Reabilita o botão
        }
    } else {
        console.log("[Auth] Credenciais INCORRETAS."); // Log 14
        loginMessageEl.textContent = 'Credenciais inválidas.';
        loginMessageEl.className = 'mt-4 text-sm font-medium text-red-600';
    }
    console.log("[Auth] handleLogin FINALIZADO."); // Log 15
}

/**
 * Inicia a aplicação principal após o login bem-sucedido.
 * Carrega dados da API e navega para a rota inicial.
 * @param {string} role - O "cargo" ou nome do usuário logado (ex: 'Administrador').
 * @throws {Error} Se o carregamento de dados falhar.
 */
// **NOVO:** Esta função agora está DEFINIDA aqui em auth.js
async function startApp(role) {
    console.log("[Auth] Iniciando startApp para:", role); // Log 16
    updateWelcomeMessage(role); // Atualiza a mensagem de boas-vindas na UI

    try {
        // Etapa Crítica: Carrega os dados da API (produtos, fornecedores, etc.)
        console.log("[Auth] Chamando loadInitialData..."); // Log 17
        await loadInitialData();
        console.log("[Auth] loadInitialData concluído."); // Log 18

        // Se os dados carregaram com sucesso, mostra a tela principal
        console.log("[Auth] Chamando showAppScreen..."); // Log 19
        showAppScreen();

        // Navega para a rota atual ou para o dashboard como padrão
        const routeToNavigate = state.currentRoute || 'dashboard';
        console.log(`[Auth] Chamando navigate para: ${routeToNavigate}`); // Log 20
        navigate(routeToNavigate); // Usa currentRoute de state.js

    } catch (error) {
        // loadInitialData já exibe uma mensagem de erro na contentArea
        console.error("[Auth] Falha no startApp (provavelmente em loadInitialData):", error); // Log 21
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
    console.log("[Auth] handleLogout chamado.");
    state.setUserId(null); // Limpa o ID do usuário no estado
    state.setAuthReady(false); // Considera não pronto até nova autenticação
    // Limpa dados sensíveis do estado
    state.setProducts([]);
    state.setSuppliers([]);
    // Limpa estado da venda atual (importa a função de state.js)
    state.clearSale();
    state.setCurrentRoute('dashboard'); // Reseta a rota padrão

    showLoginScreen(); // Mostra a tela de login

    // Se estiver usando Firebase Auth real, desloga
    if (auth) {
        auth.signOut().catch(error => console.error("Erro ao deslogar do Firebase:", error));
    }
}

// Exporta apenas o que main.js precisa
export { initializeAuth, handleLogin, handleLogout };

