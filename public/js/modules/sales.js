// --- Módulo: Pedidos (PDV) - Interface ---

import { renderSaleItems, openPaymentModal, cancelSale, handleSearchInput, hideSearchDropdown } from './pdv.js';

/**
 * Renderiza a interface principal do Ponto de Venda (PDV).
 * Esta função constrói o HTML da página de Pedidos.
 */
export function renderPedidos() {
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div class="flex flex-col lg:flex-row h-[80vh] w-full gap-4">
            
            <!-- Coluna 1: Itens da Venda e Busca -->
            <div class="flex flex-col lg:w-3/4 bg-gray-50 p-4 rounded-xl shadow-inner overflow-hidden">
                
                <!-- ATUALIZADO: Campo de Busca com Dropdown -->
                <div class="relative mb-3">
                    <label for="barcode-input" class="block text-sm font-medium text-gray-700 mb-1">Buscar Produto (SKU, Código de Barras ou Nome)</label>
                    <div class="flex items-center relative">
                        <i class="fas fa-search absolute left-3 text-gray-400"></i>
                        <input 
                            type="text" 
                            id="barcode-input" 
                            placeholder="Digite 2 ou mais letras para buscar..."
                            class="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 transition duration-150"
                            oninput="pdv.handleSearchInput(event)"
                            onblur="pdv.hideSearchDropdown()"
                            autocomplete="off">
                    </div>
                    <!-- Dropdown de Resultados da Busca -->
                    <ul id="search-results-list" class="search-results-list hidden">
                        <!-- Os resultados da busca (<li>) serão injetados aqui pelo pdv.js -->
                    </ul>
                </div>

                <!-- ATUALIZADO: Cabeçalho da Lista de Itens -->
                <div class="grid grid-cols-6 gap-2 items-center py-2 border-b border-gray-300 px-2 sticky top-0 bg-gray-50">
                    <div class="col-span-2 text-xs font-bold text-gray-600 uppercase">Produto / Estoque</div>
                    <div class="text-xs font-bold text-gray-600 uppercase">Preço Unit.</div>
                    <div class="text-xs font-bold text-gray-600 uppercase text-center">Qtd.</div>
                    <div class="text-xs font-bold text-gray-600 uppercase text-center">Desconto (R$)</div>
                    <div class="text-xs font-bold text-gray-600 uppercase text-right">Total Item</div>
                </div>

                <!-- Lista de Itens da Venda -->
                <div id="sale-items-list" class="flex-1 overflow-y-auto p-2">
                    <!-- Os itens da venda (<div>) serão injetados aqui pelo pdv.js -->
                </div>
            </div>
            
            <!-- Coluna 2: Totais e Ações -->
            <div class="flex flex-col lg:w-1/4 bg-gray-900 p-6 rounded-xl shadow-2xl text-white">
                <h3 class="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Total da Venda</h3>
                
                <div class="flex justify-between items-center text-gray-300 text-sm mb-2">
                    <span>Subtotal (Itens):</span>
                    <span id="sale-subtotal" class="font-medium">R$ 0,00</span>
                </div>
                
                <div class="flex justify-between items-center text-gray-300 text-sm mb-2">
                    <span>Descontos (Itens):</span>
                    <span id="sale-item-discounts" class="font-medium text-red-400">- R$ 0,00</span>
                </div>

                <!-- ATUALIZADO: Campo de Desconto Geral -->
                <div class="flex justify-between items-center text-gray-100 text-sm mb-4">
                    <label for="sale-general-discount" class="font-medium">Desconto Geral (R$):</label>
                    <input 
                        type="number"
                        id="sale-general-discount"
                        value="0.00"
                        onchange="pdv.updateGeneralDiscount(this.value)"
                        class="w-24 p-1 rounded-lg bg-gray-700 text-white text-right font-semibold border border-gray-600 focus:ring-orange-500 focus:border-orange-500"
                    >
                </div>
                
                <div class="border-t border-orange-600 pt-4 mb-4">
                    <div class="flex justify-between items-center text-white">
                        <span class="text-lg font-semibold">Valor Total</span>
                        <span id="sale-grand-total" class="text-4xl font-extrabold text-orange-500">R$ 0,00</span>
                    </div>
                </div>

                <!-- Botões de Ação -->
                <div class="flex-1 flex flex-col justify-end space-y-3">
                    <button id="btn-open-payment" onclick="pdv.openPaymentModal()" class="main-button w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2">
                        <i class="fas fa-dollar-sign"></i>
                        <span>FINALIZAR (F1)</span>
                    </button>
                    <button id="btn-cancel-sale" onclick="pdv.cancelSale()" class="bg-red-600 hover:bg-red-700 text-white w-full py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center space-x-2">
                        <i class="fas fa-times-circle"></i>
                        <span>Cancelar Venda (F4)</span>
                    </button>
                </div>
                
                <div class="text-xs text-gray-500 mt-4">
                    <p>Atalhos:</p>
                    <p>F1: Finalizar Venda</p>
                    <p>F4: Cancelar Venda</p>
                </div>
            </div>
        </div>
    `;
    
    // Renderiza os itens iniciais (vazio)
    renderSaleItems();
}

