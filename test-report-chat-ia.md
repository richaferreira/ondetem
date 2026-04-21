# Test Report — Chat IA com Google Gemini (PR #22)

**PR:** https://github.com/Aprendiz-Jr/ondetem/pull/22 (merged)
**Branch testada:** `main` (commit `fc5f3cc`)
**Ambiente:** local — `npm start` com `GEMINI_API_KEY` no env, modelo `gemini-2.5-flash-lite`
**Sessão Devin:** https://app.devin.ai/sessions/a8fef7bfc2ad4ab8b935a86499fe43f8

## Resumo

**5/5 asserções passaram.** Testado em uma gravação contínua cobrindo: bolha visível na home, clique abre painel com mensagem de boas-vindas exata, pergunta on-topic traz resposta real do Gemini em PT-BR, pergunta off-topic é recusada e redireciona ao escopo, e a bolha continua presente em página logada (`/agendamentos`).

Sem escalações. Nenhum erro no console durante o teste.

## Resultados

| # | Teste | Resultado |
|---|-------|-----------|
| T1 | Bolha visível na home e painel fechado por padrão | passed |
| T2 | Clicar na bolha abre o painel com a mensagem de boas-vindas | passed |
| T3 | Pergunta on-topic retorna resposta real do Gemini em PT-BR | passed |
| T4 | Off-topic é recusado redirecionando pro escopo do app | passed |
| T5 | Widget aparece também em página logada (`/agendamentos`) | passed |

## Evidências

### T1 — Bolha visível na home

Bolha roxa no canto inferior direito, painel fechado por padrão.

![T1 — bolha na home](https://app.devin.ai/attachments/a766fa64-bd27-4e62-b7ff-b71dc0faecde/screenshot_1580406cd51e45998aeb99e5bc465204.png)

### T2 — Painel abre com mensagem de boas-vindas

Clique na bolha abre painel com header "Assistente Onde Tem?" e bolha bot com o texto exato da constante `MENSAGEM_BOAS_VINDAS`: "Oi! Sou a assistente do Onde Tem?. Posso ajudar com dúvidas sobre agendamentos, pagamento, cadastro de salão e o que mais você precisar do app."

![T2 — painel aberto com welcome](https://app.devin.ai/attachments/fb52163b-76f7-4f79-8896-abf30659b5ae/screenshot_5bf6774ee4cc497783d76a6735426ce1.png)

### T3 — Resposta on-topic do Gemini

Pergunta: *"Como eu agendo um corte de cabelo?"*
Resposta do Gemini (em PT-BR, mencionando `salão`, `mapa`, `lista`, `Agendar`, `serviço`, `data`, `hora`, `pagamento` — todas do system prompt servidor-side):

> "Para agendar seu corte de cabelo, basta escolher um salão no mapa ou na lista, clicar em 'Agendar', selecionar o serviço, data e hora desejados. Depois é só escolher a forma de pagamento! 💇‍♀️"

![T3 — resposta on-topic](https://app.devin.ai/attachments/23b8d773-605d-492c-8355-44b7670fd420/screenshot_f11f4632366f432596e758bf0bdce916.png)

### T4 — Off-topic é recusado

Pergunta: *"me ensina uma receita de bolo de chocolate"*
Resposta do Gemini (recusa + redirecionamento):

> "Eu só consigo te ajudar com dúvidas sobre agendamentos, pagamentos e o uso do app 'Onde Tem?'. 😊"

Isso prova que o `systemInstruction` foi entregue corretamente ao modelo — sem ele, o Gemini responderia a receita normalmente.

![T4 — off-topic recusado](https://app.devin.ai/attachments/0c53b422-fa62-4c0e-88d9-3534d737084f/screenshot_d2b4f6bd5c9741beb8781b333a8d8202.png)

### T5 — Widget presente em página logada

Após login com `joao@email.com`, navegando para `/agendamentos`, a bolha continua visível no canto inferior direito, provando que o script + CSS foram injetados corretamente em múltiplos HTMLs (não só `index.html`).

![T5 — bolha em /agendamentos](https://app.devin.ai/attachments/fbd23b88-8b7f-4991-8bb8-c3b864d6eb75/screenshot_5375eefa3a5d41b589c2012d8302f564.png)

## Cobertura não testada (fora do escopo)

- **Mobile**: testes rodados em desktop. A media query (`@media (max-width: 500px)`) que posiciona a bolha em `bottom: 76px` sobre o bottom-nav mobile não foi exercitada em viewport real — coberto apenas via inspeção de CSS.
- **Rate limit**: 20 msg/min por IP é validado em `tests/chat.test.js` (unit test passando); não exercitado via UI porque precisaria enviar 21 requests rápidos.
- **Fallback sem `GEMINI_API_KEY`**: endpoint responde 503 com mensagem amigável. Coberto por inspeção de código + retorno manual em testes anteriores; não exercitado nesta gravação porque a chave estava definida.
