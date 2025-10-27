// public/js/router.js

// guarda qual é a rota atual
let currentView = null;

// mostra uma view e esconde as outras
function showView(viewId) {
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(v => {
        if (v.id === `view-${viewId}`) {
            v.classList.remove('hidden');
        } else {
            v.classList.add('hidden');
        }
    });

    currentView = viewId;
}

// configura os botões do menu lateral
function bindSidebar(onNavigate) {
    const buttons = document.querySelectorAll('aside [data-route]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.getAttribute('data-route');
            onNavigate(route);
        });
    });
}

// setupRouter recebe um dicionário com { rota: funçãoInit }
function setupRouter(routeInits) {
    bindSidebar(async (route) => {
        showView(route);

        // se existir init pra essa rota, chama
        if (routeInits[route]) {
            routeInits[route]();
        }
    });

    // rota inicial padrão
    showView('dashboard');
    if (routeInits['dashboard']) {
        routeInits['dashboard']();
    }
}

export { setupRouter };
