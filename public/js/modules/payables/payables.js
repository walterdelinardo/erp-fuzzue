import { authedFetch } from '/js/core/auth.js';

const unitInput   = document.getElementById('payables-unit-id');
const loadBtn     = document.getElementById('payables-load-btn');
const statusEl    = document.getElementById('payables-status');
const tableBody   = document.getElementById('payables-table-body');

const modalWrapper   = document.getElementById('payables-modal');
const closeModalBtn  = document.getElementById('payables-close-modal');
const baixaForm      = document.getElementById('payables-form');

const hiddenId       = document.getElementById('payables-current-id');
const baixaValor     = document.getElementById('payables-valor');
const baixaConta     = document.getElementById('payables-conta');
const baixaDesc      = document.getElementById('payables-desc');
const baixaMetodo    = document.getElementById('payables-metodo');
const idLabel        = document.getElementById('payables-modal-id-label');

function showStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = `text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`;
}

// carrega todos os títulos em aberto / parcial daquela filial
async function loadPayables() {
    const unitId = unitInput.value.trim();
    if (!unitId) {
        showStatus('Informe a filial.', true);
        return;
    }
    showStatus('Carregando títulos a pagar...');

    try {
        // vamos listar direto via SELECT na API?
        // ainda não temos rota dedicada pra listar por filial,
        // então vamos criar uma pequena rota GET provisória.
        //
        // Você pode adicionar no backend depois:
        // GET /api/finance/payables?unit_id=X
        //
        const res = await authedFetch(`/api/finance/payables?unit_id=${encodeURIComponent(unitId)}`);
        const data = await res.json();

        if (!data.success) {
            console.error('Falha ao carregar payables:', data.error || data.message);
            tableBody.innerHTML = '';
            showStatus('Erro ao carregar.', true);
            return;
        }

        renderTable(data.data);
        showStatus(`${data.data.length} título(s) carregado(s).`);

    } catch (err) {
        console.error('Erro geral ao carregar payables:', err);
        tableBody.innerHTML = '';
        showStatus('Erro de comunicação com servidor.', true);
    }
}

function renderTable(list = []) {
    tableBody.innerHTML = '';

    if (!list.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-3 py-6 text-center text-gray-400 text-sm">
                    Nenhum título em aberto para essa filial.
                </td>
            </tr>
        `;
        return;
    }

    list.forEach(tit => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white hover:bg-gray-50 text-sm';

        tr.innerHTML = `
            <td class="px-3 py-2 text-gray-900 font-medium">#${tit.id}</td>

            <td class="px-3 py-2 text-gray-800">
                <div class="font-medium">${tit.description}</div>
                <div class="text-[11px] text-gray-500">${tit.supplier_name || ''}</div>
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs">
                ${tit.due_date ? new Date(tit.due_date).toLocaleDateString() : '-'}
            </td>

            <td class="px-3 py-2 text-right text-gray-900 font-semibold">
                R$ ${Number(tit.amount_total || 0).toFixed(2)}
            </td>

            <td class="px-3 py-2 text-right text-gray-700">
                R$ ${Number(tit.amount_paid || 0).toFixed(2)}
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs font-semibold">
                <span class="inline-block rounded px-2 py-1 ${
                    tit.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : tit.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                }">
                    ${tit.status}
                </span>
            </td>

            <td class="px-3 py-2 text-center">
                ${tit.status === 'paid'
                    ? `<span class="text-[10px] text-gray-400 font-medium">Quitado</span>`
                    : `<button
                        class="text-red-600 hover:text-red-800 underline text-xs btn-baixar"
                        data-id="${tit.id}"
                    >
                        Baixar
                      </button>`
                }
            </td>
        `;

        tableBody.appendChild(tr);
    });

    bindBaixaButtons();
}

function bindBaixaButtons() {
    document.querySelectorAll('.btn-baixar').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openBaixaModal(id);
        });
    });
}

function openBaixaModal(id) {
    hiddenId.value = id;
    idLabel.textContent = `#${id}`;
    baixaValor.value = '';
    baixaConta.value = '';
    baixaDesc.value = '';
    baixaMetodo.value = '';
    modalWrapper.classList.remove('hidden', 'opacity-0');
    modalWrapper.classList.add('flex');
}

function closeBaixaModal() {
    modalWrapper.classList.add('hidden');
    modalWrapper.classList.remove('flex');
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        closeBaixaModal();
    });
}

// submit da baixa
baixaForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const payableId = hiddenId.value;
    const payload = {
        valor_pago: Number(baixaValor.value),
        cash_account_id: Number(baixaConta.value),
        descricao_movimento: baixaDesc.value.trim() || null,
        payment_method: baixaMetodo.value.trim() || null
    };

    if (!payload.valor_pago || !payload.cash_account_id) {
        alert('Preencha valor e conta.');
        return;
    }

    try {
        const res = await authedFetch(`/api/finance/payables/${payableId}/baixa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) {
            alert('Erro ao baixar: ' + (data.error || data.message));
            return;
        }

        closeBaixaModal();
        await loadPayables();
        alert('Baixa registrada com sucesso.');

    } catch (err) {
        console.error('Erro ao baixar título:', err);
        alert('Erro ao baixar título.');
    }
});

// botão "Carregar"
if (loadBtn) {
    loadBtn.addEventListener('click', () => {
        loadPayables();
    });
}

function initPage() {
    statusEl.textContent = 'Selecione a filial e clique em Carregar.';
}

export { initPage };
