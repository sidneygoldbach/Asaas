const express = require('express');
const router = express.Router();
const AsaasAPI = require('../config/asaas');
const { cacheMiddleware, longTermCacheMiddleware, invalidateCache } = require('../middleware/cache');

// Instância da API Asaas
const asaas = new AsaasAPI();

// Função para tratar erros da API Asaas
function tratarErroAsaas(error) {
    console.error('Erro da API Asaas:', error);
    
    if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
            case 400:
                return {
                    success: false,
                    error: 'Dados inválidos',
                    message: data.errors?.[0]?.description || 'Verifique os dados informados',
                    code: 'INVALID_DATA'
                };
            case 401:
                return {
                    success: false,
                    error: 'Não autorizado',
                    message: 'Chave de API inválida ou expirada',
                    code: 'UNAUTHORIZED'
                };
            case 403:
                return {
                    success: false,
                    error: 'Acesso negado',
                    message: 'Sem permissão para esta operação',
                    code: 'FORBIDDEN'
                };
            case 404:
                return {
                    success: false,
                    error: 'Não encontrado',
                    message: 'Recurso não encontrado',
                    code: 'NOT_FOUND'
                };
            case 429:
                return {
                    success: false,
                    error: 'Muitas requisições',
                    message: 'Limite de requisições excedido. Tente novamente em alguns minutos',
                    code: 'RATE_LIMIT'
                };
            case 500:
                return {
                    success: false,
                    error: 'Erro interno',
                    message: 'Erro interno do servidor Asaas',
                    code: 'INTERNAL_ERROR'
                };
            default:
                return {
                    success: false,
                    error: 'Erro desconhecido',
                    message: data.message || 'Erro inesperado da API',
                    code: 'UNKNOWN_ERROR'
                };
        }
    } else if (error.request) {
        return {
            success: false,
            error: 'Erro de conexão',
            message: 'Não foi possível conectar com o servidor Asaas',
            code: 'CONNECTION_ERROR'
        };
    } else {
        return {
            success: false,
            error: 'Erro interno',
            message: 'Erro interno do sistema',
            code: 'SYSTEM_ERROR'
        };
    }
}

// Página principal do módulo financeiro
router.get('/', (req, res) => {
    res.render('financeiro', { 
        title: 'Meu Dinheiro',
        page: 'financeiro'
    });
});

// API - Obter dados da conta corrente (com cache de 2 minutos)
router.get('/api/conta', cacheMiddleware(120), async (req, res) => {
    try {
        const saldo = await asaas.obterSaldoConta();
        
        res.json({
            success: true,
            data: {
                saldo: saldo.totalBalance || 0,
                saldoDisponivel: saldo.availableBalance || 0,
                saldoBloqueado: saldo.blockedBalance || 0,
                contaNumero: '12345-6', // Número da conta fictício
                agencia: '0001'
            }
        });
    } catch (error) {
        const errorResponse = tratarErroAsaas(error);
        res.status(500).json(errorResponse);
    }
});

// API: Obter extrato completo (com cache de 1 minuto)
router.get('/api/extrato', cacheMiddleware(60), async (req, res) => {
    try {
        const { page = 1, limit = 10, startDate, endDate, type } = req.query;
        
        const filtros = {
            offset: (page - 1) * limit,
            limit: parseInt(limit)
        };
        
        if (startDate) filtros.startDate = startDate;
        if (endDate) filtros.endDate = endDate;
        if (type) filtros.type = type;
        
        const extrato = await asaas.obterExtratoFinanceiro(filtros);
        
        // Formatar dados para o frontend
        const transacoesFormatadas = extrato.data?.map(transacao => ({
            id: transacao.id,
            data: asaas.formatarData(transacao.date),
            descricao: transacao.description || 'Transação',
            tipo: transacao.type,
            valor: transacao.value,
            valorFormatado: asaas.formatarMoeda(transacao.value),
            status: transacao.status || 'CONFIRMED',
            categoria: transacao.type === 'PAYMENT_RECEIVED' ? 'Recebimento' : 
                      transacao.type === 'PAYMENT_FEE' ? 'Taxa' :
                      transacao.type === 'TRANSFER' ? 'Transferência' : 'Outros'
        })) || [];
        
        res.json({
            success: true,
            data: transacoesFormatadas,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil((extrato.totalCount || 0) / limit),
                totalItems: extrato.totalCount || 0,
                hasMore: extrato.hasMore || false
            }
        });
    } catch (error) {
        const errorResponse = tratarErroAsaas(error);
        res.status(500).json(errorResponse);
    }
});

// API: Listar transferências (com cache de 30 segundos)
router.get('/api/transferencias', cacheMiddleware(30), async (req, res) => {
    try {
        const { page = 1, limit = 10, startDate, endDate } = req.query;
        
        const filtros = {
            offset: (page - 1) * limit,
            limit: parseInt(limit)
        };
        
        if (startDate) filtros.startDate = startDate;
        if (endDate) filtros.endDate = endDate;
        
        const transferencias = await asaas.listarTransferencias(filtros);
        
        // Formatar dados para o frontend
        const transferenciasFormatadas = transferencias.data?.map(transferencia => ({
            id: transferencia.id,
            data: asaas.formatarData(transferencia.dateCreated),
            valor: transferencia.value,
            valorFormatado: asaas.formatarMoeda(transferencia.value),
            tipo: transferencia.type,
            status: transferencia.status,
            destinatario: transferencia.pixAddressKey || 
                         `${transferencia.bankAccount?.bank?.name} - Ag: ${transferencia.bankAccount?.agency} CC: ${transferencia.bankAccount?.account}`,
            descricao: transferencia.description || 'Transferência'
        })) || [];
        
        res.json({
            success: true,
            data: transferenciasFormatadas,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil((transferencias.totalCount || 0) / limit),
                totalItems: transferencias.totalCount || 0
            }
        });
    } catch (error) {
        const errorResponse = tratarErroAsaas(error);
        res.status(500).json(errorResponse);
    }
});

// API - Criar nova transferência (invalida cache após criação)
router.post('/api/transferencias', async (req, res) => {
    try {
        const { tipo, valor, chavePix, dadosBancarios, descricao } = req.body;
        
        const dadosTransferencia = {
            value: parseFloat(valor),
            description: descricao || 'Transferência via sistema'
        };
        
        if (tipo === 'PIX' && chavePix) {
            dadosTransferencia.pixAddressKey = chavePix;
        } else if (tipo === 'TED' && dadosBancarios) {
            dadosTransferencia.bankAccount = {
                bank: {
                    code: dadosBancarios.codigoBanco
                },
                accountName: dadosBancarios.nomeTitular,
                ownerName: dadosBancarios.nomeTitular,
                cpfCnpj: dadosBancarios.cpfCnpj,
                agency: dadosBancarios.agencia,
                account: dadosBancarios.conta,
                accountDigit: dadosBancarios.digito
            };
        }
        
        const resultado = await asaas.criarTransferencia(dadosTransferencia);
        
        // Invalidar cache relacionado após criar transferência
        invalidateCache('/api/transferencias');
        invalidateCache('/api/conta');
        invalidateCache('/api/extrato');
        
        res.json({
            success: true,
            data: {
                id: resultado.id,
                status: resultado.status,
                valor: asaas.formatarMoeda(resultado.value),
                message: 'Transferência criada com sucesso!'
            }
        });
    } catch (error) {
        const errorResponse = tratarErroAsaas(error);
        res.status(500).json(errorResponse);
    }
});

// API: Listar contas a pagar (com cache de 1 minuto)
router.get('/api/contas', cacheMiddleware(60), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const filtros = {
            offset: (page - 1) * limit,
            limit: parseInt(limit)
        };
        
        const pagamentos = await asaas.listarPagamentos(filtros);
        
        // Formatar dados para o frontend
        const contasFormatadas = pagamentos.data?.map(pagamento => ({
            id: pagamento.id,
            data: asaas.formatarData(pagamento.paymentDate || pagamento.dateCreated),
            descricao: pagamento.description || 'Pagamento de conta',
            valor: pagamento.value,
            valorFormatado: asaas.formatarMoeda(pagamento.value),
            status: pagamento.status,
            codigoBarras: pagamento.identificationField,
            vencimento: pagamento.dueDate ? asaas.formatarData(pagamento.dueDate) : null
        })) || [];
        
        res.json({
            success: true,
            data: contasFormatadas,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil((pagamentos.totalCount || 0) / limit),
                totalItems: pagamentos.totalCount || 0
            }
        });
    } catch (error) {
        const errorResponse = tratarErroAsaas(error);
        res.status(500).json(errorResponse);
    }
});

// API - Pagar conta/boleto (invalida cache após pagamento)
router.post('/api/pagar-conta', async (req, res) => {
    try {
        const { codigoBarras, valor, descricao } = req.body;
        
        if (!codigoBarras) {
            return res.status(400).json({
                success: false,
                error: 'Código de barras obrigatório',
                message: 'Informe o código de barras da conta'
            });
        }
        
        const pagamento = await asaas.pagarConta({
            identificationField: codigoBarras,
            value: valor ? parseFloat(valor) : undefined,
            description: descricao || 'Pagamento via sistema'
        });
        
        // Invalidar cache relacionado após pagar conta
        invalidateCache('/api/contas');
        invalidateCache('/api/conta');
        invalidateCache('/api/extrato');
        
        res.json({
            success: true,
            data: pagamento,
            message: 'Conta paga com sucesso'
        });
    } catch (error) {
        const errorResponse = tratarErroAsaas(error);
        res.status(400).json(errorResponse);
    }
});

// API - Consultar conta por código de barras (com cache longo)
router.get('/api/consultar-conta/:codigoBarras', longTermCacheMiddleware(1800), async (req, res) => {
    try {
        const { codigoBarras } = req.params;
        
        const dadosConta = await asaas.consultarConta(codigoBarras);
        
        res.json({
            success: true,
            data: {
                valor: dadosConta.value,
                valorFormatado: asaas.formatarMoeda(dadosConta.value),
                vencimento: dadosConta.dueDate ? asaas.formatarData(dadosConta.dueDate) : null,
                beneficiario: dadosConta.payerName || 'Não informado',
                podePagar: dadosConta.canBePaid,
                descricao: dadosConta.description || 'Conta para pagamento'
            }
        });
    } catch (error) {
        const errorResponse = tratarErroAsaas(error);
        res.status(500).json(errorResponse);
    }
});

module.exports = router;