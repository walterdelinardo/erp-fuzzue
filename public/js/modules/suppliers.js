// public/js/suppliers.js

async function apiGetSuppliers() {
    const resp = await fetch('/api/suppliers');
    const data = await resp.json();
    if (!data.success) {
        throw new Error('Falha ao carregar fornecedores');
    }
    return data.data;
}

async function apiGetSupplier(id) {
    const resp = await fetch(`/api/suppliers/${id}`);
    const data = await resp.json();
    return data;
}

async function apiCreateSupplier(payload) {
    const resp = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return resp.json();
}

async function apiUpdateSupplier(id, payload) {
    const resp = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return resp.json();
}

async function apiDeleteSupplier(id) {
    const resp = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE'
    });
    return resp.json();
}


// Renderizar tabela
async function renderSuppliersTable() {
    const tbody = document.getElementById('suppliers-tbody');
    const statusEl = document.getElementById('suppliers-status');

    tbody.innerHTML = '';
    statusEl.textContent = 'Carregando...';

    try {
        const suppliers = await apiGetSuppliers();
        statusEl.textContent = `Encontrados ${suppliers.length} fornecedores`;

        suppliers.forEach(s => {
            const tr = document.createElement('tr');
            tr.className = 'border-b';

            tr.innerHTML = `
                <td class="px-2 py-1">${s.id}</td>
                <td class="px-2 py-1">${s.name || ''}</td>
                <td class="px-2 py-1">${s.document || ''}</td>
                <td class="px-2 py-1">${s.phone || ''}</td>
                <td class="px-2 py-1">${s.email || ''}</td>
                <td class="px-2 py-1 text-right">
                    <button class="text-blue-600 underline mr-2" data-edit="${s.id}">Editar</button>
                    <button class="text-red-600 underline" data-del="${s.id}">Excluir</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // bind Editar
        tbody.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-edit');
                openEditSupplier(id);
            });
        });

        // bind Excluir
        tbody.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-del');
                if (confirm('Excluir este fornecedor?')) {
                    const result = await apiDeleteSupplier(id);
                    alert(result.message || 'Excluído.');
                    renderSuppliersTable();
                }
            });
        });

    } catch (err) {
        console.error(err);
        statusEl.textContent = 'Erro ao carregar fornecedores.';
    }
}

// abrir form "novo fornecedor"
function openCreateSupplier() {
    fillSupplierForm({
        id: '',
        name: '',
        document: '',
        email: '',
        phone: '',
        address: ''
    });
    document.getElementById('supplier-form-title').textContent = 'Novo Fornecedor';
    document.getElementById('supplier-form').dataset.mode = 'create';
    document.getElementById('supplier-modal').classList.remove('hidden');
}

// abrir form "editar fornecedor"
async function openEditSupplier(id) {
    const data = await apiGetSupplier(id);
    if (!data.success) {
        alert('Não foi possível carregar o fornecedor.');
        return;
    }

    const s = data.data;
    fillSupplierForm({
        id: s.id,
        name: s.name,
        document: s.document,
        email: s.email,
        phone: s.phone,
        address: s.address
    });

    document.getElementById('supplier-form-title').textContent = 'Editar Fornecedor';
    document.getElementById('supplier-form').dataset.mode = 'edit';
    document.getElementById('supplier-modal').classList.remove('hidden');
}

// preencher campos do modal
function fillSupplierForm(s) {
    document.getElementById('sup-id').value = s.id ?? '';
    document.getElementById('sup-name').value = s.name ?? '';
    document.getElementById('sup-document').value = s.document ?? '';
    document.getElementById('sup-email').value = s.email ?? '';
    document.getElementById('sup-phone').value = s.phone ?? '';
    document.getElementById('sup-address').value = s.address ?? '';
}

function closeSupplierForm() {
    document.getElementById('supplier-modal').classList.add('hidden');
}

// submit do form
async function submitSupplierForm(ev) {
    ev.preventDefault();

    const mode = ev.target.dataset.mode;
    const id = document.getElementById('sup-id').value;

    const payload = {
        name: document.getElementById('sup-name').value.trim(),
        document: document.getElementById('sup-document').value.trim(),
        email: document.getElementById('sup-email').value.trim(),
        phone: document.getElementById('sup-phone').value.trim(),
        address: document.getElementById('sup-address').value.trim()
    };

    let result;
    if (mode === 'create') {
        result = await apiCreateSupplier(payload);
    } else {
        result = await apiUpdateSupplier(id, payload);
    }

    if (!result.success) {
        alert(result.message || 'Erro ao salvar fornecedor.');
        return;
    }

    closeSupplierForm();
    renderSuppliersTable();
}

// inicializador da tela de fornecedores
function initSuppliersPage() {
    // botão "novo fornecedor"
    const newBtn = document.getElementById('btn-new-supplier');
    if (newBtn) {
        newBtn.addEventListener('click', openCreateSupplier);
    }

    // botão fechar modal
    const closeBtn = document.getElementById('btn-close-supplier-form');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSupplierForm);
    }

    // submit form
    const formEl = document.getElementById('supplier-form');
    if (formEl) {
        formEl.addEventListener('submit', submitSupplierForm);
    }

    // carrega tabela
    renderSuppliersTable();
}

export { initSuppliersPage };
