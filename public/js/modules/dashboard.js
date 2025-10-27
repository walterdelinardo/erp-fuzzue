// public/js/dashboard.js

async function apiGetDashboard() {
    const resp = await fetch('/api/dashboard');
    const data = await resp.json();
    if (!data.success) {
        throw new Error('Falha ao carregar dashboard');
    }
    return data.data;
}

function renderTotals(totals) {
    const todayEl = document.getElementById('dash-total-today');
    const monthEl = document.getElementById('dash-total-month');
    const openEl  = document.getElementById('dash-open-sales');

    if (todayEl) todayEl.textContent = `R$ ${totals.total_sales_today.toFixed(2)}`;
    if (monthEl) monthEl.textContent = `R$ ${totals.total_sales_month.toFixed(2)}`;
    if (openEl)  openEl.textContent  = `${totals.open_sales_count}`;
}

function renderTopProducts(rows) {
    const tbody = document.getElementById('dash-top-products');
    if (!tbody) return;
    tbody.innerHTML = '';

    rows.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
            <td class="px-2 py-1">${p.product_name}</td>
            <td class="px-2 py-1 text-right">${p.total_qty_sold}</td>
            <td class="px-2 py-1 text-right">R$ ${p.total_revenue.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLowStock(rows) {
    const tbody = document.getElementById('dash-low-stock');
    if (!tbody) return;
    tbody.innerHTML = '';

    rows.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
            <td class="px-2 py-1">${item.name}</td>
            <td class="px-2 py-1">${item.sku || ''}</td>
            <td class="px-2 py-1 text-right">${item.stock}</td>
            <td class="px-2 py-1 text-right">R$ ${item.sale_price.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderRecentMovements(rows) {
    const tbody = document.getElementById('dash-movements');
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
            <td class="px-2 py-1">${mov.created_by_name || ''}</td>
            <td class="px-2 py-1 text-xs text-gray-500">${new Date(mov.created_at).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function initDashboardPage() {
    const statusEl = document.getElementById('dash-status');
    if (statusEl) statusEl.textContent = 'Carregando...';

    try {
        const data = await apiGetDashboard();

        renderTotals(data.totals);
        renderTopProducts(data.top_products);
        renderLowStock(data.low_stock);
        renderRecentMovements(data.recent_movements);

        if (statusEl) statusEl.textContent = '';
    } catch (err) {
        console.error(err);
        if (statusEl) statusEl.textContent = 'Erro ao carregar dashboard.';
    }
}

export { initDashboardPage };
