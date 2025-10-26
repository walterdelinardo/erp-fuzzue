/**
 * public/js/auth.js
 * * Gerencia a lógica de login e logout manual da aplicação.
 */
import { startApp } from './main.js'; // Importa a função para iniciar o app DEPOIS do login
import { showLoginScreen, showAppContainer, loginMessage } from './ui.js';

// --- Estado de Autenticação (Simples) ---
let currentUserId = null; // Armazena o UID do Firebase (se houver)

export function setCurrentUserId(userId) {
    currentUserId = userId;
}
export function getCurrentUserId() {
    return currentUserId;
}

// --- Credenciais de Demonstração (Fixas) ---
const demoUser = 'admin';
const demoPass = 'gbl12024'; // Use esta senha

/**
 * Tenta realizar o login manual com as credenciais fornecidas.
 * Se bem-sucedido, chama a função startApp() do main.js.
 */
export async function handleLogin() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    // Limpa mensagens de erro anteriores
    loginMessage.textContent = '';
    loginMessage.className = 'mt-4 text-sm font-medium';

    if (username === demoUser && password === demoPass) {
        // Sucesso
        loginMessage.textContent = 'Autenticado com sucesso. Carregando dados...';
        loginMessage.className = 'mt-4 text-sm font-medium text-green-600';
        
        // Limpa os campos após sucesso
        usernameInput.value = '';
        passwordInput.value = '';

        // Chama a função startApp (exportada do main.js) para carregar dados e iniciar a UI
        await startApp('Administrador'); 
        
    } else {
        // Falha
        loginMessage.textContent = `Credenciais inválidas. Tente ${demoUser} / ${demoPass}`;
        loginMessage.className = 'mt-4 text-sm font-medium text-red-600';
        // Não limpa os campos para o usuário corrigir
    }
}

/**
 * Realiza o logout da aplicação (apenas UI por enquanto).
 */
export function handleLogout() {
    setCurrentUserId(null); // Limpa o ID do usuário (se estiver usando Firebase)
    showLoginScreen(); // Mostra a tela de login
    
    // TODO: Adicionar lógica para limpar estado global (state.js) se necessário
    console.log("Usuário deslogado da aplicação.");
}

