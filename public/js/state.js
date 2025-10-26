// public/js/state.js

// -------------------------
// Estado de autenticação
// -------------------------
export let userId = null;          // ID do usuário logado
let authReady = false;             // se já podemos liberar a aplicação (true depois do login bem-sucedido)
export let currentRoute = 'dashboard'; // rota atual da aplicação

export function setUserId(id) {
    userId = id;
}

export function isAuthReady() {
    return authReady;
}

export function setAuthReady(val) {
    authReady = val;
}

export function setCurrentRoute(route) {
    currentRoute = route;
}

// -------------------------
// Catálogos principais carregados da API
// -------------------------
export let allProducts = [];
export let allSuppliers = [];

export function setAllProducts(list) {
    allProducts = Array.isArray(list) ? list : [];
}

export function setAllSuppliers(list) {
    allSuppliers = Array.isArray(list) ? list : [];
}

// -------------------------
// Estado do PDV / venda atual
// -------------------------
export let currentSale = [];               // itens: { product_id, name, price, quantity, total, discount }
export let currentPayments = [];           // pagamentos: { type, value, installments }
export let currentSaleTotal = 0.00;
export let currentSaleGeneralDiscount = 0.00; // desconto geral em R$

export function addItemToSale(item) {
    currentSale.push(item);
}

export function setSaleTotal(total) {
    currentSaleTotal = total;
}

export function setGeneralDiscount(amount) {
    currentSaleGeneralDiscount = amount;
}

export function addPayment(payment) {
    currentPayments.push(payment);
}

export function clearSale() {
    currentSale = [];
    currentPayments = [];
    currentSaleTotal = 0.00;
    currentSaleGeneralDiscount = 0.00;
}

// -------------------------
// Mocks temporários (dashboard, NCM etc.)
// -------------------------

export const mockStores = [
    { id: 1, name: "Loja Central (SP)", address: "Av. Paulista, 1000", phone: "11-3000-0000" },
    { id: 2, name: "Filial Zona Oeste (RJ)", address: "Rua B, 25", phone: "21-5555-1234" },
    { id: 3, name: "E-Commerce / Depósito", address: "Rua C, 40", phone: "11-9000-0000" }
];

// exemplo de mock fiscal/financeiro usado na home
export const mockFinancialData = {
    period: "Julho/2025",
    total_sales: 155000.00,
    cost_of_goods_sold: 80000.00,
    operating_expenses: 45000.00,
    net_profit: 30000.00,
    total_products_sold: 1250,
    best_selling_category: "Aço Inoxidável",
    worst_performing_store: "Filial Zona Oeste (RJ)"
};

// se você tiver mockNcms no seu arquivo antigo, você pode manter aqui também
// export const mockNcms = [ ... ];
