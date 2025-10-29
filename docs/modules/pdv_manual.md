📄 /docs/modules/pdv_manual.md
# Módulo: PDV (Ponto de Venda)

## Visão geral
O módulo **PDV** é responsável pelo processo de venda rápida em balcão/loja física, com:
- busca de produtos (autocomplete)
- montagem de carrinho
- aplicação de desconto
- cálculo de troco
- finalização da venda
- baixa de estoque
- registro de pagamentos

Ele é orientado para velocidade de operação e controle de permissão (caixa vs gerente).

---

## Camadas envolvidas

### Frontend
Localização dos arquivos:

- `/public/js/modules/pdv/pdv.html`  
  Estrutura visual da tela PDV (busca, carrinho, totais, modal de pagamento).

- `/public/js/modules/pdv/pdv.js`  
  Lógica do PDV no browser:
  - gerencia estado do carrinho
  - chama API de produtos, desconto, finalizar venda
  - usa `authedFetch()` para enviar JWT ao backend

- `/public/js/core/auth.js`
  - fornece `authedFetch()` (adiciona `Authorization: Bearer <token>`)
  - garante que só usuário autenticado consiga acessar PDV
  - garante que a sessão possui `user` e `token`

- `/public/js/core/router.js`
  - injeta `pdv.html` no `<main id="app-content">`
  - carrega e executa `pdv.js`

---

### Backend
Localização dos arquivos:

- `/server/modules/pdv.js`
  - GET `/api/pdv/search-products`
  - POST `/api/pdv/validate-admin`
  - POST `/api/pdv/finalizar-venda`

- `/server/middleware/requireAuth.js`
  - valida o JWT (`Authorization: Bearer <token>`)
  - injeta `req.user` com `{ id, username, role }`

- `/server/middleware/checkPermission.js`
  - verifica se `req.user.role` tem a permissão exigida
  - consulta tabela `roles_permissions`

- `/server/utils/auth_utils.js`
  - `userHasPermission(role, permission)`
  - `getRequestUserContext(req)` (modo legado; hoje usamos JWT)

---

### Banco de dados
Tabelas criadas em `/db/migrations/create_pdv_core.sql`:

- `products`
  - catálogo de produtos
  - controla preço de venda e estoque disponível (`stock`)
- `sales`
  - cabeçalho da venda
- `sale_items`
  - itens associados a uma venda
- `sales_payments`
  - pagamentos (dinheiro, pix, cartão, etc.)

FKs:
- `sale_items.sale_id` → `sales.id`
- `sale_items.product_id` → `products.id`
- `sales_payments.sale_id` → `sales.id`

---

## Fluxo operacional da venda

1. Operador digita o nome ou SKU do produto  
   → frontend chama `GET /api/pdv/search-products?query=...`  
   → recebe lista de produtos com preço e estoque

2. Operador adiciona itens ao carrinho  
   - altera quantidade
   - pode aplicar desconto POR ITEM (se tiver permissão liberada via gerente/senha)
   - pode aplicar desconto geral

3. Operador clica em "Finalizar Venda"  
   → abre modal de pagamento

4. Operador informa meios de pagamento  
   - Ex: Dinheiro + PIX  
   - O sistema calcula troco se houver dinheiro e valor pago > total

5. Operador confirma pagamento  
   → frontend chama `POST /api/pdv/finalizar-venda` com:
   ```json
   {
     "itens": [...],
     "subtotal": ...,
     "descontoGeral": ...,
     "totalFinal": ...,
     "pagamentos": [
       {"metodo":"dinheiro","valor":10.00},
       {"metodo":"pix","valor":6.00}
     ]
   }


Backend:

cria registro em sales

cria linhas em sale_items

cria pagamentos em sales_payments

dá baixa no estoque de cada produto em products.stock

responde com { success: true, data: { sale_id: X } }

Frontend:

alerta "Venda concluída com sucesso! ID: X"

limpa carrinho, reseta modal, zera descontos

Permissões e segurança
Autenticação obrigatória

Todas as rotas de PDV exigem requireAuth, ou seja:

o front precisa enviar o header:

Authorization: Bearer <token_jwt>


esse token é gerado no login (rota /api/auth/login)

o middleware requireAuth valida o token e injeta req.user

Permissões específicas

Algumas rotas exigem permissões adicionais:

pdv.aplicar_desconto

usada para liberar os campos de desconto no carrinho

checada em /api/pdv/validate-admin

pdv.finalizar_venda

usada para realmente registrar a venda, baixar estoque, gerar pagamentos

checada em /api/pdv/finalizar-venda

Essas permissões vêm da tabela roles_permissions (seed em /db/seeds/seed_roles_permissions.sql).

Exemplo:

INSERT INTO roles_permissions (role, permissao) VALUES
('pdv', 'pdv.usar'),
('pdv', 'pdv.finalizar_venda'),
('pdv', 'pdv.aplicar_desconto');


Isso significa:

só quem tem perfil pdv (ou admin, que tem tudo) consegue operar o caixa.

alguém do estoque ou do financeiro não consegue finalizar venda no caixa.

Estrutura de dados usada no frontend
Objeto de item no carrinho (cartItems[] em pdv.js):
{
  id: 12,              // product_id
  nome: "Produto X",
  precoUnit: 10.0,     // preço unitário
  quantidade: 2,
  descontoItem: 1.0    // desconto total aplicado nesse item
}

Payload enviado para fechar a venda:
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
    {"metodo":"dinheiro","valor":10.00},
    {"metodo":"pix","valor":6.00}
  ]
}

O que o backend grava a partir disso:

sales:

total = subtotal

discount_total = descontoGeral

final_total = totalFinal

created_by = req.user.id (vem do JWT)

sale_items:

calcula total (precoUnit * quantidade)

aplica discount_item

salva net_total = total - discount_item

baixa estoque: products.stock = stock - quantidade

sales_payments:

um registro por forma de pagamento (pix, dinheiro, etc.)

Auditoria e rastreabilidade

Cada venda guarda:

created_at e created_by em sales

itens individuais em sale_items

origem de baixa no estoque

splits de pagamento em sales_payments

Isso permite:

saber quem fez a venda

saber quanto saiu de estoque e de qual produto

saber em qual forma de pagamento entrou o dinheiro

Isso é necessário para relatórios de caixa, conferência de estoque e auditoria fiscal.

Pontos futuros já planejados

Criar tabela product_stock_movements para histórico de movimentação de estoque (entrada de compra, saída por venda, ajuste de inventário).

Emissão de comprovante/recibo físico e/ou NFC-e.

Associação da venda a um customer_id (cliente cadastrado), não apenas customer_name.

Integração com financeiro (cada venda gera título a receber ou movimento de caixa).

Registro de cancelamento de venda (status canceled) com devolução de estoque.

TL;DR para novos devs

O PDV é um módulo isolado que vive em /public/js/modules/pdv.

Ele conversa com o backend via /api/pdv/....

As rotas do backend são protegidas por JWT + permissões.

As vendas gravam tudo em sales, sale_items, sales_payments e atualizam products.stock.

O usuário logado que faz a venda fica salvo em sales.created_by.

Se você consegue rodar login, abrir o PDV, vender um item, e ver products.stock baixando, você está oficialmente com o core do ERP funcionando. 🚀