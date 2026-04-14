// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

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
    methods: ['GET', 'POST'],
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

// --- Authentication helper ---
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ erro: "Token de autenticação não fornecido." });
    }
    // NOTE: In production, replace this with proper JWT verification.
    // This is a placeholder that checks the token is non-empty.
    const token = authHeader.split(' ')[1];
    if (!token || token.length < 16) {
        return res.status(401).json({ erro: "Token inválido." });
    }
    next();
}

// --- ROTAS DE LOGIN ---
app.post('/api/login', loginLimiter, (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    // Credentials from environment variables (never hardcode in production)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error('[SEGURANÇA] Credenciais de admin não configuradas nas variáveis de ambiente.');
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }

    if (email === adminEmail && senha === adminPassword) {
        // Generate a cryptographically random token
        const token = crypto.randomBytes(32).toString('hex');
        res.status(200).json({
            mensagem: "Autenticação aprovada",
            token: token
        });
    } else {
        // Generic message to avoid user enumeration
        res.status(401).json({ erro: "Credenciais inválidas." });
    }
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

// --- ROTAS DE USUÁRIOS (protected) ---
app.get('/api/usuarios', verificarToken, (req, res) => {
    res.json({ status: 'sucesso', usuarios: [] });
});

app.post('/api/usuarios', verificarToken, (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos obrigatórios." });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ erro: "E-mail inválido." });
    }

    const sanitize = (str) => String(str).replace(/[<>"'&]/g, '');

    res.status(201).json({
        mensagem: "Usuário registrado com sucesso!",
        dados: { id: Date.now(), nome: sanitize(nome), email: sanitize(email) }
    });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`[Sistema] Servidor inicializado na porta ${PORT}`);
    console.log(`[Sistema] Acesse: http://localhost:${PORT}`);
});
