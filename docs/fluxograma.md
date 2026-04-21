# Fluxograma do projeto "Onde Tem?"

Documento completo dos fluxos do PWA: arquitetura, autenticação, jornadas de cada tipo de usuário (visitante, cliente, empresa, admin), pagamento, Service Worker e endpoints REST.

Todos os diagramas usam [Mermaid](https://mermaid.js.org/), renderizado automaticamente pelo GitHub.

---

## 1. Arquitetura em camadas

```mermaid
flowchart LR
    subgraph Client["Navegador do usuário (PWA)"]
        HTML["Páginas<br/>(index · login · cadastro-usuario<br/>cadastro-empresa · agendamentos<br/>admin · painel-empresa)"]
        JS["Scripts<br/>(script.js · app.js · auth-guard.js)"]
        SW["service-worker.js<br/>cache v23 · runtime cache"]
        Storage["Armazenamento local<br/>localStorage: ondetem_token · ondetem_usuario<br/>sessionStorage: ondetem_admin_logado"]
    end

    subgraph Server["Node.js + Express (server.js)"]
        Static["Arquivos estáticos<br/>express.static"]
        Mw["Middlewares<br/>autenticar · exigirTipo"]
        Api["API REST<br/>/api/*"]
        Health["Healthcheck<br/>/healthz"]
    end

    subgraph Mem["Banco em memória (db)"]
        Users[("usuarios")]
        Empresas[("empresas")]
        Agend[("agendamentos")]
        Pag[("pagamentos")]
        Sess[("sessoes<br/>Map&lt;token, {id, email, tipo, nome}&gt;<br/>sem expiração — vive até restart")]
    end

    subgraph Ext["Serviços externos (CDN)"]
        Leaflet["Leaflet + OSM tiles"]
        Nominatim["Nominatim<br/>(geocoding)"]
        Fonts["Google Fonts"]
    end

    HTML --> JS
    JS -->|"fetch /api/*<br/>Authorization: Bearer"| Api
    JS --> Storage
    JS --> Leaflet
    JS --> Nominatim
    SW -.intercepta.-> HTML
    SW -.intercepta.-> JS
    Api --> Mw
    Mw --> Sess
    Api --> Users
    Api --> Empresas
    Api --> Agend
    Api --> Pag
    Static --> HTML
    Health --> Mem
```

---

## 2. Jornada geral (decisão por tipo de usuário)

```mermaid
flowchart TD
    Start([Usuário abre o site]) --> SW{Service Worker<br/>registrado?}
    SW -->|primeira visita| Install[instala SW<br/>popula cache v23] --> Home
    SW -->|já registrado| Home
    Home["/ (home)"]:::page
    Home --> NotifPrompt{Tem sessão<br/>de usuário?}
    NotifPrompt -->|sim, primeira vez| AskNotif[Prompt nativo de<br/>Notification.requestPermission]
    NotifPrompt -->|não| Browse
    AskNotif --> Browse[Ver categorias · cards · mapa]
    Browse --> Click{Escolheu ação?}

    Click -->|buscar / filtrar| Filter[Filtra cards +<br/>marcadores no mapa]
    Filter --> Browse

    Click -->|Agendar em um salão| HasLogin{auth-guard<br/>localStorage<br/>ondetem_usuario?}
    HasLogin -->|não| GateModal[Modal<br/>Login necessário]
    GateModal -->|"Fazer login"| LoginPage
    GateModal -->|"Cadastrar-se"| CadUserPage
    HasLogin -->|sim, tipo usuario| BookModal[Modal<br/>Agendar]
    HasLogin -->|outro tipo| WrongType[Toast:<br/>apenas usuários agendam]

    Click -->|Entrar / Anunciar| LoginPage
    Click -->|Cadastrar empresa| CadEmpresaPage

    LoginPage["/login"]:::page --> LoginFlow
    CadUserPage["/cadastro-usuario"]:::page --> UserFlow
    CadEmpresaPage["/cadastro-empresa"]:::page --> EmpresaFlow
    BookModal --> PayFlow

    LoginFlow[ver fluxo §3]
    UserFlow[ver fluxo §4]
    EmpresaFlow[ver fluxo §5]
    PayFlow[ver fluxo §6]

    classDef page fill:#f0e8ff,stroke:#553A73,stroke-width:2px;
```

---

## 3. Autenticação — login de usuário / empresa / admin (SSO)

```mermaid
flowchart TD
    A(["/login"]) --> B[Selecionar aba:<br/>Usuário · Empresa · Admin]
    B --> C[Preencher email + senha]
    C --> D[POST /api/login<br/>body: {email, senha, tipo}]
    D --> E{servidor<br/>valida em db}
    E -->|não encontra| Erro[401 — credenciais inválidas]
    Erro --> A
    E -->|match| F[cria token em db.sessoes<br/>armazena {id, email, tipo, nome}<br/>sem expiração]
    F --> G[200 OK<br/>retorna {token, usuario}]
    G --> H["OndeTemAuth.salvarSessao<br/>localStorage: ondetem_token + ondetem_usuario"]
    H --> I{destinoPorTipo}
    I -->|tipo: usuario| Home["/"]
    I -->|tipo: empresa| PE["/painel-empresa"]
    I -->|tipo: admin| Adm["/admin"]

    Adm --> Guard{verificarLoginAdmin<br/>OndeTemAuth.obterUsuario<br/>tipo === admin?}
    Guard -->|sim — SSO| Panel[mostrarPainel]
    Guard -->|não| Form[form interno de /admin<br/>POST /api/login com tipo:admin]
    Form -->|OK| SaveDup["OndeTemAuth.salvarSessao<br/>+ sessionStorage.ondetem_admin_logado"]
    SaveDup --> Panel

    Panel --> Dash[Dashboard<br/>Usuários · Empresas · Agendamentos · Receita]

    subgraph Logout["Logout"]
        L1[clique em Sair] --> L2{OndeTemAuth<br/>tem admin SSO?}
        L2 -->|sim| L3[OndeTemAuth.logout<br/>→ POST /api/logout<br/>→ limpa localStorage<br/>→ redirect /login]
        L2 -->|não| L4[limpa sessionStorage<br/>esconde painel<br/>mostra form interno]
    end
```

---

## 4. Cadastro + uso do cliente (tipo `usuario`)

```mermaid
flowchart TD
    A(["/cadastro-usuario"]) --> B[Preencher: nome, email,<br/>telefone, CPF, endereço,<br/>data nasc., gênero, senha]
    B --> C[POST /api/usuarios]
    C --> D{validação}
    D -->|email duplicado| DE[409 — E-mail já cadastrado]
    D -->|OK| E[db.usuarios.push<br/>retorna 201]
    E --> F[redirect /login]

    F --> G[Login §3] --> Home["/"]

    Home --> Pick[Escolhe salão<br/>+ clica Agendar]
    Pick --> Modal[#modalAgendamento<br/>serviço · data · hora · obs · valor + forma pagamento]
    Modal --> Submit[submit]
    Submit --> PayFlow[§6 — Pagamento]
    PayFlow --> AgendReq[POST /api/agendamentos<br/>Authorization: Bearer token<br/>inclui pagamentoId]
    AgendReq --> Mid{middleware<br/>exigirTipo usuario}
    Mid -->|tipo != usuario| Neg[403]
    Mid -->|OK| AgendDB[db.agendamentos.push<br/>status: pendente]
    AgendDB --> Toast[toast + notificação local<br/>via SW.showNotification]
    Toast --> MeusAg[/agendamentos<br/>lista os agendamentos<br/>do usuario]
```

---

## 5. Cadastro + uso da empresa (tipo `empresa`)

```mermaid
flowchart TD
    A(["/cadastro-empresa"]) --> B[Dados comerciais<br/>CNPJ · razão social · categorias · serviços · horários]
    B --> C[Endereço estruturado<br/>rua · número · bairro · cidade · UF · CEP]
    C --> D[Localização no Mapa *<br/>- Usar minha localização<br/>- Buscar pelo endereço Nominatim<br/>- clicar / arrastar marcador]
    D --> E{lat/lng<br/>preenchidos?}
    E -->|não| E0[bloqueia submit<br/>Marque a localização da empresa]
    E0 --> D
    E -->|sim| F[POST /api/empresas<br/>payload completo + lat/lng]
    F --> G{validação server}
    G -->|lat/lng inválido| GErr400[400 — localização inválida]
    G -->|email duplicado| GErr409[409 — E-mail já cadastrado]
    G -->|OK| H[db.empresas.push<br/>{ativa: true}<br/>retorna 201]
    H --> I[redirect /login]

    I --> Login[Login tipo empresa §3] --> Painel["/painel-empresa"]

    Painel --> Tabs{O que quer?}
    Tabs -->|Perfil| P1[GET/PUT /api/empresa/perfil]
    Tabs -->|Serviços| P2[CRUD /api/empresa/servicos]
    Tabs -->|Agendamentos| P3[GET /api/agendamentos<br/>filtrado por empresa]
    P3 --> Aceitar[PATCH /api/agendamentos/:id<br/>status: pendente · confirmado · recusado · concluido]
    Tabs -->|Dashboard| P4[GET /api/empresa/dashboard<br/>totais + receita]

    subgraph Public["Home do cliente final"]
        PubGet[GET /api/empresas/publicas<br/>só campos públicos + lat/lng]
        PubGet --> PubMap[marcadores roxos no mapa<br/>popup com distância Haversine]
    end
    H -.visível em.-> PubGet
```

---

## 6. Fluxo de pagamento (simulação — PR #6/7)

```mermaid
flowchart TD
    A[Modal Agendamento<br/>Forma de pagamento] --> B{Pix ou Cartão?}

    B -->|Cartão| C1[Preenche número, titular, validade MM/AA, CVV, parcelas]
    C1 --> C2[POST /api/pagamentos/cartao<br/>valida Luhn + validade + CVV<br/>detecta bandeira]
    C2 --> C3{termina em 0000?}
    C3 -->|sim| CRec[402 — recusado<br/>fundos insuficientes]
    C3 -->|não| CAprov[201 — aprovado<br/>codigoAutorizacao + nsu<br/>guarda só bandeira + 4 últimos]
    CAprov --> Book

    B -->|Pix| P1[POST /api/pagamentos/pix<br/>status: aguardando]
    P1 --> P2[Mostra bloco #pixCobranca<br/>QR + copia-e-cola + expiraEm]
    P2 --> P3[Usuário clica Já paguei]
    P3 --> P4[POST /api/pagamentos/pix/:id/confirmar<br/>status: aprovado + endToEndId]
    P4 --> Book

    Book[POST /api/agendamentos<br/>com pagamentoId] --> Done[Toast + Notification<br/>Agendamento Confirmado!]

    subgraph Listar["Listar pagamentos"]
        LA[GET /api/pagamentos]
        LA --> LTipo{tipo do usuário?}
        LTipo -->|usuario| LU[filtra p.usuarioEmail == req.usuario.email]
        LTipo -->|empresa| LE[coleta pagamentoId dos agendamentos<br/>com empresaId == req.usuario.id<br/>e filtra db.pagamentos por esses ids]
        LTipo -->|admin| LAdm[retorna todos]
    end

    subgraph Reset["Higiene entre agendamentos"]
        R1[form.reset após concluir] --> R2[resetarBlocoPix<br/>limpa #pixCobranca]
        R2 --> R3[sincronizarBlocoPagamento<br/>esconde bloco inativo]
    end
```

---

## 7. Middleware de autenticação e autorização

```mermaid
flowchart LR
    Req["Request<br/>Authorization: Bearer TOKEN"] --> A{autenticar}
    A -->|header ausente OU não começa com Bearer| E401a[401 — Não autenticado]
    A -->|token não existe em db.sessoes| E401b[401 — Não autenticado]
    A -->|OK| Attach["req.usuario = {id, email, tipo, nome}"]
    Attach --> T{exigirTipo<br/>tipos permitidos?}
    T -->|req.usuario.tipo dentro| Next[handler da rota]
    T -->|não| E403[403 — acesso negado]

    subgraph Cliente["No browser (auth-guard.js)"]
        C1[OndeTemAuth.api<br/>adiciona header automaticamente<br/>se 401 → chama logout<br/>e redirect /login]
    end
```

---

## 8. Mapa de rotas REST (server.js)

```mermaid
flowchart TB
    subgraph Public["Públicas (sem token)"]
        R1["GET /healthz"]
        R2["POST /api/login"]
        R3["POST /api/usuarios"]
        R4["POST /api/empresas"]
        R5["GET /api/usuarios"]
        R6["GET /api/empresas"]
        R7["GET /api/empresas/publicas"]
        R8["GET /api/servicos"]
    end

    subgraph Auth["Autenticadas (qualquer tipo)"]
        A1["POST /api/logout"]
        A2["GET /api/me"]
        A3["GET /api/agendamentos"]
        A4["GET /api/pagamentos<br/>/:id"]
        A5["POST /api/pagamentos/cartao"]
        A6["POST /api/pagamentos/pix<br/>+ /:id/confirmar"]
    end

    subgraph Usuario["Somente tipo: usuario"]
        U1["POST /api/agendamentos"]
    end

    subgraph Empresa["Somente tipo: empresa"]
        E1["GET/POST/PUT/DELETE /api/empresa/servicos"]
        E2["GET/PUT /api/empresa/perfil"]
        E3["GET /api/empresa/dashboard"]
    end

    subgraph EmpAdm["Empresa OU admin"]
        EA1["PATCH /api/agendamentos/:id"]
    end
```

---

## 9. Service Worker — ciclo de vida e estratégias de cache

```mermaid
flowchart TD
    Inst["install<br/>pré-cache urlsToCache"] --> ActSkip[self.skipWaiting]
    ActSkip --> Act["activate<br/>limpa caches com nomes antigos<br/>clients.claim"]
    Act --> Fetch[fetch handler]

    Fetch --> Q{método GET?}
    Q -->|não| Skip[passa direto<br/>sem interceptar]
    Q -->|sim| Q2{mesmo origin<br/>e /api/*?}
    Q2 -->|sim| NetOnly[network-only<br/>nunca cacheia API]
    Q2 -->|não| Q3{mesmo origin?}
    Q3 -->|sim — HTML/JS/CSS| NF[network-first<br/>guarda 200 em CACHE_NAME<br/>fallback cache quando offline]
    Q3 -->|não — CDN/externo| SWR[stale-while-revalidate<br/>retorna cache imediatamente<br/>revalida em background<br/>guarda em RUNTIME_CACHE]

    ActSkip --> Msg["postMessage 'SW_UPDATED'<br/>aos clients"]
    Msg --> Reload[scripts forçam reload<br/>nas abas abertas]
```

---

## 10. Notificações (PR #8/9)

```mermaid
flowchart LR
    Load[page load] --> Has{Notification<br/>API disponível?}
    Has -->|não| Skip[sem prompt]
    Has -->|sim| Perm{permission?}
    Perm -->|granted| Ready[mostrarNotificacaoLocal<br/>via SW.showNotification<br/>fallback new Notification]
    Perm -->|denied| Skip
    Perm -->|default| Ask[Notification.requestPermission<br/>prompt nativo]
    Ask -->|granted| Ready
    Ask -->|denied| Skip

    Evento[Agendamento confirmado<br/>ou Pix aprovado] --> Ready
```

---

## 11. Matriz de permissões

| Rota / tela | Visitante | Usuário | Empresa | Admin |
|---|---|---|---|---|
| `/` (home, ver cards/mapa) | ✅ | ✅ | ✅ | ✅ |
| Agendar em um salão | ❌ (modal login) | ✅ | ❌ | ❌ |
| `/agendamentos` | ❌ | ✅ próprios | ❌ | ❌ |
| `/painel-empresa` | ❌ | ❌ | ✅ | ❌ |
| `/admin` | ❌ | ❌ | ❌ | ✅ (SSO) |
| `POST /api/empresa/*` | ❌ | ❌ | ✅ | ❌ |
| `PATCH /api/agendamentos/:id` | ❌ | ❌ | ✅ | ✅ |
| `GET /api/pagamentos` | ❌ | ✅ filtrados | ✅ filtrados | ✅ todos |
| `GET /api/empresas/publicas` | ✅ | ✅ | ✅ | ✅ |

---

## 12. Legenda

- **PWA**: Progressive Web App servido por `express.static` + Service Worker.
- **Token**: UUID gerado no `POST /api/login`, guardado em `db.sessoes` (`Map<token, usuario>`) **sem expiração** — a sessão persiste enquanto o servidor estiver rodando. Reiniciar o servidor invalida todos os tokens (consequência do `db` em memória).
- **OndeTemAuth**: IIFE em `auth-guard.js` que encapsula `salvarSessao / obterUsuario / exigirLogin / api / logout` usando `localStorage`.
- **SSO admin**: o painel `/admin` aceita sessão do `OndeTemAuth` vinda do login em `/login` (aba Admin) sem pedir login novamente.
- **db**: objeto em memória — não persiste após reinício do servidor (limitação conhecida, ver README).
