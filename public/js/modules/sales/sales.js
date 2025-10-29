async function apiGetSales() {
    const resp = await fetch('/api/sales');
    const data = await resp.json();
    if (!data.success) throw new Error('Falha ao carregar vendas');
    return data.data;
}

function renderSalesTable(rows) {
    const tbody = document.getElementById('sales-tbody');
    const statusEl = document.getElementById('sales-status');

    tbody.innerHTML = '';
    statusEl.textContent = `Encontradas ${rows.length} vendas`;

    rows.forEach(sale => {
        const tr = document.createElement('tr');
        tr.className = 'border-b';

        tr.innerHTML = `
            <td class="px-2 py-1">${sale.id}</td>
            <td class="px-2 py-1">${sale.customer_name || ''}</td>
            <td class="px-2 py-1">${sale.status}</td>
            <td class="px-2 py-1 text-right">R$ ${Number(sale.total || 0).toFixed(2)}</td>
            <td class="px-2 py-1 text-xs text-gray-500">${new Date(sale.created_at).toLocaleString()}</td>
        `;

        tbody.appendChild(tr);
    });
}

async function initPage() {
    try {
        const rows = await apiGetSales();
        renderSalesTable(rows);
    } catch (err) {
        console.error(err);
        const statusEl = document.getElementById('sales-status');
        statusEl.textContent = 'Erro ao carregar vendas.';
    }
}

export { initPage };
