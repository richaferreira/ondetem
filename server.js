// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { seedAdmin, gerarToken, usuarios } = require('./store/db');
const { verificarToken } = require('./middleware/auth');

// Route modules
const usuariosRoutes = require('./routes/usuarios');
const empresasRoutes = require('./routes/empresas');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Seed admin user from env vars
seedAdmin();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Security headers via Helmet (CSP, X-Frame-Options, etc.)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://unpkg.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "blob:"
            ],
            fontSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://fonts.gstatic.com"
            ],
            connectSrc: [
                "'self'",
                "https://jsonplaceholder.typicode.com",
                "https://tile.openstreetmap.org"
            ]
        }
    }
}));

// CORS configuration — restrict to known origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiter for login endpoint — prevents brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per window
    message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false
});

// General rate limiter for all API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware: Parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// STATIC FILE SERVING (restricted)
// ==========================================

// Block access to server-side files — must come BEFORE express.static
app.use((req, res, next) => {
    const blocked = ['/server.js', '/.env', '/.env.example', '/package.json', '/package-lock.json'];
    if (blocked.includes(req.path.toLowerCase())) {
        return res.status(403).json({ erro: "Acesso negado." });
    }
    next();
});

// Serve only client-side static files
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. ROTAS DE NAVEGAÇÃO (Páginas Front-end)
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/agendamentos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'agendamentos.html'));
});

app.get('/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuarios.html'));
});

// ==========================================
// 2. ROTAS DE DADOS (API RESTful)
// ==========================================

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// --- ROTA DE LOGIN UNIFICADA ---
app.post('/api/login', loginLimiter, (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);
    if (!usuario) {
        return res.status(401).json({ erro: "Credenciais inválidas." });
    }

    if (!usuario.ativo) {
        return res.status(403).json({ erro: "Conta desativada. Entre em contato com o suporte." });
    }

    const token = gerarToken(usuario.id, usuario.role, usuario.email);
    const { senha: _, ...dadosPublicos } = usuario;

    res.status(200).json({
        mensagem: "Autenticação aprovada",
        token,
        usuario: dadosPublicos
    });
});

// --- ROTAS DE AGENDAMENTOS (protected) ---
app.get('/api/agendamentos', verificarToken, (req, res) => {
    res.json({ status: 'sucesso', dados: [] });
});

app.post('/api/agendamentos', verificarToken, (req, res) => {
    const { estabelecimento, data, hora, pagamento } = req.body;

    if (!estabelecimento || !data || !hora) {
        return res.status(400).json({ erro: "Dados incompletos para o agendamento." });
    }

    // Sanitize string inputs
    const sanitize = (str) => String(str).replace(/[<>"'&]/g, '');

    const novoAgendamento = {
        id: Date.now(),
        estabelecimento: sanitize(estabelecimento),
        data: sanitize(data),
        hora: sanitize(hora),
        pagamento: sanitize(pagamento || ''),
        status: 'confirmado'
    };

    res.status(201).json({
        mensagem: "Agendamento criado com sucesso!",
        dados: novoAgendamento
    });
});

// --- MOUNT ROUTE MODULES ---
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/admin', adminRoutes);

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`[Sistema] Servidor inicializado na porta ${PORT}`);
    console.log(`[Sistema] Acesse: http://localhost:${PORT}`);
});
