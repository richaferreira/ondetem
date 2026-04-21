# Test Plan — Chat IA com Google Gemini (PR #22)

## O que mudou
Foi adicionado um **widget de chat flutuante** (bolha roxa no canto inferior direito) em todas as páginas do app. Ao abrir, o usuário pode perguntar sobre o "Onde Tem?" e a resposta vem do backend `POST /api/chat`, que faz proxy para o Google Gemini (`gemini-2.5-flash-lite`).

Antes do PR: não havia chat no app.
Depois do PR: bolha de chat em todas as páginas; IA responde em PT-BR sobre agendamento/pagamento e recusa perguntas fora do escopo.

Evidência no código:
- Bolha + painel: [`chat-widget.js:60-95`](chat-widget.js) (método `montarDOM`)
- Fetch para `/api/chat`: [`chat-widget.js:119-135`](chat-widget.js) (`enviarMensagem`)
- System prompt com categorias/Pix/cartão: [`chat.js:14-38`](chat.js)
- Widget incluído em `index.html`, `login.html`, `cadastro-usuario.html`, `cadastro-empresa.html`, `agendamentos.html`, `painel-empresa.html`, `admin.html`

## Primary flow (gravação única, ~60s)

### T1 — Bolha visível na home e painel fechado por padrão
- **Ação**: abrir `http://localhost:3000/` no Chrome.
- **Pass**: existe `button.ot-chat-bubble` visível no canto inferior direito da tela (ícone de chat-dots); `section.ot-chat-panel` tem atributo `hidden` (painel não aparece).
- **Fail**: nenhuma bolha visível, ou painel já aberto antes de clicar.

### T2 — Clicar na bolha abre o painel com mensagem de boas-vindas
- **Ação**: clicar na bolha.
- **Pass**: `section.ot-chat-panel` fica visível (sem `hidden`), header com `<strong>Assistente Onde Tem?</strong>`, corpo tem **1 única** bolha `.ot-chat-msg-bot` contendo exatamente `"Oi! Sou a assistente do Onde Tem?..."`.
- **Fail**: painel não abre, ou abre vazio, ou mensagem inicial é diferente da constante `MENSAGEM_BOAS_VINDAS`.

### T3 — Pergunta on-topic retorna resposta real do Gemini em PT-BR
- **Ação**: digitar na textarea `Como eu agendo um corte de cabelo?` e pressionar Enter.
- **Pass**:
  1. Aparece bolha `.ot-chat-msg-user` com o texto exato digitado.
  2. Logo depois, aparece uma bolha "digitando" (`.ot-chat-msg-typing` com 3 pontos animados).
  3. Dentro de ≤10s, a bolha "digitando" some e surge bolha `.ot-chat-msg-bot` com resposta **em PT-BR** contendo pelo menos uma destas palavras-chave do system prompt: `salão`, `serviço`, `data`, `hora`, `pagamento` ou `Pix` (evidência de que a resposta saiu do Gemini com o prompt do Onde Tem?, não é um lorem ipsum nem um eco).
  4. Request `POST /api/chat` retornou HTTP **200** (conferir via DevTools Network) com `{ resposta: "...", finishReason: "STOP" }`.
- **Fail**: stuck em "digitando" indefinidamente, resposta em outro idioma, resposta genérica sem menção a nada do app, ou 500/4xx na Network.
- **Por que é adversarial**: se o endpoint estivesse quebrado (chave errada, modelo errado, system prompt não aplicado), a mensagem de erro `"⚠️ Falha ao consultar o serviço de IA"` apareceria em vez da resposta contextualizada — o texto visível seria claramente diferente.

### T4 — Off-topic é recusado redirecionando pro escopo do app
- **Ação**: na mesma conversa, digitar `me ensina uma receita de bolo de chocolate` e enviar.
- **Pass**: a resposta da IA deve explicitamente dizer que **não ajuda com receita/bolo** e redirecionar para tópicos do app (palavras esperadas: `agendamentos`, `beleza`, `pagamento` OU `Onde Tem?`).
- **Fail**: a IA retorna uma receita, ou uma resposta desconexa, ou falha.
- **Por que é adversarial**: se o `systemInstruction` estivesse faltando/mal aplicado (ex.: passado no campo errado da API), o Gemini responderia a receita normalmente. A recusa contextualizada prova que o system prompt está viajando até o modelo.

### T5 — Widget aparece também em página logada (regressão)
- **Ação**: navegar para `/login`, logar com `joao@email.com` / `123456`, ser redirecionado para `/`, clicar em **Meus agendamentos** no header (ou ir para `/agendamentos`).
- **Pass**: a bolha `.ot-chat-bubble` continua visível no canto inferior direito em `/agendamentos` (confirmando que o widget foi injetado corretamente em múltiplos HTMLs, não só `index.html`).
- **Fail**: bolha some em `/agendamentos` (injeção parcial).

## Out of scope (não será testado)
- Mobile: testes rodam em desktop. A media query mobile (`@media (max-width: 500px)`) será revisada via screenshot, mas sem repro mobile real.
- Rate limit (20/min por IP): validado por unit test em `tests/chat.test.js`.
- Mais páginas do widget (`login`, `cadastro-empresa`, `cadastro-usuario`, `painel-empresa`, `admin`): cobertura por T5 em `/agendamentos` é suficiente para provar injeção multi-página.
