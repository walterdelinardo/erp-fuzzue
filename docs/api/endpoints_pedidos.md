# API - Módulo Pedidos

Base URL do módulo:

`/api/pedidos`

---

## 1. Criar pedido

**POST** `/api/pedidos/create`

### Request (JSON)

```json
{
  "cliente_id": 1,
  "data_pedido": "2025-11-14",
  "data_entrega": "2025-11-20",
  "status_pedido": "aberto",
  "valor_subtotal": 100.00,
  "valor_desconto": 10.00,
  "valor_total": 90.00,
  "observacoes": "Entrega combinar com o cliente."
}
cliente_id (number, obrigatório)

data_pedido (string, obrigatório – formato ISO/date)

data_entrega (string, opcional – ISO/date)

status_pedido (string, obrigatório – ex: aberto, faturado, cancelado)

valor_subtotal (number, obrigatório)

valor_desconto (number, opcional, default 0)

valor_total (number, obrigatório)

observacoes (string, opcional)

Response (200)
json
Copiar código
{
  "success": true,
  "message": "Pedido criado com sucesso.",
  "data": {
    "id": 1,
    "cliente_id": 1,
    "data_pedido": "2025-11-14T10:00:00.000Z",
    "data_entrega": "2025-11-20",
    "status_pedido": "aberto",
    "valor_subtotal": "100.00",
    "valor_desconto": "10.00",
    "valor_total": "90.00",
    "observacoes": "Entrega combinar com o cliente.",
    "data_criacao": "2025-11-14T10:00:00.000Z",
    "data_atualizacao": null,
    "ativo": true
  },
  "error": null
}
2. Listar pedidos
GET /api/pedidos/list

Query Params (opcional)
Nenhum por enquanto (lista todos ativos).

Response (200)
json
Copiar código
{
  "success": true,
  "message": "Lista de pedidos carregada.",
  "data": [
    {
      "id": 1,
      "cliente_id": 1,
      "nome_cliente": "Cliente Exemplo",
      "data_pedido": "2025-11-14T10:00:00.000Z",
      "data_entrega": "2025-11-20",
      "status_pedido": "aberto",
      "valor_subtotal": "100.00",
      "valor_desconto": "10.00",
      "valor_total": "90.00",
      "observacoes": "Entrega combinar com o cliente.",
      "data_criacao": "2025-11-14T10:00:00.000Z",
      "data_atualizacao": null,
      "ativo": true
    }
  ],
  "error": null
}
3. Buscar pedido por ID
GET /api/pedidos/get/:id

Response (200)
json
Copiar código
{
  "success": true,
  "message": "Pedido encontrado.",
  "data": {
    "id": 1,
    "cliente_id": 1,
    "nome_cliente": "Cliente Exemplo",
    "data_pedido": "2025-11-14T10:00:00.000Z",
    "data_entrega": "2025-11-20",
    "status_pedido": "aberto",
    "valor_subtotal": "100.00",
    "valor_desconto": "10.00",
    "valor_total": "90.00",
    "observacoes": "Entrega combinar com o cliente.",
    "data_criacao": "2025-11-14T10:00:00.000Z",
    "data_atualizacao": null,
    "ativo": true
  },
  "error": null
}
Response (404)
json
Copiar código
{
  "success": false,
  "message": "Pedido não encontrado.",
  "data": null,
  "error": null
}
4. Atualizar pedido
PUT /api/pedidos/update/:id

Request (JSON)
Mesmo formato do create:

json
Copiar código
{
  "cliente_id": 1,
  "data_pedido": "2025-11-14",
  "data_entrega": "2025-11-21",
  "status_pedido": "faturado",
  "valor_subtotal": 150.00,
  "valor_desconto": 0.00,
  "valor_total": 150.00,
  "observacoes": "Pedido faturado."
}
Response (200)
json
Copiar código
{
  "success": true,
  "message": "Pedido atualizado com sucesso.",
  "data": {
    "id": 1,
    "cliente_id": 1,
    "data_pedido": "2025-11-14T10:00:00.000Z",
    "data_entrega": "2025-11-21",
    "status_pedido": "faturado",
    "valor_subtotal": "150.00",
    "valor_desconto": "0.00",
    "valor_total": "150.00",
    "observacoes": "Pedido faturado.",
    "data_criacao": "2025-11-14T10:00:00.000Z",
    "data_atualizacao": "2025-11-14T11:00:00.000Z",
    "ativo": true
  },
  "error": null
}
5. Excluir (inativar) pedido
DELETE /api/pedidos/delete/:id

Faz soft delete: seta ativo = false.

Response (200)
json
Copiar código
{
  "success": true,
  "message": "Pedido excluído (inativado) com sucesso.",
  "data": {
    "id": 1,
    "ativo": false
  },
  "error": null
}