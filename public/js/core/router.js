/**
 * public/js/core/router.js
 * Roteador SPA: carrega módulos (HTML + JS) em /public/js/modules/<mod>/<mod>.*
 * Integra com auth e UI (sidebar, highlight, boas-vindas).
 */

import { initializeAuth } from '/js/core/auth.js';
import { initUI, highlightActiveModule, renderWelcomeUser } from '/js/core/ui.js';

const appContent = document.getElementById('app-content');

// Controle de navegação para evitar recarregar o mesmo módulo
let currentModule = null;

// Conjunto de módulos válidos (fallback para 'dashboard' caso hash seja inválido)
const ALLOWED_MODULES = new Set([
  'dashboard',
  'products',
  'suppliers',
  'inventory',
  'purchase',
  'sales',
  'pdv',
  'finance',
  'payables',
  'receivables',
  'finance_consolidado'
]);

/**
 * Carrega o HTML e o JS de um módulo e inicializa a página.
 * Estrutura esperada:
 *   /public/js/modules/<module>/<module>.html
 *   /public/js/modules/<module>/<module>.js (exporta initPage opcional)
 */
async function loadModule(moduleName) {
  try {
    // Skeleton loading simples
    if (appContent) {
      appContent.innerHTML = `
        <div class="p-6 animate-pulse">
          <div class="h-4 w-24 bg-gray-200 rounded mb-4"></div>
          <div class="h-3 w-full bg-gray-200 rounded mb-2"></div>
          <div class="h-3 w-5/6 bg-gray-200 rounded"></div>
        </div>
      `;
    }

    // 1) HTML
    const htmlRes = await fetch(`/js/modules/${moduleName}/${moduleName}.html`, { cache: 'no-store' });
    if (!htmlRes.ok) {
      throw new Error(`Falha ao carregar HTML do módulo "${moduleName}" (${htmlRes.status})`);
    }
    const html = await htmlRes.text();
    if (appContent) appContent.innerHTML = html;

    // 2) JS (dinâmico)
    let mod = null;
    try {
      mod = await import(`/js/modules/${moduleName}/${moduleName}.js?t=${Date.now()}`);
    } catch (e) {
      console.warn(`[Router] JS do módulo "${moduleName}" ausente ou com erro.`, e);
    }

    // 3) initPage opcional
    if (mod && typeof mod.initPage === 'function') {
      try {
        await mod.initPage();
      } catch (e) {
        console.error(`[Router] Erro ao executar initPage() do módulo ${moduleName}:`, e);
      }
    }
  } catch (err) {
    console.error('[Router] loadModule error:', err);
    if (appContent) {
      appContent.innerHTML = `
        <div class="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          <div class="font-semibold mb-1">Erro ao carregar módulo <b>${moduleName}</b>.</div>
          <div class="text-sm">${err.message || 'Erro desconhecido.'}</div>
        </div>
      `;
    }
  }
}

/**
 * Destaca o item ativo no sidebar e carrega o módulo.
 * Também atualiza o hash da URL (#<module>) para permitir refresh direto.
 * Evita recarregar quando já estamos no mesmo módulo.
 */
function navigate(moduleName) {
  if (!moduleName) return;

  // Fallback caso navegue para algo inválido
  if (!ALLOWED_MODULES.has(moduleName)) {
    moduleName = 'dashboard';
  }

  // Evita navegação duplicada
  if (moduleName === currentModule) return;
  currentModule = moduleName;

  // Highlight + conteúdo
  highlightActiveModule(moduleName);
  loadModule(moduleName);

  // Atualiza hash sem navegar de fato
  if (location.hash !== `#${moduleName}`) {
    history.replaceState(null, '', `#${moduleName}`);
  }
}

/**
 * Obtém a rota inicial:
 *  - do hash (#<module>) se houver e for válido
 *  - senão, usa "dashboard" por padrão
 */
function getInitialRoute() {
  const hash = (location.hash || '').replace('#', '').trim();
  return ALLOWED_MODULES.has(hash) ? hash : 'dashboard';
}

/**
 * Boot do app:
 * 1) Garante autenticação (redireciona para /login.html se não autenticado)
 * 2) Inicializa UI global (listeners, boas-vindas)
 * 3) Navega para a rota inicial (hash ou dashboard)
 */
(async () => {
  await initializeAuth(); // redireciona para /login.html se não houver sessão

  // usuário autenticado — pinta header e liga UI global
  renderWelcomeUser();
  initUI();

  // rota inicial (suporta abrir direto via #modulo)
  const initialRoute = getInitialRoute();
  navigate(initialRoute);

  // reage a mudanças de hash (ex.: usuário troca manualmente)
  window.addEventListener('hashchange', () => {
    const route = getInitialRoute();
    navigate(route);
  });
})();

export { navigate, loadModule };
