// public/js/modules/products/products.js

import { authedFetch, getToken } from '/js/core/auth.js';

const tableBody = document.getElementById('products-table-body');
const statusEl  = document.getElementById('products-status');
const btnNew    = document.getElementById('btn-open-new-product');

// modal global que já existe no index.html
const modalWrapper     = document.getElementById('product-modal');
const modalCloseBtn    = document.getElementById('btn-close-form');
const productForm      = document.getElementById('product-form');
const productFormTitle = document.getElementById('product-form-title');

// campos do form
const inputId          = document.getElementById('prod-id');
const inputName        = document.getElementById('prod-name');
const inputSku         = document.getElementById('prod-sku');
const inputNcm         = document.getElementById('prod-ncm');
const inputUnit        = document.getElementById('prod-unit');
const inputCategory    = document.getElementById('prod-category');
const inputDescription = document.getElementById('prod-description');
const inputCost        = document.getElementById('prod-cost');
const inputPrice       = document.getElementById('prod-price');
const inputStock       = document.getElementById('prod-stock');
const inputSupplier    = document.getElementById('prod-supplier');

function showStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = `text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`;
}

async function loadProducts() {
    showStatus('Carregando produtos...');

    try {
        const res = await authedFetch('/api/products', {
            method: 'GET'
        });

        const data = await res.json();

        if (!data.success) {
            console.error('Erro ao carregar produtos:', data.error || data.message);
            tableBody.innerHTML = '';
            showStatus('Falha ao carregar produtos.', true);
            return;
        }

        renderProductsTable(data.data);
        showStatus(`${data.data.length} produto(s) carregado(s).`);

    } catch (err) {
        console.error('Erro geral ao carregar produtos:', err);
        tableBody.innerHTML = '';
        showStatus('Erro ao comunicar com o servidor.', true);
    }
}

function renderProductsTable(produtos = []) {
    tableBody.innerHTML = '';

    if (!produtos.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-3 py-6 text-center text-gray-400 text-sm">
                    Nenhum produto cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    produtos.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white hover:bg-gray-50';

        tr.innerHTML = `
            <td class="px-3 py-2 text-gray-900">
                <div class="font-medium">${p.name || '-'}</div>
                <div class="text-xs text-gray-500">${p.category || ''}</div>
            </td>

            <td class="px-3 py-2 text-gray-700 text-sm">
                ${p.sku || '-'}
            </td>

            <td class="px-3 py-2 text-right text-gray-900 font-semibold">
                R$ ${Number(p.sale_price || 0).toFixed(2)}
            </td>

            <td class="px-3 py-2 text-right text-gray-700">
                ${Number(p.stock || 0).toFixed(3)}
            </td>

            <td class="px-3 py-2 text-center text-sm">
                <button
                    class="text-blue-600 hover:text-blue-800 font-medium underline text-xs btn-edit-prod"
                    data-id="${p.id}"
                >
                    Editar
                </button>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    bindEditButtons(produtos);
}

// associa botão "Editar" de cada linha
function bindEditButtons(produtos) {
    document.querySelectorAll('.btn-edit-prod').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-id'));
            const prod = produtos.find(p => p.id === id);
            openProductModal('edit', prod);
        });
    });
}

// Abre o modal no modo criar ou editar
function openProductModal(mode, produto = null) {
    if (mode === 'create') {
        productForm.dataset.mode = 'create';
        productFormTitle.textContent = 'Novo Produto';
        inputId.value          = '';
        inputName.value        = '';
        inputSku.value         = '';
        inputNcm.value         = '';
        inputUnit.value        = '';
        inputCategory.value    = '';
        inputDescription.value = '';
        inputCost.value        = '';
        inputPrice.value       = '';
        inputStock.value       = '';
        inputSupplier.value    = '';
    } else {
        productForm.dataset.mode = 'edit';
        productFormTitle.textContent = 'Editar Produto';

        inputId.value          = produto.id || '';
        inputName.value        = produto.name || '';
        inputSku.value         = produto.sku || '';
        inputNcm.value         = produto.ncm || '';
        inputUnit.value        = produto.unit || '';
        inputCategory.value    = produto.category || '';
        inputDescription.value = produto.description || '';
        inputCost.value        = produto.cost_price || '';
        inputPrice.value       = produto.sale_price || '';
        inputStock.value       = produto.stock || '';
        inputSupplier.value    = produto.supplier_id || '';
    }

    modalWrapper.classList.remove('hidden', 'opacity-0');
    modalWrapper.classList.add('flex'); // porque no index.html esse modal usa flex para centralizar
}

// Fecha modal
function closeProductModal() {
    modalWrapper.classList.add('hidden');
    modalWrapper.classList.remove('flex');
}

// Clique no (X)
if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        closeProductModal();
    });
}

// Clique no botão "Novo Produto"
if (btnNew) {
    btnNew.addEventListener('click', () => {
        openProductModal('create');
    });
}

// Submit do formulário de produto
productForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const mode = productForm.dataset.mode || 'create';

    // pega valores do form
    const payload = {
        sku:          inputSku.value.trim() || null,
        barcode:      null, // você ainda não tem campo no modal, mas já suportado no backend
        name:         inputName.value.trim(),
        description:  inputDescription.value.trim() || null,
        category:     inputCategory.value.trim() || null,
        ncm:          inputNcm.value.trim() || null,
        unit:         inputUnit.value.trim() || null,
        cost_price:   inputCost.value ? Number(inputCost.value) : null,
        sale_price:   inputPrice.value ? Number(inputPrice.value) : null,
        stock:        inputStock.value ? Number(inputStock.value) : 0,
        supplier_id:  inputSupplier.value ? Number(inputSupplier.value) : null,
        ativo:        true
    };

    try {
        let res;
        if (mode === 'create') {
            res = await authedFetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            const id = inputId.value;
            res = await authedFetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();

        if (!data.success) {
            alert('Erro ao salvar produto: ' + (data.error || data.message));
            return;
        }

        closeProductModal();
        await loadProducts();
        alert('Produto salvo com sucesso.');

    } catch (err) {
        console.error('Erro ao salvar produto:', err);
        alert('Erro ao salvar produto.');
    }
});


// Função de inicialização chamada pelo router.js após injetar o HTML
function initPage() {
    loadProducts();
}

export { initPage };
