async function apiGetPurchaseOrders() {
    const resp = await fetch('/api/purchase');
    const data = await resp.json();
    if (!data.success) throw new Error('Falha ao carregar OCs');
    return data.data;
}

async function apiGetPurchaseOrderDetails(id) {
    const resp = await fetch(`/api/purchase/${id}`);
    return resp.json();
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
                <button class="text-blue-600 underline text-xs" data-open="${po.id}">
                    Ver
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-open]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-open');
            await openPurchaseDetails(id);
        });
    });
}

async function openPurchaseDetails(id) {
    const details = await apiGetPurchaseOrderDetails(id);
    if (!details.success) {
        alert('Não foi possível carregar detalhes da OC #' + id);
        return;
    }

    const { order, items, receipts } = details.data;

    let msg = `OC #${order.id}\nFornecedor: ${order.supplier_name}\nStatus: ${order.status}\nTotal: R$ ${Number(order.total || 0).toFixed(2)}\n\nITENS:\n`;

    items.forEach(it => {
        msg += `- [${it.product_id}] ${it.product_name} x ${it.quantity} @ R$ ${Number(it.unit_cost).toFixed(2)} (total R$ ${Number(it.total_cost).toFixed(2)})\n`;
    });

    if (receipts.length > 0) {
        msg += `\nRECEBIMENTOS:\n`;
        receipts.forEach(rc => {
            msg += `- ${rc.received_qty} un de ${rc.product_name} em ${new Date(rc.received_at).toLocaleString()} (${rc.branch || 'sem filial'}) por ${rc.received_by_name || '---'}\n`;
        });
    } else {
        msg += `\nRECEBIMENTOS:\n(nenhum ainda)\n`;
    }

    alert(msg);
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
        received_by: 1 // TODO: trocar pelo usuário logado
    });

    if (!result.success) {
        feedback.textContent = 'Erro: ' + (result.message || 'Falha ao registrar recebimento.');
    } else {
        feedback.textContent = `Recebido. Status da OC: ${result.data.order_status}. Novo estoque: ${result.data.new_stock}`;

        // recarrega lista para refletir status
        const rows = await apiGetPurchaseOrders();
        renderPurchaseTable(rows);
    }
}

async function initPage() {
    // bind recebimento
    const form = document.getElementById('po-receive-form');
    if (form) {
        form.addEventListener('submit', handleReceiveSubmit);
    }

    // botão "nova OC" (abre modal futuro)
    const newBtn = document.getElementById('btn-new-po');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            alert('TODO: abrir modal para criar nova ordem de compra (POST /api/purchase)');
        });
    }

    // carregar lista inicial
    try {
        const rows = await apiGetPurchaseOrders();
        renderPurchaseTable(rows);
    } catch (err) {
        console.error(err);
        const statusEl = document.getElementById('po-status');
        statusEl.textContent = 'Erro ao carregar OCs.';
    }
}

export { initPage };
