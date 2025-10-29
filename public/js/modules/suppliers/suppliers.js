import { authedFetch } from '/js/core/auth.js';

const tableBody      = document.getElementById('suppliers-table-body');
const statusEl       = document.getElementById('suppliers-status');
const btnNewSupplier = document.getElementById('btn-open-new-supplier');

const modalWrapper   = document.getElementById('supplier-modal');
const modalCloseBtn  = document.getElementById('btn-close-supplier-form');
const supplierForm   = document.getElementById('supplier-form');
const formTitleEl    = document.getElementById('supplier-form-title');

const inputId        = document.getElementById('sup-id');
const inputName      = document.getElementById('sup-name');
const inputDoc       = document.getElementById('sup-document');
const inputPhone     = document.getElementById('sup-phone');
const inputEmail     = document.getElementById('sup-email');
const inputAddress   = document.getElementById('sup-address');
const inputNotes     = document.getElementById('sup-notes');

function showStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = `text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`;
}

async function loadSuppliers() {
    showStatus('Carregando fornecedores...');
    try {
        const res = await authedFetch('/api/suppliers');
        const data = await res.json();

        if (!data.success) {
            console.error('Falha ao carregar fornecedores:', data.error || data.message);
            tableBody.innerHTML = '';
            showStatus('Erro ao carregar fornecedores.', true);
            return;
        }

        renderSuppliersTable(data.data);
        showStatus(`${data.data.length} fornecedor(es) carregado(s).`);
    } catch (err) {
        console.error('Erro geral ao carregar fornecedores:', err);
        tableBody.innerHTML = '';
        showStatus('Erro de comunicação com servidor.', true);
    }
}

function renderSuppliersTable(list = []) {
    tableBody.innerHTML = '';

    if (!list.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-3 py-6 text-center text-gray-400 text-sm">
                    Nenhum fornecedor cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    list.forEach(sup => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white hover:bg-gray-50';

        tr.innerHTML = `
            <td class="px-3 py-2 text-gray-900">
                <div class="font-medium">${sup.name || '-'}</div>
                <div class="text-xs text-gray-500">${sup.address || ''}</div>
            </td>

            <td class="px-3 py-2 text-gray-700 text-sm">
                ${sup.document || '-'}
            </td>

            <td class="px-3 py-2 text-gray-700 text-sm">
                ${sup.phone || '-'}
            </td>

            <td class="px-3 py-2 text-gray-700 text-sm">
                ${sup.email || '-'}
            </td>

            <td class="px-3 py-2 text-center text-sm">
                <button
                    class="text-blue-600 hover:text-blue-800 font-medium underline text-xs btn-edit-supplier"
                    data-id="${sup.id}"
                >
                    Editar
                </button>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    bindEditButtons(list);
}

function bindEditButtons(list) {
    document.querySelectorAll('.btn-edit-supplier').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-id'));
            const sup = list.find(s => s.id === id);
            openSupplierModal('edit', sup);
        });
    });
}

function openSupplierModal(mode, supplier = null) {
    if (mode === 'create') {
        supplierForm.dataset.mode = 'create';
        formTitleEl.textContent = 'Novo Fornecedor';

        inputId.value      = '';
        inputName.value    = '';
        inputDoc.value     = '';
        inputPhone.value   = '';
        inputEmail.value   = '';
        inputAddress.value = '';
        inputNotes.value   = '';
    } else {
        supplierForm.dataset.mode = 'edit';
        formTitleEl.textContent = 'Editar Fornecedor';

        inputId.value      = supplier.id || '';
        inputName.value    = supplier.name || '';
        inputDoc.value     = supplier.document || '';
        inputPhone.value   = supplier.phone || '';
        inputEmail.value   = supplier.email || '';
        inputAddress.value = supplier.address || '';
        inputNotes.value   = supplier.notes || '';
    }

    modalWrapper.classList.remove('hidden', 'opacity-0');
    modalWrapper.classList.add('flex');
}

function closeSupplierModal() {
    modalWrapper.classList.add('hidden');
    modalWrapper.classList.remove('flex');
}

if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        closeSupplierModal();
    });
}

if (btnNewSupplier) {
    btnNewSupplier.addEventListener('click', () => {
        openSupplierModal('create');
    });
}

supplierForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const mode = supplierForm.dataset.mode || 'create';

    const payload = {
        name:    inputName.value.trim(),
        document:inputDoc.value.trim() || null,
        phone:   inputPhone.value.trim() || null,
        email:   inputEmail.value.trim() || null,
        address: inputAddress.value.trim() || null,
        notes:   inputNotes.value.trim() || null,
        is_active: true
    };

    try {
        let res;
        if (mode === 'create') {
            res = await authedFetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            const id = inputId.value;
            res = await authedFetch(`/api/suppliers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();

        if (!data.success) {
            alert('Erro ao salvar fornecedor: ' + (data.error || data.message));
            return;
        }

        closeSupplierModal();
        await loadSuppliers();
        alert('Fornecedor salvo com sucesso.');

    } catch (err) {
        console.error('Erro ao salvar fornecedor:', err);
        alert('Erro ao salvar fornecedor.');
    }
});

function initPage() {
    loadSuppliers();
}

export { initPage };
