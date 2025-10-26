// Estado global da aplicação
export let allProducts = [];
export let allSuppliers = [];

// --- Estado da Venda Atual (PDV) ---
export let currentSale = []; // Array de itens { product_id, name, price, quantity, total, discount }
export let currentPayments = []; // Array de pagamentos { type, value, installments }
export let currentSaleTotal = 0.00; // Total (calculado)
export let currentSaleGeneralDiscount = 0.00; // NOVO: Desconto geral em R$

// --- Mocks (dados estáticos) ---
export const mockStores = [
    { id: 1, name: "Loja Central (SP)", address: "Av. Paulista, 1000", phone: "11-3000-0000" },
    { id: 2, name: "Filial Zona Oeste (RJ)", address: "Rua B, 25", phone: "21-5555-1234" },
    { id: 3, name: "E-Commerce / Depósito", address: "Rua C, 40", phone: "11-9000-0000" }
];

export const mockNcms = [
    { id: 1, code: '72085100', desc: 'Chapas de ferro ou aço não ligado', letra: 'A', format: '7208.51.00', status: 'Ativo', rastreabilidade: true, diferimento: 'Ativo', aliquota_bloco_p: 4.65 },
    { id: 2, code: '76061190', desc: 'Chapas e tiras de alumínio', letra: 'B', format: '7606.11.90', status: 'Ativo', rastreabilidade: false, diferimento: 'Inativo', aliquota_bloco_p: 7.60 },
    { id: 3, code: '87039000', desc: 'Peças e acessórios de veículos', letra: 'C', format: '8703.90.00', status: 'Inativo', rastreabilidade: false, diferimento: 'Inativo', aliquota_bloco_p: 0.00 },
];
    
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

export const mockClients = [
    { id: 1, name: "Cliente Padrão", cnpj: "000.000.000-00", phone: "11987654321" },
    { id: 2, name: "Distribuidora Laranja S.A.", cnpj: "25.000.000/0001-01", phone: "21999887766" },
];

// --- Funções "Setters" para atualizar o estado ---

export function setAllProducts(products) {
    allProducts = products;
}
export function setAllSuppliers(suppliers) {
    allSuppliers = suppliers;
}

/**
 * Define o valor do desconto geral. (NOVA FUNÇÃO)
 * @param {number} amount - O valor do desconto em R$.
 */
export function setGeneralDiscount(amount) {
    currentSaleGeneralDiscount = amount;
}

/**
 * Limpa o estado da venda atual.
 */
export function clearSale() {
    currentSale = [];
    currentPayments = [];
    currentSaleTotal = 0.00;
    currentSaleGeneralDiscount = 0.00; // ATUALIZADO: Limpa o desconto
}

