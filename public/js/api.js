/**
 * public/js/api.js
 * * Funções para buscar dados do backend e interagir com APIs externas (Gemini).
 */
import { apiKey } from './config.js'; // Importa a chave da API Gemini
import { setProducts, setSuppliers } from './state.js'; // Importa setters do estado
import { showCustomModal } from './utils.js'; // Importa utilitário de modal
import { contentArea } from './ui.js'; // Importa referência à área de conteúdo

/**
 * Carrega os dados iniciais de produtos e fornecedores da API backend.
 * Atualiza o estado global da aplicação.
 * @throws {Error} Se a requisição à API falhar.
 */
async function loadInitialData() {
    if (!contentArea) {
        console.error("Elemento 'content-area' não encontrado para exibir carregamento.");
        return; // Não pode prosseguir sem a área de conteúdo
    }
    // Mostra um indicador de carregamento
    contentArea.innerHTML = `<div class="flex justify-center items-center h-full min-h-[50vh]">
        <i class="fas fa-spinner fa-spin text-4xl text-orange-600"></i>
        <span class="ml-4 text-xl text-gray-700">Carregando dados do servidor...</span>
    </div>`;

    try {
        // Faz as requisições em paralelo
        const [productsResponse, suppliersResponse] = await Promise.all([
            fetch('/api/products'), // Rota definida no backend
            fetch('/api/suppliers') // Rota definida no backend
        ]);

        // Verifica se ambas as respostas foram bem-sucedidas
        if (!productsResponse.ok) {
            const errorData = await productsResponse.text(); // Tenta ler corpo do erro
            throw new Error(`Falha ao carregar produtos (${productsResponse.status}): ${errorData}`);
        }
        if (!suppliersResponse.ok) {
            const errorData = await suppliersResponse.text(); // Tenta ler corpo do erro
            throw new Error(`Falha ao carregar fornecedores (${suppliersResponse.status}): ${errorData}`);
        }

        // Converte as respostas para JSON
        const products = await productsResponse.json();
        const suppliers = await suppliersResponse.json();

        // Atualiza o estado global
        setProducts(products);
        setSuppliers(suppliers);

        console.log(`Dados carregados: ${products.length} produtos, ${suppliers.length} fornecedores.`);

    } catch (error) {
        console.error("Erro crítico ao carregar dados iniciais:", error);
        // Exibe uma mensagem de erro mais detalhada para o usuário
        contentArea.innerHTML = `<div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md">
            <h3 class="font-bold text-lg mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Erro Crítico de Conexão</h3>
            <p class="mb-1">Não foi possível carregar os dados essenciais (produtos/fornecedores) do servidor.</p>
            <p class="text-sm mb-2"><b>Detalhes:</b> ${error.message}</p>
            <ul class="list-disc list-inside text-sm">
                <li>Verifique se o servidor backend (<code class="bg-red-200 px-1 rounded">server.js</code>) está em execução.</li>
                <li>Confirme se a URL do banco de dados (<code class="bg-red-200 px-1 rounded">DATABASE_URL</code>) no arquivo <code class="bg-red-200 px-1 rounded">.env</code> (local) ou nas configurações do ambiente (produção) está correta.</li>
                <li>Verifique a conexão de rede.</li>
            </ul>
        </div>`;
        // Re-lança o erro para interromper a inicialização da app se necessário
        throw error;
    }
}


/**
 * Chama a API Gemini (Generative Language API) com um prompt e instrução opcional.
 * Inclui tratamento de erro e retentativas com backoff exponencial.
 * @param {string} prompt - O prompt para a IA.
 * @param {string|null} [systemInstruction=null] - Instrução de sistema opcional.
 * @returns {Promise<string>} O texto gerado pela IA.
 * @throws {Error} Se a chamada da API falhar após todas as tentativas.
 */
async function callGeminiApi(prompt, systemInstruction = null) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const MAX_RETRIES = 5;
    let delay = 1000; // Começa com 1 segundo de espera

    // Construir o payload da requisição
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        // Inclui instrução de sistema apenas se fornecida
        ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } })
    };

    // Loop de tentativas
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Tratamento de erros HTTP comuns
            if (!response.ok) {
                // Se for erro de "Too Many Requests" (429) e ainda houver tentativas, espera e tenta novamente
                if (response.status === 429 && attempt < MAX_RETRIES) {
                    console.warn(`Gemini API: Rate limit atingido (429). Tentando novamente em ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Dobra o tempo de espera (backoff exponencial)
                    continue; // Próxima iteração do loop
                }
                // Para outros erros ou última tentativa, lança exceção
                const errorBody = await response.text();
                throw new Error(`Falha na API Gemini (${response.status}): ${errorBody}`);
            }

            // Processa a resposta bem-sucedida
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                return text; // Retorna o texto gerado
            } else {
                // Se a resposta veio OK (200) mas sem conteúdo esperado
                console.error("Resposta inesperada da API Gemini:", result);
                throw new Error("Resposta da API Gemini vazia ou mal formatada.");
            }

        } catch (error) {
            console.error(`Erro na tentativa ${attempt} de chamar a API Gemini:`, error);
            // Se for a última tentativa, lança o erro final
            if (attempt === MAX_RETRIES) {
                throw new Error(`Falha ao contactar a IA após ${MAX_RETRIES} tentativas: ${error.message}`);
            }
            // Se não for a última tentativa e não for 429 (já tratado), espera antes de tentar novamente
            if (error.message && !error.message.includes('429')) {
                 await new Promise(resolve => setTimeout(resolve, delay));
                 delay *= 2;
            }
        }
    }
     // Caso algo muito inesperado ocorra e saia do loop sem retornar ou lançar erro
    throw new Error("Falha desconhecida ao chamar a API Gemini.");
}


export { loadInitialData, callGeminiApi };
