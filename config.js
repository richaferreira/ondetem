/**
 * config.js - Configuração centralizada do projeto "Onde Tem?"
 * Mantém dados, constantes e configurações reutilizáveis
 */

// Dados dos estabelecimentos com informações completas
const ESTABELECIMENTOS = [
    {
        id: 0,
        nome: "Studio Bella Donna",
        descricao: "Salão de beleza completo com profissionais experientes",
        imagem: "https://frizzar.com.br/blog/wp-content/uploads/2025/01/salao-de-beleza-moderno.webp",
        avaliacao: 4.8,
        distancia: "220 m",
        telefone: "(24) 99999-0001",
        endereco: "Rua das Flores, 123 - Saquarema",
        horario: "09:00 - 18:00",
        lat: -22.9345,
        lng: -42.4951,
        categorias: ["Cabelo", "Unhas", "Sobrancelhas"],
        servicos: [
            { nome: "Corte Feminino", preco: 120.00 },
            { nome: "Manicure Simples", preco: 35.00 },
            { nome: "Design de Sobrancelhas", preco: 60.00 }
        ]
    },
    {
        id: 1,
        nome: "Clínica Estética Flores",
        descricao: "Clínica especializada em tratamentos estéticos faciais e corporais",
        imagem: "https://s2.glbimg.com/Ha2q-YYa3pCWtwM4E51zi_p-POI=/940x523/e.glbimg.com/og/ed/f/original/2019/02/20/blow-dry-bar-del-mar-chairs-counter-853427.jpg",
        avaliacao: 4.9,
        distancia: "1.1 km",
        telefone: "(24) 99999-0002",
        endereco: "Av. Principal, 456 - Saquarema",
        horario: "10:00 - 19:00",
        lat: -22.9350,
        lng: -42.4945,
        categorias: ["Rosto", "Depilação", "Massagem"],
        servicos: [
            { nome: "Limpeza de Pele", preco: 150.00 },
            { nome: "Drenagem Linfática", preco: 180.00 },
            { nome: "Depilação com Cera", preco: 90.00 }
        ]
    },
    {
        id: 2,
        nome: "Espaço Glow",
        descricao: "Espaço moderno dedicado a unhas, sobrancelhas e tratamentos faciais",
        imagem: "https://ferrante.com.br/wp-content/uploads/2024/11/decoracao-minimalista-salao.jpg.jpeg",
        avaliacao: 4.7,
        distancia: "500 m",
        telefone: "(24) 99999-0003",
        endereco: "Rua do Comércio, 789 - Saquarema",
        horario: "09:00 - 20:00",
        lat: -22.9340,
        lng: -42.4955,
        categorias: ["Unhas", "Sobrancelhas", "Rosto"],
        servicos: [
            { nome: "Design de Sobrancelhas", preco: 60.00 },
            { nome: "Alongamento em Gel", preco: 160.00 },
            { nome: "Limpeza de Pele", preco: 120.00 }
        ]
    }
];

// Categorias disponíveis
const CATEGORIAS = [
    { nome: "Cabelo", icone: "bi-scissors" },
    { nome: "Unhas", icone: "bi-hand-index-thumb" },
    { nome: "Depilação", icone: "bi-gender-female" },
    { nome: "Sobrancelhas", icone: "bi-eye" },
    { nome: "Massagem", icone: "bi-person-hearts" },
    { nome: "Rosto", icone: "bi-person-fill" }
];

// Horários disponíveis para agendamento
const HORARIOS_DISPONIVEIS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
];

// Métodos de pagamento
const METODOS_PAGAMENTO = [
    { valor: "pix", label: "Pix" },
    { valor: "cartao", label: "Cartão de Crédito" },
    { valor: "local", label: "Pagar no Estabelecimento" }
];

// Configurações de cores
const CORES = {
    primaria: "#553A73",
    secundaria: "#d93d3d",
    sucesso: "#28a745",
    erro: "#dc3545",
    aviso: "#ffc107",
    info: "#17a2b8"
};

// Configurações de animação
const ANIMACOES = {
    duracao: 300,
    easing: "ease"
};

// Configurações do mapa
const MAPA_CONFIG = {
    zoom: 13,
    coordenada_padrao: [-22.9345, -42.4951],
    cidade: "Saquarema"
};

// Chaves do localStorage
const STORAGE_KEYS = {
    agendamentos: "ondetem_agendamentos",
    preferencias: "ondetem_preferencias",
    historico_busca: "ondetem_historico_busca"
};

// Função auxiliar para buscar estabelecimento por ID
function obterEstabelecimento(id) {
    return ESTABELECIMENTOS.find(est => est.id === id);
}

// Função auxiliar para buscar estabelecimentos por categoria
function obterEstabelecimentosPorCategoria(categoria) {
    return ESTABELECIMENTOS.filter(est => est.categorias.includes(categoria));
}

// Função auxiliar para buscar estabelecimentos por termo
function buscarEstabelecimentos(termo) {
    const termoBusca = termo.toLowerCase();
    return ESTABELECIMENTOS.filter(est => 
        est.nome.toLowerCase().includes(termoBusca) ||
        est.descricao.toLowerCase().includes(termoBusca) ||
        est.categorias.some(cat => cat.toLowerCase().includes(termoBusca))
    );
}

// Exportar para uso em outros arquivos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ESTABELECIMENTOS,
        CATEGORIAS,
        HORARIOS_DISPONIVEIS,
        METODOS_PAGAMENTO,
        CORES,
        ANIMACOES,
        MAPA_CONFIG,
        STORAGE_KEYS,
        obterEstabelecimento,
        obterEstabelecimentosPorCategoria,
        buscarEstabelecimentos
    };
}
