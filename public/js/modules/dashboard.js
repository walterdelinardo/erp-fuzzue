/**
 * public/js/modules/dashboard.js
 * * Módulo de renderização do Dashboard.
 */
import { contentArea } from '../ui.js';
import { allProducts, mockStores } from '../state.js';

/**
 * Verifica quantos produtos estão abaixo do estoque mínimo.
 * @returns {number} A contagem de produtos com estoque baixo.
 */
function checkLowStock() {
    if (!allProducts || allProducts.length === 0) {
        return 0;
    }
    return allProducts.filter(p => (p.stock || 0) < (p.min_stock || 0)).length;
}

/**
 * Renderiza o conteúdo da tela de Dashboard.
 */
function renderDashboard() {
    const lowStockCount = checkLowStock();
    const alertClass = lowStockCount > 0 ? 'border-red-500 alert-critical' : 'border-green-500';
    const alertIconColor = lowStockCount > 0 ? 'text-red-500' : 'text-green-500';

    contentArea.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-gray-900">Visão Geral</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Card 1: Total de Lojas (Mock) -->
            <div class="bg-gray-50 p-5 rounded-xl shadow-md border-t-4 border-orange-600">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold text-gray-700">Total de Lojas</span>
                    <i class="fas fa-store text-2xl text-orange-600"></i>
                </div>
                <p id="stat-stores" class="text-4xl font-extrabold text-gray-900 mt-2">${mockStores.length}</p>
                <p class="text-sm text-gray-500 mt-1">Lojas ativas no sistema</p>
            </div>

            <!-- Card 2: Faturamento (Mock) -->
            <div class="bg-gray-50 p-5 rounded-xl shadow-md border-t-4 border-gray-900">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold text-gray-700">Faturamento (Mês)</span>
                    <i class="fas fa-dollar-sign text-2xl text-gray-900"></i>
                </div>
                <p id="stat-faturamento" class="text-4xl font-extrabold text-gray-900 mt-2">R$ 45.000</p>
                <p class="text-sm text-gray-500 mt-1">Meta alcançada: 75%</p>
            </div>

            <!-- Card 3: Clientes Ativos (Mock) -->
            <div class="bg-gray-50 p-5 rounded-xl shadow-md border-t-4 border-orange-600">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold text-gray-700">Clientes Ativos</span>
                    <i class="fas fa-users text-2xl text-orange-600"></i>
                </div>
                <p id="stat-clientes" class="text-4xl font-extrabold text-gray-900 mt-2">128</p>
                <p class="text-sm text-gray-500 mt-1">3 novos clientes esta semana</p>
            </div>
            
            <!-- Card 4: Alerta de Estoque (Dados Reais) -->
            <div class="bg-gray-50 p-5 rounded-xl shadow-md border-t-4 ${alertClass}">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold text-gray-700">Itens em Alerta</span>
                    <i class="fas fa-exclamation-triangle text-2xl ${alertIconColor}"></i>
                </div>
                <p id="stat-alerta" class="text-4xl font-extrabold text-gray-900 mt-2">${lowStockCount}</p>
                <p class="text-sm text-gray-500 mt-1">${lowStockCount > 0 ? 'Atenção! Necessário reabastecer.' : 'Nenhum alerta pendente.'}</p>
            </div>
        </div>

        <!-- Seção Gráfico (Mock) -->
        <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 class="text-xl font-bold mb-4 text-gray-800">Faturamento e Pedidos por Mês (Mock)</h3>
            <div class="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                [Gráfico de Vendas por Mês aqui]
            </div>
        </div>

        <!-- Detalhe do Alerta (Dados Reais) -->
        <div class="mt-8">
            <h3 class="text-xl font-bold mb-4 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}">Alerta de Estoque Baixo</h3>
            ${lowStockCount > 0 ? `
                <div class="bg-red-50 border border-red-200 p-4 mt-4 rounded-xl max-h-48 overflow-y-auto">
                    ${allProducts.filter(p => (p.stock || 0) < (p.min_stock || 0)).map(p => `
                        <p class="text-red-700 text-sm">
                            <i class="fas fa-exclamation-circle mr-2"></i> 
                            <strong>${p.name} (SKU: ${p.sku})</strong> - Estoque: ${p.stock} / Mínimo: ${p.min_stock}
                        </p>
                    `).join('')}
                </div>
            ` : '<p class="text-green-600 mt-4 text-sm">Nenhum produto em nível de estoque crítico.</p>'}
        </div>
    `;
}

export { renderDashboard };
