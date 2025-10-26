/**
 * public/js/main.js
 * * Este é TODO o JavaScript do seu index.html original, movido para um arquivo.
 * O próximo passo será quebrar este arquivo "monolítico" em módulos menores
 * (ex: auth.js, ui.js, routes.js, modules/products.js, etc.)
 */

// Importações do Firebase (necessárias no escopo do módulo)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, addDoc, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Setup Firebase Global ---
// As variáveis __app_id e __firebase_config são lidas do <script> no index.html
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(__firebase_config);

setLogLevel('debug'); // Ativa logs de debug do Firestore

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserId = null;
let authReady = false;

// --- Variáveis de UI ---
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app');
const contentArea = document.getElementById('content-area');
const loginMessage = document.getElementById('login-message');
const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const menuLinks = document.querySelectorAll('.menu-link');

// --- Variáveis PDV (Estado da Venda Atual) ---
let currentSale = []; // Array de itens { product_id, name, price, quantity, total }
let currentPayments = []; // Array de pagamentos { type, value, installments }
let currentSaleTotal = 0.00;

// --- ESTADO GLOBAL (DADOS REAIS DO BACKEND) ---
// Estas variáveis serão preenchidas com dados reais da API após o login
let allProducts = [];
let allSuppliers = [];

// --- Utilitários ---

// Função para mostrar modal customizado (substitui alert/confirm)
function showCustomModal(title, body, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    const confirmBtn = document.getElementById('modal-confirm');
    
    // Remove o listener antigo para evitar múltiplos cliques
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.onclick = () => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
    };
}

// Função para limpar caracteres não numéricos (CNPJ/CPF)
function cleanDocumentNumber(doc_number) {
    if (doc_number) {
        return doc_number.replace(/[^0-9]/g, '');
    }
    return '';
}

// Função para formatar o ID do usuário (mostra só o início)
function formatUserId(userId) {
    return userId ? `${userId.substring(0, 8)}...` : 'Anônimo';
}

// --- Gemini API Utilities ---

/**
 * Chama o Gemini API com prompt e instrução do sistema.
 * Implementa backoff exponencial para retries.
 */
async function callGeminiApi(prompt, systemInstruction = null) {
    // (O código desta função permanece o mesmo)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    // ... (resto da lógica do callGeminiApi) ...
    const MAX_RETRIES = 5;
    let delay = 1000;
    
    // Construir payload
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    };

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429 && i < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue; // Tentar novamente
                }
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) return text;
            
            throw new Error("Resposta da API vazia ou mal formatada.");

        } catch (error) {
            if (i === MAX_RETRIES - 1) {
                console.error("Erro final após todas as tentativas:", error);
                throw new Error(`Falha ao contactar a IA: ${error.message}`);
            }
        }
    }
    throw new Error("Falha desconhecida ao chamar a API Gemini.");
}

/**
 * Gera uma descrição de produto usando o Gemini API.
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
        genButton.disabled = false;
        genButton.innerHTML = '✨ Gerar Descrição';
    }
}

/**
 * Gera uma análise financeira usando o Gemini API.
 */
async function generateFinancialAnalysis() {
    const analysisArea = document.getElementById('financial-analysis-output');
    const genButton = document.getElementById('btn-generate-analysis');

    genButton.disabled = true;
    analysisArea.innerHTML = '<div class="flex items-center text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Analisando dados...</div>';
    
    // (No futuro, coletaríamos dados reais do 'mockFinancialData' ou API)
    const systemPrompt = "Você é um analista financeiro sênior (CFA). Analise os dados brutos e forneça 3 insights acionáveis (bullet points) para um gerente de loja.";
    const userPrompt = `Dados: {faturamento: 45000, custos: 25000, despesas: 10000, meta: 60000}`;

    try {
        const generatedText = await callGeminiApi(userPrompt, systemPrompt);
        // Formata o texto (ex: substitui * por <strong>)
        const formattedText = generatedText.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        analysisArea.innerHTML = `<ul class="list-disc list-inside space-y-2 text-gray-700">${formattedText}</ul>`;
    } catch (error) {
        analysisArea.innerHTML = `<p class="text-red-600">Erro ao gerar análise: ${error.message}</p>`;
    } finally {
        genButton.disabled = false;
    }
}

/**
 * Chat de Dúvidas com IA (Ajuda/IA)
 */
async function sendHelpQuery() {
    const queryInput = document.getElementById('ai-query-input');
    const query = queryInput.value;
    const output = document.getElementById('ai-chat-output');
    
    if (!query) return;

    queryInput.value = '';
    output.innerHTML = '<p class="text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Pensando...</p>';

    const systemPrompt = "Você é o 'FUZZ', o assistente de IA do ERP Fuzzue. Responda as dúvidas do usuário de forma direta, amigável e focada em ajuda operacional do sistema. Use o contexto dos módulos (PDV, Produtos, NCM, Relatórios) para responder.";
    const userPrompt = `Dúvida do usuário: ${query}`;
    
    try {
        const generatedText = await callGeminiApi(userPrompt, systemPrompt);
        output.innerHTML = `<p class="text-gray-800">${generatedText}</p>`;
    } catch (error) {
        output.innerHTML = `<p class="text-red-600">Desculpe, não consegui processar sua dúvida: ${error.message}</p>`;
    }
}

/**
 * Gera o QR Code para um código de produto.
 */
function generateQRCode(productCode) {
    const qrCodeContainer = document.getElementById('qrcode-output');
    if (!qrCodeContainer) return; // Sai se o container não estiver na tela
    
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


// --- Lógica PDV ---

// Função principal que atualiza a lista de itens da venda
function renderSaleItems() {
    const listContainer = document.getElementById('sale-items-list');
    if (!listContainer) return; // Sai se não estiver na tela de Pedidos

    currentSaleTotal = currentSale.reduce((sum, item) => sum + item.total, 0);

    if (currentSale.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-center p-4">Nenhum item adicionado à venda.</p>';
    } else {
        listContainer.innerHTML = currentSale.map((item, index) => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow border border-gray-200">
                <div class="flex-1">
                    <p class="font-semibold text-gray-900">${item.name}</p>
                    <p class="text-sm text-gray-600">R$ ${item.price.toFixed(2)} (Margem: ${item.margin || 0}%)</p>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="number" value="${item.quantity}" min="1" 
                           onchange="updateItemQuantity(${index}, this.value)" 
                           class="w-16 p-1 text-center border border-gray-300 rounded-lg">
                    <p class="font-bold text-gray-900 w-20 text-right">R$ ${item.total.toFixed(2)}</p>
                    <button onclick="removeItemFromSale(${index})" class="text-red-500 hover:text-red-700 p-1 rounded-full">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Atualiza os totais na coluna da direita
    const totalDisplay = document.getElementById('sale-total-display');
    if(totalDisplay) {
        totalDisplay.textContent = `R$ ${currentSaleTotal.toFixed(2)}`;
    }
}

// Adiciona/Incrementa item na venda
function addItemToSale(product) {
    const existingItemIndex = currentSale.findIndex(item => item.product_id === product.id);

    if (existingItemIndex > -1) {
        // Incrementa a quantidade
        currentSale[existingItemIndex].quantity += 1;
        currentSale[existingItemIndex].total = currentSale[existingItemIndex].price * currentSale[existingItemIndex].quantity;
    } else {
        // Adiciona novo item
        // Calcula o preço final de venda com base na margem
        const price = parseFloat(product.price || 0);
        const margin = parseFloat(product.margin || 0);
        const finalPrice = price * (1 + margin / 100);

        currentSale.push({
            product_id: product.id,
            name: product.name,
            price: finalPrice, // Usa o preço com margem
            margin: margin,
            quantity: 1,
            total: finalPrice // Total inicial (1 unidade)
        });
    }
    renderSaleItems();
}

// Remove item da venda
window.removeItemFromSale = function(index) {
    currentSale.splice(index, 1);
    renderSaleItems();
}

// Atualiza quantidade de um item
window.updateItemQuantity = function(index, newQuantity) {
    const quantity = parseInt(newQuantity);
    if (quantity > 0) {
        currentSale[index].quantity = quantity;
        currentSale[index].total = currentSale[index].price * quantity;
    } else {
        // Se a quantidade for 0 ou inválida, remove o item
        currentSale.splice(index, 1);
    }
    renderSaleItems();
}

// Busca de produto por SKU/Código de Barras
function searchAndAddProduct() {
    const input = document.getElementById('barcode-input');
    if (!input) return; // Proteção
    
    const query = input.value.trim();
    input.value = ''; // Limpa o campo após leitura/busca
    input.focus(); // Mantém o foco no input
    
    if (!query) return;

    // Busca nos dados REAIS (allProducts)
    const product = allProducts.find(p => 
        (p.sku && p.sku.toLowerCase() === query.toLowerCase()) || 
        (p.barcode && p.barcode === query) || 
        (p.name && p.name.toLowerCase().includes(query.toLowerCase()))
    );

    if (product) {
        addItemToSale(product); // A função addItemToSale já lida com o cálculo da margem
    } else {
        showCustomModal("Produto Não Encontrado", `Nenhum produto encontrado para o código/nome: ${query}`);
    }
}

// Lógica de Pagamento
function openPaymentModal() {
    if (currentSale.length === 0) {
        showCustomModal("Venda Vazia", "Adicione pelo menos um produto antes de finalizar a venda.");
        return;
    }
    // Reseta o modal de pagamento
    currentPayments = [];
    document.getElementById('payment-methods-list').innerHTML = '';
    document.getElementById('payment-modal-change').textContent = 'Troco: R$ 0,00';
    document.getElementById('payment-modal-total').textContent = `R$ ${currentSaleTotal.toFixed(2)}`;
    
    // Abre o modal
    document.getElementById('payment-modal').classList.remove('hidden');
    document.getElementById('payment-modal').classList.add('flex');
}

// Atualiza o estado visual do Modal de Pagamento
function updatePaymentModal() {
    const paymentsList = document.getElementById('payment-methods-list');
    const changeDisplay = document.getElementById('payment-modal-change');
    
    const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
    const troco = totalPago - currentSaleTotal;

    if (currentPayments.length === 0) {
        paymentsList.innerHTML = '<p class="text-xs text-gray-500 text-center">Nenhuma forma de pagamento adicionada.</p>';
    } else {
        paymentsList.innerHTML = currentPayments.map((p, index) => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded-md border">
                <div>
                    <span class="font-semibold text-gray-800">${p.type} ${p.installments > 1 ? `(${p.installments}x)` : ''}</span>
                </div>
                <div>
                    <span class="font-semibold text-orange-600">R$ ${p.value.toFixed(2)}</span>
                    <button onclick="removePayment(${index})" class="text-red-500 hover:text-red-700 p-1 rounded-full ml-2">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    if (troco > 0) {
        changeDisplay.textContent = `Troco: R$ ${troco.toFixed(2)}`;
        changeDisplay.className = "text-lg font-semibold text-green-600";
    } else if (troco < 0) {
        changeDisplay.textContent = `Faltam: R$ ${Math.abs(troco).toFixed(2)}`;
        changeDisplay.className = "text-lg font-semibold text-red-600";
    } else {
        changeDisplay.textContent = 'Troco: R$ 0,00';
        changeDisplay.className = "text-lg font-semibold text-gray-700";
    }
}

// Adiciona um pagamento
document.getElementById('btn-add-payment').onclick = function() {
    const type = document.getElementById('payment-type').value;
    const valueInput = document.getElementById('payment-value');
    const installments = parseInt(document.getElementById('payment-installments').value);
    
    let value = parseFloat(valueInput.value);
    
    if (isNaN(value) || value <= 0) {
        showCustomModal("Valor Inválido", "Por favor, insira um valor de pagamento válido.");
        return;
    }

    currentPayments.push({
        type: type,
        value: value,
        installments: (type === 'Parcelado' || type === 'Credito') ? installments : 1
    });

    valueInput.value = ''; // Limpa o campo
    updatePaymentModal();
}

// Listener para Parcelas
document.getElementById('payment-type').onchange = function() {
    const installmentsSelect = document.getElementById('payment-installments');
    if (this.value === 'Parcelado' || this.value === 'Credito') {
        installmentsSelect.disabled = false;
    } else {
        installmentsSelect.disabled = true;
        installmentsSelect.value = '1';
    }
}

// Remove um pagamento
window.removePayment = function(index) {
    currentPayments.splice(index, 1);
    updatePaymentModal();
}

// Finaliza a venda
document.getElementById('btn-finalize-sale').onclick = async function() {
    
    const totalPago = currentPayments.reduce((sum, p) => sum + p.value, 0);
    if (totalPago < currentSaleTotal) {
        showCustomModal("Pagamento Incompleto", "O valor pago é menor que o total da venda. Verifique os pagamentos.");
        return;
    }

    const saleData = {
        sale: {
            items: currentSale,
            total: currentSaleTotal
        },
        payments: currentPayments,
        userId: currentUserId || 'anonimo'
    };

    try {
        // Usa a rota da API modularizada
        const response = await fetch('/api/sales/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();

        if (!response.ok) {
            // Mostra erro específico do backend (ex: estoque insuficiente)
            throw new Error(result.message || 'Erro desconhecido no servidor.');
        }

        // Se chegou aqui, a venda foi um sucesso
        document.getElementById('payment-modal').classList.add('hidden');
        document.getElementById('payment-modal').classList.remove('flex');
        
        const troco = totalPago - currentSaleTotal;
        
        showCustomModal("Venda Finalizada", 
            `Venda concluída com sucesso! (ID: ${result.sale_id || 'N/A'}). Total: R$ ${currentSaleTotal.toFixed(2)}. Troco: R$ ${Math.max(0, troco).toFixed(2)}.`,
            async () => {
                // Reset da venda
                currentSale = [];
                currentPayments = [];
                currentSaleTotal = 0.00;
                
                // Recarrega os dados dos produtos (para atualizar o estoque)
                await loadInitialData(); 
                
                // Volta para o PDV (que agora mostrará o estoque atualizado)
                navigate('pedidos'); 
            }
        );

    } catch (error) {
        console.error("Erro ao finalizar venda:", error);
        showCustomModal("Falha na Venda", `Não foi possível finalizar a venda: ${error.message}`);
    }
}


// --- Rotas e Conteúdo Dinâmico (Renderização do HTML de cada módulo) ---

// --- DADOS MOCK (PARCIAL) ---
// DEIXAMOS OS MOCKS que o backend AINDA NÃO FORNECE
const mockStores = [
    { id: 1, name: "Loja Central (SP)", address: "Av. Paulista, 1000", phone: "11-3000-0000" },
    { id: 2, name: "Filial Zona Oeste (RJ)", address: "Rua B, 25", phone: "21-5555-1234" },
    { id: 3, name: "E-Commerce / Depósito", address: "Rua C, 40", phone: "11-9000-0000" }
];

const mockNcms = [
    { id: 1, code: '72085100', desc: 'Chapas de ferro ou aço não ligado', letra: 'A', format: '7208.51.00', status: 'Ativo', rastreabilidade: true, diferimento: 'Ativo', aliquota_bloco_p: 4.65 },
    { id: 2, code: '76061190', desc: 'Chapas e tiras de alumínio', letra: 'B', format: '7606.11.90', status: 'Ativo', rastreabilidade: false, diferimento: 'Inativo', aliquota_bloco_p: 7.60 },
    { id: 3, code: '87039000', desc: 'Peças e acessórios de veículos', letra: 'C', format: '8703.90.00', status: 'Inativo', rastreabilidade: false, diferimento: 'Inativo', aliquota_bloco_p: 0.00 },
];

const mockFinancialData = {
    period: "Julho/2025",
    total_sales: 155000.00,
    cost_of_goods_sold: 80000.00,
    operating_expenses: 45000.00,
    net_profit: 30000.00,
    total_products_sold: 1250,
    best_selling_category: "Aço Inoxidável",
    worst_performing_store: "Filial Zona Oeste (RJ)"
};

const mockClients = [
    { id: 1, name: "Cliente Padrão", cnpj: "000.000.000-00", phone: "11987654321" },
    { id: 2, name: "Distribuidora Laranja S.A.", cnpj: "25.000.000/0001-01", phone: "21999887766" },
];

/**
 * Lógica para verificar quantos produtos estão em estoque baixo.
 */
function checkLowStock() {
    // Lê de allProducts (dados reais)
    return allProducts.filter(p => p.stock < p.min_stock).length;
}

/**
 * Obtém a descrição NCM
 */
const getNcmDescription = (code) => {
    return mockNcms.find(n => n.code === code)?.desc || 'NCM não encontrado';
}

function renderDashboard() {
    // Lê de allProducts (dados reais)
    
    const lowStockCount = checkLowStock();
    const alertClass = lowStockCount > 0 ? 'border-red-500 alert-critical' : 'border-green-500';
    const alertIconColor = lowStockCount > 0 ? 'text-red-500' : 'text-green-500';

    contentArea.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-gray-900">Visão Geral</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Card 1: Total de Lojas -->
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
            
            <!-- Card 4: Alerta de Estoque (USANDO LÓGICA REAL) -->
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

        <!-- Detalhe do Alerta (Real) -->
        <div class="mt-8">
            <h3 class="text-xl font-bold mb-4 text-red-600">Alerta de Estoque Baixo</h3>
            ${lowStockCount > 0 ? `
                <div class="bg-red-50 border border-red-200 p-4 mt-4 rounded-xl max-h-48 overflow-y-auto">
                    ${allProducts.filter(p => p.stock < p.min_stock).map(p => `
                        <p class="text-red-700 text-sm">
                            <i class="fas fa-exclamation-circle mr-2"></i> ${p.name} (Estoque: ${p.stock} / Mínimo: ${p.min_stock})
                        </p>
                    `).join('')}
                </div>
            ` : '<p class="text-green-600 mt-4 text-sm">Nenhum produto em nível de estoque crítico.</p>'}
        </div>
    `;
}

function renderLojas() {
    // (Usa mockStores)
    contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Gestão de Lojas / Filiais</h2>
            <button id="btn-nova-loja" class="main-button flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold shadow-md">
                <i class="fas fa-plus"></i>
                <span>Nova Loja</span>
            </button>
        </div>
        <p class="text-gray-600 mb-6">Controle centralizado de todas as suas unidades de negócio.</p>
        
        <!-- Lista de Lojas -->
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
                        <button class="text-orange-600 hover:text-orange-900 p-2 rounded-full transition duration-150">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-500 hover:text-red-700 p-2 rounded-full transition duration-150" onclick="showCustomModal('Confirmação', 'Tem certeza que deseja deletar a loja ${s.name}? Isso afetará o estoque.', null)">
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

function renderUsuarios() {
    // (Usa dados mock)
    contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Gestão de Usuários</h2>
            <button id="btn-novo-usuario" class="main-button flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold shadow-md">
                <i class="fas fa-plus"></i>
                <span>Novo Usuário</span>
            </button>
        </div>
        <p class="text-gray-600 mb-6">Cadastre e gerencie os usuários do sistema Fuzzue, com controle de **permissões** (Caixa, Gerente, Administrador).</p>
        
        <!-- Formulário de Novo Usuário (Escondido por padrão) -->
        <div id="form-novo-usuario" class="bg-gray-50 p-6 rounded-xl shadow-inner mb-6 hidden">
            <!-- ... (formulário mock) ... -->
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
        <h3 class="text-xl font-bold mt-8 mb-4 text-gray-900">Usuários Cadastrados (<span id="user-count">1</span>)</h3>
        <div id="user-list" class="space-y-4">
            <div class="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex justify-between items-center">
                <div>
                    <p class="font-semibold text-gray-900">admin</p>
                    <p class="text-sm text-gray-600">Cargo: Administrador | Loja: Loja Central (SP)</p>
                </div>
                <i class="fas fa-check-circle text-green-500"></i>
            </div>
        </div>
    `;
    
    // Lógica de manipulação de formulário (apenas mock)
    document.getElementById('btn-novo-usuario').onclick = () => {
        document.getElementById('form-novo-usuario').classList.remove('hidden');
    };
    document.getElementById('btn-cancelar-usuario').onclick = () => {
        document.getElementById('form-novo-usuario').classList.add('hidden');
    };
    document.getElementById('btn-salvar-usuario').onclick = () => {
        showCustomModal("Sucesso", "Usuário (mock) salvo! A lógica de salvar usuários no DB será implementada.");
        document.getElementById('form-novo-usuario').classList.add('hidden');
    };
}

// Renderiza a tela de NCM
function renderNcm() {
    // (Usa mockNcms)
    
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

async function renderProdutos() {
    
    // Renderiza a partir da variável global 'allProducts'
    const produtosParaRenderizar = allProducts;
    
    // Função auxiliar para encontrar o nome da loja
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
                        <input type="text" id="product-ncm" placeholder="Ex: 72085100" class="block w-2/5 p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" onchange="document.getElementById('ncm-desc-display').textContent = getNcmDescription(this.value)">
                        <button class="bg-gray-200 text-gray-700 px-3 py-2 rounded-xl font-semibold hover:bg-gray-300" onclick="showCustomModal('Lookup NCM', 'Em uma aplicação real, abriria uma janela para buscar o NCM.')"><i class="fas fa-search"></i></button>
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
                            const isAlert = p.stock < p.min_stock;
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
    
    // Botão de Gerar Descrição
    const btnGenDesc = document.getElementById('btn-generate-description');
    if (btnGenDesc) {
        btnGenDesc.onclick = generateProductDescription;
    }
    
    // Botão de Toggle do Formulário
    document.getElementById('btn-novo-produto-toggle').onclick = () => {
         document.getElementById('form-novo-produto').classList.toggle('hidden');
    };

    // Botão "Salvar Produto"
    document.getElementById('btn-salvar-produto').onclick = async () => {
        const formMessage = document.getElementById('product-form-message');
        formMessage.textContent = 'Salvando...';
        formMessage.className = 'mt-4 text-sm font-medium text-orange-600';

        // Coletar os dados do formulário
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(produto)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Falha ao salvar o produto');
            }
            
            showCustomModal("Sucesso", `Produto "${produto.name}" salvo no banco de dados!`);
            formMessage.textContent = '';
            document.getElementById('form-novo-produto').classList.add('hidden'); // Esconde o formulário
            
            // Recarrega todos os dados e renderiza a página novamente
            await loadInitialData();
            renderProdutos(); 

        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            showCustomModal("Erro", `Não foi possível salvar: ${error.message}`);
            formMessage.textContent = `Erro: ${error.message}`;
            formMessage.className = 'mt-4 text-sm font-medium text-red-600';
        }
    };
}


async function renderFornecedores() {
    
    // Renderiza a partir da variável global 'allSuppliers'
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
                        <button class="text-red-500 hover:text-red-700 p-2 rounded-full transition duration-150" onclick="showCustomModal('Confirmação', 'Tem certeza que deseja deletar o fornecedor ${s.name}?', null)">
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
    
    document.getElementById('btn-adicionar-fornecedor').onclick = async () => {
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
            renderFornecedores();

        } catch (error) {
            console.error("Erro ao salvar fornecedor:", error);
            showCustomModal("Erro", `Não foi possível salvar: ${error.message}`);
            formMessage.textContent = `Erro: ${error.message}`;
            formMessage.className = 'mt-4 text-sm font-medium text-red-600';
        }
    };
}

function renderRelatorios() {
    // (Usa mockFinancialData)
    const data = mockFinancialData; 
    
    contentArea.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900">Relatórios Financeiros e de Vendas</h2>
        <p class="text-gray-600 mb-6">Análise (mock) do período de ${data.period}.</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-50 p-5 rounded-xl shadow-md border-t-4 border-green-500">
                <span class="text-lg font-semibold text-gray-700">Lucro Líquido</span>
                <p class="text-4xl font-extrabold text-green-600 mt-2">R$ ${data.net_profit.toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 p-5 rounded-xl shadow-md border-t-4 border-orange-600">
                <span class="text-lg font-semibold text-gray-700">Vendas Totais</span>
                <p class="text-4xl font-extrabold text-orange-600 mt-2">R$ ${data.total_sales.toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 p-5 rounded-xl shadow-md border-t-4 border-red-500">
                <span class="text-lg font-semibold text-gray-700">Custos e Despesas</span>
                <p class="text-4xl font-extrabold text-red-600 mt-2">R$ ${(data.cost_of_goods_sold + data.operating_expenses).toFixed(2)}</p>
            </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 class="text-xl font-bold mb-4 text-gray-800">Análise de IA (Mock)</h3>
            <p class="text-gray-600 mb-4">Insights gerados pela IA com base nos dados brutos do período.</p>
            <button id="btn-generate-analysis" class="main-button px-4 py-2 rounded-xl font-semibold shadow-md mb-4">
                <i class="fas fa-magic mr-2"></i> Gerar Análise Financeira
            </button>
            <div id="financial-analysis-output" class="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[8rem]">
                <p class="text-gray-500">Clique em "Gerar Análise" para ver os insights da IA.</p>
            </div>
        </div>
    `;
    
    // Adiciona listener
    document.getElementById('btn-generate-analysis').onclick = generateFinancialAnalysis;
}

function renderHelp() {
    // (Esta função é modificada para usar os dados reais 'allProducts' na busca)
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
                    <button id="btn-generate-qr" class="main-button px-4 py-2 rounded-xl font-semibold flex-shrink-0">Gerar</T>
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

    // Lógica de Pesquisa de Preços
    const searchPrice = () => {
        const query = document.getElementById('price-search-input').value.trim().toLowerCase();
        const output = document.getElementById('price-search-output');
        
        if (!query) {
            output.innerHTML = '<p class="text-gray-500 text-sm">Por favor, insira um código ou nome para pesquisar.</p>';
            return;
        }
        
        // Busca nos dados REAIS (allProducts)
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
    };

    document.getElementById('btn-search-price').onclick = searchPrice;
    document.getElementById('price-search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchPrice();
    });

    // Lógica de Geração de QR Code
    const qrCodeInput = document.getElementById('qr-code-input');
    const qrCodeGenerateBtn = document.getElementById('btn-generate-qr');
    
    generateQRCode(qrCodeInput.value); // Gera o inicial

    qrCodeGenerateBtn.onclick = () => {
        generateQRCode(qrCodeInput.value.trim());
    };
    qrCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generateQRCode(qrCodeInput.value.trim());
    });
    
    // Lógica do Chat IA
    document.getElementById('btn-send-ai-query').onclick = sendHelpQuery;
    document.getElementById('ai-query-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendHelpQuery();
    });
}

// Renderiza a tela de Pedidos/PDV
function renderPedidos() {
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
                    <!-- Itens da venda serão injetados aqui -->
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
    
    // Foco automático no input de busca
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
        barcodeInput.focus();
        // Listener para "Enter" no input
        barcodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                searchAndAddProduct();
            }
        });
    }

    // Botão de Abrir Pagamento
    document.getElementById('btn-open-payment').onclick = openPaymentModal;

    // Botão de Cancelar Venda
    document.getElementById('btn-cancel-sale').onclick = () => {
        if (currentSale.length > 0) {
            showCustomModal("Cancelar Venda", "Tem certeza que deseja limpar todos os itens da venda atual?", () => {
                currentSale = [];
                renderSaleItems();
            });
        }
    };
    
    // Atalhos de Teclado
    document.onkeydown = function(e) {
        if (currentRoute !== 'pedidos') return; // Só ativa na tela de pedidos
        
        if (e.key === 'F1') {
            e.preventDefault();
            openPaymentModal();
        }
        if (e.key === 'F4') {
            e.preventDefault();
            document.getElementById('btn-cancel-sale').click();
        }
    };

    // Renderiza os itens iniciais (vazio)
    renderSaleItems();
}


// Mapeamento de Rotas
const routes = {
    'dashboard': renderDashboard,
    'lojas': renderLojas, 
    'ncm': renderNcm,
    'produtos': renderProdutos, 
    'usuarios': renderUsuarios,
    'fornecedores': renderFornecedores,
    'relatorios': renderRelatorios, 
    'ajuda': renderHelp, 
    'pedidos': renderPedidos, // Rota PDV
    'clientes': () => {
        contentArea.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-900">Gestão de Clientes (Mock)</h2>
            <p class="mt-4 text-gray-600">Esta tela (ainda mock) será atualizada para incluir histórico de compras, preferências e controlo de garantia.</p>
            <div class="mt-6 space-y-4">
            ${mockClients.map(c => `
                <div class="bg-gray-50 p-4 rounded-xl shadow-md border border-gray-200">
                    <p class="font-semibold text-gray-900 text-lg">${c.name}</p>
                    <p class="text-sm text-gray-600">Documento: ${c.cnpj}</p>
                    <p class="text-sm text-gray-600">Telefone: ${c.phone}</p>
                </div>
            `).join('')}
            </div>
        `;
    },
    'configuracoes': () => {
        contentArea.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-900">Configurações do Sistema (Mock)</h2>
            <p class="mt-4 text-gray-600">Configurações (ainda mock) para NF-e, Backup e Logs de Auditoria.</p>
            <div class="mt-6 space-y-3">
                <div class="bg-gray-50 p-4 rounded-xl shadow-md border border-gray-200">
                    <p class="font-semibold text-gray-900">Certificado Digital (A1)</p>
                    <p class="text-sm text-gray-600">Status: <span class="text-green-600 font-semibold">Válido (expira em 10/2025)</span></p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl shadow-md border border-gray-200">
                    <p class="font-semibold text-gray-900">Logs de Auditoria</p>
                    <p class="text-sm text-gray-600">Rastreamento de ações (criação de produtos, vendas) ativado.</p>
                </div>
            </div>
        `;
    },
};

let currentRoute = 'dashboard';

function navigate(route) {
    // Remove listeners de teclado antigos para evitar duplicatas
    document.onkeydown = null; 
    
    currentRoute = route;
    const handler = routes[route] || renderDashboard;
    
    // Adiciona classe de transição
    contentArea.classList.remove('content-fade-in');
    void contentArea.offsetWidth; // Força o navegador a "repintar"
    
    handler(); // Chama a função de renderização da rota
    
    contentArea.classList.add('content-fade-in');

    // Atualiza links de menu para destacar o ativo
    document.querySelectorAll('#sidebar li a').forEach(link => {
        link.classList.remove('bg-orange-600', 'text-white', 'shadow-lg');
        if (!link.classList.contains('menu-link')) {
             link.classList.add('menu-link'); // Garante que o link de dashboard possa ser deselecionado
        }
    });
    const activeLink = document.querySelector(`#sidebar li[data-route="${route}"] a`);
    if (activeLink) {
        activeLink.classList.add('bg-orange-600', 'text-white', 'shadow-lg');
        activeLink.classList.remove('menu-link');
    }
    
    // Fecha o menu em telas pequenas após navegação
    if (window.innerWidth < 768) {
        sidebar.classList.add('hidden');
    }
}

// --- Event Listeners Globais e Funções de Autenticação ---

// Navegação pela Sidebar
document.querySelectorAll('#sidebar li[data-route]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        navigate(route);
    });
});

// Menu Hamburguer (Mobile)
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        // Ajustes para menu mobile sobreposto
        if (!sidebar.classList.contains('hidden')) {
            sidebar.classList.add('absolute', 'z-40', 'h-full');
        } else {
            sidebar.classList.remove('absolute', 'z-40', 'h-full');
        }
    });
}

// Botão de Logout
document.getElementById('logout-button').onclick = () => {
    showCustomModal("Sair do Sistema", "Você será desconectado. Continuar?", () => {
        handleLogout();
    });
};

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const demoUser = 'admin';
    const demoPass = 'gbl12024';

    if (username === demoUser && password === demoPass) {
        // Simulação de login bem-sucedido
        loginMessage.textContent = 'Autenticado com sucesso. Carregando dados...';
        loginMessage.className = 'mt-4 text-sm font-medium text-green-600';
        await startApp('Administrador'); // Chama startApp
    } else {
        loginMessage.textContent = 'Credenciais inválidas. Tente admin / gbl12024';
        loginMessage.className = 'mt-4 text-sm font-medium text-red-600';
    }
}

function handleLogout() {
    currentUserId = null;
    authReady = false; // Reseta o estado de autenticação
    loginScreen.classList.remove('hidden');
    loginScreen.classList.remove('opacity-0');
    appContainer.classList.add('hidden');
    loginMessage.textContent = '';
    
    // Limpa dados globais
    allProducts = [];
    allSuppliers = [];
    currentSale = [];
}

/**
 * Função para carregar dados iniciais do backend (API)
 */
async function loadInitialData() {
    // Mostra um carregamento global na área de conteúdo
    contentArea.innerHTML = `<div class="flex justify-center items-center h-full min-h-[50vh]">
        <i class="fas fa-spinner fa-spin text-4xl text-orange-600"></i>
        <span class="ml-4 text-xl text-gray-700">Carregando dados do servidor...</span>
    </div>`;
    
    try {
        // Carrega produtos e fornecedores em paralelo
        const [productsResponse, suppliersResponse] = await Promise.all([
            fetch('/api/products'), // Usa a rota da API
            fetch('/api/suppliers') // Usa a rota da API
        ]);

        if (!productsResponse.ok) throw new Error(`Falha ao carregar produtos (${productsResponse.status})`);
        if (!suppliersResponse.ok) throw new Error(`Falha ao carregar fornecedores (${suppliersResponse.status})`);

        allProducts = await productsResponse.json();
        allSuppliers = await suppliersResponse.json();
        
        console.log(`Dados carregados: ${allProducts.length} produtos, ${allSuppliers.length} fornecedores.`);

    } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        contentArea.innerHTML = `<div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <h3 class="font-bold">Erro Crítico de API</h3>
            <p>Não foi possível carregar os dados do banco (produtos/fornecedores).</p>
            <p class="mt-2 text-sm"><b>Erro:</b> ${error.message}</p>
            <p class="mt-2 text-sm">Verifique se o <b>servidor backend (server.js)</b> está rodando e se a <b>DATABASE_URL</b> no arquivo .env está correta.</p>
        </div>`;
        // Trava a navegação se os dados essenciais falharem
        throw error; 
    }
}

/**
 * Inicia a aplicação após o login
 */
async function startApp(role) {
    
    // Inicializa a navegação e esconde o login
    welcomeMessage.textContent = `Bem-vindo(a), ${role}`;
    loginScreen.classList.add('opacity-0'); // Inicia a transição de fade-out
    
    setTimeout(() => {
        loginScreen.classList.add('hidden'); // Esconde após a transição
    }, 300); // Duração da transição
    
    appContainer.classList.remove('hidden');
    
    try {
        // Carrega os dados REAIS do backend ANTES de navegar
        await loadInitialData();
        
        // Navega para a rota padrão (Dashboard)
        navigate(currentRoute);

    } catch (error) {
        // Se o loadInitialData falhar, a mensagem de erro já estará no contentArea
        console.error("Não foi possível iniciar o app pois os dados falharam.", error);
    }
}

// --- Ponto de Entrada da Aplicação ---

document.getElementById('btn-login').onclick = handleLogin;
document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
});


// Início da Aplicação (Simulação de verificação de autenticação)
window.onload = () => {
    // (A lógica do Firebase permanece para o futuro, mas o login agora é manual)
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        signInWithCustomToken(auth, __initial_auth_token)
            .then(userCredential => {
                console.log("Firebase: Usuário autenticado via token customizado.");
            })
            .catch(error => {
                console.error("Firebase: Erro ao autenticar com token customizado. Entrando como anônimo.", error);
                signInAnonymously(auth);
            });
    } else {
        signInAnonymously(auth).catch(error => {
            console.error("Firebase: Erro ao autenticar anonimamente.", error);
        });
    }
    
    // Listener de estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            authReady = true;
            console.log(`Firebase: Sessão anônima/customizada pronta. UID: ${currentUserId}`);
            // NOTA: O login real da aplicação (startApp) ainda é disparado manualmente
            // pelo botão 'handleLogin' por enquanto.
        } else {
            currentUserId = null;
            authReady = true;
            loginScreen.classList.remove('hidden');
            loginScreen.classList.remove('opacity-0');
            appContainer.classList.add('hidden');
            console.log("Firebase: Usuário deslogado.");
        }
    });
};
