/**
 * public/js/modules/settings.js
 * * Módulo de renderização da tela de Configurações (mock).
 */
import { contentArea } from '../ui.js';

/**
 * Renderiza o conteúdo da tela de Configurações (mock).
 */
async function renderConfiguracoes() {
    contentArea.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900">Configurações do Sistema (Mock)</h2>
        <p class="mt-4 text-gray-600">Configurações para NF-e, Backup e Logs de Auditoria.</p>
        <div class="mt-6 space-y-3">
            <div class="bg-gray-50 p-4 rounded-xl shadow-md border border-gray-200">
                <p class="font-semibold text-gray-900">Certificado Digital (A1)</p>
                <p class="text-sm text-gray-600">Status: <span class="text-green-600 font-semibold">Válido (expira em 10/2025)</span></p>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl shadow-md border border-gray-200">
                <p class="font-semibold text-gray-900">Logs de Auditoria</p>
                <p class="text-sm text-gray-600">Rastreamento de ações (criação de produtos, vendas) ativado.</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl shadow-md border border-gray-200">
                <p class="font-semibold text-gray-900">Integração API (Asaas/Outros)</p>
                <p class="text-sm text-gray-600">Status: <span class="text-gray-500">Não configurado</span></p>
            </div>
        </div>
    `;
}

export { renderConfiguracoes };
