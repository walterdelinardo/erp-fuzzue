import { authedFetch } from '/js/core/auth.js';

const unitInput    = document.getElementById('finance-unit-id');
const loadBtn      = document.getElementById('finance-load-btn');

const statusEl     = document.getElementById('finance-status');
const summaryEl    = document.getElementById('finance-summary');
const accountsBody = document.getElementById('finance-accounts-body');

function showStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = `text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`;
}

async function loadDashboard() {
    const unitId = unitInput.value.trim();
    if (!unitId) {
        showStatus('Informe o ID da filial (unit_id).', true);
        return;
    }

    showStatus('Carregando financeiro da filial...');

    try {
        const res = await authedFetch(`/api/finance/dashboard?unit_id=${encodeURIComponent(unitId)}`);
        const data = await res.json();

        if (!data.success) {
            console.error('Falha ao carregar dashboard financeiro:', data.error || data.message);
            summaryEl.innerHTML = '';
            accountsBody.innerHTML = '';
            showStatus('Erro ao carregar financeiro.', true);
            return;
        }

        renderDashboard(data.data);
        showStatus(`Filial ${data.data.unit_id} carregada.`);

    } catch (err) {
        console.error('Erro geral ao carregar dashboard financeiro:', err);
        summaryEl.innerHTML = '';
        accountsBody.innerHTML = '';
        showStatus('Erro de comunicação com servidor.', true);
    }
}

function renderDashboard(d) {
    // Cards resumo pagar/receber
    summaryEl.innerHTML = `
        <div class="bg-white border border-gray-200 rounded-lg p-4 text-sm">
            <div class="text-gray-500 text-xs font-medium uppercase mb-1">A Pagar (Aberto)</div>
            <div class="text-gray-900 text-lg font-semibold">
                R$ ${Number(d.pagar_resumo.em_aberto_valor || 0).toFixed(2)}
            </div>
            <div class="text-[11px] text-gray-500">
                ${d.pagar_resumo.em_aberto_qtd} título(s)
            </div>
            <div class="mt-2 text-[11px] text-red-600">
                Vencido: R$ ${Number(d.pagar_resumo.vencido_valor || 0).toFixed(2)} (${d.pagar_resumo.vencido_qtd} título(s))
            </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-4 text-sm">
            <div class="text-gray-500 text-xs font-medium uppercase mb-1">A Receber (Aberto)</div>
            <div class="text-gray-900 text-lg font-semibold">
                R$ ${Number(d.receber_resumo.em_aberto_valor || 0).toFixed(2)}
            </div>
            <div class="text-[11px] text-gray-500">
                ${d.receber_resumo.em_aberto_qtd} título(s)
            </div>
            <div class="mt-2 text-[11px] text-orange-600">
                Vencido: R$ ${Number(d.receber_resumo.vencido_valor || 0).toFixed(2)} (${d.receber_resumo.vencido_qtd} título(s))
            </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-4 text-sm">
            <div class="text-gray-500 text-xs font-medium uppercase mb-1">Contas / Saldos</div>
            <div class="text-gray-900 text-lg font-semibold">
                ${d.saldos_contas.length} conta(s)
            </div>
            <div class="text-[11px] text-gray-500">
                Somatório:
                R$ ${sumAccounts(d.saldos_contas).toFixed(2)}
            </div>
            <div class="text-[11px] text-gray-400 mt-2">
                Inclui caixa físico, banco e PIX.
            </div>
        </div>
    `;

    // tabela de contas / saldos
    accountsBody.innerHTML = '';

    if (!d.saldos_contas.length) {
        accountsBody.innerHTML = `
            <tr>
                <td colspan="3" class="px-3 py-6 text-center text-gray-400 text-sm">
                    Nenhuma conta financeira cadastrada para esta filial.
                </td>
            </tr>
        `;
        return;
    }

    d.saldos_contas.forEach(acc => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white hover:bg-gray-50';

        tr.innerHTML = `
            <td class="px-3 py-2 text-gray-900 text-sm font-medium">
                ${acc.name}
            </td>
            <td class="px-3 py-2 text-gray-700 text-xs">
                ${acc.account_type}
            </td>
            <td class="px-3 py-2 text-right text-gray-900 text-sm font-semibold">
                R$ ${Number(acc.balance || 0).toFixed(2)}
            </td>
        `;

        accountsBody.appendChild(tr);
    });
}

function sumAccounts(list) {
    let total = 0;
    list.forEach(acc => {
        total += Number(acc.balance || 0);
    });
    return total;
}

// botão "Carregar"
if (loadBtn) {
    loadBtn.addEventListener('click', () => {
        loadDashboard();
    });
}

// inicialização da página no router
function initPage() {
    // opcional: você pode preencher unitInput com uma filial padrão da sessão do usuário futuramente.
    statusEl.textContent = 'Escolha uma filial e clique em Carregar.';
}

export { initPage };
