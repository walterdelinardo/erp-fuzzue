/**
 * public/js/modules/reports.js
 * * Módulo de renderização da tela de Relatórios.
 */
import { contentArea } from '../ui.js';
import { mockFinancialData } from '../state.js';
import { callGeminiApi } from '../api.js';
import { showCustomModal } from '../utils.js';

/**
 * Gera uma análise financeira usando a API Gemini (dados mock).
 */
async function generateFinancialAnalysis() {
    const analysisArea = document.getElementById('financial-analysis-output');
    const genButton = document.getElementById('btn-generate-analysis');

    genButton.disabled = true;
    analysisArea.innerHTML = '<div class="flex items-center text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Analisando dados...</div>';
    
    // (Usa dados mock por enquanto)
    const data = mockFinancialData;
    const systemPrompt = "Você é um analista financeiro sênior (CFA). Analise os dados brutos e forneça 3 insights acionáveis (bullet points) para um gerente de loja.";
    const userPrompt = `Dados: {faturamento: ${data.total_sales}, custos_mercadoria: ${data.cost_of_goods_sold}, despesas_operacionais: ${data.operating_expenses}, lucro_liquido: ${data.net_profit}, categoria_mais_vendida: "${data.best_selling_category}"}`;

    try {
        const generatedText = await callGeminiApi(userPrompt, systemPrompt);
        // Formata o texto (substitui * por <strong> e nova linha por <br>)
        const formattedText = generatedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negrito
            .replace(/\n/g, '<br>');
        analysisArea.innerHTML = `<div class="space-y-2 text-gray-700">${formattedText}</div>`;
    } catch (error) {
        analysisArea.innerHTML = `<p class="text-red-600">Erro ao gerar análise: ${error.message}</p>`;
        showCustomModal("Erro na IA", `Não foi possível gerar a análise: ${error.message}`);
    } finally {
        if (genButton) {
            genButton.disabled = false;
        }
    }
}

/**
 * Renderiza o conteúdo da tela de Relatórios.
 */
async function renderRelatorios() {
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

export { renderRelatorios };
