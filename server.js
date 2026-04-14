// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware: Parse de JSON com foco em performance para o corpo das requisições
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve todos os arquivos estáticos (HTML, CSS, imagens e os scripts do front-end)
// Isso otimiza o carregamento sem precisar criar uma rota para cada imagem ou arquivo CSS
app.use(express.static(__dirname));

// ==========================================
// 1. ROTAS DE NAVEGAÇÃO (Páginas Front-end)
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/agendamentos', (req, res) => {
    res.sendFile(path.join(__dirname, 'agendamentos.html'));
});

app.get('/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'usuarios.html'));
});

// ==========================================
// 2. ROTAS DE DADOS (API RESTful)
// ==========================================

// --- ROTAS DE LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    // Lógica de verificação (posteriormente será conectada ao banco de dados)
    if (email === 'admin@ondetem.com' && senha === '123456') {
        res.status(200).json({
            mensagem: "Autenticação aprovada",
            token: "token_de_acesso_gerado_aqui"
        });
    } else {
        res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }
});

// --- ROTAS DE AGENDAMENTOS ---
app.get('/api/agendamentos', (req, res) => {
    // Retornaria a lista de agendamentos salvos no banco
    res.json({ status: 'sucesso', dados: [] });
});

app.post('/api/agendamentos', (req, res) => {
    const { estabelecimento, data, hora, pagamento } = req.body;

    // Validação de segurança lógica: impede o processamento se faltarem dados cruciais
    if (!estabelecimento || !data || !hora) {
        return res.status(400).json({ erro: "Dados incompletos para o agendamento." });
    }

    const novoAgendamento = {
        id: Date.now(),
        estabelecimento,
        data,
        hora,
        pagamento,
        status: 'confirmado'
    };

    // Resposta de sucesso simulando a inserção no banco
    res.status(201).json({
        mensagem: "Agendamento criado com sucesso!",
        dados: novoAgendamento
    });
});

// --- ROTAS DE USUÁRIOS ---
app.get('/api/usuarios', (req, res) => {
    res.json({ status: 'sucesso', usuarios: [] });
});

app.post('/api/usuarios', (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos obrigatórios." });
    }

    res.status(201).json({
        mensagem: "Usuário registrado com sucesso!",
        dados: { id: Date.now(), nome, email }
    });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`[Sistema] Servidor inicializado e rodando na porta ${PORT}`);
    console.log(`[Sistema] Acesse a aplicação em: http://localhost:${PORT}`);
});