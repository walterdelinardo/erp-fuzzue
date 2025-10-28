// ------------------------------
// ESTADO DO PDV
// ------------------------------
let cartItems = [];          // [{ id, nome, precoUnit, quantidade, descontoItem }]
let descontoGeral = 0.00;
let descontosLiberados = false;

let searchTimeout = null;


// ------------------------------
// ELEMENTOS DO DOM
// ------------------------------
const searchInput           = document.getElementById('searchProduct');
const suggestionsList       = document.getElementById('productSuggestions');

const cartBody              = document.getElementById('cartBody');

const subtotalValueEl       = document.getElementById('subtotalValue');
const totalFinalValueEl     = document.getElementById('totalFinalValue');

const descontoGeralInput    = document.getElementById('descontoGeral');
const unlockDiscountBtn     = document.getElementById('unlockDiscountBtn');

const finalizarVendaBtn     = document.getElementById('finalizarVendaBtn');
const cancelarCarrinhoBtn   = document.getElementById('cancelarCarrinhoBtn');

const paymentModal          = document.getElementById('paymentModal');
const cancelarPagamentoBtn  = document.getElementById('cancelarPagamentoBtn');
const confirmarPagamentoBtn = document.getElementById('confirmarPagamentoBtn');

const pgTotalFinalEl        = document.getElementById('pgTotalFinal');
const pgMetodo1El           = document.getElementById('pgMetodo1');
const pgMetodo2El           = document.getElementById('pgMetodo2');
const pgValor1El            = document.getElementById('pgValor1');
const pgValor2El            = document.getElementById('pgValor2');
const pgTrocoEl             = document.getElementById('pgTroco');


// ------------------------------
// AUTOCOMPLETE DE PRODUTOS
// ------------------------------
searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim();
    if (term.length < 2) {
        hideSuggestions();
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetch(`/api/modules/pdv/search-products?query=${encodeURIComponent(term)}`)
            .then(res => res.json())
            .then(data => {
                renderProductSuggestions(data);
            })
            .catch(err => {
                console.error('Erro ao buscar produtos:', err);
            });
    }, 300);
});

function renderProductSuggestions(produtos = []) {
    if (!produtos.length) {
        hideSuggestions();
        return;
    }

    suggestionsList.innerHTML = '';

    produtos.forEach(prod => {
        const li = document.createElement('li');
        li.className = "px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 text-sm";

        li.innerHTML = `
            <span class="text-gray-700">${prod.nome} <span class="text-gray-400 text-xs">(${prod.sku || prod.codigo_barras || ''})</span></span>
            <strong class="text-gray-900">R$ ${Number(prod.preco).toFixed(2)}</strong>
        `;

        li.addEventListener('click', () => {
            addProductToCart(prod);
            hideSuggestions();
            searchInput.value = '';
        });

        suggestionsList.appendChild(li);
    });

    suggestionsList.classList.remove('hidden');
}

function hideSuggestions() {
    suggestionsList.classList.add('hidden');
    suggestionsList.innerHTML = '';
}


// ------------------------------
// CARRINHO
// ------------------------------
function addProductToCart(prod) {
    const existing = cartItems.find(i => i.id === prod.id);
    if (existing) {
        existing.quantidade += 1;
    } else {
        cartItems.push({
            id: prod.id,
            nome: prod.nome,
            precoUnit: Number(prod.preco),
            quantidade: 1,
            descontoItem: 0.00
        });
    }

    renderCart();
}

function renderCart() {
    cartBody.innerHTML = '';

    cartItems.forEach((item, index) => {
        const totalBruto    = item.precoUnit * item.quantidade;
        const totalLiquido  = totalBruto - item.descontoItem;
        const row           = document.createElement('tr');

        row.className = "align-top";

        row.innerHTML = `
            <td class="px-3 py-2 text-gray-900">
                <div class="font-medium">${item.nome}</div>
            </td>

            <td class="px-3 py-2 text-center">
                <input
                    type="number"
                    min="1"
                    value="${item.quantidade}"
                    data-index="${index}"
                    class="cart-qtd-input w-16 border border-gray-300 rounded-md px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
            </td>

            <td class="px-3 py-2 text-right text-gray-700">
                R$ ${item.precoUnit.toFixed(2)}
            </td>

            <td class="px-3 py-2 text-right">
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value="${item.descontoItem.toFixed(2)}"
                    data-index="${index}"
                    class="cart-desc-input w-20 border border-gray-300 rounded-md px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${descontosLiberados ? '' : 'bg-gray-100'}"
                    ${descontosLiberados ? '' : 'disabled'}
                >
            </td>

            <td class="px-3 py-2 text-right font-semibold text-gray-900">
                R$ ${totalLiquido.toFixed(2)}
            </td>

            <td class="px-3 py-2 text-center">
                <button
                    class="remove-item-btn text-red-600 hover:text-red-800 text-base leading-none"
                    data-index="${index}"
                    title="Remover item"
                >
                    🗑
                </button>
            </td>
        `;

        cartBody.appendChild(row);
    });

    bindCartEvents();
    recalcularTotais();
}

function bindCartEvents() {
    // quantidade
    document.querySelectorAll('.cart-qtd-input').forEach(input => {
        input.addEventListener('change', e => {
            const idx = e.target.getAttribute('data-index');
            const novaQtd = Number(e.target.value);
            if (novaQtd >= 1) {
                cartItems[idx].quantidade = novaQtd;
                renderCart();
            }
        });
    });

    // desconto por item
    document.querySelectorAll('.cart-desc-input').forEach(input => {
        input.addEventListener('change', e => {
            const idx = e.target.getAttribute('data-index');
            const novoDesc = Number(e.target.value);
            const item = cartItems[idx];
            const totalBruto = item.precoUnit * item.quantidade;
            cartItems[idx].descontoItem = Math.min(novoDesc, totalBruto);
            renderCart();
        });
    });

    // remover item
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const idx = e.target.getAttribute('data-index');
            cartItems.splice(idx, 1);
            renderCart();
        });
    });

    // desconto geral
    descontoGeralInput.addEventListener('change', e => {
        const valor = Number(e.target.value);
        descontoGeral = valor >= 0 ? valor : 0;
        recalcularTotais();
    });
}

function getSubtotalSemGeral() {
    let subtotal = 0;
    cartItems.forEach(item => {
        const bruto      = item.precoUnit * item.quantidade;
        const liquido    = bruto - item.descontoItem;
        subtotal        += liquido;
    });
    return subtotal;
}

function recalcularTotais() {
    const subtotal = getSubtotalSemGeral();

    // aplica desconto geral mas não deixa negativo
    const totalFinal = Math.max(subtotal - descontoGeral, 0);

    subtotalValueEl.textContent   = `R$ ${subtotal.toFixed(2)}`;
    totalFinalValueEl.textContent = `R$ ${totalFinal.toFixed(2)}`;
}


// ------------------------------
// DESBLOQUEAR DESCONTOS
// ------------------------------
unlockDiscountBtn.addEventListener('click', () => {
    const senha = window.prompt('Digite a senha de administrador para liberar descontos:');
    if (!senha) return;

    fetch('/api/modules/pdv/validate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha })
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.valid === true) {
            descontosLiberados = true;
            descontoGeralInput.disabled = false;
            descontoGeralInput.classList.remove('bg-gray-100');
            unlockDiscountBtn.textContent = '🔓';
            renderCart(); // re-render pra liberar inputs de desconto item
        } else {
            alert('Senha inválida');
        }
    })
    .catch(err => {
        console.error('Erro ao validar senha:', err);
        alert('Erro ao validar senha');
    });
});


// ------------------------------
// LIMPAR TELA / CANCELAR CARRINHO
// ------------------------------
cancelarCarrinhoBtn.addEventListener('click', () => {
    limparPDV();
});

function limparPDV() {
    cartItems = [];
    descontoGeral = 0.00;
    descontosLiberados = false;

    descontoGeralInput.value = '0.00';
    descontoGeralInput.disabled = true;
    descontoGeralInput.classList.add('bg-gray-100');
    unlockDiscountBtn.textContent = '🔒';

    pgValor1El.value = "0.00";
    pgValor2El.value = "0.00";
    pgMetodo1El.value = "dinheiro";
    pgMetodo2El.value = "";

    renderCart();
    fecharModalPagamento();
}


// ------------------------------
// PAGAMENTO (2 MÉTODOS)
// ------------------------------
finalizarVendaBtn.addEventListener('click', () => {
    // pega total final atual
    const totalFinalTexto = totalFinalValueEl.textContent.replace('R$','').trim();
    const totalFinal = Number(totalFinalTexto.replace(',', '.'));

    pgTotalFinalEl.textContent = `R$ ${totalFinal.toFixed(2)}`;
    abrirModalPagamento();
    atualizarTroco();
});

cancelarPagamentoBtn.addEventListener('click', () => {
    fecharModalPagamento();
});

[pgValor1El, pgValor2El, pgMetodo1El, pgMetodo2El].forEach(el => {
    el.addEventListener('input', atualizarTroco);
    el.addEventListener('change', atualizarTroco);
});

function abrirModalPagamento() {
    paymentModal.classList.remove('hidden');
}

function fecharModalPagamento() {
    paymentModal.classList.add('hidden');
}

function atualizarTroco() {
    const total = parseFloat(
        pgTotalFinalEl.textContent.replace('R$','').trim()
    );

    const v1 = Number(pgValor1El.value);
    const v2 = Number(pgValor2El.value);
    const pago = v1 + v2;

    let troco = 0;
    const m1 = pgMetodo1El.value;
    const m2 = pgMetodo2El.value;

    // troco só se algum meio for dinheiro e pago > total
    if ((m1 === 'dinheiro' || m2 === 'dinheiro') && pago > total) {
        troco = pago - total;
    }

    pgTrocoEl.textContent = `R$ ${troco.toFixed(2)}`;
}

// confirmar pagamento -> envia venda para backend
confirmarPagamentoBtn.addEventListener('click', () => {
    const total = parseFloat(
        pgTotalFinalEl.textContent.replace('R$','').trim()
    );

    const metodo1 = pgMetodo1El.value;
    const metodo2 = pgMetodo2El.value;
    const valor1  = Number(pgValor1El.value);
    const valor2  = Number(pgValor2El.value);

    const somaPagamentos = valor1 + valor2;

    // valida cobertura do total
    if (Number(somaPagamentos.toFixed(2)) < Number(total.toFixed(2))) {
        alert('Valor pago é menor que o total.');
        return;
    }

    const payloadVenda = {
        itens: cartItems,
        subtotal: getSubtotalSemGeral(),
        descontoGeral: descontoGeral,
        totalFinal: total,
        pagamentos: [
            { metodo: metodo1, valor: valor1 },
            ...(metodo2 ? [{ metodo: metodo2, valor: valor2 }] : [])
        ]
    };

    fetch('/api/modules/pdv/finalizar-venda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadVenda)
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.ok) {
            alert('Venda concluída com sucesso! ID: ' + data.venda_id);
            limparPDV();
        } else {
            alert('Erro ao concluir venda.');
        }
    })
    .catch(err => {
        console.error('Erro ao finalizar venda:', err);
        alert('Erro ao finalizar venda');
    });
});


// ------------------------------
// RENDER INICIAL
// ------------------------------
renderCart();
