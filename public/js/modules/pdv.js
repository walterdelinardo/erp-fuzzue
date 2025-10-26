// --- Módulo: Lógica do Ponto de Venda (PDV) ---

import { 
    allProducts, 
    currentSale, 
    currentPayments, 
    currentSaleTotal, 
    currentSaleGeneralDiscount, 
    setGeneralDiscount, 
    clearSale as clearSaleState 
} from '../state.js';

import { showCustomModal, showPasswordPrompt } from '../utils.js';

// Senha master para descontos (em um app real, viria do backend)
const ADMIN_PASSWORD = 'admin'; 

// --- 1. Lógica de Busca (Autocomplete) ---

/**
 * Filtra produtos e exibe o dropdown de busca.
 * Chamado pelo 'oninput' do campo de busca.
 * @param {Event} event - O evento de input.
 */
export function handleSearchInput(event) {
    const query = event.target.value.toLowerCase();
    const resultsList = document.getElementById('search-results-list');
    
    if (query.length < 2) {
        resultsList.classList.add('hidden');
        resultsList.innerHTML = '';
        return;
    }

    const filteredProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query))
    ).slice(0, 10); // Limita a 10 resultados

    if (filteredProducts.length === 0) {
        resultsList.classList.add('hidden');
        resultsList.innerHTML = '';
        return;
    }

    // CORREÇÃO: Trocado 'class_name' por 'class'
    resultsList.innerHTML = filteredProducts.map(p => `
        <li class="search-result-item" data-id="${p.id}">
            <span class="font-semibold">${p.name}</span>
            <span class="text-sm text-gray-600"> (SKU: ${p.sku} | Estoque: ${p.stock})</span>
        </li>
    `).join('');
    
    resultsList.classList.remove('hidden');

    // Adiciona listeners de clique aos novos itens
    document.querySelectorAll('.search-result-item').forEach(item => {
        // Esta é a linha que estava com o erro 'a_>' na sua imagem. 
        // A versão que você colou estava correta, e esta também está.
        item.onclick = () => {
            addItemFromSearch(item.dataset.id);
        };
    });
}

/**
 * Adiciona um item à venda a partir do clique no dropdown de busca.
 * @param {string} productId - O ID/SKU do produto a ser adicionado.
 */
export function addItemFromSearch(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        addItemToSale(product);
    }
    
    // Limpa e esconde a busca
    document.getElementById('barcode-input').value = '';
    hideSearchDropdown();
    document.getElementById('barcode-input').focus();
}

/**
 * Esconde o dropdown de busca (chamado pelo 'onblur' do input).
 */
export function hideSearchDropdown() {
    // Adicionamos um pequeno delay para permitir que o clique no item seja registrado
    setTimeout(() => {
        const resultsList = document.getElementById('search-results-list');
        if (resultsList) { // Verifica se o elemento ainda existe
            resultsList.classList.add('hidden');
            resultsList.innerHTML = '';
        }
    }, 200); // 200ms de delay
}


// --- 2. Lógica Principal da Venda ---

/**
 * Adiciona/Incrementa um item na venda atual.
 * @param {object} product - O objeto do produto (vindo de allProducts).
 */
function addItemToSale(product) {
    const existingItemIndex = currentSale.findIndex(item => item.product_id === product.id);

    if (existingItemIndex > -1) {
        // Incrementa a quantidade
        currentSale[existingItemIndex].quantity++;
    } else {
        // Adiciona novo item à venda
        currentSale.push({
            product_id: product.id,
            name: product.name,
            price: parseFloat(product.price || 0),
            margin: parseFloat(product.margin || 0),
            stock: parseInt(product.stock || 0), // Armazena o estoque original
            quantity: 1,
            discount: 0.00 // NOVO: Desconto por item
        });
    }
    renderSaleItems();
}

/**
 * Atualiza a quantidade de um item na venda.
 * Chamado pelo 'onchange' do input de quantidade.
 * @param {number} index - O índice do item no array currentSale.
 * @param {string} newQuantity - O novo valor (string) do input.
 */
export function updateItemQuantity(index, newQuantity) {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 1) {
        currentSale[index].quantity = 1; // Reseta para 1 se for inválido
    } else {
        currentSale[index].quantity = quantity;
    }
    renderSaleItems();
}

/**
 * Remove um item da venda.
 * Chamado pelo 'onclick' do botão de remover.
 * @param {number} index - O índice do item a ser removido.
 */
export function removeItemFromSale(index) {
    currentSale.splice(index, 1);
    renderSaleItems();
}

/**
 * Limpa a venda atual (cancela).
 */
export function cancelSale() {
    showCustomModal("Cancelar Venda", "Tem certeza que deseja limpar todos os itens da venda atual?", () => {
        clearSaleState();
        renderSaleItems();
        // Limpa também o modal de pagamento se estiver aberto
        currentPayments = []; 
        updatePaymentModal();
    });
}


// --- 3. Lógica de Desconto (com Senha) ---

/**
 * Tenta atualizar o desconto de um item.
 * Pede a senha de admin antes de aplicar.
 * @param {number} index - O índice do item no array currentSale.
 * @param {string} newDiscount - O novo valor (string) do input de desconto.
 */
export function updateItemDiscount(index, newDiscount) {
    const amount = parseFloat(newDiscount) || 0;

    showPasswordPrompt("Insira a senha de administrador para aplicar o desconto no item:", (password) => {
        if (password === ADMIN_PASSWORD) {
            currentSale[index].discount = amount;
            renderSaleItems();
        } else {
            showCustomModal("Erro", "Senha incorreta. O desconto não foi aplicado.");
            // Reseta o input para o valor antigo (que está em currentSale[index].discount)
            renderSaleItems();
        }
    });
}

/**
 * Tenta atualizar o desconto geral da venda.
 * Pede a senha de admin antes de aplicar.
 * @param {string} newDiscount - O novo valor (string) do input de desconto geral.
 */
export function updateGeneralDiscount(newDiscount) {
    const amount = parseFloat(newDiscount) || 0;

    showPasswordPrompt("Insira a senha de administrador para aplicar o desconto geral:", (password) => {
        if (password === ADMIN_PASSWORD) {
            setGeneralDiscount(amount); // Salva no estado global
            renderSaleItems();
        } else {
            showCustomModal("Erro", "Senha incorreta. O desconto não foi aplicado.");
            // Reseta o input para o valor antigo (que está em currentSaleGeneralDiscount)
            renderSaleItems(); 
        }
    });
}


// --- 4. Renderização e Cálculos ---

/**
 * Renderiza a lista de itens da venda e atualiza os totais.
 * Esta é a função central que recalcula tudo.
 */
export function renderSaleItems() {
    const listContainer = document.getElementById('sale-items-list');
    const subTotalEl = document.getElementById('sale-subtotal');
    const itemDiscountTotalEl = document.getElementById('sale-item-discounts');
    const generalDiscountInput = document.getElementById('sale-general-discount'); // O input
    const grandTotalEl = document.getElementById('sale-grand-total');
    const totalHeaderEl = document.getElementById('sale-total-header');

    if (!listContainer) return; // Sai se a UI do PDV não estiver carregada

    let subTotal = 0.00; // Total bruto (Preço * Qtd)
    let totalItemDiscounts = 0.00; // Soma dos descontos dos itens

    if (currentSale.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-center col-span-5 py-4">Nenhum item adicionado à venda.</p>';
    } else {
        listContainer.innerHTML = currentSale.map((item, index) => {
            const itemTotal = item.price * item.quantity; // Total do item (antes do desconto do item)
            const finalItemTotal = itemTotal - item.discount; // Total do item (após desconto do item)
            const stockAfterSale = item.stock - item.quantity; // ATUALIZADO: Cálculo de estoque parcial
            
            subTotal += itemTotal;
            totalItemDiscounts += item.discount;

            // CORREÇÃO: Trocado 'class_name' por 'class'
            return `
                <div class="grid grid-cols-6 gap-2 items-center py-2 border-b border-gray-200">
                    <!-- Col 1: Nome e Estoque -->
                    <div class="col-span-2">
                        <p class="font-semibold text-gray-900">${item.name}</p>
                        <!-- ATUALIZADO: Exibição de Estoque Parcial -->
                        <p class="text-xs text-blue-600">
                            Estoque: ${item.stock} / (Restante: ${stockAfterSale})
                            ${stockAfterSale < 0 ? '<span class="font-bold text-red-500"> (Negativo!)</span>' : ''}
                        </p>
                    </div>
                    
                    <!-- Col 2: Preço Unitário -->
                    <div class="text-sm text-gray-700">R$ ${item.price.toFixed(2)}</div>
                    
                    <!-- Col 3: Quantidade -->
                    <input 
                        type="number" 
                        value="${item.quantity}" 
                        onchange="pdv.updateItemQuantity(${index}, this.value)"
                        class="w-16 p-2 border border-gray-300 rounded-lg text-center">
                    
                    <!-- Col 4: Desconto do Item (R$) -->
                    <div class="relative">
                        <span class="absolute left-2 top-2.5 text-gray-500">R$</span>
                        <input 
                            type="number" 
                            value="${item.discount.toFixed(2)}" 
                            onchange="pdv.updateItemDiscount(${index}, this.value)"
                            class="w-full p-2 pl-8 border border-gray-300 rounded-lg text-center">
                    </div>

                    <!-- Col 5: Total do Item e Remover -->
                    <div class="text-right">
                        <p class="font-bold text-gray-900 text-lg">R$ ${finalItemTotal.toFixed(2)}</p>
                        <button onclick="pdv.removeItemFromSale(${index})" class="text-red-500 hover:text-red-700 text-xs">
                            Remover
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Cálculo Final ---
    const generalDiscount = currentSaleGeneralDiscount; // Pega do estado global
    const grandTotal = subTotal - totalItemDiscounts - generalDiscount;
    
    // Atualiza os totais na UI
    subTotalEl.textContent = `R$ ${subTotal.toFixed(2)}`;
    itemDiscountTotalEl.textContent = `R$ ${totalItemDiscounts.toFixed(2)}`;
    generalDiscountInput.value = generalDiscount.toFixed(2); // Atualiza o valor do input
    grandTotalEl.textContent = `R$ ${grandTotal.toFixed(2)}`;
    totalHeaderEl.textContent = `R$ ${grandTotal.toFixed(2)}`; // Atualiza o total no topo

    // Salva o total final (para o modal de pagamento)
    currentSaleTotal = grandTotal;
}


// --- 5. Lógica de Pagamento e Finalização ---

/**
 * Abre o modal de pagamento.
 */
export function openPaymentModal() {
    if (currentSale.length === 0) {
        showCustomModal("Venda Vazia", "Adicione pelo menos um produto antes de finalizar a venda.");
        return;
    }
    
    // Reseta o modal de pagamento
    currentPayments = [];
    updatePaymentModal();
    
    // Atualiza o total a pagar no modal
    document.getElementById('payment-modal-total').textContent = `R$ ${currentSaleTotal.toFixed(2)}`;
    document.getElementById('payment-modal').classList.remove('hidden');
    document.getElementById('payment-modal').classList.add('flex');
    document.getElementById('payment-value').focus();
}

/**
 * Atualiza a UI do modal de pagamento (lista de pagamentos, troco, etc.)
 */
export function updatePaymentModal() {
    const paymentsList = document.getElementById('payment-methods-list');
    const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
    const totalAPagar = currentSaleTotal;
    const troco = totalPago - totalAPagar;

    // Atualiza lista de pagamentos
    if (currentPayments.length === 0) {
        paymentsList.innerHTML = '<p class="text-sm text-gray-500 p-2">Nenhuma forma de pagamento adicionada.</p>';
    } else {
        paymentsList.innerHTML = currentPayments.map((p, index) => `
            <div class="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                <span class="text-sm font-medium">${p.type} ${p.installments > 1 ? `(${p.installments}x)` : ''}</span>
                <span class="text-sm font-semibold">R$ ${p.value.toFixed(2)}</span>
                <button onclick="pdv.removePayment(${index})" class="text-red-500 hover:text-red-700 text-xs">&times; Remover</button>
            </div>
        `).join('');
    }

    // Atualiza troco
    const changeEl = document.getElementById('payment-modal-change');
    if (troco > 0) {
        changeEl.textContent = `Troco: R$ ${troco.toFixed(2)}`;
        changeEl.className = 'text-lg font-semibold text-green-600';
    } else if (troco < 0) {
        changeEl.textContent = `Faltam: R$ ${Math.abs(troco).toFixed(2)}`;
        changeEl.className = 'text-lg font-semibold text-red-600';
    } else {
        changeEl.textContent = 'Troco: R$ 0,00';
        changeEl.className = 'text-lg font-semibold text-gray-700';
    }

    // Habilita/Desabilita botão de finalizar
    document.getElementById('btn-finalize-sale').disabled = (troco < 0);
}

/**
 * Adiciona um pagamento ao modal.
 */
export function addPayment() {
    const type = document.getElementById('payment-type').value;
    const valueInput = document.getElementById('payment-value');
    const installments = parseInt(document.getElementById('payment-installments').value);
    
    let value = parseFloat(valueInput.value) || 0;
    
    if (value <= 0) {
        // Se o valor for 0, tenta preencher o valor restante
        const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
        const restante = currentSaleTotal - totalPago;
        if (restante > 0) {
            value = restante;
        } else {
            showCustomModal("Atenção", "O valor do pagamento deve ser maior que zero.");
            return;
        }
    }

    currentPayments.push({
        type: type,
        value: value,
        installments: (type === 'Parcelado' || type === 'Credito') ? installments : 1
    });

    valueInput.value = ''; // Limpa o input
    updatePaymentModal();
}

/**
 * Remove um pagamento do modal.
 * @param {number} index - O índice do pagamento a ser removido.
 */
export function removePayment(index) {
    currentPayments.splice(index, 1);
    updatePaymentModal();
}

/**
 * Finaliza a venda, enviando os dados para o backend.
 */
export async function finalizeSale() {
    const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
    const troco = totalPago - currentSaleTotal;

    if (troco < 0) {
        showCustomModal("Pagamento Incompleto", "O valor pago é menor que o total da venda. Adicione mais pagamentos.");
        return;
    }

    // Prepara os dados para enviar ao backend
    const saleData = {
        sale: {
            items: currentSale,
            total: currentSaleTotal,
            general_discount: currentSaleGeneralDiscount // ATUALIZADO: Envia desconto geral
        },
        payments: currentPayments,
        userId: 'admin' // Em um app real, pegaria o ID do usuário logado
    };

    try {
        const response = await fetch('/api/sales/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Erro desconhecido no servidor.');
        }

        // Sucesso
        document.getElementById('payment-modal').classList.add('hidden');
        
        showCustomModal("Venda Finalizada", 
            `Venda concluída com sucesso! Total: R$ ${currentSaleTotal.toFixed(2)}. Troco: R$ ${Math.max(0, troco).toFixed(2)}.`,
            async () => {
                clearSaleState();
                renderSaleItems();
                
                // Recarrega os dados dos produtos (para atualizar o estoque)
                // (Em um app maior, isso seria feito de forma mais otimizada)
                const { loadInitialData } = await import('../api.js');
                await loadInitialData(); 
            }
        );

    } catch (error) {
        console.error("Erro ao finalizar venda:", error);
        showCustomModal("Falha na Venda", `Não foi possível finalizar a venda: ${error.message}`);
    }
}

