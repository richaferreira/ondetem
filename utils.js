/**
 * utils.js - Funções utilitárias para o projeto "Onde Tem?"
 * Gerencia localStorage, formatação de dados e operações comuns
 */

// ============================================
// 1. GERENCIAMENTO DE AGENDAMENTOS
// ============================================

/**
 * Obter todos os agendamentos salvos
 * @returns {Array} Lista de agendamentos
 */
function obterAgendamentos() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.agendamentos)) || [];
}

/**
 * Salvar novo agendamento
 * @param {Object} agendamento - Dados do agendamento
 * @returns {Boolean} Sucesso da operação
 */
function salvarAgendamento(agendamento) {
    try {
        let agendamentos = obterAgendamentos();
        agendamentos.push(agendamento);
        localStorage.setItem(STORAGE_KEYS.agendamentos, JSON.stringify(agendamentos));
        console.log('✓ Agendamento salvo:', agendamento.id);
        return true;
    } catch (erro) {
        console.error('✗ Erro ao salvar agendamento:', erro);
        return false;
    }
}

/**
 * Remover agendamento por ID
 * @param {Number} id - ID do agendamento
 * @returns {Boolean} Sucesso da operação
 */
function removerAgendamento(id) {
    try {
        let agendamentos = obterAgendamentos();
        agendamentos = agendamentos.filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEYS.agendamentos, JSON.stringify(agendamentos));
        console.log('✓ Agendamento removido:', id);
        return true;
    } catch (erro) {
        console.error('✗ Erro ao remover agendamento:', erro);
        return false;
    }
}

/**
 * Atualizar agendamento
 * @param {Number} id - ID do agendamento
 * @param {Object} dados - Novos dados
 * @returns {Boolean} Sucesso da operação
 */
function atualizarAgendamento(id, dados) {
    try {
        let agendamentos = obterAgendamentos();
        const index = agendamentos.findIndex(a => a.id === id);
        
        if (index !== -1) {
            agendamentos[index] = { ...agendamentos[index], ...dados };
            localStorage.setItem(STORAGE_KEYS.agendamentos, JSON.stringify(agendamentos));
            console.log('✓ Agendamento atualizado:', id);
            return true;
        }
        return false;
    } catch (erro) {
        console.error('✗ Erro ao atualizar agendamento:', erro);
        return false;
    }
}

/**
 * Obter agendamento por ID
 * @param {Number} id - ID do agendamento
 * @returns {Object|null} Agendamento ou null
 */
function obterAgendamentoPorId(id) {
    const agendamentos = obterAgendamentos();
    return agendamentos.find(a => a.id === id) || null;
}

/**
 * Obter agendamentos por estabelecimento
 * @param {Number} estabelecimentoId - ID do estabelecimento
 * @returns {Array} Lista de agendamentos
 */
function obterAgendamentosPorEstabelecimento(estabelecimentoId) {
    return obterAgendamentos().filter(a => a.estabelecimentoId === estabelecimentoId);
}

/**
 * Limpar todos os agendamentos
 * @returns {Boolean} Sucesso da operação
 */
function limparAgendamentos() {
    try {
        localStorage.removeItem(STORAGE_KEYS.agendamentos);
        console.log('✓ Todos os agendamentos foram removidos');
        return true;
    } catch (erro) {
        console.error('✗ Erro ao limpar agendamentos:', erro);
        return false;
    }
}

/**
 * Contar agendamentos
 * @returns {Number} Quantidade de agendamentos
 */
function contarAgendamentos() {
    return obterAgendamentos().length;
}

// ============================================
// 2. GERENCIAMENTO DE PREFERÊNCIAS
// ============================================

/**
 * Obter preferências do usuário
 * @returns {Object} Preferências salvas
 */
function obterPreferencias() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.preferencias)) || {};
}

/**
 * Salvar preferências
 * @param {Object} preferencias - Dados das preferências
 * @returns {Boolean} Sucesso da operação
 */
function salvarPreferencias(preferencias) {
    try {
        localStorage.setItem(STORAGE_KEYS.preferencias, JSON.stringify(preferencias));
        console.log('✓ Preferências salvas');
        return true;
    } catch (erro) {
        console.error('✗ Erro ao salvar preferências:', erro);
        return false;
    }
}

/**
 * Atualizar preferência específica
 * @param {String} chave - Chave da preferência
 * @param {*} valor - Valor da preferência
 * @returns {Boolean} Sucesso da operação
 */
function atualizarPreferencia(chave, valor) {
    try {
        let prefs = obterPreferencias();
        prefs[chave] = valor;
        salvarPreferencias(prefs);
        return true;
    } catch (erro) {
        console.error('✗ Erro ao atualizar preferência:', erro);
        return false;
    }
}

// ============================================
// 3. GERENCIAMENTO DE HISTÓRICO DE BUSCA
// ============================================

/**
 * Obter histórico de buscas
 * @returns {Array} Lista de buscas realizadas
 */
function obterHistoricoBusca() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.historico_busca)) || [];
}

/**
 * Adicionar termo ao histórico de busca
 * @param {String} termo - Termo de busca
 * @returns {Boolean} Sucesso da operação
 */
function adicionarAoHistoricoBusca(termo) {
    try {
        if (!termo || termo.trim() === '') return false;
        
        let historico = obterHistoricoBusca();
        
        // Remover duplicatas
        historico = historico.filter(t => t !== termo);
        
        // Adicionar no início
        historico.unshift(termo);
        
        // Manter apenas os últimos 10
        historico = historico.slice(0, 10);
        
        localStorage.setItem(STORAGE_KEYS.historico_busca, JSON.stringify(historico));
        console.log('✓ Adicionado ao histórico:', termo);
        return true;
    } catch (erro) {
        console.error('✗ Erro ao adicionar ao histórico:', erro);
        return false;
    }
}

/**
 * Limpar histórico de busca
 * @returns {Boolean} Sucesso da operação
 */
function limparHistoricoBusca() {
    try {
        localStorage.removeItem(STORAGE_KEYS.historico_busca);
        console.log('✓ Histórico de busca limpo');
        return true;
    } catch (erro) {
        console.error('✗ Erro ao limpar histórico:', erro);
        return false;
    }
}

// ============================================
// 4. FORMATAÇÃO DE DADOS
// ============================================

/**
 * Formatar data para formato brasileiro
 * @param {String|Date} data - Data a formatar
 * @returns {String} Data formatada
 */
function formatarData(data) {
    try {
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (erro) {
        console.error('✗ Erro ao formatar data:', erro);
        return data;
    }
}

/**
 * Formatar data e hora
 * @param {String|Date} data - Data a formatar
 * @returns {String} Data e hora formatadas
 */
function formatarDataHora(data) {
    try {
        const d = new Date(data);
        return d.toLocaleString('pt-BR');
    } catch (erro) {
        console.error('✗ Erro ao formatar data/hora:', erro);
        return data;
    }
}

/**
 * Formatar moeda para BRL
 * @param {Number} valor - Valor a formatar
 * @returns {String} Valor formatado
 */
function formatarMoeda(valor) {
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    } catch (erro) {
        console.error('✗ Erro ao formatar moeda:', erro);
        return `R$ ${valor}`;
    }
}

/**
 * Formatar telefone
 * @param {String} telefone - Telefone a formatar
 * @returns {String} Telefone formatado
 */
function formatarTelefone(telefone) {
    const cleaned = telefone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
    
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return telefone;
}

/**
 * Obter label do método de pagamento
 * @param {String} valor - Valor do método
 * @returns {String} Label formatado
 */
function obterLabelPagamento(valor) {
    const metodo = METODOS_PAGAMENTO.find(m => m.valor === valor);
    return metodo ? metodo.label : valor;
}

/**
 * Obter ícone do método de pagamento
 * @param {String} valor - Valor do método
 * @returns {String} Ícone HTML
 */
function obterIconePagamento(valor) {
    const icones = {
        'pix': '<i class="bi bi-qr-code"></i>',
        'cartao': '<i class="bi bi-credit-card"></i>',
        'local': '<i class="bi bi-cash-coin"></i>'
    };
    return icones[valor] || '<i class="bi bi-wallet2"></i>';
}

// ============================================
// 5. VALIDAÇÕES
// ============================================

/**
 * Validar email
 * @param {String} email - Email a validar
 * @returns {Boolean} Email válido
 */
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validar telefone
 * @param {String} telefone - Telefone a validar
 * @returns {Boolean} Telefone válido
 */
function validarTelefone(telefone) {
    const regex = /^(\d{2})\s?9?\d{4}-?\d{4}$/;
    return regex.test(telefone.replace(/\D/g, ''));
}

/**
 * Validar data futura
 * @param {String} data - Data a validar
 * @returns {Boolean} Data é futura
 */
function validarDataFutura(data) {
    const dataSelecionada = new Date(data);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return dataSelecionada >= hoje;
}

// ============================================
// 6. UTILITÁRIOS GERAIS
// ============================================

/**
 * Calcular distância entre duas coordenadas (Haversine)
 * @param {Number} lat1 - Latitude 1
 * @param {Number} lon1 - Longitude 1
 * @param {Number} lat2 - Latitude 2
 * @param {Number} lon2 - Longitude 2
 * @returns {Number} Distância em km
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Gerar ID único
 * @returns {String} ID único
 */
function gerarIdUnico() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Copiar para clipboard
 * @param {String} texto - Texto a copiar
 * @returns {Promise<Boolean>} Sucesso da operação
 */
async function copiarParaClipboard(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        console.log('✓ Copiado para clipboard:', texto);
        return true;
    } catch (erro) {
        console.error('✗ Erro ao copiar:', erro);
        return false;
    }
}

/**
 * Delay/Sleep
 * @param {Number} ms - Milissegundos
 * @returns {Promise} Promise que resolve após o delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce
 * @param {Function} func - Função a executar
 * @param {Number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle
 * @param {Function} func - Função a executar
 * @param {Number} limit - Tempo limite em ms
 * @returns {Function} Função com throttle
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

console.log('✓ Utils carregado com sucesso');
