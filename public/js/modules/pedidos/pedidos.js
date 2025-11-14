// public/js/modules/pedidos/pedidos.js

document.addEventListener('DOMContentLoaded', () => {
    const pedidoForm        = document.getElementById('pedidoForm');
    const pedidoIdInput     = document.getElementById('pedidoId');
    const clienteIdInput    = document.getElementById('clienteId');
    const dataPedidoInput   = document.getElementById('dataPedido');
    const dataEntregaInput  = document.getElementById('dataEntrega');
    const statusPedidoInput = document.getElementById('statusPedido');
    const valorSubtotalInput= document.getElementById('valorSubtotal');
    const valorDescontoInput= document.getElementById('valorDesconto');
    const valorTotalInput   = document.getElementById('valorTotal');
    const observacoesInput  = document.getElementById('observacoes');

    const btnNovoPedido     = document.getElementById('btnNovoPedido');
    const btnLimparPedido   = document.getElementById('btnLimparPedido');
    const pedidosTableBody  = document.getElementById('pedidosTableBody');

    // Se você tiver helpers de auth (ex: getAuthHeaders) use aqui.
    // Para manter genérico, vou usar um wrapper simples.
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

    function limparFormulario() {
        pedidoIdInput.value = '';
        clienteIdInput.value = '';
        dataPedidoInput.value = '';
        dataEntregaInput.value = '';
        statusPedidoInput.value = 'aberto';
        valorSubtotalInput.value = '';
        valorDescontoInput.value = '0.00';
        valorTotalInput.value = '';
        observacoesInput.value = '';
    }

    function validarFormulario() {
        if (!clienteIdInput.value) {
            alert('Selecione um cliente.');
            return false;
        }
        if (!dataPedidoInput.value) {
            alert('Informe a data do pedido.');
            return false;
        }
        if (!valorSubtotalInput.value || Number(valorSubtotalInput.value) < 0) {
            alert('Informe o subtotal.');
            return false;
        }
        if (!valorTotalInput.value || Number(valorTotalInput.value) < 0) {
            alert('Informe o valor total.');
            return false;
        }
        return true;
    }

    async function carregarPedidos() {
        try {
            const result = await apiFetch('/api/pedidos/list');
            const pedidos = result.data || [];
            pedidosTableBody.innerHTML = '';

            pedidos.forEach(p => {
                const tr = document.createElement('tr');

                const tdId = document.createElement('td');
                tdId.textContent = p.id;

                const tdCliente = document.createElement('td');
                tdCliente.textContent = p.nome_cliente || p.cliente_id;

                const tdData = document.createElement('td');
                tdData.textContent = p.data_pedido
                    ? new Date(p.data_pedido).toLocaleDateString()
                    : '';

                const tdStatus = document.createElement('td');
                tdStatus.textContent = p.status_pedido;

                const tdValorTotal = document.createElement('td');
                tdValorTotal.textContent = Number(p.valor_total).toFixed(2);

                const tdAcoes = document.createElement('td');

                const btnEditar = document.createElement('button');
                btnEditar.textContent = 'Editar';
                btnEditar.addEventListener('click', () => preencherFormulario(p));

                const btnExcluir = document.createElement('button');
                btnExcluir.textContent = 'Excluir';
                btnExcluir.addEventListener('click', () => excluirPedido(p.id));

                tdAcoes.appendChild(btnEditar);
                tdAcoes.appendChild(btnExcluir);

                tr.appendChild(tdId);
                tr.appendChild(tdCliente);
                tr.appendChild(tdData);
                tr.appendChild(tdStatus);
                tr.appendChild(tdValorTotal);
                tr.appendChild(tdAcoes);

                pedidosTableBody.appendChild(tr);
            });

        } catch (err) {
            console.error(err);
            alert('Erro ao carregar pedidos: ' + err.message);
        }
    }

    function preencherFormulario(pedido) {
        pedidoIdInput.value      = pedido.id;
        clienteIdInput.value     = pedido.cliente_id;
        dataPedidoInput.value    = pedido.data_pedido
            ? pedido.data_pedido.substring(0, 10)
            : '';
        dataEntregaInput.value   = pedido.data_entrega
            ? pedido.data_entrega.substring(0, 10)
            : '';
        statusPedidoInput.value  = pedido.status_pedido;
        valorSubtotalInput.value = pedido.valor_subtotal;
        valorDescontoInput.value = pedido.valor_desconto;
        valorTotalInput.value    = pedido.valor_total;
        observacoesInput.value   = pedido.observacoes || '';
    }

    async function excluirPedido(id) {
        if (!confirm(`Confirma exclusão do pedido #${id}?`)) return;
        try {
            await apiFetch(`/api/pedidos/delete/${id}`, {
                method: 'DELETE'
            });
            await carregarPedidos();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir pedido: ' + err.message);
        }
    }

    pedidoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validarFormulario()) return;

        const payload = {
            cliente_id: Number(clienteIdInput.value),
            data_pedido: dataPedidoInput.value,
            data_entrega: dataEntregaInput.value || null,
            status_pedido: statusPedidoInput.value,
            valor_subtotal: Number(valorSubtotalInput.value),
            valor_desconto: Number(valorDescontoInput.value || 0),
            valor_total: Number(valorTotalInput.value),
            observacoes: observacoesInput.value || null
        };

        const id = pedidoIdInput.value;

        try {
            if (id) {
                await apiFetch(`/api/pedidos/update/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiFetch('/api/pedidos/create', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            limparFormulario();
            await carregarPedidos();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar pedido: ' + err.message);
        }
    });

    btnNovoPedido.addEventListener('click', () => {
        limparFormulario();
        clienteIdInput.focus();
    });

    btnLimparPedido.addEventListener('click', () => {
        limparFormulario();
    });

    // Inicial
    carregarPedidos();
});
