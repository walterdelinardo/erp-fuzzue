import { getStoreName } from '../utils.js';
import { allProducts } from '../state.js';
import { 
    handleSearchInput, 
    handleSearchFocus, 
    handleSearchBlur, 
    searchAndAddProduct, 
    renderSaleItems,
    promptClearSale 
} from './pdv.js';

// Função para renderizar a interface principal do PDV (sales.js)
export function renderPedidos() {
    const contentArea = document.getElementById('content-area');
    
    // HTML atualizado com o dropdown de busca e novos campos de desconto
    contentArea.innerHTML = `
        <div class="flex flex-col lg:flex-row h-[80vh] w-full gap-4">
            
            <!-- Coluna 1: Itens da Venda e Busca -->
            <div class="flex flex-col lg:w-3/4 bg-gray-50 p-4 rounded-xl shadow-inner overflow-hidden">
                
                <!-- Campo de Busca com Autocomplete -->
                <div class="relative mb-3">
                    <label for="barcode-input" class="block text-sm font-medium text-gray-700 mb-1">Buscar Produto (SKU, Código de Barras ou Nome)</label>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="barcode-input" placeholder="Digite o nome, SKU ou código..." 
                               class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                    </div>
                    <!-- Dropdown de Resultados da Busca (flutuante) -->
                    <div id="search-results" class="search-results-list hidden absolute z-50 w-full bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-60 overflow-y-auto">
                        <!-- Os resultados da busca serão injetados aqui pelo pdv.js -->
                    </div>
                </div>
                
                <!-- Lista de Itens da Venda -->
                <div id="sale-items-list" class="flex-1 overflow-y-auto space-y-2 pr-2">
                    <!-- Itens da venda serão renderizados aqui pelo pdv.js -->
                    <p class="text-gray-500 text-center mt-4">Nenhum item na venda.</p>
                </div>
            </div>

            <!-- Coluna 2: Totais e Ações -->
            <div class="flex flex-col lg:w-1/4 bg-gray-900 p-6 rounded-xl shadow-2xl text-white">
                <h3 class="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Total da Venda</h3>
                
                <div class="flex justify-between items-center mb-2">
                    <span class="text-lg text-gray-400">Subtotal:</span>
                    <span id="sale-subtotal" class="text-lg font-medium text-gray-300">R$ 0,00</span>
                </div>

                <!-- Campo de Desconto Geral -->
                <div class="flex justify-between items-center mb-4">
                    <label for="general-discount" class="text-lg text-gray-400">Desconto (R$):</label>
                    <input type="number" id="general-discount" 
                           class="w-24 p-1 rounded bg-gray-700 text-white text-right font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500" 
                           value="0.00" 
                           placeholder="0,00">
                </div>

                <div class="border-t border-gray-700 pt-4">
                    <span class="text-sm text-gray-400 block text-right">Valor Total</span>
                    <p id="sale-total" class="text-4xl font-extrabold text-right text-orange-500 mb-6">R$ 0,00</p>
                </div>
                
                <button id="btn-open-payment" class="w-full main-button py-4 rounded-xl font-semibold shadow-lg text-lg flex items-center justify-center space-x-2">
                    <i class="fas fa-dollar-sign"></i>
                    <span>FINALIZAR (F1)</span>
                </button>
                <button id="btn-cancel-sale" class="w-full bg-red-600 hover:bg-red-700 text-white py-3 mt-3 rounded-xl font-semibold shadow-lg">
                    Cancelar Venda (F4)
                </button>
                
                <div class="mt-auto text-xs text-gray-500">
                    <p class="font-semibold">Atalhos:</p>
                    <p>F1: Finalizar Venda</p>
                    <p>F4: Cancelar Venda</p>
                    <p>ESC: Limpar Busca</p>
                </div>
            </div>
        </div>
    `;

    // Renderiza os itens iniciais (vazio)
    renderSaleItems();

    // Adiciona os listeners de eventos (agora gerenciados pelo pdv.js)
    const searchInput = document.getElementById('barcode-input');
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    // Adicionamos um listener global para fechar o dropdown se clicar fora
    document.addEventListener('click', handleSearchBlur);
    
    // Listener para o campo de desconto geral
    document.getElementById('general-discount').addEventListener('change', (e) => {
        // Importa a função de desconto geral do pdv.js
        import('./pdv.js').then(pdv => pdv.updateGeneralDiscount(e.target.value));
    });

    // Listeners dos botões
    document.getElementById('btn-open-payment').onclick = () => {
        import('./pdv.js').then(pdv => pdv.openPaymentModal());
    };
    document.getElementById('btn-cancel-sale').onclick = promptClearSale;

    // Atalhos de teclado
    document.addEventListener('keydown', handlePDVShortcuts);
}

// Handler de Atalhos do Teclado
function handlePDVShortcuts(e) {
    if (e.key === 'F1') {
        e.preventDefault();
        import('./pdv.js').then(pdv => pdv.openPaymentModal());
    }
    if (e.key === 'F4') {
        e.preventDefault();
        promptClearSale();
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        const searchInput = document.getElementById('barcode-input');
        if (searchInput) {
            searchInput.value = '';
            handleSearchInput({ target: searchInput }); // Simula um evento de input para limpar
        }
    }
}

