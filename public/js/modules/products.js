// public/js/products.js

async function apiGetProducts() {
    const resp = await fetch('/api/products');
    const data = await resp.json();
    if (!data.success) {
        throw new Error('Falha ao carregar produtos');
    }
    return data.data; // array
}

async function apiCreateProduct(prod) {
    const resp = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
    });
    const data = await resp.json();
    return data;
}

async function apiUpdateProduct(id, prod) {
    const resp = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
    });
    const data = await resp.json();
    return data;
}

async function apiDeleteProduct(id) {
    const resp = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
    });
    const data = await resp.json();
    return data;
}

// monta tabela na tela
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
                <td class="px-2 py-1">${prod.stock ?? 0}</td>
                <td class="px-2 py-1">${prod.sale_price ?? 0}</td>
                <td class="px-2 py-1">${prod.supplier_name || '-'}</td>
                <td class="px-2 py-1 text-right">
                    <button class="text-blue-600 underline mr-2" data-edit="${prod.id}">Editar</button>
                    <button class="text-red-600 underline" data-del="${prod.id}">Excluir</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // ligar botões de edição e exclusão
        tbody.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-edit');
                openEditForm(id);
            });
        });

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

// abre modal/formulário pra criar produto
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
}

// abre modal/formulário pra editar produto existente
async function openEditForm(id) {
    // pega dados atuais via GET /api/products/:id
    const resp = await fetch(`/api/products/${id}`);
    const data = await resp.json();
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
}

// preenche o form visualmente
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

// fecha modal
function closeForm() {
    document.getElementById('product-modal').classList.add('hidden');
}

// submit do form (create/edit)
async function submitForm(ev) {
    ev.preventDefault();

    const mode = ev.target.dataset.mode; // 'create' ou 'edit'
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

// inicialização da página produtos
function initProductsPage() {
    // botão "novo produto"
    const newBtn = document.getElementById('btn-new-product');
    if (newBtn) {
        newBtn.addEventListener('click', openCreateForm);
    }

    // botão fechar modal
    const closeBtn = document.getElementById('btn-close-form');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeForm);
    }

    // submit form
    const formEl = document.getElementById('product-form');
    if (formEl) {
        formEl.addEventListener('submit', submitForm);
    }

    // carrega tabela
    renderProductsTable();
}

// exporta init pra chamar quando rota / tela "produtos" abrir
export { initProductsPage };
