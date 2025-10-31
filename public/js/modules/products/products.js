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
const inputBarcode     = document.getElementById('prod-barcode'); // NOVO
const inputNcm         = document.getElementById('prod-ncm');
const inputUnit        = document.getElementById('prod-unit');
const inputCategory    = document.getElementById('prod-category');
const inputSubcategory = document.getElementById('prod-subcategory'); // NOVO
const inputProductType = document.getElementById('prod-product-type'); // NOVO
const inputCst         = document.getElementById('prod-cst'); // NOVO
const inputCsosn       = document.getElementById('prod-csosn'); // NOVO
const inputCfop        = document.getElementById('prod-cfop'); // NOVO
const inputDescription = document.getElementById('prod-description');
const inputCost        = document.getElementById('prod-cost');
const inputPrice       = document.getElementById('prod-price');
const inputProfitMargin= document.getElementById('prod-profit-margin'); // NOVO
const inputStock       = document.getElementById('prod-stock');
const inputMinStock    = document.getElementById('prod-min-stock'); // NOVO
const inputLocation    = document.getElementById('prod-location'); // NOVO
const inputWeight      = document.getElementById('prod-weight'); // NOVO
const inputHeight      = document.getElementById('prod-height'); // NOVO
const inputWidth       = document.getElementById('prod-width'); // NOVO
const inputDepth       = document.getElementById('prod-depth'); // NOVO
const inputObservations= document.getElementById('prod-observations'); // NOVO
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
        inputBarcode.value     = ''; // NOVO
        inputNcm.value         = '';
        inputUnit.value        = '';
        inputCategory.value    = '';
        inputSubcategory.value = ''; // NOVO
        inputProductType.value = 'fisico'; // NOVO
        inputCst.value         = ''; // NOVO
        inputCsosn.value       = ''; // NOVO
        inputCfop.value        = ''; // NOVO
        inputDescription.value = '';
        inputCost.value        = '';
        inputPrice.value       = '';
        inputProfitMargin.value= ''; // NOVO
        inputStock.value       = '';
        inputMinStock.value    = ''; // NOVO
        inputLocation.value    = ''; // NOVO
        inputWeight.value      = ''; // NOVO
        inputHeight.value      = ''; // NOVO
        inputWidth.value       = ''; // NOVO
        inputDepth.value       = ''; // NOVO
        inputObservations.value= ''; // NOVO
        inputSupplier.value    = '';
    } else {
        productForm.dataset.mode = 'edit';
        productFormTitle.textContent = 'Editar Produto';

        inputId.value          = produto.id || '';
        inputName.value        = produto.name || '';
        inputSku.value         = produto.sku || '';
        inputBarcode.value     = produto.barcode || ''; // NOVO
        inputNcm.value         = produto.ncm || '';
        inputUnit.value        = produto.unit || '';
        inputCategory.value    = produto.category || '';
        inputSubcategory.value = produto.subcategory || ''; // NOVO
        inputProductType.value = produto.product_type || 'fisico'; // NOVO
        inputCst.value         = produto.cst || ''; // NOVO
        inputCsosn.value       = produto.csosn || ''; // NOVO
        inputCfop.value        = produto.cfop || ''; // NOVO
        inputDescription.value = produto.description || '';
        inputCost.value        = produto.cost_price || '';
        inputPrice.value       = produto.sale_price || '';
        inputProfitMargin.value= produto.profit_margin || ''; // NOVO
        inputStock.value       = produto.stock || '';
        inputMinStock.value    = produto.min_stock || ''; // NOVO
        inputLocation.value    = produto.location || ''; // NOVO
        inputWeight.value      = produto.weight || ''; // NOVO
        inputHeight.value      = produto.height || ''; // NOVO
        inputWidth.value       = produto.width || ''; // NOVO
        inputDepth.value       = produto.depth || ''; // NOVO
        inputObservations.value= produto.observations || ''; // NOVO
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
        sku:            inputSku.value.trim() || null,
        barcode:        inputBarcode.value.trim() || null, // AGORA TEM CAMPO
        name:           inputName.value.trim(),
        description:    inputDescription.value.trim() || null,
        category:       inputCategory.value.trim() || null,
        subcategory:    inputSubcategory.value.trim() || null, // NOVO
        product_type:   inputProductType.value.trim() || 'fisico', // NOVO
        ncm:            inputNcm.value.trim() || null,
        cst:            inputCst.value.trim() || null, // NOVO
        csosn:          inputCsosn.value.trim() || null, // NOVO
        cfop:           inputCfop.value.trim() || null, // NOVO
        unit:           inputUnit.value.trim() || null,
        cost_price:     inputCost.value ? Number(inputCost.value) : null,
        sale_price:     inputPrice.value ? Number(inputPrice.value) : null,
        profit_margin:  inputProfitMargin.value ? Number(inputProfitMargin.value) : null, // NOVO
        stock:          inputStock.value ? Number(inputStock.value) : 0,
        min_stock:      inputMinStock.value ? Number(inputMinStock.value) : 0, // NOVO
        location:       inputLocation.value.trim() || null, // NOVO
        weight:         inputWeight.value ? Number(inputWeight.value) : null, // NOVO
        height:         inputHeight.value ? Number(inputHeight.value) : null, // NOVO
        width:          inputWidth.value ? Number(inputWidth.value) : null, // NOVO
        depth:          inputDepth.value ? Number(inputDepth.value) : null, // NOVO
        observations:   inputObservations.value.trim() || null, // NOVO
        supplier_id:    inputSupplier.value ? Number(inputSupplier.value) : null,
        ativo:          true
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