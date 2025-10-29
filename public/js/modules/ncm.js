/**
 * public/js/modules/ncm.js
 * * Módulo de renderização da tela de NCM (mock).
 */
import { contentArea } from '../ui.js';
import { mockNcms } from '../state.js';
import { showCustomModal } from '../utils.js';

/**
 * Obtém a descrição de um NCM (usado pelo módulo de Produtos).
 * @param {string} code - O código NCM.
 * @returns {string} A descrição ou 'NCM não encontrado'.
 */
function getNcmDescription(code) {
    if (!code) return '...';
    return mockNcms.find(n => n.code === code)?.desc || 'NCM não encontrado';
}

/**
 * Renderiza o conteúdo da tela de NCM.
 */
async function renderNcm() {
    
    const renderNcmTable = () => {
        return `
            <div class="overflow-x-auto bg-white rounded-xl shadow-md mt-6">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código (NCM)</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rastreabilidade</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${mockNcms.map(n => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">${n.format}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${n.desc}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <span class="px-3 py-1 rounded-full text-xs font-medium ${n.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${n.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${n.rastreabilidade ? 'Sim' : 'Não'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };
    
    contentArea.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Classificação Fiscal (NCM)</h2>
        <p class="text-gray-600 mb-8">Gerencie os códigos NCM para a correta emissão fiscal e apuração de alíquotas.</p>
        
        <div class="flex justify-between items-center">
             <div class="flex space-x-2 border-b border-gray-300">
                <button class="py-2 px-4 text-orange-600 border-b-2 border-orange-600 font-semibold">Tabela NCM</button>
                <button class="py-2 px-4 text-gray-500 hover:text-gray-800">Regras de Tributação (Mock)</button>
            </div>
            <button id="btn-novo-ncm" class="main-button flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold shadow-md">
                <i class="fas fa-plus"></i>
                <span>Novo NCM</span>
            </button>
        </div>
        
        ${renderNcmTable()}
    `;
    
    document.getElementById('btn-novo-ncm').onclick = () => {
        showCustomModal("Em Desenvolvimento", "Funcionalidade de cadastro de NCM será implementada em breve.");
    };
}

export { renderNcm, getNcmDescription };
