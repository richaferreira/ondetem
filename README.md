Aqui está a tradução do seu plano de testes. Mantive a formatação original em Markdown e adaptei alguns termos para o jargão técnico comum em português brasileiro:

# Plano de Testes: Páginas de Cadastro + Admin

## O Que Mudou
Três novas páginas adicionadas ao PWA "Onde Tem?":
1. **Cadastro de usuário** (`/cadastro-usuario`) — formulário completo com dados pessoais, contato, endereço e senha
2. **Cadastro de empresa** (`/cadastro-empresa`) — formulário comercial com CNPJ, categorias, serviços e horários
3. **Dashboard Admin** (`/admin`) — login + painel de gerenciamento com estatísticas e tabelas de usuários/empresas/agendamentos

Navegação atualizada: `login.html` agora possui os botões "Cadastrar como Usuário" e "Cadastrar como Empresa". `index.html` possui um link "Admin" no cabeçalho.

## Fluxo Principal: Cadastro de Ponta a Ponta + Verificação do Admin

### Teste 1: Navegação do Login para as Páginas de Cadastro
**Passos:**
1. Navegue para `http://localhost:3000/login`
2. Verifique se a página exibe dois novos botões: "Cadastrar como Usuário" e "Cadastrar como Empresa"
3. Clique em "Cadastrar como Usuário"

**Critérios de aprovação:** O navegador redireciona para `/cadastro-usuario.html` e exibe o formulário com o título "Cadastro de Usuário"

### Teste 2: Formulário de Cadastro de Usuário — Envio com Dados Válidos
**Passos:**
1. Em `/cadastro-usuario`, preencha:
   - Nome Completo: "Maria Silva"
   - CPF: "123.456.789-00"
   - Data de Nascimento: "1990-05-15"
   - E-mail: "maria@teste.com"
   - Telefone: "(21) 99999-1234"
   - Senha: "Teste@123"
   - Confirmar Senha: "Teste@123"
   - Marque o checkbox "termos de uso"
2. Clique no botão "Criar Minha Conta"

**Critérios de aprovação:**
- Um banner de alerta verde aparece no topo com um texto contendo "Cadastro realizado com sucesso!"
- O botão exibe temporariamente um *spinner* com o texto "Cadastrando..." durante o envio
- Após cerca de 2 segundos, a página redireciona para `login.html`

### Teste 3: Formulário de Cadastro de Usuário — Indicador de Força da Senha
**Passos:**
1. Em `/cadastro-usuario`, digite "abc" no campo Senha
2. Observe o indicador de força da senha
3. Em seguida, digite "Abc123!@" no campo Senha
4. Observe o indicador de força da senha novamente

**Critérios de aprovação:**
- "abc" → a barra de força exibe o estado "fraca" com a cor vermelha/laranja
- "Abc123!@" → a barra de força exibe o estado "forte" com a cor verde, e o texto de dica diz "Senha forte!"

### Teste 4: Página de Cadastro de Empresa Carrega com Todas as Seções
**Passos:**
1. Navegue para `http://localhost:3000/cadastro-empresa`
2. Role a página pelo formulário

**Critérios de aprovação:** A página exibe todas as seções:
- Seção "Dados da Empresa" com os campos `nomeEmpresa`, `cnpj`, `razaoSocial`, `nomeFantasia` e `descricaoEmpresa`
- Seção "Categorias de Serviços" com 6 checkboxes (Cabelo, Unhas, Depilação, Sobrancelhas, Massagem, Rosto)
- Seção "Serviços Oferecidos" com o botão "Adicionar Serviço"
- Seção "Contato" com os campos `email`, `telefone`, `whatsapp` e `instagram`
- Seção "Endereço do Estabelecimento" com o campo `CEP`
- Seção "Horário de Funcionamento" com os checkboxes de dias e campos de horário
- Seção "Senha de Acesso" com os campos `nomeResponsavel`, `senha` e `confirmarSenha`
- O botão de envio "Cadastrar Empresa" está visível

### Teste 5: Login de Admin — Credenciais Corretas
**Passos:**
1. Navegue para `http://localhost:3000/admin`
2. Verifique se o formulário de login está visível com o título "Painel Admin"
3. Insira o email: "admin@ondetem.com"
4. Insira a senha: "123456"
5. Clique no botão "Entrar"

**Critérios de aprovação:**
- O formulário de login desaparece
- O painel do dashboard admin aparece com uma barra lateral mostrando: Dashboard, Usuários, Empresas, Agendamentos, Configurações
- O Dashboard exibe 4 cards de estatísticas: "Usuários Cadastrados", "Empresas Ativas", "Agendamentos" e "Receita Estimada"
- A barra superior exibe o título "Dashboard" e o e-mail "admin@ondetem.com"

### Teste 6: Login de Admin — Credenciais Incorretas
**Passos:**
1. Navegue para `http://localhost:3000/admin` (página recarregada/nova)
2. Insira o email: "wrong@email.com"
3. Insira a senha: "wrongpass"
4. Clique em "Entrar"

**Critérios de aprovação:**
- O formulário de login permanece visível (sem troca de painel)
- Um texto de erro em vermelho aparece dizendo "E-mail ou senha incorretos."

### Teste 7: Painel Admin — Navegação da Barra Lateral
**Passos:**
1. Após o login bem-sucedido no admin, clique em "Usuários" na barra lateral
2. Em seguida, clique em "Empresas" na barra lateral
3. Depois, clique em "Configurações" na barra lateral

**Critérios de aprovação:**
- Clicar em "Usuários" → o título da barra superior muda para "Usuários" e exibe a tabela de usuários com "Nenhum usuário cadastrado"
- Clicar em "Empresas" → o título da barra superior muda para "Empresas" e exibe a tabela de empresas com "Nenhuma empresa cadastrada"
- Clicar em "Configurações" → o título da barra superior muda para "Configurações", exibe o campo de nome da plataforma com o valor "Onde Tem?" e o e-mail de suporte "suporte@ondetem.com"

### Teste 8: Página Inicial (Index) — Link do Admin no Cabeçalho
**Passos:**
1. Navegue para `http://localhost:3000/`
2. Verifique o cabeçalho em busca de um botão/link para "Admin"

**Critérios de aprovação:** O cabeçalho exibe um link/botão "Admin" que aponta para `admin.html`

## Evidências de Código
- `server.js` linhas 35-45: Novas rotas para `/cadastro-usuario`, `/cadastro-empresa`, `/admin`
- `server.js` linhas 101-130: Endpoints da API para `POST /api/usuarios` e `POST /api/empresas`
- `server.js` linhas 52-63: `POST /api/login` com credenciais de admin fixadas no código (*hardcoded*)
- `login.html` linhas 38-41: Novos botões de cadastro
- `index.html` linha 33: Link do Admin no cabeçalho
- `cadastro-usuario.html` linhas 606-677: Manipulador de envio (*submit handler*) do formulário
- `cadastro-empresa.html` linhas 724-832: Manipulador de envio do formulário
- `admin.html` linhas 770-810: Manipulador de login do admin
- `admin.html` linhas 836-873: Manipulador de navegação da barra lateral