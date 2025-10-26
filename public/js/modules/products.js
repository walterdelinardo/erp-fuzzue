/**
 * public/js/modules/products.js
 * * Módulo de renderização da tela de Produtos.
 */
import { contentArea } from '../ui.js';
import { allProducts, mockStores } from '../state.js';
import { showCustomModal } from '../utils.js';
import { callGeminiApi, loadInitialData } from '../api.js';
import { getNcmDescription } from './ncm.js'; // Importa do módulo NCM

/**
 * Gera uma descrição de produto usando a API Gemini.
 */
async function generateProductDescription() {
    const productName = document.getElementById('product-name').value;
    const descriptionTextarea = document.getElementById('product-description');
    const genButton = document.getElementById('btn-generate-description');
    
    if (!productName) {
        showCustomModal("Atenção", "Por favor, preencha o Nome do Produto antes de gerar a descrição.");
        return;
    }

    genButton.disabled = true;
    genButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    
    const systemPrompt = "Você é um especialista em e-commerce. Crie uma descrição de produto concisa (máximo 3 linhas), atraente e otimizada para SEO.";
    const userPrompt = `Gere uma descrição para o produto: ${productName}`;

    try {
        const generatedText = await callGeminiApi(userPrompt, systemPrompt);
        descriptionTextarea.value = generatedText;
    } catch (error) {
        showCustomModal("Erro na IA", `Não foi possível gerar a descrição: ${error.message}`);
    } finally {
        if (genButton) { // Verifica se o botão ainda existe (usuário pode ter navegado)
            genButton.disabled = false;
            genButton.innerHTML = '✨ Gerar Descrição';
        }
    }
}

/**
 * Salva um novo produto ou atualiza um existente via API.
 */
async function saveProduct() {
    const formMessage = document.getElementById('product-form-message');
    formMessage.textContent = 'Salvando...';
    formMessage.className = 'mt-4 text-sm font-medium text-orange-600';

    // Coleta os dados do formulário
    const produto = {
        name: document.getElementById('product-name').value,
        sku: document.getElementById('product-sku').value, // O ID/SKU é o mesmo
        price: parseFloat(document.getElementById('product-price').value) || 0,
        stock: parseInt(document.getElementById('product-stock').value) || 0,
        min_stock: parseInt(document.getElementById('product-min-stock').value) || 0,
        margin: parseFloat(document.getElementById('product-margin').value) || 0,
        ncm_code: document.getElementById('product-ncm').value,
        cst: document.getElementById('product-cst').value,
        origem: document.getElementById('product-origem').value,
        tributacao: document.getElementById('product-tributacao').value,
        description: document.getElementById('product-description').value,
        // store_id: document.getElementById('product-store').value, // (Ainda mock)
    };

    if (!produto.name || !produto.sku) {
         showCustomModal("Erro", "Nome e SKU do Produto são obrigatórios!");
         formMessage.textContent = 'Erro: Nome e SKU são obrigatórios.';
         formMessage.className = 'mt-4 text-sm font-medium text-red-600';
         return;
    }

    // Enviar os dados para a API usando FETCH POST
    try {
        const response = await fetch('/api/products', { // Usa a rota da API
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produto)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Falha ao salvar o produto');
        }
        
        showCustomModal("Sucesso", `Produto "${produto.name}" salvo no banco de dados!`);
        formMessage.textContent = '';
        document.getElementById('form-novo-produto').classList.add('hidden'); // Esconde o formulário
        
        // Recarrega todos os dados (para atualizar a lista)
        await loadInitialData();
        // Renderiza a página de produtos novamente (com os dados atualizados)
        await renderProdutos(); 

    } catch (error) {
        console.error("Erro ao salvar produto:", error);
        showCustomModal("Erro", `Não foi possível salvar: ${error.message}`);
        formMessage.textContent = `Erro: ${error.message}`;
        formMessage.className = 'mt-4 text-sm font-medium text-red-600';
    }
}

/**
 * Renderiza o conteúdo da tela de Produtos.
 */
async function renderProdutos() {
    const produtosParaRenderizar = allProducts;
    
    // Função auxiliar (usa mock)
    const getStoreName = (id) => mockStores.find(s => s.id === id)?.name || 'Consolidado';
    
    contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Gestão de Produtos</h2>
            <button id="btn-novo-produto-toggle" class="main-button flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold shadow-md">
                <i class="fas fa-plus"></i>
                <span>Novo Produto</span>
            </button>
        </div>
        <p class="text-gray-600 mb-6">Controle de estoque unificado, cadastro com SKU, código de barras, margem de lucro e dados fiscais.</p>
        
        <!-- Formulário de Novo Produto (Escondido por padrão) -->
        <div id="form-novo-produto" class="bg-gray-50 p-6 rounded-xl shadow-inner mb-6 hidden">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Adicionar Novo Produto</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="md:col-span-2">
                    <label for="product-name" class="block text-sm font-medium text-gray-700">Nome do Produto *</label>
                    <input type="text" id="product-name" placeholder="Ex: Chapa de Aço Inoxidável 304" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                 <div>
                    <label for="product-unit" class="block text-sm font-medium text-gray-700">Unidade de Medida</label>
                    <select id="product-unit" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                        <option value="Pç">Peça</option>
                        <option value="Kg">Kg</option>
                        <option value="M2">M²</option>
                    </select>
                </div>
                <div>
                    <label for="product-store" class="block text-sm font-medium text-gray-700">Loja (Estoque)</label>
                    <select id="product-store" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                        ${mockStores.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="product-margin" class="block text-sm font-medium text-gray-700">Margem Lucro (%)</label>
                    <input type="number" id="product-margin" placeholder="Ex: 30" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="product-price" class="block text-sm font-medium text-gray-700">Preço de Custo (R$) *</label>
                    <input type="number" id="product-price" placeholder="Ex: 150.00" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="product-sku" class="block text-sm font-medium text-gray-700">SKU / Código Barras *</label>
                    <input type="text" id="product-sku" placeholder="Ex: AÇO-304-CHAPA" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="product-stock" class="block text-sm font-medium text-gray-700">Estoque Atual *</label>
                    <input type="number" id="product-stock" placeholder="Ex: 50" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
                <div>
                    <label for="product-min-stock" class="block text-sm font-medium text-gray-700">Estoque Mínimo *</label>
                    <input type="number" id="product-min-stock" placeholder="Ex: 10" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
            </div>

            <!-- Campos Fiscais Adicionais -->
            <h4 class="text-lg font-semibold text-gray-800 mt-6 mb-4 border-b pb-2">Dados Fiscais (NF-e)</h4>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="col-span-2">
                     <label for="product-ncm" class="block text-sm font-medium text-gray-700">Classificação Fiscal (NCM)</label>
                     <div class="flex space-x-2 mt-1">
                        <input type="text" id="product-ncm" placeholder="Ex: 72085100" class="block w-2/5 p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                        <button id="btn-lookup-ncm" class="bg-gray-200 text-gray-700 px-3 py-2 rounded-xl font-semibold hover:bg-gray-300"><i class="fas fa-search"></i></button>
                        <span id="ncm-desc-display" class="block w-full p-3 bg-white text-sm text-gray-600 border border-gray-300 rounded-lg">...</span>
                    </div>
                </div>
                <div>
                    <label for="product-cst" class="block text-sm font-medium text-gray-700">CST (Tabela A)</label>
                    <select id="product-cst" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                        <option value="00">00 - Tributada Integralmente</option>
                        <option value="01">01 - Isenta/Não Tributada (Importação)</option>
                        <option value="02">02 - Tributação com Redução de Base de Cálculo</option>
                        <option value="41">41 - Não Tributada</option>
                    </select>
                </div>
                <div>
                    <label for="product-origem" class="block text-sm font-medium text-gray-700">Origem do Produto</label>
                    <select id="product-origem" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                        <option value="Nacional">Nacional (0, 3, 4, 5)</option>
                        <option value="Importado">Importado (1, 2, 6, 7)</option>
                    </select>
                </div>
                <div class="col-span-4">
                    <label for="product-tributacao" class="block text-sm font-medium text-gray-700">Tipo de Tributação (ICMS, IPI, PIS, COFINS)</label>
                    <input type="text" id="product-tributacao" placeholder="Ex: ICMS, IPI, PIS, COFINS" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                </div>
            </div>
            
            <div class="mt-4">
                <label for="product-description" class="block text-sm font-medium text-gray-700">Descrição do Produto</label>
                <div class="flex space-x-3 mb-2">
                    <textarea id="product-description" rows="3" class="mt-1 block w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"></textarea>
                    <button id="btn-generate-description" class="bg-gray-900 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-gray-700 transition duration-150 flex items-center justify-center h-full flex-shrink-0 w-32 md:w-40">
                        ✨ Gerar Descrição
                    </button>
                </div>
            </div>

            <div class="mt-6 flex space-x-3 justify-start">
                <button id="btn-salvar-produto" class="main-button px-6 py-3 rounded-xl font-semibold shadow-md">
                    Salvar Produto
                </button>
            </div>
            <p id="product-form-message" class="mt-4 text-sm font-medium"></p>
        </div>

        <!-- Lista de Produtos -->
        <h3 class="text-xl font-bold mt-8 mb-4 text-gray-900">Produtos Cadastrados (<span id="product-count">${produtosParaRenderizar.length}</span>)</h3>
        <div class="overflow-x-auto bg-white rounded-xl shadow-md">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NCM/CST</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque (Loja)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margem (%)</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Venda (R$)</th>
                    </tr>
                </thead>
                <tbody id="product-list" class="bg-white divide-y divide-gray-200">
                    ${produtosParaRenderizar.length === 0 ? 
                        `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum produto cadastrado.</td></tr>` : 
                        produtosParaRenderizar.map(p => {
                            const price = parseFloat(p.price || 0);
                            const margin = parseFloat(p.margin || 0);
                            const finalPrice = price * (1 + margin / 100);
                            const isAlert = (p.stock || 0) < (p.min_stock || 0);
                            const rowClass = isAlert ? 'bg-red-50 border-l-4 border-red-500' : 'hover:bg-gray-50';
                            return `
                                <tr class="${rowClass}">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.sku}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.ncm_code || 'N/A'}/${p.cst || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm ${isAlert ? 'text-red-600 font-semibold' : 'text-gray-900'}">${p.stock} (${getStoreName(p.store_id)})</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600">${margin}%</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">${finalPrice.toFixed(2)}</td>
                                </tr>
                            `
                        }).join('')
                    }
                </tbody>
            </table>
        </div>
    `;
    
    // --- Adiciona Listeners Específicos da Rota ---
    document.getElementById('btn-generate-description').onclick = generateProductDescription;
    document.getElementById('btn-novo-produto-toggle').onclick = () => {
         document.getElementById('form-novo-produto').classList.toggle('hidden');
    };
    document.getElementById('btn-salvar-produto').onclick = saveProduct;
    
    // Listener para NCM input
    const ncmInput = document.getElementById('product-ncm');
    const ncmDesc = document.getElementById('ncm-desc-display');
    ncmInput.onchange = () => ncmDesc.textContent = getNcmDescription(ncmInput.value);
    document.getElementById('btn-lookup-ncm').onclick = () => {
        showCustomModal('Lookup NCM', 'Em uma aplicação real, aqui abriria uma janela para buscar o NCM na tabela.');
        ncmDesc.textContent = getNcmDescription(ncmInput.value);
    };
}

export { renderProdutos };
