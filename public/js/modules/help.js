/**
 * public/js/modules/help.js
 * * Módulo de renderização da tela de Ajuda (IA, QR Code, Pesquisa).
 */
import { contentArea } from '../ui.js';
import { allProducts } from '../state.js';
import { callGeminiApi } from '../api.js';

/**
 * Chat de Dúvidas com IA (Assistente FUZZ).
 */
async function sendHelpQuery() {
    const queryInput = document.getElementById('ai-query-input');
    const query = queryInput.value;
    const output = document.getElementById('ai-chat-output');
    
    if (!query || !output || !queryInput) return;

    queryInput.value = '';
    output.innerHTML = '<p class="text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Pensando...</p>';

    const systemPrompt = "Você é o 'FUZZ', o assistente de IA do ERP Fuzzue. Responda as dúvidas do usuário de forma direta, amigável e focada em ajuda operacional do sistema. Use o contexto dos módulos (PDV, Produtos, NCM, Relatórios) para responder.";
    const userPrompt = `Dúvida do usuário: ${query}`;
    
    try {
        const generatedText = await callGeminiApi(userPrompt, systemPrompt);
        output.innerHTML = `<p class="text-gray-800">${generatedText.replace(/\n/g, '<br>')}</p>`;
    } catch (error) {
        output.innerHTML = `<p class="text-red-600">Desculpe, não consegui processar sua dúvida: ${error.message}</p>`;
    }
}

/**
 * Gera o QR Code para um código de produto.
 * @param {string} productCode - O texto a ser codificado.
 */
function generateQRCode(productCode) {
    const qrCodeContainer = document.getElementById('qrcode-output');
    if (!qrCodeContainer) return; // Sai se o container não estiver na tela
    
    // Usa a biblioteca global QRCode (carregada no index.html)
    if (typeof QRCode === 'undefined') {
        qrCodeContainer.innerHTML = '<p class="text-red-500 text-xs">Biblioteca QRCode não carregada.</p>';
        return;
    }

    if (!productCode) {
        qrCodeContainer.innerHTML = '<p class="text-xs text-gray-500 text-center p-2">Digite um SKU ou código para gerar o QR Code.</p>';
        return;
    }

    QRCode.toCanvas(productCode, { 
        width: 160, 
        margin: 2,
        color: {
            dark: '#1f2937', // Cor dos pontos (Cinza escuro)
            light: '#FFFFFF'  // Cor do fundo
        }
    }, function (error, canvas) {
        if (error) {
            console.error(error);
            qrCodeContainer.innerHTML = '<p class="text-red-500 text-xs">Erro ao gerar QR Code.</p>';
        } else {
            qrCodeContainer.innerHTML = '';
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            canvas.style.borderRadius = '8px';
            qrCodeContainer.appendChild(canvas);
        }
    });
}

/**
 * Lógica de Pesquisa Rápida de Preços.
 */
function searchPrice() {
    const queryInput = document.getElementById('price-search-input');
    const output = document.getElementById('price-search-output');
    
    if (!queryInput || !output) return;

    const query = queryInput.value.trim().toLowerCase();
    
    if (!query) {
        output.innerHTML = '<p class="text-gray-500 text-sm">Por favor, insira um código ou nome para pesquisar.</p>';
        return;
    }
    
    const foundProduct = allProducts.find(p => 
        (p.sku && p.sku.toLowerCase() === query) || 
        (p.barcode && p.barcode === query) ||
        (p.name && p.name.toLowerCase().includes(query))
    );

    if (foundProduct) {
        const price = parseFloat(foundProduct.price || 0);
        const margin = parseFloat(foundProduct.margin || 0);
        const priceVenda = (price * (1 + margin / 100)).toFixed(2);
        output.innerHTML = `
            <p class="font-bold text-gray-900">${foundProduct.name} (SKU: ${foundProduct.sku})</p>
            <p class="text-sm text-gray-700">Preço de Custo: <span class="font-semibold text-red-600">R$ ${price.toFixed(2)}</span></p>
            <p class="text-lg font-bold text-orange-600">Preço de Venda: R$ ${priceVenda}</p>
            <p class="text-xs text-gray-500 mt-1">Margem: ${margin}% | Estoque: ${foundProduct.stock}</p>
        `;
    } else {
        output.innerHTML = `<p class="text-red-500 text-sm">Produto com código/nome "${query}" não encontrado.</p>`;
    }
}

/**
 * Renderiza o conteúdo da tela de Ajuda.
 */
async function renderHelp() {
    contentArea.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900">Ajuda e Ferramentas IA</h2>
        <p class="text-gray-600 mb-8">Pesquise informações de produtos, gere códigos QR e use o chat IA para tirar dúvidas.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Coluna 1: Pesquisa de Preços Rápida -->
            <div class="bg-gray-50 p-6 rounded-xl shadow-md md:col-span-1">
                <h3 class="text-xl font-semibold text-orange-600 mb-4 flex items-center"><i class="fas fa-search-dollar mr-2"></i> Pesquisa de Preços</h3>
                <p class="text-sm text-gray-600 mb-4">Encontre rapidamente o preço de custo e venda de qualquer produto pelo SKU ou nome.</p>
                
                <label for="price-search-input" class="block text-sm font-medium text-gray-700">SKU / Nome do Produto</label>
                <div class="flex space-x-2 mt-1">
                    <input type="text" id="price-search-input" placeholder="Ex: AÇO-304-CHAPA" class="block w-full p-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                    <button id="btn-search-price" class="main-button px-4 py-2 rounded-xl font-semibold flex-shrink-0">Buscar</button>
                </div>
                <div id="price-search-output" class="mt-4 p-3 bg-white rounded-lg border border-gray-200 min-h-[5rem]">
                    <p class="text-gray-500 text-sm">Nenhum produto pesquisado.</p>
                </div>
            </div>
            
            <!-- Coluna 2: Geração de QR Code -->
            <div class="bg-gray-50 p-6 rounded-xl shadow-md md:col-span-1">
                <h3 class="text-xl font-semibold text-orange-600 mb-4 flex items-center"><i class="fas fa-qrcode mr-2"></i> Gerador de QR Code</h3>
                <p class="text-sm text-gray-600 mb-4">Gere um QR Code para etiquetas de produtos (usando SKU ou Código de Barras).</p>
                
                <label for="qr-code-input" class="block text-sm font-medium text-gray-700">SKU / Código</label>
                <div class="flex space-x-2 mt-1">
                    <input type="text" id="qr-code-input" value="SKU-DEFAULT-123" class="block w-full p-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                    <button id="btn-generate-qr" class="main-button px-4 py-2 rounded-xl font-semibold flex-shrink-0">Gerar</button>
                </div>
                <div id="qrcode-output" class="mt-4 p-3 bg-white rounded-lg border border-gray-200 h-48 flex items-center justify-center">
                    <!-- QR Code será injetado aqui -->
                </div>
            </div>

            <!-- Coluna 3: Chat IA de Suporte -->
            <div class="bg-gray-50 p-6 rounded-xl shadow-md md:col-span-1 flex flex-col h-full">
                <h3 class="text-xl font-semibold text-orange-600 mb-4 flex items-center"><i class="fas fa-robot mr-2"></i> Assistente IA "FUZZ"</h3>
                <p class="text-sm text-gray-600 mb-4">Tire dúvidas sobre o sistema ("Como cadastrar NCM?", "Onde vejo o estoque?").</p>
                
                <div id="ai-chat-output" class="flex-1 p-3 bg-white rounded-lg border border-gray-200 min-h-[5rem] mb-4 text-sm">
                    <p class="text-gray-500">Olá! Como posso ajudar hoje?</p>
                </div>
                <div class="flex space-x-2">
                    <input type="text" id="ai-query-input" placeholder="Digite sua dúvida..." class="block w-full p-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                    <button id="btn-send-ai-query" class="main-button px-4 py-2 rounded-xl font-semibold flex-shrink-0">Enviar</button>
                </div>
            </div>
        </div>
    `;
    
    // --- Adiciona Listeners Específicos da Rota ---

    // Pesquisa de Preços
    document.getElementById('btn-search-price').onclick = searchPrice;
    document.getElementById('price-search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchPrice();
    });

    // Geração de QR Code
    const qrCodeInput = document.getElementById('qr-code-input');
    const qrCodeGenerateBtn = document.getElementById('btn-generate-qr');
    generateQRCode(qrCodeInput.value); // Gera o inicial
    qrCodeGenerateBtn.onclick = () => generateQRCode(qrCodeInput.value.trim());
    qrCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generateQRCode(qrCodeInput.value.trim());
    });
    
    // Chat IA
    document.getElementById('btn-send-ai-query').onclick = sendHelpQuery;
    document.getElementById('ai-query-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendHelpQuery();
    });
}

export { renderHelp };
