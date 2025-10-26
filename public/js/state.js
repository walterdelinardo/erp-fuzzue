/**
 * public/js/state.js
 * * Gerencia o estado global da aplicação frontend.
 */

// Estado da Autenticação
let currentUserId = null;
let authReady = false;

// Dados da API
let allProducts = [];
let allSuppliers = [];

// Estado da Venda Atual (PDV)
let currentSale = []; // Array de itens { product_id, name, price, quantity, total }
let currentPayments = []; // Array de pagamentos { type, value, installments }
let currentSaleTotal = 0.00;

// Estado da Rota Atual
let currentRoute = 'dashboard';

// Mock Data (temporário para módulos ainda não conectados à API)
const mockStores = [
    { id: 1, name: "Loja Central (SP)", address: "Av. Paulista, 1000", phone: "11-3000-0000" },
    { id: 2, name: "Filial Zona Oeste (RJ)", address: "Rua B, 25", phone: "21-5555-1234" },
    { id: 3, name: "E-Commerce / Depósito", address: "Rua C, 40", phone: "11-9000-0000" }
];
const mockNcms = [
    { id: 1, code: '72085100', desc: 'Chapas de ferro ou aço não ligado', letra: 'A', format: '7208.51.00', status: 'Ativo', rastreabilidade: true, diferimento: 'Ativo', aliquota_bloco_p: 4.65 },
    { id: 2, code: '76061190', desc: 'Chapas e tiras de alumínio', letra: 'B', format: '7606.11.90', status: 'Ativo', rastreabilidade: false, diferimento: 'Inativo', aliquota_bloco_p: 7.60 },
    { id: 3, code: '87039000', desc: 'Peças e acessórios de veículos', letra: 'C', format: '8703.90.00', status: 'Inativo', rastreabilidade: false, diferimento: 'Inativo', aliquota_bloco_p: 0.00 },
];
const mockFinancialData = {
    period: "Julho/2025",
    total_sales: 155000.00,
    cost_of_goods_sold: 80000.00,
    operating_expenses: 45000.00,
    net_profit: 30000.00,
    total_products_sold: 1250,
    best_selling_category: "Aço Inoxidável",
    worst_performing_store: "Filial Zona Oeste (RJ)"
};
const mockClients = [
    { id: 1, name: "Cliente Padrão", cnpj: "000.000.000-00", phone: "11987654321" },
    { id: 2, name: "Distribuidora Laranja S.A.", cnpj: "25.000.000/0001-01", phone: "21999887766" },
];


// Funções para atualizar o estado (setters) - IMPORTANTE para modularidade
function setUserId(id) { currentUserId = id; }
function setAuthReady(isReady) { authReady = isReady; }
function setProducts(products) { allProducts = products; }
function setSuppliers(suppliers) { allSuppliers = suppliers; }
function setCurrentSale(sale) { currentSale = sale; }
function setCurrentPayments(payments) { currentPayments = payments; }
function setCurrentSaleTotal(total) { currentSaleTotal = total; }
function setCurrentRoute(route) { currentRoute = route; }

// Exporta o estado e as funções de atualização
export {
    currentUserId, authReady, allProducts, allSuppliers, currentSale, currentPayments, currentSaleTotal, currentRoute,
    mockStores, mockNcms, mockFinancialData, mockClients,
    setUserId, setAuthReady, setProducts, setSuppliers, setCurrentSale, setCurrentPayments, setCurrentSaleTotal, setCurrentRoute
};
