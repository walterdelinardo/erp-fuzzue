/**
 * public/js/modules/users.js
 * * Módulo de renderização da tela de Usuários (mock).
 */
import { contentArea } from '../ui.js';
import { mockStores } from '../state.js';
import { showCustomModal } from '../utils.js';

/**
 * Renderiza o conteúdo da tela de Usuários.
 */
async function renderUsuarios() {
    contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Gestão de Usuários</h2>
            <button id="btn-novo-usuario-toggle" class="main-button flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold shadow-md">
                <i class="fas fa-plus"></i>
                <span>Novo Usuário</span>
            </button>
        </div>
        <p class="text-gray-600 mb-6">Cadastre e gerencie os usuários do sistema Fuzzue, com controle de **permissões** (Caixa, Gerente, Administrador).</p>
        
        <!-- Formulário de Novo Usuário (Escondido por padrão) -->
        <div id="form-novo-usuario" class="bg-gray-50 p-6 rounded-xl shadow-inner mb-6 hidden">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Adicionar Novo Usuário</h3>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome</label>
                    <input type="text" placeholder="Nome Completo" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg">
                </div>
                 <div>
                    <label class="block text-sm font-medium text-gray-700">Login (usuário)</label>
                    <input type="text" placeholder="usuario.login" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Permissão</label>
                    <select class="mt-1 block w-full p-3 border border-gray-300 rounded-lg">
                        <option>Caixa</option>
                        <option>Gerente</option>
                        <option>Administrador</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Loja Padrão</label>
                    <select class="mt-1 block w-full p-3 border border-gray-300 rounded-lg">
                         ${mockStores.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>
             </div>
             <div class="mt-6 flex space-x-3 justify-start">
                <button id="btn-salvar-usuario" class="main-button px-6 py-3 rounded-xl font-semibold shadow-md">Salvar Usuário</button>
                <button id="btn-cancelar-usuario" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-300">Cancelar</button>
             </div>
        </div>

        <!-- Lista de Usuários (Mocked) -->
        <h3 class="text-xl font-bold mt-8 mb-4 text-gray-900">Usuários Cadastrados (1)</h3>
        <div id="user-list" class="space-y-4">
            <div class="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex justify-between items-center">
                <div>
                    <p class="font-semibold text-gray-900">admin (Você)</p>
                    <p class="text-sm text-gray-600">Cargo: Administrador | Loja: Loja Central (SP)</p>
                </div>
                <i class="fas fa-check-circle text-green-500"></i>
            </div>
        </div>
    `;
    
    // --- Adiciona Listeners Específicos da Rota ---
    document.getElementById('btn-novo-usuario-toggle').onclick = () => {
        document.getElementById('form-novo-usuario').classList.toggle('hidden');
    };
    document.getElementById('btn-cancelar-usuario').onclick = () => {
        document.getElementById('form-novo-usuario').classList.add('hidden');
    };
    document.getElementById('btn-salvar-usuario').onclick = () => {
        showCustomModal("Sucesso", "Usuário (mock) salvo! A lógica de salvar usuários no DB será implementada.");
        document.getElementById('form-novo-usuario').classList.add('hidden');
    };
}

export { renderUsuarios };
