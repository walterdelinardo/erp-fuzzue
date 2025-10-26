/**
 * public/js/router.js
 * * Gerencia a navegação entre os módulos (rotas) da aplicação.
 */
import { setCurrentRoute } from './state.js';
import { contentArea, updateSidebarActiveLink } from './ui.js';

// Importa dinamicamente TODAS as funções de renderização dos módulos
// Isso permite que o Webpack/Vite (futuramente) faça "code splitting"
const modules = {
    'dashboard': () => import('./modules/dashboard.js').then(m => m.renderDashboard),
    'pedidos': () => import('./modules/sales.js').then(m => m.renderPedidos),
    'clientes': () => import('./modules/clients.js').then(m => m.renderClientes),
    'lojas': () => import('./modules/stores.js').then(m => m.renderLojas),
    'produtos': () => import('./modules/products.js').then(m => m.renderProdutos),
    'ncm': () => import('./modules/ncm.js').then(m => m.renderNcm),
    'fornecedores': () => import('./modules/suppliers.js').then(m => m.renderFornecedores),
    'relatorios': () => import('./modules/reports.js').then(m => m.renderRelatorios),
    'usuarios': () => import('./modules/users.js').then(m => m.renderUsuarios),
    'ajuda': () => import('./modules/help.js').then(m => m.renderHelp),
    'configuracoes': () => import('./modules/settings.js').then(m => m.renderConfiguracoes),
};

/**
 * Mapeamento das rotas para as funções de renderização carregadas.
 * O 'handler' será preenchido quando o módulo for carregado.
 */
const routes = {
    'dashboard': { load: modules.dashboard, handler: null },
    'pedidos': { load: modules.pedidos, handler: null },
    'clientes': { load: modules.clientes, handler: null },
    'lojas': { load: modules.lojas, handler: null },
    'produtos': { load: modules.produtos, handler: null },
    'ncm': { load: modules.ncm, handler: null },
    'fornecedores': { load: modules.fornecedores, handler: null },
    'relatorios': { load: modules.relatorios, handler: null },
    'usuarios': { load: modules.usuarios, handler: null },
    'ajuda': { load: modules.ajuda, handler: null },
    'configuracoes': { load: modules.configuracoes, handler: null },
};

/**
 * Função de navegação principal. Carrega e exibe o módulo da rota solicitada.
 * @param {string} routeName - O nome da rota (ex: 'dashboard', 'produtos').
 */
async function navigate(routeName) {
    // Remove listeners de teclado antigos (importante para o PDV)
    document.onkeydown = null;

    // Define a rota padrão se a rota solicitada não existir
    if (!routes[routeName]) {
        routeName = 'dashboard';
    }

    // Atualiza o estado global
    setCurrentRoute(routeName);

    // Encontra a rota no mapeamento
    const route = routes[routeName];

    try {
        // Mostra um loader enquanto o módulo carrega (especialmente na primeira vez)
        if (!route.handler) {
            contentArea.innerHTML = `<div class="flex justify-center items-center h-full min-h-[50vh]">
                <i class="fas fa-spinner fa-spin text-2xl text-orange-600"></i>
                <span class="ml-3 text-gray-600">Carregando módulo...</span>
            </div>`;
            
            // Carrega o módulo (import dinâmico) e armazena o handler
            const renderFunction = await route.load();
            route.handler = renderFunction;
        }
        
        // Adiciona classe de transição (fade-in)
        contentArea.classList.remove('content-fade-in');
        void contentArea.offsetWidth; // Força o "reflow" do navegador

        // Chama a função de renderização do módulo, que preencherá o contentArea
        await route.handler();
        
        contentArea.classList.add('content-fade-in');

        // Atualiza o link ativo na sidebar
        updateSidebarActiveLink(routeName);

    } catch (error) {
        console.error(`Erro ao carregar ou renderizar a rota "${routeName}":`, error);
        contentArea.innerHTML = `<div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <h3 class="font-bold">Erro ao carregar módulo</h3>
            <p>${error.message}</p>
        </div>`;
    }
}

// Exporta a função de navegação para ser usada pela UI (links da sidebar)
export { navigate };
