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

app.get('/cadastro-usuario', (req, res) => {
    res.sendFile(path.join(__dirname, 'cadastro-usuario.html'));
});

app.get('/cadastro-empresa', (req, res) => {
    res.sendFile(path.join(__dirname, 'cadastro-empresa.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ==========================================
// 2. ROTAS DE DADOS (API RESTful)
// ==========================================

// --- ROTAS DE LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, senha, tipo } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: "Preencha o e-mail e a senha." });
    }

    // Login de admin - credenciais fixas
    if (tipo === 'admin') {
        if (email === 'admin@ondetem.com' && senha === '123456') {
            return res.status(200).json({
                mensagem: "Autenticação aprovada",
                tipo: 'admin',
                token: "token_de_acesso_gerado_aqui"
            });
        } else {
            return res.status(401).json({ erro: "Credenciais de administrador inválidas." });
        }
    }

    // Login de usuário ou empresa - aceita qualquer credencial por enquanto
    // (posteriormente será conectado ao banco de dados)
    if (tipo === 'usuario' || tipo === 'empresa') {
        return res.status(200).json({
            mensagem: "Autenticação aprovada",
            tipo: tipo,
            token: "token_de_acesso_gerado_aqui"
        });
    }

    // Fallback - login legado sem tipo
    if (email === 'admin@ondetem.com' && senha === '123456') {
        return res.status(200).json({
            mensagem: "Autenticação aprovada",
            token: "token_de_acesso_gerado_aqui"
        });
    }

    res.status(401).json({ erro: "E-mail ou senha incorretos." });
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
        dados: { id: Date.now(), nome, email, dataCadastro: new Date().toLocaleString('pt-BR'), status: 'ativo' }
    });
});

// --- ROTAS DE EMPRESAS ---
app.get('/api/empresas', (req, res) => {
    res.json({ status: 'sucesso', empresas: [] });
});

app.post('/api/empresas', (req, res) => {
    const { nome, cnpj, razaoSocial, email, senha } = req.body;

    if (!nome || !cnpj || !razaoSocial || !email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos obrigatórios." });
    }

    res.status(201).json({
        mensagem: "Empresa cadastrada com sucesso! Aguardando aprovação do administrador.",
        dados: { id: Date.now(), nome, cnpj, email, dataCadastro: new Date().toLocaleString('pt-BR'), status: 'pendente' }
    });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`[Sistema] Servidor inicializado e rodando na porta ${PORT}`);
    console.log(`[Sistema] Acesse a aplicação em: http://localhost:${PORT}`);
});