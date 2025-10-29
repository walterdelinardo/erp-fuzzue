---

## 📄 `/docs/api/endpoints_pdv.md`

```md
# API: PDV
Base: `/api/pdv`

Todas as rotas abaixo exigem:
- Header de autenticação JWT:
  ```http
  Authorization: Bearer <token>
Algumas rotas exigem permissões específicas (veja campo "Permissão necessária").

Formato de resposta padrão em todas as rotas:

json
Copiar código
{
  "success": true | false,
  "message": "texto explicativo curto",
  "data": { ... } | [ ... ] | null,
  "error": null | "CODIGO_DO_ERRO"
}
1. GET /search-products
Descrição
Busca produtos pelo nome ou SKU para autocomplete do PDV.

Permissão necessária
Apenas login (requireAuth).

Não exige permissão especial de função.

Query params
query: string com pelo menos 2 caracteres

Exemplo:
GET /api/pdv/search-products?query=camiseta

Response (sucesso)
json
Copiar código
{
  "success": true,
  "message": "Produtos encontrados",
  "data": [
    {
      "id": 1,
      "nome": "Camiseta Preta Básica",
      "sku": "SKU-001",
      "preco": "49.90",
      "estoque_atual": "100.000"
    }
  ],
  "error": null
}
Response (query curta)
json
Copiar código
{
  "success": true,
  "message": "Termo muito curto ou vazio",
  "data": [],
  "error": null
}
2. POST /validate-admin
Descrição
Valida se o usuário atual pode liberar descontos no PDV.
Essa rota também valida a senha de gerente configurada no .env.

Permissão necessária
pdv.aplicar_desconto

Request body
json
Copiar código
{
  "senha": "senhaDigitadaNoPrompt"
}
Response (senha válida e permissão ok)
json
Copiar código
{
  "success": true,
  "message": "Validação de permissão de desconto realizada",
  "data": {
    "valid": true
  },
  "error": null
}
Response (senha inválida ou sem permissão)
json
Copiar código
{
  "success": true,
  "message": "Validação de permissão de desconto realizada",
  "data": {
    "valid": false
  },
  "error": null
}
Observações
A senha esperada vem de process.env.PDV_ADMIN_PASS.

O front só libera os campos de desconto se valid === true.

3. POST /finalizar-venda
Descrição
Registra uma venda completa:

Cria header em sales

Cria itens em sale_items

Dá baixa no estoque de cada produto vendido

Cria os pagamentos em sales_payments

Permissão necessária
pdv.finalizar_venda

Request body
json
Copiar código
{
  "itens": [
    {
      "id": 12,
      "nome": "Produto X",
      "precoUnit": 10.00,
      "quantidade": 2,
      "descontoItem": 1.00
    }
  ],
  "subtotal": 18.00,
  "descontoGeral": 2.00,
  "totalFinal": 16.00,
  "pagamentos": [
    { "metodo": "dinheiro", "valor": 10.00 },
    { "metodo": "pix", "valor": 6.00 }
  ]
}
Explicação dos campos:

itens: lista de itens do carrinho

precoUnit é o preço efetivo por unidade

descontoItem é o desconto total no item (não %)

subtotal: soma líquida dos itens após desconto individual

descontoGeral: desconto aplicado no final da venda inteira

totalFinal: subtotal - descontoGeral

pagamentos: cada forma de pagamento e valor pago nela

Response (sucesso)
json
Copiar código
{
  "success": true,
  "message": "Venda finalizada com sucesso",
  "data": {
    "sale_id": 45
  },
  "error": null
}
Response (erro de validação)
Exemplo: nenhum item informado

json
Copiar código
{
  "success": false,
  "message": "Nenhum item informado.",
  "data": null,
  "error": "PDV_NO_ITEMS"
}
Response (erro interno)
json
Copiar código
{
  "success": false,
  "message": "Erro ao finalizar venda",
  "data": null,
  "error": "details from throw"
}
Como o backend usa os dados internamente
Cria uma linha em sales:

total = subtotal

discount_total = descontoGeral

final_total = totalFinal

created_by = ID do usuário autenticado (via JWT)

status = "completed"

Para cada item:

gera linha em sale_items

calcula:

total = unit_price * quantity

net_total = total - desconto_item

atualiza o estoque do produto:

sql
Copiar código
UPDATE products
SET stock = stock - quantidade
WHERE id = <id do produto>
Para cada forma de pagamento:

insere em sales_payments:

sale_id

metodo

valor

Integração com autenticação
Essas rotas dependem dos middlewares:

requireAuth

Valida o JWT

Injeta req.user = { id, username, role, fullName }

Retorna 401 se o token for inválido/ausente

checkPermission("nome.da.permissao")

Lê req.user.role

Consulta roles_permissions

Retorna 403 se a role do usuário não tiver a permissão

Exemplo de uso em server/modules/pdv.js:

js
Copiar código
router.post(
    '/finalizar-venda',
    requireAuth,
    checkPermission('pdv.finalizar_venda'),
    async (req, res) => {
        // ...
    }
);
Impacto contábil / auditoria
sales.created_by registra quem fez a venda.

O estoque é reduzido imediatamente.

O pagamento é registrado com método e valor, permitindo:

fechamento de caixa

conferência diária do operador

integração futura com financeiro / fluxo de caixa

Roadmap futuro (previsto)
registro de cancelamento de venda com devolução de estoque e log de quem cancelou.

emissão de DANFE / NFC-e integrada.

amarração da venda a um customer_id (para CRM / fidelização).

criação de product_stock_movements para rastreabilidade de estoque em nível de auditoria fiscal.

Resumo rápido para devs novos
Para usar o PDV no navegador, o usuário precisa:

fazer login em /login.html

receber token JWT

abrir o módulo PDV no menu lateral (data-module="pdv")

O PDV só funciona se:

o token JWT for válido

a role desse usuário (pdv, admin, etc.) tiver as permissões certas no banco (roles_permissions)

Toda venda gera:

sales (cabeçalho)

sale_items (itens vendidos)

sales_payments (formas de pagamento)

baixa no products.stock

Pronto: o módulo PDV está oficialmente documentado e pronto pra auditoria.