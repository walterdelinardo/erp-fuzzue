-- =====================================================================
-- TABELA: users
-- =====================================================================
-- Responsável por armazenar as credenciais e dados de acesso dos
-- usuários do ERP Fuzzue.
--
-- Padrões aplicados:
-- - snake_case
-- - campos padrão (id, data_criacao, data_atualizacao, ativo)
-- - colunas booleanas prefixadas com is_
-- - controle de status e papéis de acesso
-- =====================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    username           VARCHAR(50)  NOT NULL UNIQUE,
    password_hash      TEXT         NOT NULL,
    full_name          VARCHAR(100) NOT NULL,
    email              VARCHAR(120),
    role               VARCHAR(30)  DEFAULT 'user',
    is_active          BOOLEAN      DEFAULT TRUE,

    data_criacao       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao   TIMESTAMP,
    ativo              BOOLEAN      DEFAULT TRUE
);

-- =====================================================================
-- Índices auxiliares
-- =====================================================================
CREATE INDEX idx_users_username ON users(username);

-- =====================================================================
-- Usuário padrão de demonstração
-- =====================================================================
INSERT INTO users (username, password_hash, full_name, email, role, is_active)
VALUES 
('admin', 'gbl12024', 'Administrador do Sistema', 'admin@fuzzue.local', 'admin', TRUE);
🧩 Detalhes técnicos
Coluna	Tipo	Descrição
id	SERIAL PK	Identificador único
username	VARCHAR(50) UNIQUE	Nome de login
password_hash	TEXT	Senha (texto simples no momento, futuramente hash com bcrypt)
full_name	VARCHAR(100)	Nome completo
email	VARCHAR(120)	E-mail do usuário
role	VARCHAR(30)	Perfil (ex: admin, vendedor, gerente)
is_active	BOOLEAN	Define se o usuário está ativo
data_criacao	TIMESTAMP	Criação automática do registro
data_atualizacao	TIMESTAMP	Atualização manual via backend
ativo	BOOLEAN	Campo genérico de status para consistência entre módulos

⚙️ Padrões aplicados
Tabela: users (minúsculo, plural)

Colunas padrão: id, data_criacao, data_atualizacao, ativo

Campos booleanos: prefixo is_

Índice auxiliar: idx_users_username

Registro inicial: usuário admin com senha gbl12024

📌 Próximos passos sugeridos
Rodar a migration:

bash
Copiar código
psql -U postgres -d fuzzue_db -f db/migrations/create_users.sql
Verificar acesso:

Usuário: admin

Senha: gbl12024

Endpoint: POST /api/auth/login

Planejamento de segurança (próxima versão):

Implementar bcrypt.hash() na criação de usuários.

Implementar bcrypt.compare() no login (auth.js backend).

Adicionar middleware auth_middleware.js para proteger rotas internas.