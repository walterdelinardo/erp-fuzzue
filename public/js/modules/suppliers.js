/**
 * public/js/modules/suppliers.js
 * * Módulo de renderização da tela de Fornecedores.
 */
import { contentArea } from '../ui.js';
import { allSuppliers } from '../state.js';
import { showCustomModal, cleanDocumentNumber } from '../utils.js';
import { loadInitialData } from '../api.js';

/**
 * Salva um novo fornecedor via API.
 */
async function saveSupplier() {
    const formMessage = document.getElementById('supplier-form-message');
    const rawCnpj = document.getElementById('supplier-cnpj').value;
    const cleanedCnpj = cleanDocumentNumber(rawCnpj);
    
    const fornecedor = {
        name: document.getElementById('supplier-name').value,
        cnpj: cleanedCnpj,
        contact_person: document.getElementById('contact-person').value,
        phone: document.getElementById('supplier-phone').value,
        email: document.getElementById('supplier-email').value,
        cep: document.getElementById('supplier-cep').value,
        address: document.getElementById('supplier-address').value,
        observations: document.getElementById('supplier-observations').value,
    };

    if (!fornecedor.name) {
        formMessage.textContent = 'O Nome da Empresa é obrigatório.';
        formMessage.className = 'mt-4 text-sm font-medium text-red-600';
        return;
    }
    
    formMessage.textContent = 'Salvando...';
    formMessage.className = 'mt-4 text-sm font-medium text-orange-600';
    
    try {
        const response = await fetch('/api/suppliers', { // Usa a rota da API
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fornecedor)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Falha ao salvar fornecedor.');
        }

        showCustomModal("Sucesso", `Fornecedor ${fornecedor.name} salvo no banco de dados!`);
        formMessage.textContent = '';
        document.getElementById('form-novo-fornecedor').classList.add('hidden'); // Esconde o formulário
        
        // Recarrega todos os dados e renderiza a página novamente
        await loadInitialData();
        await renderFornecedores();

    } catch (error) {
        console.error("Erro ao salvar fornecedor:", error);
        showCustomModal("Erro", `Não foi possível salvar: ${error.message}`);
        formMessage.textContent = `Erro: ${error.message}`;
        formMessage.className = 'mt-4 text-sm font-medium text-red-600';
    }
}

/**
 * Renderiza o conteúdo da tela de Fornecedores.
 */
async function renderFornecedores() {
    const fornecedoresParaRenderizar = allSuppliers;

    contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Gestão de Fornecedores</h2>
            <button id="btn-novo-fornecedor-toggle" class="main-button flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold shadow-md">
                <i class="fas fa-plus"></i>
                <span>Novo Fornecedor</span>
            </button>
        </div>
        <p class="text-gray-600 mb-6">Cadastre e gerencie os fornecedores do sistema Fuzzue.</p>
        
        <!-- Formulário de Novo Fornecedor (Escondido por padrão) -->
        <div id="form-novo-fornecedor" class="bg-gray-50 p-6 rounded-xl shadow-inner mb-6 hidden">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Adicionar Novo Fornecedor</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="supplier-name" class="block text-sm font-medium text-gray-700">Nome da Empresa *</label>
                    <input type="text" id="supplier-name" placeholder="Ex: Distribuidora de Aço S.A." class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="contact-person" class="block text-sm font-medium text-gray-700">Pessoa de Contato</label>
                    <input type="text" id="contact-person" placeholder="Ex: Sr. Carlos" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="supplier-phone" class="block text-sm font-medium text-gray-700">Telefone</label>
                    <input type="text" id="supplier-phone" placeholder="Ex: (11) 99999-8888" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="supplier-email" class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="supplier-email" placeholder="Ex: contato@distribuidora.com" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="supplier-cnpj" class="block text-sm font-medium text-gray-700">CNPJ</label>
                    <input type="text" id="supplier-cnpj" placeholder="Apenas números" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="supplier-cep" class="block text-sm font-medium text-gray-700">CEP</label>
                    <input type="text" id="supplier-cep" placeholder="Apenas números" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
            </div>
            
            <div class="mt-4">
                <label for="supplier-address" class="block text-sm font-medium text-gray-700">Endereço</label>
                <input type="text" id="supplier-address" placeholder="Ex: Av. Industrial, 123" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
            </div>
            <div class="mt-4">
                <label for="supplier-observations" class="block text-sm font-medium text-gray-700">Observações</label>
                <textarea id="supplier-observations" rows="2" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"></textarea>
            </div>

            <div class="mt-6 flex space-x-3 justify-start">
                <button id="btn-adicionar-fornecedor" class="main-button px-6 py-3 rounded-xl font-semibold shadow-md">
                    Adicionar Fornecedor
                </button>
            </div>
            <p id="supplier-form-message" class="mt-4 text-sm font-medium"></p>
        </div>

        <!-- Lista de Fornecedores -->
        <h3 class="text-xl font-bold mt-8 mb-4 text-gray-900">Fornecedores Cadastrados (<span id="supplier-count">${fornecedoresParaRenderizar.length}</span>)</h3>
        <div id="supplier-list" class="space-y-4">
            ${fornecedoresParaRenderizar.length === 0 ? 
                `<p class="text-center text-gray-500">Nenhum fornecedor cadastrado.</p>` :
                fornecedoresParaRenderizar.map(s => `
                    <div class="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-900">${s.name}</p>
                            <p class="text-sm text-gray-600">CNPJ: ${s.cnpj || 'N/A'} | Contato: ${s.contact_person || 'N/A'}</p>
                        </div>
                        <button class="text-red-500 hover:text-red-700 p-2 rounded-full transition duration-150" onclick="showCustomModal('Confirmação', 'Tem certeza que deseja deletar o fornecedor ${s.name}?', () => console.warn('Delete mockado'))">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')
            }
        </div>
    `;
    
    // --- Adiciona Listeners Específicos da Rota ---
    document.getElementById('btn-novo-fornecedor-toggle').onclick = () => {
         document.getElementById('form-novo-fornecedor').classList.toggle('hidden');
    };
    document.getElementById('btn-adicionar-fornecedor').onclick = saveSupplier;
}

export { renderFornecedores };
