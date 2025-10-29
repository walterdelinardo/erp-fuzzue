import { authedFetch } from '/js/core/auth.js';

const unitInput   = document.getElementById('receivables-unit-id');
const loadBtn     = document.getElementById('receivables-load-btn');
const statusEl    = document.getElementById('receivables-status');
const tableBody   = document.getElementById('receivables-table-body');

const modalWrapper   = document.getElementById('receivables-modal');
const closeModalBtn  = document.getElementById('receivables-close-modal');
const baixaForm      = document.getElementById('receivables-form');

const hiddenId       = document.getElementById('receivables-current-id');
const baixaValor     = document.getElementById('receivables-valor');
const baixaConta     = document.getElementById('receivables-conta');
const baixaDesc      = document.getElementById('receivables-desc');
const baixaMetodo    = document.getElementById('receivables-metodo');
const idLabel        = document.getElementById('receivables-modal-id-label');

function showStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = `text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`;
}

async function loadReceivables() {
    const unitId = unitInput.value.trim();
    if (!unitId) {
        showStatus('Informe a filial.', true);
        return;
    }
    showStatus('Carregando títulos a receber...');

    try {
        const res = await authedFetch(`/api/finance/receivables?unit_id=${encodeURIComponent(unitId)}`);
        const data = await res.json();

        if (!data.success) {
            console.error('Falha ao carregar receivables:', data.error || data.message);
            tableBody.innerHTML = '';
            showStatus('Erro ao carregar.', true);
            return;
        }

        renderTable(data.data);
        showStatus(`${data.data.length} título(s) carregado(s).`);

    } catch (err) {
        console.error('Erro geral ao carregar receivables:', err);
        tableBody.innerHTML = '';
        showStatus('Erro de comunicação com servidor.', true);
    }
}

function renderTable(list = []) {
    tableBody.innerHTML = '';

    if (!list.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-3 py-6 text-center text-gray-400 text-sm">
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
                <div class="font-medium">${tit.customer_name || '-'}</div>
                <div class="text-[11px] text-gray-500">Cliente</div>
            </td>

            <td class="px-3 py-2 text-gray-800">
                <div class="font-medium">${tit.description}</div>
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs">
                ${tit.due_date ? new Date(tit.due_date).toLocaleDateString() : '-'}
            </td>

            <td class="px-3 py-2 text-right text-gray-900 font-semibold">
                R$ ${Number(tit.amount_total || 0).toFixed(2)}
            </td>

            <td class="px-3 py-2 text-right text-gray-700">
                R$ ${Number(tit.amount_received || 0).toFixed(2)}
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs font-semibold">
                <span class="inline-block rounded px-2 py-1 ${
                    tit.status === 'received'
                        ? 'bg-green-100 text-green-700'
                        : tit.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                }">
                    ${tit.status}
                </span>
            </td>

            <td class="px-3 py-2 text-center">
                ${tit.status === 'received'
                    ? `<span class="text-[10px] text-gray-400 font-medium">Quitado</span>`
                    : `<button
                        class="text-green-600 hover:text-green-800 underline text-xs btn-receber"
                        data-id="${tit.id}"
                    >
                        Receber
                      </button>`
                }
            </td>
        `;

        tableBody.appendChild(tr);
    });

    bindReceberButtons();
}

function bindReceberButtons() {
    document.querySelectorAll('.btn-receber').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openReceberModal(id);
        });
    });
}

function openReceberModal(id) {
    hiddenId.value = id;
    idLabel.textContent = `#${id}`;
    baixaValor.value = '';
    baixaConta.value = '';
    baixaDesc.value = '';
    baixaMetodo.value = '';
    modalWrapper.classList.remove('hidden', 'opacity-0');
    modalWrapper.classList.add('flex');
}

function closeReceberModal() {
    modalWrapper.classList.add('hidden');
    modalWrapper.classList.remove('flex');
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        closeReceberModal();
    });
}

// submit da baixa (recebimento do título)
baixaForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const receivableId = hiddenId.value;
    const payload = {
        valor_recebido: Number(baixaValor.value),
        cash_account_id: Number(baixaConta.value),
        descricao_movimento: baixaDesc.value.trim() || null,
        receive_method: baixaMetodo.value.trim() || null
    };

    if (!payload.valor_recebido || !payload.cash_account_id) {
        alert('Preencha valor e conta.');
        return;
    }

    try {
        const res = await authedFetch(`/api/finance/receivables/${receivableId}/baixa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) {
            alert('Erro ao registrar recebimento: ' + (data.error || data.message));
            return;
        }

        closeReceberModal();
        await loadReceivables();
        alert('Recebimento registrado com sucesso.');

    } catch (err) {
        console.error('Erro ao registrar recebimento:', err);
        alert('Erro ao registrar recebimento.');
    }
});

// botão "Carregar"
if (loadBtn) {
    loadBtn.addEventListener('click', () => {
        loadReceivables();
    });
}

function initPage() {
    statusEl.textContent = 'Selecione a filial e clique em Carregar.';
}

export { initPage };
