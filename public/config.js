/**
 * config.js - Configuração centralizada do projeto "Onde Tem?"
 */

const ESTABELECIMENTOS = [
    {
        id: 0,
        nome: "Studio Bella Donna",
        descricao: "Cabelo • Unhas • Sobrancelhas",
        imagem: "https://frizzar.com.br/blog/wp-content/uploads/2025/01/salao-de-beleza-moderno.webp",
        avaliacao: 4.8,
        distancia: "220 m",
        lat: -22.9345,
        lng: -42.4951,
        categorias: ["Cabelo", "Unhas", "Sobrancelhas"],
        servicos: [
            { nome: "Corte Feminino", preco: 120.00 },
            { nome: "Manicure Simples", preco: 35.00 }
        ]
    },
    {
        id: 1,
        nome: "Clínica Estética Flores",
        descricao: "Rosto • Depilação • Massagem",
        imagem: "https://s2.glbimg.com/Ha2q-YYa3pCWtwM4E51zi_p-POI=/940x523/e.glbimg.com/og/ed/f/original/2019/02/20/blow-dry-bar-del-mar-chairs-counter-853427.jpg",
        avaliacao: 4.9,
        distancia: "1.1 km",
        lat: -22.9350,
        lng: -42.4945,
        categorias: ["Rosto", "Depilação", "Massagem"],
        servicos: [
            { nome: "Limpeza de Pele", preco: 150.00 },
            { nome: "Drenagem Linfática", preco: 180.00 }
        ]
    },
    {
        id: 2,
        nome: "Espaço Glow",
        descricao: "Unhas • Sobrancelhas • Rosto",
        imagem: "https://ferrante.com.br/wp-content/uploads/2024/11/decoracao-minimalista-salao.jpg.jpeg",
        avaliacao: 4.7,
        distancia: "500 m",
        lat: -22.9340,
        lng: -42.4955,
        categorias: ["Unhas", "Sobrancelhas", "Rosto"],
        servicos: [
            { nome: "Design de Sobrancelhas", preco: 60.00 },
            { nome: "Alongamento em Gel", preco: 160.00 }
        ]
    }
];

const HORARIOS_DISPONIVEIS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

const STORAGE_KEYS = {
    agendamentos: "ondetem_agendamentos"
};

const MAPA_CONFIG = {
    coordenada_padrao: [-22.9345, -42.4951],
    zoom: 13
};
