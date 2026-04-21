# Test Plan — Login de usuário + admin (pós PR #16 mergeado em main)

## O que mudou em termos user-visible
- Antes: `/admin` rejeitava `admin@ondetem.com` / `123456` com "E-mail ou senha incorretos."
- Depois: login de admin via `/login` (aba Admin) redireciona para `/admin` e **o painel abre direto**, sem pedir login de novo (SSO). Login direto pelo form interno de `/admin` também funciona e persiste o token.

## T1 — Regressão: usuário comum ainda loga e acessa /agendamentos
Passos:
1. `/login` com `joao@email.com` / `123456` (aba "Usuário" padrão), submit.
2. Navegar para `/agendamentos`.

Assertions:
- **A1**: Após submit, URL vira `localhost:3000/` (home). Sem banner "Erro de conexão" nem "E-mail ou senha incorretos.".
- **A2**: Em `/agendamentos`, página renderiza heading "Meus Agendamentos" (NÃO redireciona para `/login`).

## T2 — Fix principal: admin loga via /login e painel abre via SSO
Passos:
1. Limpar `localStorage` + `sessionStorage` (devtools `Application → Clear storage`).
2. `/login` → clicar aba **Admin** → `admin@ondetem.com` / `123456` → submit.

Assertions:
- **A3**: URL muda para `localhost:3000/admin`. Nenhum banner "E-mail ou senha incorretos."
- **A4**: Em `/admin`, o formulário interno de login (`#adminLogin`) está **oculto** e o painel (`#adminPanel`) está visível com a sidebar "Onde Tem? Admin" + topbar mostrando "admin@ondetem.com" + seção Dashboard com os 4 cards de contadores (Total de Usuários / Empresas / Agendamentos / Empresas Ativas). Fail se reapareceu o card roxo "Painel Admin" pedindo login de novo.

## Fora de escopo
- Não vou testar empresa, agendamento, pagamento ou cadastro — já validados em PRs anteriores.
- Logout SSO e logout não-SSO (correções do Devin Review do PR #16) não são o foco original do pedido do usuário; se sobrar tempo após T1/T2 passarem, adiciono como regressão rápida.

## Código lido para montar o plano
- `server.js:112-135` — /api/login exige `tipo` no body
- `login.html:71-77,105` — `destinoPorTipo` redireciona admin → `/admin`
- `admin.html:674-687,697-730` — `verificarLoginAdmin` faz SSO via `OndeTemAuth.obterUsuario()`, form interno persiste token via `OndeTemAuth.salvarSessao`
- `admin.html:795-816` — logout só chama `OndeTemAuth.logout()` se sessão SSO de admin existe
