// public/js/modules/pdv/pdv.js

// --- estado local do carrinho ---
let cart = []; 
// cada item = { product_id, name, unit_price, qty }

// formata em BRL
function formatBRL(v) {
    const n = Number(v || 0);
    return "R$ " + n.toFixed(2).replace('.', ',');
}

// soma carrinho
function getTotals() {
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.unit_price * item.qty;
    });

    const discount = 0; // pode evoluir futuramente
    const total = subtotal - discount;

    return { subtotal, discount, total };
}

// renderiza carrinho na tabela
function renderCart() {
    const tbody = document.getElementById('pdv-cart-body');
    const emptyMsg = document.getElementById('pdv-empty-cart');

    tbody.innerHTML = '';

    if (cart.length === 0) {
        emptyMsg.classList.remove('hidden');
    } else {
        emptyMsg.classList.add('hidden');
    }

    cart.forEach((item, index) => {
        const lineTotal = item.unit_price * item.qty;

        const tr = document.createElement('tr');
        tr.className = 'border-b';

        tr.innerHTML = `
            <td class="px-2 py-1">${item.name}</td>

            <td class="px-2 py-1 text-right">
                <input
                    data-idx="${index}"
                    class="pdv-qty-input w-16 border rounded px-1 py-0.5 text-right text-sm"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value="${item.qty}"
                />
            </td>

            <td class="px-2 py-1 text-right">${formatBRL(item.unit_price)}</td>

            <td class="px-2 py-1 text-right">${formatBRL(lineTotal)}</td>

            <td class="px-2 py-1 text-right">
                <button
                    data-rm="${index}"
                    class="text-red-600 hover:text-red-700 text-xs underline"
                >
                    Remover
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // bind remover
    tbody.querySelectorAll('[data-rm]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-rm'));
            cart.splice(idx, 1);
            renderCart();
            renderTotals();
        });
    });

    // bind alterar quantidade
    tbody.querySelectorAll('.pdv-qty-input').forEach(input => {
        input.addEventListener('change', () => {
            const idx = parseInt(input.getAttribute('data-idx'));
            let val = parseFloat(input.value);
            if (isNaN(val) || val <= 0) val = 1;
            cart[idx].qty = val;
            renderCart();
            renderTotals();
        });
    });
}

// renderiza totals + troco
function renderTotals() {
    const { subtotal, discount, total } = getTotals();

    document.getElementById('pdv-subtotal').textContent = formatBRL(subtotal);
    document.getElementById('pdv-discount').textContent = formatBRL(discount);
    document.getElementById('pdv-total').textContent = formatBRL(total);

    // calcula troco se pagamento for dinheiro
    const method = document.getElementById('pdv-payment-method').value;
    const receivedInput = document.getElementById('pdv-cash-received').value;
    const receivedVal = parseFloat(receivedInput || '0') || 0;

    let change = 0;
    if (method === 'DINHEIRO') {
        change = receivedVal - total;
        if (change < 0) change = 0;
    }

    document.getElementById('pdv-change').textContent = formatBRL(change);
}

// adiciona item ao carrinho
function addItemToCart(product) {
    // product esperado: { id, name, sale_price }
    // se já existe no carrinho, soma quantidade
    const found = cart.find(i => i.product_id === product.id);
    if (found) {
        found.qty += 1;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            unit_price: Number(product.sale_price || 0),
            qty: 1
        });
    }
    renderCart();
    renderTotals();
}

// busca produtos na API
async function searchProducts(query) {
    // precisamos de uma rota que permita busca rápida
    // sugestão de backend:
    // GET /api/products/search?q=...
    const resp = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    const data = await resp.json();
    if (!data.success) {
        throw new Error(data.message || 'Falha na busca');
    }
    return data.data; // array de produtos
}

// renderiza resultados de busca
function renderSearchResults(products) {
    const box = document.getElementById('pdv-search-results');
    box.innerHTML = '';

    if (!products.length) {
        box.classList.remove('hidden');
        box.innerHTML = `
            <div class="p-3 text-xs text-gray-500 text-center">
                Nenhum produto encontrado.
            </div>
        `;
        return;
    }

    products.forEach(prod => {
        const row = document.createElement('button');
        row.className = 'w-full flex justify-between text-left text-sm p-3 hover:bg-gray-100';
        row.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-gray-800">${prod.name}</div>
                <div class="text-[11px] text-gray-500">
                    SKU: ${prod.sku || '-'} · Estoque: ${prod.stock ?? 0}
                </div>
            </div>
            <div class="text-right font-semibold text-gray-800">
                ${formatBRL(prod.sale_price || 0)}
            </div>
        `;

        row.addEventListener('click', () => {
            addItemToCart(prod);
            box.classList.add('hidden');
        });

        box.appendChild(row);
    });

    box.classList.remove('hidden');
}

// finaliza venda
async function finishSale() {
    const feedback = document.getElementById('pdv-feedback');

    if (cart.length === 0) {
        feedback.textContent = 'Carrinho vazio.';
        feedback.classList.remove('text-green-600');
        feedback.classList.add('text-red-600');
        return;
    }

    const { total } = getTotals();
    const payment_method = document.getElementById('pdv-payment-method').value;
    const cash_received_raw = document.getElementById('pdv-cash-received').value;
    const cash_received = parseFloat(cash_received_raw || '0') || 0;

    // Montar payload pro backend
    const salePayload = {
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.qty,
            unit_price: item.unit_price
        })),
        payment_method,
        total,
        cash_received,
        // TODO: incluir user logado
        // você pode importar getCurrentUser() de auth.js se quiser mais tarde
    };

    // Chama API de finalizar venda
    // a rota sugerida:
    // POST /api/sales/pdv
    const resp = await fetch('/api/sales/pdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
    });

    const data = await resp.json();
    if (!data.success) {
        feedback.textContent = data.message || 'Erro ao finalizar venda.';
        feedback.classList.remove('text-green-600');
        feedback.classList.add('text-red-600');
        return;
    }

    // se sucesso:
    feedback.textContent = `Venda #${data.data.sale_id} registrada!`;
    feedback.classList.remove('text-red-600');
    feedback.classList.add('text-green-600');

    // limpa carrinho
    cart = [];
    renderCart();
    renderTotals();

    // atualiza histórico
    loadRecentSales();
}

// pega últimas vendas p/ histórico (opcional)
async function getRecentSales() {
    // cria no backend:
    // GET /api/sales/recent -> retorna [{id, total, payment_method, created_at}, ...]
    const resp = await fetch('/api/sales/recent');
    const data = await resp.json();
    if (!data.success) return [];
    return data.data;
}

// desenha histórico
async function loadRecentSales() {
    const body = document.getElementById('pdv-history-body');
    const empty = document.getElementById('pdv-history-empty');

    body.innerHTML = '';

    try {
        const rows = await getRecentSales();

        if (!rows.length) {
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        rows.forEach(sale => {
            const tr = document.createElement('tr');
            tr.className = 'border-b';
            tr.innerHTML = `
                <td class="px-2 py-1">${sale.id}</td>
                <td class="px-2 py-1">${formatBRL(sale.total)}</td>
                <td class="px-2 py-1">${sale.payment_method}</td>
                <td class="px-2 py-1 text-xs text-gray-500">
                    ${new Date(sale.created_at).toLocaleString()}
                </td>
            `;
            body.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        empty.classList.remove('hidden');
    }
}

// bind de todos os eventos da tela
function bindEvents() {
    // busca produto
    const searchBtn = document.getElementById('pdv-search-btn');
    const searchInput = document.getElementById('pdv-search');

    searchBtn.addEventListener('click', async () => {
        const q = searchInput.value.trim();
        if (!q) return;
        try {
            const products = await searchProducts(q);
            renderSearchResults(products);
        } catch (err) {
            console.error(err);
            renderSearchResults([]);
        }
    });

    // Enter na busca
    searchInput.addEventListener('keydown', async (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            const q = searchInput.value.trim();
            if (!q) return;
            try {
                const products = await searchProducts(q);
                renderSearchResults(products);
            } catch (err) {
                console.error(err);
                renderSearchResults([]);
            }
        }
    });

    // limpar carrinho
    const clearBtn = document.getElementById('pdv-clear-cart');
    clearBtn.addEventListener('click', () => {
        if (cart.length === 0) return;
        if (confirm('Esvaziar carrinho?')) {
            cart = [];
            renderCart();
            renderTotals();
        }
    });

    // alterar forma de pagamento recalcula troco
    const methodSel = document.getElementById('pdv-payment-method');
    methodSel.addEventListener('change', () => {
        renderTotals();
    });

    // alterar valor recebido recalcula troco
    const cashInput = document.getElementById('pdv-cash-received');
    cashInput.addEventListener('input', () => {
        renderTotals();
    });

    // finalizar venda
    const finishBtn = document.getElementById('pdv-finish-sale');
    finishBtn.addEventListener('click', async () => {
        await finishSale();
    });
}

async function initPage() {
    cart = []; // zera carrinho sempre que abrir o PDV
    renderCart();
    renderTotals();
    bindEvents();
    loadRecentSales();
}

export { initPage };
