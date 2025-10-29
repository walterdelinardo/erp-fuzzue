/**
 * public/js/modules/clients.js
 * * Módulo de renderização da tela de Clientes (mock).
 */
import { contentArea } from '../ui.js';
import { mockClients } from '../state.js';

/**
 * Renderiza o conteúdo da tela de Clientes (mock).
 */
async function renderClientes() {
    contentArea.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900">Gestão de Clientes (Mock)</h2>
        <p class="mt-4 text-gray-600 mb-6">Esta tela será atualizada para incluir histórico de compras, preferências e controlo de garantia.</p>
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
}

export { renderClientes };
