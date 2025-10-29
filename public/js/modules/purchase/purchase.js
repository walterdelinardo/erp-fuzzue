import { authedFetch } from '/js/core/auth.js';

const tableBody      = document.getElementById('po-table-body');
const statusEl       = document.getElementById('po-status');
const btnNewPO       = document.getElementById('btn-open-new-po');

const poModal        = document.getElementById('po-modal');
const poForm         = document.getElementById('po-form');
const poCloseBtn     = document.getElementById('btn-close-po-form');

// campos do form
const inputSupplierId    = document.getElementById('po-supplier-id');
const inputNotesInternal = document.getElementById('po-notes-internal');
const inputNotesSupplier = document.getElementById('po-notes-supplier');
const inputItensRaw      = document.getElementById('po-itens-raw');
const inputDescontoGeral = document.getElementById('po-desconto-geral');

function showStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = `text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`;
}

async function loadPOs() {
    showStatus('Carregando ordens de compra...');
    try {
        const res = await authedFetch('/api/purchase');
        const data = await res.json();

        if (!data.success) {
            console.error('Falha ao carregar OCs:', data.error || data.message);
            tableBody.innerHTML = '';
            showStatus('Erro ao carregar ordens de compra.', true);
            return;
        }

        renderPOTable(data.data);
        showStatus(`${data.data.length} OC(s) carregada(s).`);
    } catch (err) {
        console.error('Erro geral ao carregar OCs:', err);
        tableBody.innerHTML = '';
        showStatus('Erro de comunicação com servidor.', true);
    }
}

function renderPOTable(list = []) {
    tableBody.innerHTML = '';

    if (!list.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-3 py-6 text-center text-gray-400 text-sm">
                    Nenhuma ordem de compra registrada.
                </td>
            </tr>
        `;
        return;
    }

    list.forEach(po => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white hover:bg-gray-50';

        tr.innerHTML = `
            <td class="px-3 py-2 text-gray-900 text-sm font-medium">
                #${po.id}
            </td>

            <td class="px-3 py-2 text-gray-800 text-sm">
                ${po.supplier_name || '-'}
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs font-semibold">
                <span class="inline-block rounded px-2 py-1 ${
                    po.status === 'received'
                        ? 'bg-green-100 text-green-700'
                        : po.status === 'canceled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                }">
                    ${po.status}
                </span>
            </td>

            <td class="px-3 py-2 text-right text-gray-900 text-sm font-semibold">
                R$ ${Number(po.total_final || 0).toFixed(2)}
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs">
                ${po.created_at ? new Date(po.created_at).toLocaleString() : '-'}
            </td>

            <td class="px-3 py-2 text-gray-700 text-xs">
                ${po.received_at ? new Date(po.received_at).toLocaleString() : '-'}
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

function openPOModal() {
    poModal.classList.remove('hidden', 'opacity-0');
    poModal.classList.add('flex');
    poForm.dataset.mode = 'create';

    // limpa form
    inputSupplierId.value    = '';
    inputNotesInternal.value = '';
    inputNotesSupplier.value = '';
    inputItensRaw.value      = '';
    inputDescontoGeral.value = '0.00';
}

function closePOModal() {
    poModal.classList.add('hidden');
    poModal.classList.remove('flex');
}

if (btnNewPO) {
    btnNewPO.addEventListener('click', () => {
        openPOModal();
    });
}

if (poCloseBtn) {
    poCloseBtn.addEventListener('click', () => {
        closePOModal();
    });
}

// salva nova OC
poForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    // parse rápido dos itens do textarea
    // formato linha: product_id | qtd | custo_unitario
    // ex:
    // 1 | 50 | 18.5
    // 2 | 10 | 7.2
    const itens = [];
    const linhas = inputItensRaw.value.split('\n');
    for (const linha of linhas) {
        const clean = linha.trim();
        if (!clean) continue;
        const partes = clean.split('|').map(v => v.trim());
        if (partes.length < 3) continue;

        const productId = Number(partes[0]);
        const qtd       = Number(partes[1]);
        const custo     = Number(partes[2]);

        itens.push({
            product_id: productId,
            descricao_item: null, // opcional, pode ser buscado do produto futuramente
            quantidade: qtd,
            unidade: 'un',
            custo_unitario: custo
        });
    }

    const payload = {
        supplier_id: Number(inputSupplierId.value),
        notes_internal: inputNotesInternal.value.trim() || null,
        notes_supplier: inputNotesSupplier.value.trim() || null,
        itens,
        desconto_total: Number(inputDescontoGeral.value)
    };

    try {
        const res = await authedFetch('/api/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!data.success) {
            alert('Erro ao salvar ordem de compra: ' + (data.error || data.message));
            return;
        }

        closePOModal();
        await loadPOs();
        alert(`OC #${data.data.purchase_order_id} criada.`);

    } catch (err) {
        console.error('Erro ao salvar OC:', err);
        alert('Erro ao salvar ordem de compra.');
    }
});

function initPage() {
    loadPOs();
}

export { initPage };
