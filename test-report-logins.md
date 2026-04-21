# Test Report — Login usuário + admin (pós-merge PR #16)

- **Data**: 2026-04-20
- **Base testada**: `main` @ `8b8150c` (PR #16 merged)
- **Credenciais**:
  - Usuário: `joao@email.com` / `123456`
  - Admin: `admin@ondetem.com` / `123456`
- **Servidor**: `http://localhost:3000`
- **Gravação**: `rec-a6c7401f` (mp4 anexado à mensagem)

## Resumo

2/2 passed. Ambos os fluxos de login funcionam fim-a-fim após as correções do PR #16.

| # | Teste | Resultado |
|---|---|---|
| T1 | Usuário comum loga em `/login` e acessa `/agendamentos` | passed |
| T2 | Admin loga via `/login` (aba Admin) → `/admin` renderiza painel via SSO sem re-login | passed |

## T1 — Usuário comum

Passos:
1. Abri `http://localhost:3000/login` (aba "Usuário" já selecionada).
2. Digitei `joao@email.com` / `123456`, Enter.
3. Naveguei para `/agendamentos`.

Evidências:
- Após submit a URL virou `localhost:3000/` (home carregou com hero, categorias e cards de salão). Nenhum banner de "Erro de conexão" ou "E-mail ou senha incorretos.".
- `/agendamentos` renderizou o heading **"Meus Agendamentos"**, os 4 cards de contadores (Total/Confirmados/Pendentes/Cancelados em 0), filtros e estado vazio "Nenhum agendamento realizado" — não houve redirect para `/login`.

![T1 /agendamentos](https://app.devin.ai/attachments/9e8e2057-3057-4b99-aa9a-147840eb098d/t1-agendamentos.png)

## T2 — Admin via SSO

Passos:
1. `javascript:localStorage.clear();sessionStorage.clear();location.href='/login'` (garantir estado limpo).
2. Em `/login`, cliquei na aba **Admin**.
3. Digitei `admin@ondetem.com` / `123456`, Enter.

Evidências:
- URL virou `localhost:3000/admin`. Nenhuma mensagem de erro.
- Painel administrativo renderizou via SSO (fluxo do PR #16) — o formulário interno `#adminLogin` ficou oculto e o painel abriu direto, sem pedir login de novo.
- Sidebar "Onde Tem? Painel Administrativo" com itens **Dashboard / Usuários / Empresas / Agendamentos / Configurações / Sair**.
- Topbar: email **`admin@ondetem.com`** + avatar "A".
- 4 cards do dashboard visíveis: **Usuários Cadastrados · Empresas Ativas · Agendamentos · Receita Estimada R$ 0,00** + bloco "Atividades Recentes".

![T2 /admin painel SSO](https://app.devin.ai/attachments/faa9dd9b-bfd3-4ff2-a76f-4841953b77b1/t2-admin-panel.png)

## Fora do escopo (não testado)

- Login direto pelo formulário interno de `/admin` (caminho alternativo do PR #16) — pedido do usuário era "login de admin", e o caminho via `/login` é o recomendado.
- Logout SSO e logout não-SSO — endereçados no código e no Devin Review do PR #16 mas fora do pedido ("testa o login"). Se quiser, rodo uma rodada só pra esses dois fluxos.
- Empresa (`empresa@ondetem.com`) — não pedido.

## Observações

- O Chrome na VM abre pop-up "Change your password" / "Save password" depois do submit, porque `123456` está em breach lists. Isso não afeta o app — é prompt nativo do Chrome e some clicando em "No thanks"/"OK".
