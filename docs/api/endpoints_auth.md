📗 /docs/api/endpoints_auth.md
API: /api/auth
🧩 Base
http://localhost:40011/api/auth

1️⃣ POST /login
Descrição

Realiza a autenticação do usuário com base nas credenciais fornecidas.

Request
{
  "username": "admin",
  "password": "gbl12024"
}

Response — Sucesso
{
  "success": true,
  "message": "Login bem-sucedido!",
  "data": {
    "id": 1,
    "username": "admin",
    "fullName": "Administrador do Sistema",
    "role": "admin"
  },
  "error": null
}

Response — Falha (usuário inexistente)
{
  "success": false,
  "message": "Usuário ou senha inválidos.",
  "data": null,
  "error": "LOGIN_USER_NOT_FOUND"
}

Response — Falha (usuário inativo)
{
  "success": false,
  "message": "Este usuário está desativado.",
  "data": null,
  "error": "LOGIN_USER_INACTIVE"
}

Response — Falha (senha incorreta)
{
  "success": false,
  "message": "Usuário ou senha inválidos.",
  "data": null,
  "error": "LOGIN_BAD_PASSWORD"
}

2️⃣ (Futuro) GET /me

Retorna os dados do usuário logado com base no token JWT.
Ainda não implementado. Planejado para versão 2.0 do Auth.

🔁 Formato de resposta padronizado

Todas as respostas seguem o modelo:

{
  "success": true | false,
  "message": "texto explicativo curto",
  "data": { ... } | [ ... ] | null,
  "error": null | "código_interno"
}

🧱 Dependências técnicas

express

pg

dotenv

bcrypt (planejado)

🔒 Segurança e boas práticas

As senhas não devem ser armazenadas em texto puro.

Implementar bcrypt.hash() na criação de usuários e bcrypt.compare() no login.

Considerar o uso de JWT (via jsonwebtoken) para autenticação de APIs REST.
