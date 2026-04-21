# PR #15 — Airbnb home redesign E2E test report

Testado rodando `npm start` local em `http://localhost:3000/` (branch `devin/1776731157-airbnb-home`), navegando pela UI com o Chromium via DISPLAY :0. Gravação em anexo.

## Resultados

| # | Test | Resultado | Evidência |
|---|------|-----------|-----------|
| T1 | Home renderiza em novo visual Airbnb (pill + categorias + grid acima do mapa) | ✅ passed | Screenshot 1 |
| T2 | Filtro "Unhas" oculta cards sem a categoria | ✅ passed | Screenshot 2 |
| T3 | Agendar deslogado → `#modalLoginNecessario` (não `#modalAgendamento`) | ✅ passed | Screenshot 3 |
| T4 | Logado + Agendar → `#modalAgendamento` com valor default e Pix | ✅ passed | Screenshot 4 |
| T5 | Toggle do mapa — `Ocultar mapa` esconde; `Mostrar mapa` re-renderiza tiles (valida `mapaInstancia.invalidateSize`) | ✅ passed | Screenshots 5, 6 |

## Screenshots

### 1. Home Airbnb-style (T1)
![Home com pill, categorias e grid de cards acima do mapa](https://app.devin.ai/attachments/85c1a276-2cc9-4bfa-801c-b3a971fec9a0/screenshot_750ea6d42f3043fb9aa9253cbc490441.png)

### 2. Filtro Unhas (T2)
![Filtro Unhas ativo; Clínica Estética Flores oculta](https://app.devin.ai/attachments/738d89da-b427-4dad-90fb-6ffcb81ed195/screenshot_d8227a8bf3d24caeaaf6d4ee9636a44b.png)

### 3. Modal Login necessário deslogado (T3)
![Modal Login necessário ao clicar Agendar sem estar logado](https://app.devin.ai/attachments/82623407-2e31-48fd-8afd-8999c074b44e/screenshot_f5f8b9c631dc401786d179e93f4f5f56.png)

### 4. Modal Agendar logado (T4)
![Modal Agendar em Studio Bella Donna, Valor 60.00, Pix](https://app.devin.ai/attachments/f1100b34-e2e0-4211-8773-a0dc2fbffa82/screenshot_3907d3fbaf644f20b03eae4de7d79776.png)

### 5. Mapa oculto — botão vira "Mostrar mapa" (T5)
![Mapa oculto; botão vira Mostrar mapa](https://app.devin.ai/attachments/f80678d3-3bb5-4554-a8df-c6bf31d12162/screenshot_07b69099cdd94996aa2bd820af47998b.png)

### 6. Mapa re-renderizado após toggle (T5 — fix validado)
![Mapa reexibido, tiles completos sem cinza](https://app.devin.ai/attachments/6c24736c-86f0-42c4-86fb-0a7d61c8afb5/screenshot_d6a4a38a82424ccb8552940f8e73e8b3.png)

## Observações

- Testado sem SW antigo interferindo: o bump `v18→v21` do PR já toma conta de invalidar cache.
- Hooks de `script.js` (delegação do botão Agendar, `.category-item`, `.card-salao`, `data-index`, `#modalLoginNecessario`, `#modalAgendamento`) permanecem funcionais no novo layout.
- Único comentário novo do Devin Review é **estilístico** (indentação 2→4 espaços no `<script>` inline do toggle) — não é regressão funcional e não foi abordado neste PR.
