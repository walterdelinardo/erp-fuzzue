/**
 * public/js/modules/sales.js
 * * Módulo de renderização da tela de Pedidos (PDV).
 */
import { contentArea } from '../ui.js';
import { renderSaleItems, openPaymentModal, cancelSale, searchAndAddProduct } from './pdv.js'; // Importa a lógica do PDV

/**
 * Renderiza o conteúdo da tela de Pedidos (PDV).
 */
async function renderPedidos() {
    contentArea.innerHTML = `
        <!-- Layout Flexível para PDV -->
        <div class="flex flex-col lg:flex-row h-[78vh] w-full gap-4">
            
            <!-- Coluna 1: Itens da Venda e Busca (Ocupa 2/3) -->
            <div class="flex flex-col lg:w-2/3 bg-gray-50 p-4 rounded-xl shadow-inner overflow-hidden">
                <!-- Input de Busca -->
                <div class="mb-4">
                    <label for="barcode-input" class="block text-sm font-medium text-gray-700">Buscar Produto (SKU, Código de Barras ou Nome)</label>
                    <div class="relative mt-1">
                        <input type="text" id="barcode-input" placeholder="Leia o código ou digite o nome..." 
                               class="w-full p-4 pl-12 border border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 text-lg">
                        <i class="fas fa-barcode absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-2xl"></i>
                    </div>
                </div>
                
                <!-- Lista de Itens (Scrollável) -->
                <div id="sale-items-list" class="flex-1 space-y-3 overflow-y-auto p-2 bg-white border border-gray-200 rounded-lg">
                    <!-- Itens da venda serão injetados aqui por renderSaleItems() -->
                </div>
            </div>
            
            <!-- Coluna 2: Totais e Ações (Ocupa 1/3) -->
            <div class="flex flex-col lg:w-1/3 bg-gray-900 p-6 rounded-xl shadow-2xl text-white">
                <h3 class="text-2xl font-bold border-b border-gray-700 pb-3 mb-4">Total da Venda</h3>
                
                <div class="mb-6">
                    <span class="text-lg text-gray-400">Valor Total</span>
                    <p id="sale-total-display" class="text-6xl font-extrabold text-orange-500">R$ 0,00</p>
                </div>
                
                <!-- Botão Principal de Pagamento -->
                <button id="btn-open-payment" class="main-button w-full py-5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl mb-4">
                    <i class="fas fa-dollar-sign mr-2"></i> FINALIZAR (F1)
                </button>
                
                <button id="btn-cancel-sale" class="bg-red-600 text-white w-full py-3 rounded-xl font-semibold hover:bg-red-700 mb-6">
                    <i class="fas fa-times mr-2"></i> Cancelar Venda (F4)
                </button>
                
                <div class="mt-auto text-sm text-gray-500">
                    <p>Atalhos:</p>
                    <p>F1: Finalizar Venda</p>
                    <p>F4: Cancelar Venda</p>
                </div>
            </div>
        </div>
    `;
    
    // --- Adiciona Listeners Específicos da Rota ---
    
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
        barcodeInput.focus(); // Foco automático no input de busca
        // Listener para "Enter" no input
        barcodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Evita submit de formulário (se houver)
                searchAndAddProduct(); // Chama a lógica do PDV
            }
        });
    }

    // Botões
    document.getElementById('btn-open-payment').onclick = openPaymentModal;
    document.getElementById('btn-cancel-sale').onclick = cancelSale;
    
    // Atalhos de Teclado (específicos desta rota)
    document.onkeydown = function(e) {
        // Foco automático no input de busca se o usuário começar a digitar
        if (e.key.length === 1 && e.key.match(/[a-z0-9]/i) && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
             if(barcodeInput) barcodeInput.focus();
        }
        
        if (e.key === 'F1') {
            e.preventDefault();
            openPaymentModal();
        }
        if (e.key === 'F4') {
            e.preventDefault();
            cancelSale();
        }
    };

    // Renderiza os itens da venda atual (pode estar vazia ou não)
    renderSaleItems();
}

export { renderPedidos };
