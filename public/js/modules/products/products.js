async function apiGetProducts() {
    const resp = await fetch('/api/products');
    const data = await resp.json();
    if (!data.success) {
        throw new Error('Falha ao carregar produtos');
    }
    return data.data;
}

async function apiGetProduct(id) {
    const resp = await fetch(`/api/products/${id}`);
    return resp.json();
}

async function apiCreateProduct(prod) {
    const resp = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
    });
    return resp.json();
}

async function apiUpdateProduct(id, prod) {
    const resp = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
    });
    return resp.json();
}

async function apiDeleteProduct(id) {
    const resp = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
    });
    return resp.json();
}

// Preenche tabela
async function renderProductsTable() {
    const tbody = document.getElementById('products-tbody');
    const statusEl = document.getElementById('products-status');

    tbody.innerHTML = '';
    statusEl.textContent = 'Carregando...';

    try {
        const products = await apiGetProducts();
        statusEl.textContent = `Encontrados ${products.length} produtos`;

        products.forEach(prod => {
            const tr = document.createElement('tr');
            tr.className = 'border-b';

            tr.innerHTML = `
                <td class="px-2 py-1">${prod.id}</td>
                <td class="px-2 py-1">${prod.name || ''}</td>
                <td class="px-2 py-1">${prod.sku || ''}</td>
                <td class="px-2 py-1">${prod.ncm || ''}</td>
                <td class="px-2 py-1 text-right">${prod.stock ?? 0}</td>
                <td class="px-2 py-1 text-right">${prod.sale_price ?? 0}</td>
                <td class="px-2 py-1">${prod.supplier_name || '-'}</td>
                <td class="px-2 py-1 text-right">
                    <button class="text-blue-600 underline mr-2" data-edit="${prod.id}">Editar</button>
                    <button class="text-red-600 underline" data-del="${prod.id}">Excluir</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Botão editar
        tbody.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => openEditForm(btn.getAttribute('data-edit')));
        });

        // Botão excluir
        tbody.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-del');
                if (confirm('Excluir este produto?')) {
                    const result = await apiDeleteProduct(id);
                    alert(result.message || 'Excluído.');
                    renderProductsTable();
                }
            });
        });

    } catch (err) {
        console.error(err);
        statusEl.textContent = 'Erro ao carregar produtos.';
    }
}

// Helpers do modal
function fillFormFields(p) {
    document.getElementById('prod-id').value = p.id ?? '';
    document.getElementById('prod-name').value = p.name ?? '';
    document.getElementById('prod-sku').value = p.sku ?? '';
    document.getElementById('prod-ncm').value = p.ncm ?? '';
    document.getElementById('prod-unit').value = p.unit ?? 'un';
    document.getElementById('prod-category').value = p.category ?? '';
    document.getElementById('prod-description').value = p.description ?? '';
    document.getElementById('prod-cost').value = p.cost_price ?? 0;
    document.getElementById('prod-price').value = p.sale_price ?? 0;
    document.getElementById('prod-stock').value = p.stock ?? 0;
    document.getElementById('prod-supplier').value = p.supplier_id ?? '';
}

function openCreateForm() {
    fillFormFields({
        id: '',
        name: '',
        sku: '',
        ncm: '',
        unit: 'un',
        category: '',
        description: '',
        cost_price: 0,
        sale_price: 0,
        stock: 0,
        supplier_id: ''
    });
    document.getElementById('product-form-title').textContent = 'Novo Produto';
    document.getElementById('product-form').dataset.mode = 'create';
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-modal').classList.add('flex');
}

async function openEditForm(id) {
    const data = await apiGetProduct(id);
    if (!data.success) {
        alert('Não foi possível carregar o produto.');
        return;
    }
    const p = data.data;

    fillFormFields({
        id: p.id,
        name: p.name,
        sku: p.sku,
        ncm: p.ncm,
        unit: p.unit,
        category: p.category,
        description: p.description,
        cost_price: p.cost_price,
        sale_price: p.sale_price,
        stock: p.stock,
        supplier_id: p.supplier_id
    });

    document.getElementById('product-form-title').textContent = 'Editar Produto';
    document.getElementById('product-form').dataset.mode = 'edit';
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-modal').classList.add('flex');
}

function closeForm() {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-modal').classList.remove('flex');
}

// submit do form (create/edit)
async function submitForm(ev) {
    ev.preventDefault();

    const mode = ev.target.dataset.mode;
    const id = document.getElementById('prod-id').value;

    const payload = {
        name: document.getElementById('prod-name').value.trim(),
        sku: document.getElementById('prod-sku').value.trim(),
        ncm: document.getElementById('prod-ncm').value.trim(),
        unit: document.getElementById('prod-unit').value.trim(),
        category: document.getElementById('prod-category').value.trim(),
        description: document.getElementById('prod-description').value.trim(),
        cost_price: parseFloat(document.getElementById('prod-cost').value || 0),
        sale_price: parseFloat(document.getElementById('prod-price').value || 0),
        stock: parseFloat(document.getElementById('prod-stock').value || 0),
        supplier_id: document.getElementById('prod-supplier').value
            ? parseInt(document.getElementById('prod-supplier').value)
            : null
    };

    let result;
    if (mode === 'create') {
        result = await apiCreateProduct(payload);
    } else {
        result = await apiUpdateProduct(id, payload);
    }

    if (!result.success) {
        alert(result.message || 'Erro.');
        return;
    }

    closeForm();
    renderProductsTable();
}

function bindModalEvents() {
    const newBtn = document.getElementById('btn-new-product');
    if (newBtn) newBtn.addEventListener('click', openCreateForm);

    const closeBtn = document.getElementById('btn-close-form');
    if (closeBtn) closeBtn.addEventListener('click', closeForm);

    const formEl = document.getElementById('product-form');
    if (formEl) formEl.addEventListener('submit', submitForm);
}

async function initPage() {
    bindModalEvents();
    renderProductsTable();
}

export { initPage };
