// public/js/purchase-ui.js

async function apiGetPurchaseOrders() {
    const resp = await fetch('/api/purchase');
    const data = await resp.json();
    if (!data.success) {
        throw new Error('Falha ao carregar OCs');
    }
    return data.data;
}

async function apiReceivePurchase(payload) {
    const resp = await fetch('/api/purchase/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return resp.json();
}

function renderPurchaseTable(rows) {
    const tbody = document.getElementById('po-tbody');
    const statusEl = document.getElementById('po-status');

    tbody.innerHTML = '';
    statusEl.textContent = `Encontradas ${rows.length} ordens de compra`;

    rows.forEach(po => {
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
            <td class="px-2 py-1">${po.id}</td>
            <td class="px-2 py-1">${po.supplier_name || ''}</td>
            <td class="px-2 py-1">${po.status}</td>
            <td class="px-2 py-1 text-right">R$ ${Number(po.total || 0).toFixed(2)}</td>
            <td class="px-2 py-1 text-xs text-gray-500">${new Date(po.created_at).toLocaleString()}</td>
            <td class="px-2 py-1 text-right">
                <button class="text-blue-600 underline text-xs" data-open="${po.id}">Ver</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // futuro: abrir detalhes da OC (itens, recebimentos)
    tbody.querySelectorAll('[data-open]').forEach(btn => {
        btn.addEventListener('click', () => {
            alert('TODO: detalhar OC #' + btn.getAttribute('data-open'));
        });
    });
}

async function handleReceiveSubmit(ev) {
    ev.preventDefault();

    const purchase_order_id = parseInt(document.getElementById('po-id').value);
    const product_id        = parseInt(document.getElementById('po-product-id').value);
    const received_qty      = parseFloat(document.getElementById('po-received-qty').value);
    const branch            = document.getElementById('po-branch').value.trim();
    const note              = document.getElementById('po-note').value.trim();
    const feedback          = document.getElementById('po-feedback');

    feedback.textContent = 'Registrando recebimento...';

    const result = await apiReceivePurchase({
        purchase_order_id,
        product_id,
        received_qty,
        branch,
        note,
        received_by: 1 // TODO: pegar usuário logado
    });

    if (!result.success) {
        feedback.textContent = 'Erro: ' + (result.message || 'Falha ao registrar recebimento.');
    } else {
        feedback.textContent = `Recebido com sucesso. Status atual da OC: ${result.data.order_status}. Novo estoque: ${result.data.new_stock}`;
        // Recarrega tabela OCs pra atualizar status/total:
        const rows = await apiGetPurchaseOrders();
        renderPurchaseTable(rows);
    }
}

async function initPurchasePage() {
    // bind botão de recebimento
    const form = document.getElementById('po-receive-form');
    const btn  = document.getElementById('btn-po-receive');
    if (form && btn) {
        form.addEventListener('submit', handleReceiveSubmit);
    }

    // carrega lista inicial de OCs
    try {
        const rows = await apiGetPurchaseOrders();
        renderPurchaseTable(rows);
    } catch (e) {
        console.error(e);
        const statusEl = document.getElementById('po-status');
        if (statusEl) statusEl.textContent = 'Erro ao carregar OCs.';
    }
}

export { initPurchasePage };
