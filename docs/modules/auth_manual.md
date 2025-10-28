📘 /docs/modules/auth_manual.md
Módulo: Autenticação (auth)
📄 Descrição geral

O módulo Auth é responsável pelo controle de acesso dos usuários ao ERP Fuzzue.
Ele gerencia o processo de login, sessão de usuário e validação de autenticação no frontend e backend.

📁 Estrutura de arquivos
/server/modules/auth.js              → Rotas e lógica de autenticação backend
/public/js/core/auth.js              → Funções de login e sessão no frontend
/public/login.html                   → Tela de login do sistema
/docs/modules/auth_manual.md         → Manual técnico (este arquivo)
/docs/api/endpoints_auth.md          → Documentação dos endpoints REST

⚙️ Funcionamento geral
1. Fluxo de autenticação

O usuário acessa /login.html.

O formulário envia username e password via attemptLogin().

O frontend faz POST /api/auth/login.

O backend valida as credenciais e responde com o formato padrão:

{
  "success": true,
  "message": "Login bem-sucedido!",
  "data": {
    "id": 1,
    "username": "admin",
    "fullName": "Administrador",
    "role": "admin"
  },
  "error": null
}


O frontend salva o usuário em sessionStorage e redireciona para /index.html.

O main.js chama initializeAuth() e mostra o painel principal.

2. Frontend (public/js/core/auth.js)
Funções principais:
Função	Descrição
getCurrentUser()	Retorna o usuário logado salvo em sessionStorage.
setCurrentUser(user)	Salva o usuário atual (após login).
clearCurrentUser()	Remove os dados da sessão (logout).
attemptLogin(username, password)	Faz POST /api/auth/login, salva o usuário e redireciona.
initializeAuth()	Verifica se há sessão ativa e mostra o app ou redireciona para /login.html.
Sessão

A sessão é salva em sessionStorage sob a chave:

fuzzue_user


O formato armazenado é o JSON retornado em data.

3. Backend (server/modules/auth.js)
Funções do módulo

POST /api/auth/login: valida credenciais e retorna dados básicos do usuário.

Banco de dados esperado

Tabela users:

Coluna	Tipo	Descrição
id	SERIAL PRIMARY KEY	Identificador único
username	VARCHAR(50)	Nome de login
password_hash	TEXT	Senha (atualmente texto simples; substituir por hash)
full_name	VARCHAR(100)	Nome completo
role	VARCHAR(30)	Perfil de acesso
is_active	BOOLEAN DEFAULT TRUE	Se o usuário está ativo
4. Segurança

Atualmente, a senha é comparada como texto simples (password === password_hash).

Deve ser substituída por bcrypt.compare() no futuro.

As rotas não emitem tokens JWT ainda (sessão controlada localmente no navegador).

Recomendação futura: implementar JWT + middleware de autenticação nas rotas críticas.

5. Logout

O botão “Sair” no index.html chama:

clearCurrentUser();
window.location.href = '/login.html';


Assim, a sessão é encerrada e o usuário é redirecionado para o login.

6. Erros e logs

Todos os erros de banco são tratados por db.handleError().

Logs são impressos no terminal com prefixos [Auth] para fácil rastreamento.

O frontend exibe mensagens amigáveis no elemento #login-feedback.

🧭 Fluxo resumido
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (login.html)
    participant A as API (/api/auth/login)
    participant DB as Banco (users)

    U->>F: Entra com usuário e senha
    F->>A: POST /api/auth/login { username, password }
    A->>DB: SELECT * FROM users WHERE username = $1
    DB-->>A: Retorna dados do usuário
    A-->>F: { success:true, data:{id, username,...} }
    F->>F: Salva sessionStorage('fuzzue_user')
    F->>U: Redireciona para /index.html

🧩 Exemplo prático de uso (frontend)
import { attemptLogin } from './js/core/auth.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    await attemptLogin(username, password);
  } catch (err) {
    alert(err.message);
  }
});

🔒 Padrões e recomendações

Usar HTTPS em produção.

Implementar hashing de senhas (bcrypt).

Centralizar tokens JWT (futuro) em server/middleware/auth.js.

Adicionar rota /api/auth/me para retornar o usuário atual.

Implementar controle de expiração de sessão.

✍️ Commit sugerido
Criar documentação do módulo Auth (manual + endpoints)