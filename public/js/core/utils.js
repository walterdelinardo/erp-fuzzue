// --- Utilitários Globais ---

/**
 * Exibe um modal de alerta customizado (substitui alert()).
 * @param {string} title - O título do modal.
 * @param {string} body - A mensagem de corpo do modal.
 * @param {function} [onConfirm] - (Opcional) Função a ser chamada ao clicar em OK.
 */
export function showCustomModal(title, body, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    const confirmBtn = document.getElementById('modal-confirm');
    
    // Remove o listener antigo antes de adicionar um novo para evitar chamadas múltiplas
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    document.getElementById('modal-confirm').onclick = () => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        if (onConfirm) {
            onConfirm();
        }
    };
}

/**
 * Exibe um modal de prompt de senha. (NOVA FUNÇÃO)
 * @param {string} body - A mensagem de corpo do modal.
 * @param {function} onConfirm - Função a ser chamada com a senha digitada (string).
 */
export function showPasswordPrompt(body, onConfirm) {
    const modal = document.getElementById('password-prompt-modal');
    document.getElementById('password-prompt-body').textContent = body;
    const passwordInput = document.getElementById('password-prompt-input');
    passwordInput.value = ''; // Limpa o campo
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    passwordInput.focus(); // Foca no campo de senha

    const confirmBtn = document.getElementById('password-prompt-confirm');
    const cancelBtn = document.getElementById('password-prompt-cancel');
    
    // Usamos replaceWith para garantir que os listeners são únicos
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.onclick = () => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        if (onConfirm) {
            onConfirm(passwordInput.value);
        }
    };
    
    // Listener para o botão Cancelar
    cancelBtn.onclick = () => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    };

    // Listener para a tecla Enter no input
    passwordInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            newConfirmBtn.click();
        }
        if (e.key === 'Escape') {
            cancelBtn.click();
        }
    };
}


/**
 * Limpa caracteres não numéricos (CNPJ/CPF).
 * @param {string} doc_number - O número do documento (ex: "123.456.789-00").
 * @returns {string} - O número limpo (ex: "12345678900").
 */
export function cleanDocumentNumber(doc_number) {
    if (doc_number) {
        return doc_number.replace(/[^0-9]/g, '');
    }
    return '';
}

/**
 * Obtém o nome da loja com base no ID.
 * (Usa o mockStores importado do estado)
 * @param {number} id - O ID da loja.
 * @returns {string} - O nome da loja ou 'Consolidado'.
 */
import { mockStores } from './state.js';
export function getStoreName(id) {
    return mockStores.find(s => s.id === id)?.name || 'Consolidado';
}

