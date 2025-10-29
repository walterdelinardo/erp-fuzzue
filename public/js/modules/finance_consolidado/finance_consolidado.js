import { authedFetch } from '/js/core/auth.js';

const statusEl      = document.getElementById('fc-status');
const cardsWrapper  = document.getElementById('fc-global-cards');
const tableBody     = document.getElementById('fc-table-body');

function setStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = `text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`;
}

async function loadConsolidado() {
    setStatus('Carregando visão consolidada...');

    try {
        const res = await authedFetch('/api/finance/consolidado');
        const data = await res.json();

        if (!data.success) {
            console.error('Falha ao carregar consolidado:', data.error || data.message);
            renderCards(null);
            renderTable([]);
            setStatus('Erro ao carregar dados.', true);
            return;
        }

        renderCards(data.data.global_total);
        renderTable(data.data.unidades);
        setStatus('Visão consolidada carregada.');

    } catch (err) {
        console.error('Erro geral ao carregar consolidado:', err);
        renderCards(null);
        renderTable([]);
        setStatus('Erro de comunicação com o servidor.', true);
    }
}

function money(v) {
    return `R$ ${Number(v || 0).toFixed(2)}`;
}

function renderCards(globalTotal) {
    if (!globalTotal) {
        cardsWrapper.innerHTML = '';
        return;
    }

    const {
        saldo_total_contas,
        pagar_aberto_valor,
        pagar_vencido_valor,
        receber_aberto_valor
    } = globalTotal;

    cardsWrapper.innerHTML = `
        <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="text-[11px] text-gray-500 font-medium uppercase mb-1">Saldo Total (Caixa+Banco)</div>
            <div class="text-lg font-semibold text-gray-900">${money(saldo_total_contas)}</div>
            <div class="text-[11px] text-gray-400 mt-1">Somando todas as filiais</div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="text-[11px] text-red-600 font-medium uppercase mb-1">A Pagar (aberto)</div>
            <div class="text-lg font-semibold text-red-700">${money(pagar_aberto_valor)}</div>
            <div class="text-[11px] text-gray-400 mt-1">Compromissos assumidos e ainda não pagos</div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="text-[11px] text-red-600 font-medium uppercase mb-1">A Pagar (vencido)</div>
            <div class="text-lg font-semibold text-red-700">${money(pagar_vencido_valor)}</div>
            <div class="text-[11px] text-gray-400 mt-1">Risco jurídico / corte de fornecedor</div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="text-[11px] text-green-600 font-medium uppercase mb-1">A Receber (aberto)</div>
            <div class="text-lg font-semibold text-green-700">${money(receber_aberto_valor)}</div>
            <div class="text-[11px] text-gray-400 mt-1">Inadimplência impacta diretamente caixa</div>
        </div>
    `;
}

function renderTable(unidades = []) {
    tableBody.innerHTML = '';

    if (!unidades.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-3 py-6 text-center text-gray-400 text-sm">
                    Nenhuma unidade encontrada ou sem dados financeiros.
                </td>
            </tr>
        `;
        return;
    }

    unidades.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white hover:bg-gray-50 text-sm';

        const riscoClass =
            u.risco_liquidez > 0
                ? 'text-red-700 font-semibold'
                : 'text-green-700 font-semibold';

        tr.innerHTML = `
            <td class="px-3 py-2 text-gray-900 font-semibold">
                ${u.trade_name}
                <div class="text-[11px] text-gray-400 font-normal">ID Filial ${u.unit_id}</div>
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs">
                ${u.cidade || ''} / ${u.uf || ''}
            </td>

            <td class="px-3 py-2 text-right text-gray-900 font-semibold">
                ${money(u.saldo_total_contas)}
            </td>

            <td class="px-3 py-2 text-right text-red-700 font-semibold">
                ${money(u.pagar_aberto_valor)}
            </td>

            <td class="px-3 py-2 text-right text-red-700 text-xs">
                ${money(u.pagar_vencido_valor)}
            </td>

            <td class="px-3 py-2 text-right text-green-700 font-semibold">
                ${money(u.receber_aberto_valor)}
            </td>

            <td class="px-3 py-2 text-right text-green-700 text-xs">
                ${money(u.receber_vencido_valor)}
            </td>

            <td class="px-3 py-2 text-right ${riscoClass}">
                ${money(u.risco_liquidez)}
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

// inicialização que o router chama
function initPage() {
    // carrega automaticamente
    loadConsolidado();
}

export { initPage };
