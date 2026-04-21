/**
 * script.js - Script principal do projeto "Onde Tem?"
 * Gerencia interatividade, filtros, mapa e persistência de dados
 */

// ============================================
// 1. REGISTRO DO SERVICE WORKER PARA PWA
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('✓ Service Worker registrado:', reg.scope))
            .catch(err => console.log('✗ Erro ao registrar SW:', err));
    });
}

// ============================================
// 2. VARIÁVEIS GLOBAIS
// ============================================
let filtroAtivo = null;
let mapaInstancia = null;
let marcadoresEstabelecimentos = [];
let marcadoresEmpresasCadastradas = [];
let localizacaoUsuario = null;
let estabelecimentoSelecionado = null;

// ============================================
// 3. INICIALIZAÇÃO DO DOCUMENTO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✓ DOM carregado - Iniciando aplicação');
    
    // Inicializar componentes
    inicializarBusca();
    inicializarCategorias();
    inicializarModal();
    inicializarFormulario();
    inicializarMapa();
    
    console.log('✓ Aplicação inicializada com sucesso');
});

// ============================================
// 4. BUSCA E FILTRO POR TEXTO
// ============================================
function inicializarBusca() {
    const inputDesktop = document.querySelector('.search-bar input');
    const btnLupaMobile = document.getElementById('btn-lupa-mobile');
    const inputMobile = document.getElementById('input-busca-mobile');

    // Busca no desktop
    if (inputDesktop) {
        inputDesktop.addEventListener('input', (e) => {
            filtroAtivo = null;
            removerFiltrosCategorias();
            filtrarPorTexto(e.target.value);
        });
    }

    // Busca no mobile
    if (inputMobile) {
        inputMobile.addEventListener('input', (e) => {
            filtroAtivo = null;
            removerFiltrosCategorias();
            filtrarPorTexto(e.target.value);
        });
    }

    // Toggle da lupa no mobile
    if (btnLupaMobile) {
        btnLupaMobile.addEventListener('click', () => {
            inputMobile.classList.toggle('d-none');
            inputMobile.classList.toggle('ativo');
            if (!inputMobile.classList.contains('d-none')) {
                inputMobile.focus();
            }
        });
    }
}

function filtrarPorTexto(termo) {
    const cards = document.querySelectorAll('.listings .row > div');
    const searchTerm = termo.toLowerCase();
    let resultados = 0;

    cards.forEach((card, index) => {
        const estabelecimento = ESTABELECIMENTOS[index];
        if (!estabelecimento) return;

        const match = 
            estabelecimento.nome.toLowerCase().includes(searchTerm) ||
            estabelecimento.descricao.toLowerCase().includes(searchTerm) ||
            estabelecimento.categorias.some(cat => cat.toLowerCase().includes(searchTerm));

        if (match) {
            card.style.display = "block";
            card.style.animation = "slideIn 0.3s ease";
            resultados++;
        } else {
            card.style.display = "none";
        }
    });

    // Mostrar mensagem se não houver resultados
    mostrarMensagemResultados(resultados, termo);
}

function mostrarMensagemResultados(resultados, termo) {
    let mensagem = document.getElementById('mensagem-resultados');
    
    if (!mensagem) {
        mensagem = document.createElement('div');
        mensagem.id = 'mensagem-resultados';
        mensagem.className = 'alert alert-info mt-3';
        document.querySelector('.listings').appendChild(mensagem);
    }

    if (resultados === 0 && termo) {
        mensagem.textContent = '';
        const icone = document.createElement('i');
        icone.className = 'bi bi-search';
        mensagem.appendChild(icone);
        mensagem.appendChild(document.createTextNode(` Nenhum resultado encontrado para "${termo}"`));
        mensagem.style.display = 'block';
    } else {
        mensagem.style.display = 'none';
    }
}

// ============================================
// 5. FILTRO POR CATEGORIAS
// ============================================
function inicializarCategorias() {
    const categoryItems = document.querySelectorAll('.category-item');

    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            const categoria = item.querySelector('p').innerText;
            
            if (filtroAtivo === categoria) {
                // Remover filtro se clicar novamente
                filtroAtivo = null;
                item.classList.remove('active');
                mostrarTodosCards();
                console.log('✓ Filtro removido');
            } else {
                // Aplicar novo filtro
                filtroAtivo = categoria;
                removerFiltrosCategorias();
                item.classList.add('active');
                filtrarPorCategoria(categoria);
                console.log('✓ Filtro aplicado:', categoria);
            }
        });

        // Adicionar efeito hover
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'scale(1.05)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = 'scale(1)';
        });
    });
}

function filtrarPorCategoria(categoria) {
    const cards = document.querySelectorAll('.listings .row > div');
    let resultados = 0;

    cards.forEach((card, index) => {
        const estabelecimento = ESTABELECIMENTOS[index];
        if (!estabelecimento) return;

        const match = estabelecimento.categorias.includes(categoria);

        if (match) {
            card.style.display = "block";
            card.style.animation = "slideIn 0.3s ease";
            resultados++;
        } else {
            card.style.display = "none";
        }
    });

    mostrarMensagemResultados(resultados, categoria);
}

function removerFiltrosCategorias() {
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
}

function mostrarTodosCards() {
    document.querySelectorAll('.listings .row > div').forEach(card => {
        card.style.display = "block";
        card.style.animation = "slideIn 0.3s ease";
    });
    
    const mensagem = document.getElementById('mensagem-resultados');
    if (mensagem) mensagem.style.display = 'none';
}

// ============================================
// 6. MODAL E AGENDAMENTO
// ============================================
function inicializarModal() {
    const modalElement = document.getElementById('modalAgendamento');
    const bModal = new bootstrap.Modal(modalElement);

    // Delegação de evento para botões "Agendar" (dentro de cards de salão)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.card-salao .card-body .btn');
        if (btn) {
            const cardBody = btn.closest('.card-body');
            const nomeLocal = cardBody.querySelector('.card-title').innerText;
            const indexCard = Array.from(document.querySelectorAll('.listings .row > div')).findIndex(
                card => card.querySelector('.card-title').innerText === nomeLocal
            );

            if (indexCard !== -1) {
                // Exige autenticação antes de abrir o modal de agendamento
                if (!exigirUsuarioLogado(nomeLocal)) return;

                estabelecimentoSelecionado = ESTABELECIMENTOS[indexCard];
                document.getElementById('modalAgendamentoLabel').innerText = `Agendar em: ${nomeLocal}`;
                preencherHorariosDisponiveis();
                bModal.show();
                console.log('✓ Modal aberto para:', nomeLocal);
            }
        }
    });
}

/**
 * Verifica se existe um usuário logado do tipo "usuario" antes de permitir agendar.
 * Caso contrário, abre o modal pedindo login ou cadastro.
 * @returns {Boolean} true se o usuário pode prosseguir, false se o fluxo foi interrompido.
 */
function exigirUsuarioLogado(nomeLocal) {
    const auth = window.OndeTemAuth;
    const usuario = auth ? auth.obterUsuario() : null;
    const token = auth ? auth.obterToken() : null;

    if (usuario && token && usuario.tipo === 'usuario') {
        return true;
    }

    if (usuario && usuario.tipo && usuario.tipo !== 'usuario') {
        alert('Apenas contas de "Usuário" podem realizar agendamentos. Faça login com uma conta de usuário.');
        return false;
    }

    abrirModalLoginNecessario(nomeLocal);
    return false;
}

function abrirModalLoginNecessario(nomeLocal) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    const modalEl = document.getElementById('modalLoginNecessario');
    if (!modalEl) {
        // Fallback caso o modal não esteja presente no HTML
        const ir = confirm('Para agendar, você precisa estar logado.\n\nOK → Fazer login\nCancelar → Criar conta');
        window.location.href = ir ? `/login?redirect=${redirect}` : '/cadastro-usuario';
        return;
    }
    const textoDestino = modalEl.querySelector('[data-destino]');
    if (textoDestino) {
        textoDestino.textContent = nomeLocal ? `em ${nomeLocal}` : '';
    }
    const btnLogin = modalEl.querySelector('#btnIrLogin');
    if (btnLogin) {
        btnLogin.href = `login.html?redirect=${redirect}`;
    }
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bModal.show();
}

function preencherHorariosDisponiveis() {
    const selectHora = document.getElementById('horaAgendamento');
    selectHora.innerHTML = '<option value="">Selecione...</option>';

    HORARIOS_DISPONIVEIS.forEach(horario => {
        const option = document.createElement('option');
        option.value = horario;
        option.textContent = horario;
        selectHora.appendChild(option);
    });
}

// ============================================
// 7. FORMULÁRIO E PAGAMENTO
// ============================================
// Guarda a cobrança Pix da vez para que o botão "Já paguei" saiba qual
// pagamento confirmar na API.
let pixCobrancaAtual = null;

// Sincroniza a visibilidade dos blocos de cartão/Pix com o valor atual do
// select de método de pagamento. É chamado tanto pelo evento `change` do
// select quanto após `form.reset()` (que não dispara `change`).
function sincronizarBlocoPagamento() {
    const selectMetodo = document.getElementById('metodoPagamento');
    const blocoCartao = document.getElementById('blocoCartao');
    const blocoPix = document.getElementById('blocoPix');
    if (!selectMetodo) return;
    const metodo = selectMetodo.value;
    if (blocoCartao) blocoCartao.hidden = metodo !== 'cartao';
    if (blocoPix) blocoPix.hidden = metodo !== 'pix';
    if (metodo !== 'pix') resetarBlocoPix();
}

function inicializarFormulario() {
    const form = document.getElementById('formAgendamento');
    const statusPagamento = document.getElementById('statusPagamento');
    const selectMetodo = document.getElementById('metodoPagamento');

    selectMetodo.addEventListener('change', () => {
        sincronizarBlocoPagamento();
        statusPagamento.innerHTML = '';
    });
    sincronizarBlocoPagamento();

    // Máscaras dos campos de cartão (estética; o servidor é quem valida).
    const inputNumero = document.getElementById('cartaoNumero');
    const inputValidade = document.getElementById('cartaoValidade');
    const inputCvv = document.getElementById('cartaoCvv');
    if (inputNumero) {
        inputNumero.addEventListener('input', () => {
            const d = inputNumero.value.replace(/\D/g, '').slice(0, 19);
            inputNumero.value = d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
        });
    }
    if (inputValidade) {
        inputValidade.addEventListener('input', () => {
            const d = inputValidade.value.replace(/\D/g, '').slice(0, 4);
            inputValidade.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
        });
    }
    if (inputCvv) {
        inputCvv.addEventListener('input', () => {
            inputCvv.value = inputCvv.value.replace(/\D/g, '').slice(0, 4);
        });
    }

    // Botão "copiar" do Pix.
    const btnCopiar = document.getElementById('btnCopiarPix');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', async () => {
            const el = document.getElementById('pixCopiaECola');
            if (!el || !el.value) return;
            try {
                await navigator.clipboard.writeText(el.value);
                btnCopiar.innerHTML = '<i class="bi bi-check2"></i>';
                setTimeout(() => { btnCopiar.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1500);
            } catch (_) {
                el.select();
                document.execCommand('copy');
            }
        });
    }

    // Botão "Já paguei (simular confirmação)" do Pix.
    const btnPaguei = document.getElementById('btnPagueiPix');
    if (btnPaguei) {
        btnPaguei.addEventListener('click', async () => {
            await confirmarPixSimulado(form, statusPagamento);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processarAgendamento(form, statusPagamento);
    });
}

function resetarBlocoPix() {
    pixCobrancaAtual = null;
    const inicial = document.getElementById('pixInicial');
    const cobranca = document.getElementById('pixCobranca');
    if (inicial) inicial.hidden = false;
    if (cobranca) cobranca.hidden = true;
    const qr = document.getElementById('pixQrCode');
    if (qr) qr.innerHTML = '';
    const cc = document.getElementById('pixCopiaECola');
    if (cc) cc.value = '';
}

function renderizarQrCodePix(copiaECola) {
    const container = document.getElementById('pixQrCode');
    if (!container) return;
    // Usa serviço público para gerar o QR. Se estiver offline, o usuário ainda
    // consegue usar o "copia e cola" abaixo.
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(copiaECola)}`;
    container.innerHTML = `<img src="${src}" width="180" height="180" alt="QR Code Pix">`;
}

async function processarAgendamento(form, statusPagamento) {
    const btnSubmit = form.querySelector('button[type="submit"]');
    const dataAgendamento = document.getElementById('dataAgendamento').value;
    const horaAgendamento = document.getElementById('horaAgendamento').value;
    const metodoPagamento = document.getElementById('metodoPagamento').value;
    const valorInput = document.getElementById('valorAgendamento');
    const valor = valorInput ? Number(valorInput.value) : 0;

    // Revalida autenticação antes de submeter (defesa em profundidade)
    if (!exigirUsuarioLogado(estabelecimentoSelecionado && estabelecimentoSelecionado.nome)) {
        const modalElement = document.getElementById('modalAgendamento');
        const bModal = bootstrap.Modal.getInstance(modalElement);
        if (bModal) bModal.hide();
        return;
    }

    if (!dataAgendamento || !horaAgendamento || !metodoPagamento) {
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-exclamation-circle"></i> Preencha todos os campos!</b>';
        return;
    }

    const dataSelecionada = new Date(dataAgendamento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataSelecionada < hoje) {
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-exclamation-circle"></i> Selecione uma data futura!</b>';
        return;
    }
    if (metodoPagamento !== 'local' && (!Number.isFinite(valor) || valor <= 0)) {
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-exclamation-circle"></i> Informe um valor válido para o pagamento.</b>';
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';
    statusPagamento.innerHTML = '<i class="bi bi-hourglass-split"></i> Conectando ao servidor...';

    try {
        // 1) Processa o pagamento (se houver) antes de criar o agendamento.
        let pagamento = null;
        if (metodoPagamento === 'cartao') {
            pagamento = await pagarCartao(valor, statusPagamento);
            if (!pagamento) return reabilitarBotao(btnSubmit);
        } else if (metodoPagamento === 'pix') {
            // Para Pix mostramos o QR code e paramos por aqui. A criação do
            // agendamento acontece no botão "Já paguei (simular confirmação)".
            const criado = await criarCobrancaPix(valor, statusPagamento);
            if (!criado) return reabilitarBotao(btnSubmit);
            statusPagamento.innerHTML = '<i class="bi bi-qr-code-scan"></i> Aguardando pagamento Pix...';
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Confirmar e Pagar';
            return;
        }

        // 2) Cria o agendamento (com ou sem pagamento associado).
        await criarAgendamento({
            form, statusPagamento, btnSubmit,
            dataAgendamento, horaAgendamento, metodoPagamento, pagamento
        });
    } catch (erro) {
        console.error('✗ Erro ao processar agendamento:', erro);
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-x-circle"></i> Erro de conexão. Verifique se o servidor está rodando.</b>';
        reabilitarBotao(btnSubmit);
    }
}

function reabilitarBotao(btnSubmit) {
    setTimeout(() => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Confirmar e Pagar';
    }, 2000);
}

async function pagarCartao(valor, statusPagamento) {
    const numero = (document.getElementById('cartaoNumero').value || '').trim();
    const nome = (document.getElementById('cartaoNome').value || '').trim();
    const validade = (document.getElementById('cartaoValidade').value || '').trim();
    const cvv = (document.getElementById('cartaoCvv').value || '').trim();
    const parcelas = Number(document.getElementById('cartaoParcelas').value) || 1;

    if (!numero || !nome || !validade || !cvv) {
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-exclamation-circle"></i> Preencha todos os dados do cartão.</b>';
        return null;
    }

    statusPagamento.innerHTML = '<i class="bi bi-credit-card"></i> Autorizando cartão...';
    const resp = await window.OndeTemAuth.api('/api/pagamentos/cartao', {
        method: 'POST',
        body: JSON.stringify({ valor, numero, nome, validade, cvv, parcelas })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || (json.dados && json.dados.status !== 'aprovado')) {
        const msg = (json.dados && json.dados.motivo) || json.erro || 'Pagamento recusado.';
        statusPagamento.innerHTML = `<b class="text-danger"><i class="bi bi-x-circle"></i> ${msg}</b>`;
        return null;
    }
    statusPagamento.innerHTML = `<b class="text-success"><i class="bi bi-check-circle"></i> Cartão aprovado (autorização ${json.dados.codigoAutorizacao}).</b>`;
    return json.dados;
}

async function criarCobrancaPix(valor, statusPagamento) {
    statusPagamento.innerHTML = '<i class="bi bi-qr-code"></i> Gerando cobrança Pix...';
    const resp = await window.OndeTemAuth.api('/api/pagamentos/pix', {
        method: 'POST',
        body: JSON.stringify({ valor })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.dados) {
        statusPagamento.innerHTML = `<b class="text-danger"><i class="bi bi-x-circle"></i> ${json.erro || 'Não foi possível gerar a cobrança Pix.'}</b>`;
        return null;
    }
    pixCobrancaAtual = json.dados;
    document.getElementById('pixInicial').hidden = true;
    document.getElementById('pixCobranca').hidden = false;
    document.getElementById('pixCopiaECola').value = json.dados.copiaECola;
    renderizarQrCodePix(json.dados.copiaECola);
    return json.dados;
}

async function confirmarPixSimulado(form, statusPagamento) {
    if (!pixCobrancaAtual) return;
    const btnPaguei = document.getElementById('btnPagueiPix');
    const btnSubmit = form.querySelector('button[type="submit"]');
    btnPaguei.disabled = true;
    btnPaguei.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Confirmando...';
    try {
        const resp = await window.OndeTemAuth.api(`/api/pagamentos/pix/${pixCobrancaAtual.id}/confirmar`, {
            method: 'POST'
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || (json.dados && json.dados.status !== 'aprovado')) {
            statusPagamento.innerHTML = `<b class="text-danger"><i class="bi bi-x-circle"></i> ${json.erro || 'Pix não confirmado.'}</b>`;
            btnPaguei.disabled = false;
            btnPaguei.innerHTML = '<i class="bi bi-check-circle"></i> Já paguei (simular confirmação)';
            return;
        }
        statusPagamento.innerHTML = '<b class="text-success"><i class="bi bi-check-circle"></i> Pix confirmado!</b>';
        const pagamento = json.dados;
        const dataAgendamento = document.getElementById('dataAgendamento').value;
        const horaAgendamento = document.getElementById('horaAgendamento').value;
        await criarAgendamento({
            form, statusPagamento, btnSubmit,
            dataAgendamento, horaAgendamento, metodoPagamento: 'pix', pagamento
        });
    } catch (erro) {
        console.error('✗ Erro ao confirmar Pix:', erro);
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-x-circle"></i> Erro ao confirmar Pix.</b>';
        btnPaguei.disabled = false;
        btnPaguei.innerHTML = '<i class="bi bi-check-circle"></i> Já paguei (simular confirmação)';
    }
}

async function criarAgendamento(ctx) {
    const { form, statusPagamento, btnSubmit, dataAgendamento, horaAgendamento, metodoPagamento, pagamento } = ctx;
    const dadosAgendamento = {
        estabelecimento: estabelecimentoSelecionado.nome,
        data: dataAgendamento,
        hora: horaAgendamento,
        pagamento: metodoPagamento,
        pagamentoId: pagamento ? pagamento.id : null
    };

    const resposta = await window.OndeTemAuth.api('/api/agendamentos', {
        method: 'POST',
        body: JSON.stringify(dadosAgendamento)
    });
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
        const msgErro = resultado.erro || `Erro ${resposta.status}`;
        statusPagamento.innerHTML = `<b class="text-danger"><i class="bi bi-x-circle"></i> ${msgErro}</b>`;
        reabilitarBotao(btnSubmit);
        return;
    }

    const registroLocal = {
        id: resultado.dados && resultado.dados.id ? resultado.dados.id : Date.now(),
        estabelecimento: dadosAgendamento.estabelecimento,
        estabelecimentoId: estabelecimentoSelecionado.id,
        data: dadosAgendamento.data,
        hora: dadosAgendamento.hora,
        pagamento: dadosAgendamento.pagamento,
        pagamentoId: dadosAgendamento.pagamentoId,
        timestamp: new Date().toLocaleString('pt-BR'),
        status: (resultado.dados && resultado.dados.status) || 'pendente'
    };
    const agendamentos = JSON.parse(localStorage.getItem(STORAGE_KEYS.agendamentos)) || [];
    agendamentos.push(registroLocal);
    localStorage.setItem(STORAGE_KEYS.agendamentos, JSON.stringify(agendamentos));

    statusPagamento.innerHTML = '<b class="text-success"><i class="bi bi-check-circle"></i> Agendamento confirmado!</b>';

    setTimeout(() => {
        const modalElement = document.getElementById('modalAgendamento');
        const bModal = bootstrap.Modal.getInstance(modalElement);
        if (bModal) bModal.hide();
        form.reset();
        statusPagamento.innerHTML = '';
        // form.reset() não dispara 'change' no select e volta para a opção
        // padrão "pix", então precisamos limpar a cobrança Pix do fluxo
        // anterior explicitamente (senão o QR code e o botão "Já paguei"
        // da cobrança antiga continuariam visíveis) e só depois sincronizar
        // a visibilidade dos blocos.
        resetarBlocoPix();
        sincronizarBlocoPagamento();
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Confirmar e Pagar';

        if (typeof mostrarNotificacao === 'function') {
            mostrarNotificacao(
                `Agendamento confirmado em ${registroLocal.estabelecimento}`,
                'success'
            );
        }
        if (window.mostrarNotificacaoPush) {
            const dataFormatada = typeof formatarData === 'function'
                ? formatarData(registroLocal.data)
                : registroLocal.data;
            window.mostrarNotificacaoPush(
                'Agendamento Confirmado!',
                `Sua reserva em ${registroLocal.estabelecimento} para o dia ${dataFormatada} às ${registroLocal.hora} foi realizada com sucesso.`
            );
        }
        console.log('✓ Agendamento realizado:', registroLocal);
    }, 1500);
}

// ============================================
// 8. MAPA E MARCADORES
// ============================================
function inicializarMapa() {
    console.log('✓ Inicializando mapa...');
    
    mapaInstancia = L.map('map');

    // Adicionar camada de azulejos (OpenStreetMap)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(mapaInstancia);

    // Tentar localizar o usuário
    mapaInstancia.locate({ setView: true, maxZoom: 16 });

    // Evento: Localização encontrada
    mapaInstancia.on('locationfound', function(e) {
        console.log('✓ Localização do usuário encontrada');
        localizacaoUsuario = e.latlng;

        // Marcador do usuário
        L.marker(e.latlng, {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(mapaInstancia)
            .bindPopup("<b>Você está aqui!</b>")
            .openPopup();

        // Círculo de precisão
        L.circle(e.latlng, e.accuracy, {
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(mapaInstancia);

        // Adicionar marcadores dos estabelecimentos em destaque + empresas cadastradas
        adicionarMarcadoresEstabelecimentos();
        carregarEmpresasCadastradas();
    });

    // Evento: Erro na localização
    mapaInstancia.on('locationerror', function(e) {
        console.warn('⚠ Localização não disponível. Usando Saquarema como padrão.');

        // Fallback: Saquarema
        mapaInstancia.setView(MAPA_CONFIG.coordenada_padrao, MAPA_CONFIG.zoom);

        // Adicionar marcadores dos estabelecimentos em destaque + empresas cadastradas
        adicionarMarcadoresEstabelecimentos();
        carregarEmpresasCadastradas();
    });
}

// Distância aproximada em km entre dois pontos (fórmula de Haversine)
function distanciaKm(lat1, lng1, lat2, lng2) {
    const toRad = v => v * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function formatarDistancia(km) {
    if (!Number.isFinite(km)) return '';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
}

async function carregarEmpresasCadastradas() {
    try {
        const resp = await fetch('/api/empresas/publicas');
        if (!resp.ok) {
            console.warn('⚠ Não foi possível carregar empresas cadastradas:', resp.status);
            return;
        }
        const { empresas } = await resp.json();
        if (!Array.isArray(empresas)) return;

        // Remove marcadores anteriores (ex.: reload após novo cadastro)
        marcadoresEmpresasCadastradas.forEach(m => m.remove());
        marcadoresEmpresasCadastradas = [];

        const icone = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        empresas.forEach(emp => {
            if (typeof emp.lat !== 'number' || typeof emp.lng !== 'number') return;

            let distanciaHtml = '';
            if (localizacaoUsuario) {
                const km = distanciaKm(localizacaoUsuario.lat, localizacaoUsuario.lng, emp.lat, emp.lng);
                distanciaHtml = `<br><small><i class="bi bi-geo"></i> ${formatarDistancia(km)} de você</small>`;
            }

            const categorias = (emp.categorias || []).join(', ');
            const telefone = emp.telefone ? `<br><small><i class="bi bi-telephone"></i> ${emp.telefone}</small>` : '';
            const endereco = emp.endereco ? `<br><small>${emp.endereco}</small>` : '';

            const marcador = L.marker([emp.lat, emp.lng], { icon: icone })
                .addTo(mapaInstancia)
                .bindPopup(`
                    <div style="min-width: 200px;">
                        <b style="color: #553A73;">${emp.nome}</b>
                        ${categorias ? `<br><small>${categorias}</small>` : ''}
                        ${endereco}
                        ${telefone}
                        ${distanciaHtml}
                    </div>
                `);

            marcadoresEmpresasCadastradas.push(marcador);
        });

        console.log(`✓ ${marcadoresEmpresasCadastradas.length} empresa(s) cadastrada(s) exibida(s) no mapa.`);
    } catch (erro) {
        console.error('✗ Erro ao carregar empresas cadastradas:', erro);
    }
}

function adicionarMarcadoresEstabelecimentos() {
    console.log('✓ Adicionando marcadores dos estabelecimentos...');
    
    ESTABELECIMENTOS.forEach((est, index) => {
        // Criar ícone personalizado
        const icone = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Criar marcador
        const marcador = L.marker([est.lat, est.lng], { icon: icone })
            .addTo(mapaInstancia)
            .bindPopup(`
                <div style="width: 200px;">
                    <b style="color: #553A73;">${est.nome}</b><br>
                    <small>${est.categorias.join(', ')}</small><br>
                    <small><i class="bi bi-star-fill" style="color: #ffc107;"></i> ${est.avaliacao}</small><br>
                    <small>${est.endereco}</small><br>
                    <small><i class="bi bi-telephone"></i> ${est.telefone}</small>
                </div>
            `);

        marcador.on('click', () => {
            console.log('✓ Marcador clicado:', est.nome);
        });

        marcadoresEstabelecimentos.push(marcador);
    });

    console.log('✓ Marcadores adicionados:', marcadoresEstabelecimentos.length);
}

// ============================================
// 9. NOTIFICAÇÕES
// ============================================
function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.className = `alert alert-${tipo} alert-dismissible fade show`;
    notificacao.role = 'alert';
    notificacao.style.position = 'fixed';
    notificacao.style.top = '20px';
    notificacao.style.right = '20px';
    notificacao.style.zIndex = '9999';
    notificacao.style.minWidth = '300px';
    notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    document.body.appendChild(notificacao);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        notificacao.remove();
    }, 5000);
}

// ============================================
// 10. UTILITÁRIOS
// ============================================

// Função para formatar data
function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

// Função para formatar moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Função para obter label do método de pagamento
function obterLabelPagamento(valor) {
    const metodo = METODOS_PAGAMENTO.find(m => m.valor === valor);
    return metodo ? metodo.label : valor;
}

console.log('✓ Script carregado com sucesso');
