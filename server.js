const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://viacep.com.br", "https://cdn.jsdelivr.net"]
    }
  }
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP (aumentado de 100)
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
});
app.use(limiter);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true em produção com HTTPS
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(expressLayouts);
app.set('layout', 'layout');

// Rotas
app.use('/', require('./routes/index'));
app.use('/api/cobrancas', require('./routes/cobrancas'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/imoveis', require('./routes/imoveis'));
app.use('/api/contratos', require('./routes/contratos'));
app.use('/financeiro', require('./routes/financeiro'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`🏠 Sistema de Imóveis rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Verificar se a API key está configurada
  if (!process.env.ASAAS_API_KEY) {
    console.warn('⚠️  ATENÇÃO: ASAAS_API_KEY não configurada!');
    console.warn('📝 Copie o arquivo .env.example para .env e configure sua chave API');
  }
});