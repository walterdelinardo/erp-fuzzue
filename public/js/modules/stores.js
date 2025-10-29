/**
 * public/js/modules/stores.js
 * * Módulo de renderização da tela de Lojas (mock).
 */
import { contentArea } from '../ui.js';
import { mockStores } from '../state.js';
import { showCustomModal } from '../utils.js';

/**
 * Renderiza o conteúdo da tela de Lojas/Filiais.
 */
async function renderLojas() {
    contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Gestão de Lojas / Filiais</h2>
            <button id="btn-nova-loja" class="main-button flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold shadow-md">
                <i class="fas fa-plus"></i>
                <span>Nova Loja</span>
            </button>
        </div>
        <p class="text-gray-600 mb-6">Controle centralizado de todas as suas unidades de negócio.</p>
        
        <!-- Lista de Lojas (Mock) -->
        <h3 class="text-xl font-bold mt-8 mb-4 text-gray-900">Lojas Cadastradas (${mockStores.length})</h3>
        <div class="space-y-4">
            ${mockStores.map(s => `
                <div class="bg-gray-50 p-4 rounded-xl shadow-md border border-orange-200 flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <p class="font-semibold text-gray-900 text-lg">${s.name}</p>
                        <p class="text-sm text-gray-600">Endereço: ${s.address}</p>
                        <p class="text-sm text-gray-600">Telefone: ${s.phone}</p>
                    </div>
                    <div class="mt-3 md:mt-0 flex space-x-2">
                        <button class="text-orange-600 hover:text-orange-900 p-2 rounded-full transition duration-150" onclick="showCustomModal('Atenção', 'Função de editar (mock) não implementada.')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-500 hover:text-red-700 p-2 rounded-full transition duration-150" onclick="showCustomModal('Confirmação', 'Tem certeza que deseja deletar a loja ${s.name}? (Mock)', null)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('btn-nova-loja').onclick = () => {
        showCustomModal("Em Desenvolvimento", "Funcionalidade de cadastro de nova loja será implementada em breve.");
    };
}

export { renderLojas };
