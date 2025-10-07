# Sistema de Administração de Imóveis Alugados

Sistema completo para administração de imóveis alugados integrado com a API do Asaas para gestão financeira e geração de boletos.

## 🚀 Funcionalidades

### 📊 Dashboard
- Visão geral financeira em tempo real
- Gráficos de receita e inadimplência
- Indicadores de performance
- Alertas de vencimentos próximos

### 👥 Gestão de Clientes/Inquilinos
- Cadastro completo de clientes
- Integração automática com API do Asaas
- Validação de CPF/CNPJ
- Histórico de pagamentos

### 🏠 Gestão de Imóveis
- Cadastro detalhado de propriedades
- Controle de status (disponível/alugado)
- Fotos e documentos
- Histórico de locações

### 📋 Contratos de Locação
- Criação e gestão de contratos
- Controle de vigência
- Renovações automáticas
- Relatórios de vencimento

### 💰 Cobranças e Boletos
- Geração automática de cobranças
- Boletos bancários via Asaas
- Cobranças recorrentes
- Controle de juros e multas
- Pagamentos via PIX e cartão

### 📈 Relatórios
- Relatórios financeiros detalhados
- Análise de inadimplência
- Performance por imóvel
- Exportação em PDF

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **Frontend**: EJS + Tailwind CSS + JavaScript
- **API de Pagamentos**: Asaas
- **Gráficos**: Chart.js
- **Ícones**: Font Awesome
- **Datas**: Moment.js

## 📋 Pré-requisitos

- Node.js 16+ 
- NPM ou Yarn
- Conta no Asaas (https://www.asaas.com/)

## ⚙️ Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd sistema-imoveis-asaas
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

4. **Configure sua chave da API do Asaas**

Edite o arquivo `.env` e adicione suas credenciais:

```env
# API do Asaas
ASAAS_API_KEY=sua_chave_de_producao_aqui
ASAAS_API_KEY_SANDBOX=sua_chave_de_sandbox_aqui
ASAAS_BASE_URL_PRODUCTION=https://api.asaas.com/v3
ASAAS_BASE_URL_SANDBOX=https://sandbox.asaas.com/api/v3

# Configurações do servidor
PORT=3000
NODE_ENV=development

# Segurança
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
SESSION_SECRET=seu_session_secret_super_seguro_aqui

# Informações da empresa
COMPANY_NAME=Sua Imobiliária
COMPANY_EMAIL=contato@suaimobiliaria.com
COMPANY_PHONE=(11) 99999-9999
```

## 🔑 Como Obter a Chave da API do Asaas

### 1. Criar Conta no Asaas
- Acesse https://www.asaas.com/
- Clique em "Criar conta grátis"
- Preencha os dados da sua empresa
- Confirme seu email

### 2. Acessar o Painel
- Faça login no painel do Asaas
- Vá em **Configurações** → **Integrações** → **API**

### 3. Gerar Chaves da API
- **Ambiente Sandbox (Testes)**:
  - Clique em "Gerar nova chave" na seção Sandbox
  - Copie a chave gerada
  - Cole no campo `ASAAS_API_KEY_SANDBOX` do arquivo `.env`

- **Ambiente Produção**:
  - Após validar sua conta, gere a chave de produção
  - Cole no campo `ASAAS_API_KEY` do arquivo `.env`

### 4. Configurar Webhooks (Opcional)
Para receber notificações automáticas de pagamentos:
- Vá em **Configurações** → **Integrações** → **Webhooks**
- Adicione a URL: `https://seudominio.com/webhooks/asaas`
- Selecione os eventos desejados

## 🚀 Executando o Sistema

### Modo Desenvolvimento
```bash
npm run dev
```

### Modo Produção
```bash
npm start
```

O sistema estará disponível em: http://localhost:3000

## 📁 Estrutura do Projeto

```
sistema-imoveis-asaas/
├── config/
│   └── asaas.js              # Configuração da API do Asaas
├── routes/
│   ├── index.js              # Rotas principais
│   ├── clientes.js           # Gestão de clientes
│   ├── imoveis.js            # Gestão de imóveis
│   ├── contratos.js          # Gestão de contratos
│   ├── cobrancas.js          # Gestão de cobranças
│   └── dashboard.js          # Dashboard e relatórios
├── views/
│   ├── layout.ejs            # Layout base
│   ├── dashboard.ejs         # Página principal
│   ├── clientes.ejs          # Gestão de clientes
│   ├── imoveis.ejs           # Gestão de imóveis
│   ├── contratos.ejs         # Gestão de contratos
│   ├── cobrancas.ejs         # Gestão de cobranças
│   └── relatorios.ejs        # Relatórios
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── server.js                 # Servidor principal
├── package.json              # Dependências
├── .env.example              # Exemplo de configuração
└── README.md                 # Este arquivo
```

## 🔧 Configurações Importantes

### Ambiente de Desenvolvimento vs Produção
- **Development**: Usa chave sandbox do Asaas (transações fictícias)
- **Production**: Usa chave de produção (transações reais)

### Segurança
- Sempre use HTTPS em produção
- Mantenha as chaves da API seguras
- Configure adequadamente as variáveis de ambiente
- Use senhas fortes para JWT_SECRET e SESSION_SECRET

### Backup
- Faça backup regular dos dados
- Mantenha logs das transações
- Configure monitoramento de erros

## 📊 Funcionalidades da API do Asaas Utilizadas

### ✅ Implementadas
- **Clientes**: Criação, edição, listagem
- **Cobranças**: Geração de boletos, PIX, cartão
- **Assinaturas**: Cobranças recorrentes
- **Webhooks**: Notificações de pagamento
- **Relatórios**: Extratos e análises

### 🔄 Planejadas
- **Split de Pagamentos**: Divisão automática
- **Antecipação**: Antecipação de recebíveis
- **Cartão de Crédito**: Tokenização
- **Conta Digital**: Movimentação financeira

## 🐛 Solução de Problemas

### Erro: "ASAAS_API_KEY não configurada"
- Verifique se o arquivo `.env` existe
- Confirme se a chave da API está correta
- Reinicie o servidor após alterar o `.env`

### Erro: "Unauthorized" da API do Asaas
- Verifique se a chave da API está válida
- Confirme se está usando a URL correta (sandbox vs produção)
- Verifique se sua conta Asaas está ativa

### Problemas de CORS
- Configure adequadamente as origens permitidas
- Verifique se está usando HTTPS em produção

## 📞 Suporte

### Documentação Oficial
- **Asaas API**: https://docs.asaas.com/
- **Node.js**: https://nodejs.org/docs/
- **Express**: https://expressjs.com/

### Contato
- Email: suporte@suaimobiliaria.com
- Telefone: (11) 99999-9999

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Changelog

### v1.0.0 (2024-01-XX)
- ✅ Sistema completo de gestão de imóveis
- ✅ Integração com API do Asaas
- ✅ Dashboard com métricas em tempo real
- ✅ Geração de boletos e cobranças
- ✅ Relatórios financeiros
- ✅ Interface responsiva

---

**Desenvolvido com ❤️ para facilitar a gestão de imóveis alugados**