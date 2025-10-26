/**
 * public/js/modules/pdv.js
 * * Contém toda a LÓGICA de negócio do Ponto de Venda (PDV).
 * * É importado por 'sales.js' (render) e 'router.js'.
 */
import { 
    allProducts, 
    currentSale, 
    currentPayments, 
    currentSaleTotal,
    currentUserId,
    setCurrentSale, 
    setCurrentPayments, 
    setCurrentSaleTotal
} from '../state.js';
import { showCustomModal } from '../utils.js';
import { loadInitialData } from '../api.js';
import { navigate } from '../router.js';

/**
 * Atualiza a UI da lista de itens da venda e o total.
 */
function renderSaleItems() {
    const listContainer = document.getElementById('sale-items-list');
    const totalDisplay = document.getElementById('sale-total-display');

    if (!listContainer || !totalDisplay) {
        console.warn("Elementos do PDV (lista ou total) não encontrados no DOM.");
        return;
    }

    // Calcula o total
    const total = currentSale.reduce((sum, item) => sum + item.total, 0);
    setCurrentSaleTotal(total); // Atualiza o estado global

    // Atualiza o display de total
    totalDisplay.textContent = `R$ ${total.toFixed(2)}`;

    // Atualiza a lista de itens
    if (currentSale.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-center p-4">Nenhum item adicionado à venda.</p>';
    } else {
        listContainer.innerHTML = currentSale.map((item, index) => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow border border-gray-200">
                <div class="flex-1 mr-2">
                    <p class="font-semibold text-gray-900 truncate">${item.name}</p>
                    <p class="text-sm text-gray-600">R$ ${item.price.toFixed(2)} (Margem: ${item.margin || 0}%)</p>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="number" value="${item.quantity}" min="1" 
                           data-index="${index}"
                           class="w-16 p-1 text-center border border-gray-300 rounded-lg pdv-item-quantity">
                    <p class="font-bold text-gray-900 w-20 text-right">R$ ${item.total.toFixed(2)}</p>
                    <button data-index="${index}" class="text-red-500 hover:text-red-700 p-1 rounded-full pdv-item-remove">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Adiciona listeners de evento DEPOIS de criar o HTML
        addPDVListeners();
    }
}

/**
 * Adiciona listeners para os botões de quantidade e remoção de itens do PDV.
 * Usa delegação de eventos para performance (embora aqui esteja direto).
 */
function addPDVListeners() {
    document.querySelectorAll('.pdv-item-quantity').forEach(input => {
        input.addEventListener('change', (e) => {
            updateItemQuantity(e.target.dataset.index, e.target.value);
        });
    });

    document.querySelectorAll('.pdv-item-remove').forEach(button => {
        button.addEventListener('click', (e) => {
            // Pega o index do elemento pai (botão)
            removeItemFromSale(e.currentTarget.dataset.index);
        });
    });
}


/**
 * Adiciona ou incrementa um item na venda.
 * @param {object} product - O objeto do produto (vindo de allProducts).
 */
function addItemToSale(product) {
    const existingItemIndex = currentSale.findIndex(item => item.product_id === product.id);

    if (existingItemIndex > -1) {
        // Incrementa a quantidade
        currentSale[existingItemIndex].quantity += 1;
        currentSale[existingItemIndex].total = currentSale[existingItemIndex].price * currentSale[existingItemIndex].quantity;
    } else {
        // Adiciona novo item
        const price = parseFloat(product.price || 0);
        const margin = parseFloat(product.margin || 0);
        const finalPrice = price * (1 + margin / 100);

        currentSale.push({
            product_id: product.id,
            name: product.name,
            price: finalPrice, // Usa o preço com margem
            margin: margin,
            quantity: 1,
            total: finalPrice // Total inicial (1 unidade)
        });
    }
    // Atualiza o estado global
    setCurrentSale([...currentSale]); 
    // Renderiza
    renderSaleItems();
}

/**
 * Remove um item da venda.
 * @param {number} index - O índice do item no array currentSale.
 */
function removeItemFromSale(index) {
    currentSale.splice(index, 1);
    setCurrentSale([...currentSale]);
    renderSaleItems();
}

/**
 * Atualiza a quantidade de um item na venda.
 * @param {number} index - O índice do item.
 * @param {string} newQuantity - A nova quantidade (vem do input).
 */
function updateItemQuantity(index, newQuantity) {
    const quantity = parseInt(newQuantity);
    const item = currentSale[index];
    
    if (item) {
         if (quantity > 0) {
            item.quantity = quantity;
            item.total = item.price * quantity;
        } else {
            // Se a quantidade for 0 ou inválida, remove o item
            currentSale.splice(index, 1);
        }
        setCurrentSale([...currentSale]);
        renderSaleItems();
    }
}

/**
 * Busca um produto (SKU ou Nome) no estado global e o adiciona à venda.
 */
function searchAndAddProduct() {
    const input = document.getElementById('barcode-input');
    if (!input) return;
    
    const query = input.value.trim();
    input.value = ''; // Limpa o campo
    input.focus(); // Mantém o foco
    
    if (!query) return;

    const queryLower = query.toLowerCase();
    const product = allProducts.find(p => 
        (p.sku && p.sku.toLowerCase() === queryLower) || 
        (p.barcode && p.barcode === query) || 
        (p.name && p.name.toLowerCase().includes(queryLower))
    );

    if (product) {
        addItemToSale(product);
    } else {
        showCustomModal("Produto Não Encontrado", `Nenhum produto encontrado para o código/nome: ${query}`);
    }
}

/**
 * Cancela a venda atual (limpa o carrinho).
 */
function cancelSale() {
    if (currentSale.length > 0) {
        showCustomModal("Cancelar Venda", "Tem certeza que deseja limpar todos os itens da venda atual?", () => {
            setCurrentSale([]);
            renderSaleItems();
        });
    }
}


// --- LÓGICA DO MODAL DE PAGAMENTO ---

/**
 * Abre o modal de pagamento.
 */
function openPaymentModal() {
    if (currentSale.length === 0) {
        showCustomModal("Venda Vazia", "Adicione pelo menos um produto antes de finalizar a venda.");
        return;
    }
    // Reseta o modal de pagamento
    setCurrentPayments([]);
    
    // Atualiza os displays do modal
    const totalEl = document.getElementById('payment-modal-total');
    if (totalEl) totalEl.textContent = `R$ ${currentSaleTotal.toFixed(2)}`;
    
    // Configura listeners do modal (DEVE ser feito ao abrir)
    setupPaymentModalListeners();

    // Atualiza a lista de pagamentos (vazia)
    updatePaymentModalUI();
    
    // Abre o modal
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

/**
 * Fecha o modal de pagamento.
 */
function closePaymentModal() {
     const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Atualiza a UI do modal de pagamento (lista de pagamentos, troco).
 */
function updatePaymentModalUI() {
    const paymentsList = document.getElementById('payment-methods-list');
    const changeDisplay = document.getElementById('payment-modal-change');
    
    const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
    const troco = totalPago - currentSaleTotal;

    if (!paymentsList || !changeDisplay) return;

    // Renderiza a lista de pagamentos
    if (currentPayments.length === 0) {
        paymentsList.innerHTML = '<p class="text-xs text-gray-500 text-center">Nenhuma forma de pagamento adicionada.</p>';
    } else {
        paymentsList.innerHTML = currentPayments.map((p, index) => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded-md border">
                <div>
                    <span class="font-semibold text-gray-800">${p.type} ${p.installments > 1 ? `(${p.installments}x)` : ''}</span>
                </div>
                <div>
                    <span class="font-semibold text-orange-600">R$ ${p.value.toFixed(2)}</span>
                    <button data-index="${index}" class="text-red-500 hover:text-red-700 p-1 rounded-full ml-2 pdv-payment-remove">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Adiciona listeners para os botões de remover pagamento
        document.querySelectorAll('.pdv-payment-remove').forEach(button => {
            button.onclick = (e) => removePayment(e.currentTarget.dataset.index);
        });
    }
    
    // Atualiza o display de troco/falta
    if (troco > 0.005) { // Margem de 0.005 para arredondamento
        changeDisplay.textContent = `Troco: R$ ${troco.toFixed(2)}`;
        changeDisplay.className = "text-lg font-semibold text-green-600";
    } else if (troco < -0.005) {
        changeDisplay.textContent = `Faltam: R$ ${Math.abs(troco).toFixed(2)}`;
        changeDisplay.className = "text-lg font-semibold text-red-600";
    } else {
        changeDisplay.textContent = 'Total Pago';
        changeDisplay.className = "text-lg font-semibold text-gray-700";
    }
}

/**
 * Adiciona um pagamento à lista.
 */
function addPayment() {
    const type = document.getElementById('payment-type').value;
    const valueInput = document.getElementById('payment-value');
    const installments = parseInt(document.getElementById('payment-installments').value);
    
    let value = parseFloat(valueInput.value);
    
    if (isNaN(value) || value <= 0) {
        // Tenta pegar o valor faltante automaticamente
        const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
        const faltante = currentSaleTotal - totalPago;
        if (faltante > 0.005) {
            value = faltante;
        } else {
            showCustomModal("Valor Inválido", "Por favor, insira um valor de pagamento válido.");
            return;
        }
    }

    currentPayments.push({
        type: type,
        value: value,
        installments: (type === 'Parcelado' || type === 'Credito') ? installments : 1
    });
    setCurrentPayments([...currentPayments]);

    valueInput.value = ''; // Limpa o campo
    updatePaymentModalUI();
}

/**
 * Remove um pagamento da lista.
 * @param {number} index - O índice do pagamento a ser removido.
 */
function removePayment(index) {
    currentPayments.splice(index, 1);
    setCurrentPayments([...currentPayments]);
    updatePaymentModalUI();
}

/**
 * Finaliza a venda, enviando os dados para a API backend.
 */
async function finalizeSale() {
    const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
    // Permite uma pequena margem de arredondamento (ex: 0.001)
    if (totalPago < currentSaleTotal - 0.01) {
        showCustomModal("Pagamento Incompleto", "O valor pago é menor que o total da venda. Verifique os pagamentos.");
        return;
    }

    const saleData = {
        sale: {
            items: currentSale,
            total: currentSaleTotal
        },
        payments: currentPayments,
        userId: currentUserId || 'anonimo'
    };

    const finalizeButton = document.getElementById('btn-finalize-sale');
    finalizeButton.disabled = true;
    finalizeButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processando...';

    try {
        const response = await fetch('/api/sales/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();

        if (!response.ok) {
            // Mostra erro específico do backend (ex: estoque insuficiente)
            throw new Error(result.message || 'Erro desconhecido no servidor.');
        }

        // Sucesso
        closePaymentModal();
        
        const troco = totalPago - currentSaleTotal;
        
        showCustomModal("Venda Finalizada", 
            `Venda concluída com sucesso! Total: R$ ${currentSaleTotal.toFixed(2)}. Troco: R$ ${Math.max(0, troco).toFixed(2)}.`,
            async () => {
                // Reset do estado da venda
                setCurrentSale([]);
                setCurrentPayments([]);
                setCurrentSaleTotal(0.00);
                
                // Recarrega os dados dos produtos (para atualizar o estoque)
                await loadInitialData(); 
                
                // Volta para o PDV (que agora mostrará o estoque atualizado e carrinho vazio)
                navigate('pedidos'); 
            }
        );

    } catch (error) {
        console.error("Erro ao finalizar venda:", error);
        showCustomModal("Falha na Venda", `Não foi possível finalizar a venda: ${error.message}`);
    } finally {
        // Reabilita o botão em caso de falha ou sucesso
        finalizeButton.disabled = false;
        finalizeButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Finalizar';
    }
}

/**
 * Configura os listeners de evento para o modal de pagamento.
 * (Chamado toda vez que o modal é aberto para garantir que os botões funcionem)
 */
function setupPaymentModalListeners() {
    // Clona botões para evitar listeners duplicados
    const addBtn = document.getElementById('btn-add-payment');
    const finalizeBtn = document.getElementById('btn-finalize-sale');
    const cancelBtn = document.getElementById('btn-cancel-payment');
    const nfeBtn = document.getElementById('btn-nfe-option');
    const typeSelect = document.getElementById('payment-type');

    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.onclick = addPayment;

    const newFinalizeBtn = finalizeBtn.cloneNode(true);
    finalizeBtn.parentNode.replaceChild(newFinalizeBtn, finalizeBtn);
    newFinalizeBtn.onclick = finalizeSale;
    newFinalizeBtn.disabled = false; // Garante que não esteja travado
    newFinalizeBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Finalizar';


    cancelBtn.onclick = closePaymentModal;
    nfeBtn.onclick = () => showCustomModal("NF-e", "A emissão de NF-e/Cupom Fiscal será integrada futuramente.");

    typeSelect.onchange = () => {
        const installmentsSelect = document.getElementById('payment-installments');
        if (typeSelect.value === 'Parcelado' || typeSelect.value === 'Credito') {
            installmentsSelect.disabled = false;
        } else {
            installmentsSelect.disabled = true;
            installmentsSelect.value = '1';
        }
    };
}


// Exporta as funções que a UI (sales.js) precisa chamar
export {
    renderSaleItems,
    searchAndAddProduct,
    openPaymentModal,
    cancelSale,
    updateItemQuantity,
    removeItemFromSale
};
