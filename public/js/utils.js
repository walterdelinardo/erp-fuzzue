/**
 * public/js/utils.js
 * * Funções utilitárias usadas em várias partes do frontend.
 */

/**
 * Mostra um modal de alerta customizado.
 * @param {string} title - O título do modal.
 * @param {string} body - A mensagem do modal.
 * @param {function} [onConfirm] - Função a ser executada ao clicar em OK.
 */
function showCustomModal(title, body, onConfirm) {
    const modalTitleEl = document.getElementById('modal-title');
    const modalBodyEl = document.getElementById('modal-body');
    const modal = document.getElementById('custom-modal');
    const confirmBtn = document.getElementById('modal-confirm');

    if (!modal || !modalTitleEl || !modalBodyEl || !confirmBtn) {
        console.error("Elementos do modal não encontrados no DOM.");
        // Fallback para alert se o modal falhar
        alert(`${title}\n\n${body}`);
        if (onConfirm) onConfirm();
        return;
    }

    modalTitleEl.textContent = title;
    modalBodyEl.textContent = body;

    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Usa flex para centralizar

    // Clona o botão para remover listeners antigos e evitar acúmulo
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Adiciona o novo listener
    newConfirmBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (onConfirm) {
            try {
                onConfirm();
            } catch (error) {
                console.error("Erro ao executar callback onConfirm do modal:", error);
            }
        }
    };
}

/**
 * Remove caracteres não numéricos de uma string (útil para CNPJ, CPF, CEP).
 * @param {string} doc_number - A string a ser limpa.
 * @returns {string} A string contendo apenas números.
 */
function cleanDocumentNumber(doc_number) {
    if (typeof doc_number === 'string') {
        return doc_number.replace(/[^0-9]/g, '');
    }
    return '';
}

/**
 * Formata um ID de usuário para exibição (mostra apenas o início).
 * @param {string} userId - O ID completo do usuário.
 * @returns {string} O ID formatado ou 'Anônimo'.
 */
function formatUserId(userId) {
    return userId ? `${userId.substring(0, 8)}...` : 'Anônimo';
}

/**
 * Formata um valor numérico como moeda brasileira (R$).
 * @param {number} value - O valor numérico.
 * @returns {string} O valor formatado como R$ 0,00.
 */
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return "R$ 0,00";
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


export { showCustomModal, cleanDocumentNumber, formatUserId, formatCurrency };
