/**
 * script.js - Script principal do projeto "Onde Tem?"
 * Gerencia interatividade, filtros, mapa e persistência de dados
 */

// ============================================
// 1. REGISTRO DO SERVICE WORKER PARA PWA
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
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
        mensagem.innerHTML = `<i class="bi bi-search"></i> Nenhum resultado encontrado para "${termo}"`;
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

    // Delegação de evento para botões "Agendar"
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-danger') && e.target.closest('.card-body')) {
            const btn = e.target;
            const cardBody = btn.closest('.card-body');
            const nomeLocal = cardBody.querySelector('.card-title').innerText;
            const indexCard = Array.from(document.querySelectorAll('.listings .row > div')).findIndex(
                card => card.querySelector('.card-title').innerText === nomeLocal
            );

            if (indexCard !== -1) {
                estabelecimentoSelecionado = ESTABELECIMENTOS[indexCard];
                document.getElementById('modalAgendamentoLabel').innerText = `Agendar em: ${nomeLocal}`;
                preencherHorariosDisponiveis();
                bModal.show();
                console.log('✓ Modal aberto para:', nomeLocal);
            }
        }
    });
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
function inicializarFormulario() {
    const form = document.getElementById('formAgendamento');
    const statusPagamento = document.getElementById('statusPagamento');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processarAgendamento(form, statusPagamento);
    });
}

async function processarAgendamento(form, statusPagamento) {
    const btnSubmit = form.querySelector('button[type="submit"]');
    const dataAgendamento = document.getElementById('dataAgendamento').value;
    const horaAgendamento = document.getElementById('horaAgendamento').value;
    const metodoPagamento = document.getElementById('metodoPagamento').value;

    // Validações
    if (!dataAgendamento || !horaAgendamento || !metodoPagamento) {
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-exclamation-circle"></i> Preencha todos os campos!</b>';
        return;
    }

    // Validar data (não pode ser no passado)
    const dataSelecionada = new Date(dataAgendamento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataSelecionada < hoje) {
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-exclamation-circle"></i> Selecione uma data futura!</b>';
        return;
    }

    // Desabilitar botão e mostrar progresso
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';
    statusPagamento.innerHTML = '<i class="bi bi-hourglass-split"></i> Conectando ao servidor...';

    const dadosAgendamento = {
        id: Date.now(),
        estabelecimento: estabelecimentoSelecionado.nome,
        estabelecimentoId: estabelecimentoSelecionado.id,
        data: dataAgendamento,
        hora: horaAgendamento,
        pagamento: metodoPagamento,
        timestamp: new Date().toLocaleString('pt-BR'),
        status: 'confirmado'
    };

    try {
        // Simular chamada à API
        const resposta = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            body: JSON.stringify(dadosAgendamento),
            headers: { 'Content-type': 'application/json; charset=UTF-8' }
        });

        if (resposta.ok) {
            const resultado = await resposta.json();

            // Salvar no localStorage
            let agendamentos = JSON.parse(localStorage.getItem(STORAGE_KEYS.agendamentos)) || [];
            agendamentos.push(dadosAgendamento);
            localStorage.setItem(STORAGE_KEYS.agendamentos, JSON.stringify(agendamentos));

            // Mostrar sucesso
            statusPagamento.innerHTML = '<b class="text-success"><i class="bi bi-check-circle"></i> Pagamento Aprovado!</b>';
            
            setTimeout(() => {
                const modalElement = document.getElementById('modalAgendamento');
                const bModal = bootstrap.Modal.getInstance(modalElement);
                bModal.hide();
                form.reset();
                statusPagamento.innerHTML = '';
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Confirmar e Pagar';

                // Mostrar notificação de sucesso
                mostrarNotificacao(
                    `Agendamento confirmado em ${dadosAgendamento.estabelecimento}`,
                    'success'
                );

                // DISPARAR NOTIFICAÇÃO PUSH (Simulada conforme Aula 6)
                if (window.mostrarNotificacaoPush) {
                    window.mostrarNotificacaoPush(
                        'Agendamento Confirmado! ✅',
                        `Sua reserva em ${dadosAgendamento.estabelecimento} para o dia ${formatarData(dadosAgendamento.data)} às ${dadosAgendamento.hora} foi realizada com sucesso.`
                    );
                }
                
                console.log('✓ Agendamento realizado:', dadosAgendamento);
            }, 2000);
        }
    } catch (erro) {
        statusPagamento.innerHTML = '<b class="text-danger"><i class="bi bi-x-circle"></i> Erro no processamento.</b>';
        console.error('✗ Erro ao processar agendamento:', erro);
        
        setTimeout(() => {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Confirmar e Pagar';
        }, 2000);
    }
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

        // Adicionar marcadores dos estabelecimentos
        adicionarMarcadoresEstabelecimentos();
    });

    // Evento: Erro na localização
    mapaInstancia.on('locationerror', function(e) {
        console.warn('⚠ Localização não disponível. Usando Saquarema como padrão.');
        
        // Fallback: Saquarema
        mapaInstancia.setView(MAPA_CONFIG.coordenada_padrao, MAPA_CONFIG.zoom);
        
        // Adicionar marcadores dos estabelecimentos
        adicionarMarcadoresEstabelecimentos();
    });
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
