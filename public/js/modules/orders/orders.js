// public/js/modules/orders/orders.js

document.addEventListener('DOMContentLoaded', () => {
    const orderForm          = document.getElementById('orderForm');
    const orderIdInput       = document.getElementById('orderId');
    const customerIdInput    = document.getElementById('customerId');
    const orderDateInput     = document.getElementById('orderDate');
    const deliveryDateInput  = document.getElementById('deliveryDate');
    const orderStatusInput   = document.getElementById('orderStatus');
    const subtotalAmountInput= document.getElementById('subtotalAmount');
    const discountAmountInput= document.getElementById('discountAmount');
    const totalAmountInput   = document.getElementById('totalAmount');
    const notesInput         = document.getElementById('notes');

    const btnNewOrder        = document.getElementById('btnNewOrder');
    const btnClearOrder      = document.getElementById('btnClearOrder');
    const ordersTableBody    = document.getElementById('ordersTableBody');

    async function apiFetch(url, options = {}) {
        const finalOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        };
        const response = await fetch(url, finalOptions);
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
            const msg = data.message || 'Erro na requisição';
            throw new Error(msg);
        }
        return data;
    }

    function clearForm() {
        orderIdInput.value        = '';
        customerIdInput.value     = '';
        orderDateInput.value      = '';
        deliveryDateInput.value   = '';
        orderStatusInput.value    = 'open';
        subtotalAmountInput.value = '';
        discountAmountInput.value = '0.00';
        totalAmountInput.value    = '';
        notesInput.value          = '';
    }

    function validateForm() {
        if (!customerIdInput.value) {
            alert('Selecione um cliente.');
            return false;
        }
        if (!orderDateInput.value) {
            alert('Informe a data do pedido.');
            return false;
        }
        if (!subtotalAmountInput.value || Number(subtotalAmountInput.value) < 0) {
            alert('Informe o subtotal.');
            return false;
        }
        if (!totalAmountInput.value || Number(totalAmountInput.value) < 0) {
            alert('Informe o valor total.');
            return false;
        }
        return true;
    }

    async function loadOrders() {
        try {
            const result = await apiFetch('/api/orders/list');
            const orders = result.data || [];
            ordersTableBody.innerHTML = '';

            orders.forEach(o => {
                const tr = document.createElement('tr');

                const tdId = document.createElement('td');
                tdId.textContent = o.id;

                const tdCustomer = document.createElement('td');
                tdCustomer.textContent = o.customer_name || o.customer_id;

                const tdDate = document.createElement('td');
                tdDate.textContent = o.order_date
                    ? new Date(o.order_date).toLocaleDateString()
                    : '';

                const tdStatus = document.createElement('td');
                tdStatus.textContent = o.status;

                const tdTotal = document.createElement('td');
                tdTotal.textContent = Number(o.total_amount).toFixed(2);

                const tdActions = document.createElement('td');

                const btnEdit = document.createElement('button');
                btnEdit.textContent = 'Editar';
                btnEdit.addEventListener('click', () => fillForm(o));

                const btnDelete = document.createElement('button');
                btnDelete.textContent = 'Excluir';
                btnDelete.addEventListener('click', () => deleteOrder(o.id));

                tdActions.appendChild(btnEdit);
                tdActions.appendChild(btnDelete);

                tr.appendChild(tdId);
                tr.appendChild(tdCustomer);
                tr.appendChild(tdDate);
                tr.appendChild(tdStatus);
                tr.appendChild(tdTotal);
                tr.appendChild(tdActions);

                ordersTableBody.appendChild(tr);
            });

        } catch (err) {
            console.error(err);
            alert('Erro ao carregar orders: ' + err.message);
        }
    }

    function fillForm(o) {
        orderIdInput.value        = o.id;
        customerIdInput.value     = o.customer_id;
        orderDateInput.value      = o.order_date
            ? o.order_date.substring(0, 10)
            : '';
        deliveryDateInput.value   = o.delivery_date
            ? o.delivery_date.substring(0, 10)
            : '';
        orderStatusInput.value    = o.status;
        subtotalAmountInput.value = o.subtotal_amount;
        discountAmountInput.value = o.discount_amount;
        totalAmountInput.value    = o.total_amount;
        notesInput.value          = o.notes || '';
    }

    async function deleteOrder(id) {
        if (!confirm(`Confirma exclusão da order #${id}?`)) return;
        try {
            await apiFetch(`/api/orders/delete/${id}`, {
                method: 'DELETE'
            });
            await loadOrders();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir order: ' + err.message);
        }
    }

    orderForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm()) return;

        const payload = {
            customer_id: Number(customerIdInput.value),
            order_date: orderDateInput.value,
            delivery_date: deliveryDateInput.value || null,
            status: orderStatusInput.value,
            subtotal_amount: Number(subtotalAmountInput.value),
            discount_amount: Number(discountAmountInput.value || 0),
            total_amount: Number(totalAmountInput.value),
            notes: notesInput.value || null
        };

        const id = orderIdInput.value;

        try {
            if (id) {
                await apiFetch(`/api/orders/update/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiFetch('/api/orders/create', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            clearForm();
            await loadOrders();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar order: ' + err.message);
        }
    });

    btnNewOrder.addEventListener('click', () => {
        clearForm();
        customerIdInput.focus();
    });

    btnClearOrder.addEventListener('click', () => {
        clearForm();
    });

    // Inicial
    loadOrders();
});
