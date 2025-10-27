// public/js/inventory-ui.js

async function postInventoryMove(payload) {
    const resp = await fetch('/api/inventory/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    return resp.json();
}

async function loadRecentMovements() {
    // vamos reaproveitar o /api/dashboard porque ele já retorna recent_movements
    const resp = await fetch('/api/dashboard');
    const data = await resp.json();
    if (!data.success) {
        throw new Error('Falha ao carregar movimentações.');
    }
    return data.data.recent_movements;
}

function renderRecentMovements(rows) {
    const tbody = document.getElementById('inv-movements-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    rows.forEach(mov => {
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
            <td class="px-2 py-1">${mov.product_name || '(?)'}</td>
            <td class="px-2 py-1">${mov.type === 'entrada' ? '➕ Entrada' : '➖ Saída'}</td>
            <td class="px-2 py-1 text-right">${mov.quantity}</td>
            <td class="px-2 py-1">${mov.reason || ''}</td>
            <td class="px-2 py-1">${mov.branch || ''}</td>
            <td class="px-2 py-1 text-xs text-gray-500">${new Date(mov.created_at).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleMoveSubmit(ev) {
    ev.preventDefault();

    const product_id = parseInt(document.getElementById('inv-product-id').value);
    const type       = document.getElementById('inv-type').value;
    const quantity   = parseFloat(document.getElementById('inv-qty').value);
    const reason     = document.getElementById('inv-reason').value.trim();
    const branch     = document.getElementById('inv-branch').value.trim();

    const feedback = document.getElementById('inv-feedback');

    feedback.textContent = 'Registrando...';

    const payload = {
        product_id,
        type,
        quantity,
        reason,
        branch,
        created_by: 1 // TODO: amarrar com usuário logado
    };

    const result = await postInventoryMove(payload);

    if (!result.success) {
        feedback.textContent = 'Erro: ' + (result.message || 'Falha ao registrar movimentação.');
    } else {
        feedback.textContent = 'Movimentação registrada. Novo estoque: ' + result.data.new_stock;
        // recarrega tabela de histórico:
        const rows = await loadRecentMovements();
        renderRecentMovements(rows);
    }
}

async function initInventoryPage() {
    // bind botão registrar
    const btn = document.getElementById('btn-inv-move');
    const form = document.getElementById('inventory-move-form');

    if (form && btn) {
        form.addEventListener('submit', handleMoveSubmit);
    }

    // carrega histórico inicial
    try {
        const rows = await loadRecentMovements();
        renderRecentMovements(rows);
    } catch (e) {
        console.error(e);
    }
}

export { initInventoryPage };
