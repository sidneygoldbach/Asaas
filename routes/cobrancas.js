const express = require('express');
const router = express.Router();
const asaas = require('../config/asaas');
const moment = require('moment');

// Listar todas as cobranças
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      customer, 
      status, 
      dateCreated_ge, 
      dateCreated_le,
      dueDate_ge,
      dueDate_le 
    } = req.query;
    
    const filtros = {
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    };

    if (customer) filtros.customer = customer;
    if (status) filtros.status = status;
    if (dateCreated_ge) filtros.dateCreated_ge = dateCreated_ge;
    if (dateCreated_le) filtros.dateCreated_le = dateCreated_le;
    if (dueDate_ge) filtros.dueDate_ge = dueDate_ge;
    if (dueDate_le) filtros.dueDate_le = dueDate_le;

    const cobrancas = await asaas.listarCobrancas(filtros);
    
    res.json({
      success: true,
      data: cobrancas.data,
      totalCount: cobrancas.totalCount,
      hasMore: cobrancas.hasMore,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Buscar cobrança por ID
router.get('/:id', async (req, res) => {
  try {
    const cobranca = await asaas.buscarCobranca(req.params.id);
    res.json({
      success: true,
      data: cobranca
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Criar nova cobrança de aluguel
router.post('/', async (req, res) => {
  try {
    const {
      customer,
      imovel_id,
      valor_aluguel,
      valor_condominio,
      valor_iptu,
      valor_outros,
      descricao_outros,
      dueDate,
      description,
      billingType = 'BOLETO',
      installmentCount,
      discount,
      interest,
      fine,
      postalService = false
    } = req.body;

    // Validações básicas
    if (!customer || !valor_aluguel || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Cliente, valor do aluguel e data de vencimento são obrigatórios'
      });
    }

    // Calcular valor total
    const valorTotal = parseFloat(valor_aluguel) + 
                      parseFloat(valor_condominio || 0) + 
                      parseFloat(valor_iptu || 0) + 
                      parseFloat(valor_outros || 0);

    // Preparar descrição detalhada
    let descricaoDetalhada = description || 'Cobrança de Aluguel';
    
    const detalhes = [];
    detalhes.push(`Aluguel: R$ ${parseFloat(valor_aluguel).toFixed(2)}`);
    
    if (valor_condominio && parseFloat(valor_condominio) > 0) {
      detalhes.push(`Condomínio: R$ ${parseFloat(valor_condominio).toFixed(2)}`);
    }
    
    if (valor_iptu && parseFloat(valor_iptu) > 0) {
      detalhes.push(`IPTU: R$ ${parseFloat(valor_iptu).toFixed(2)}`);
    }
    
    if (valor_outros && parseFloat(valor_outros) > 0) {
      detalhes.push(`${descricao_outros || 'Outros'}: R$ ${parseFloat(valor_outros).toFixed(2)}`);
    }

    if (imovel_id) {
      descricaoDetalhada += ` - Imóvel ID: ${imovel_id}`;
    }
    
    descricaoDetalhada += `\n\nDetalhamento:\n${detalhes.join('\n')}\nTotal: R$ ${valorTotal.toFixed(2)}`;

    // Preparar dados da cobrança
    const dadosCobranca = {
      customer,
      billingType,
      value: valorTotal,
      dueDate,
      description: descricaoDetalhada,
      postalService
    };

    // Adicionar parcelamento se especificado
    if (installmentCount && installmentCount > 1) {
      dadosCobranca.installmentCount = installmentCount;
      dadosCobranca.installmentValue = valorTotal / installmentCount;
    }

    // Adicionar desconto se especificado
    if (discount) {
      dadosCobranca.discount = discount;
    }

    // Adicionar juros se especificado
    if (interest) {
      dadosCobranca.interest = interest;
    }

    // Adicionar multa se especificado
    if (fine) {
      dadosCobranca.fine = fine;
    }

    const cobranca = await asaas.criarCobranca(dadosCobranca);
    
    res.status(201).json({
      success: true,
      data: cobranca,
      message: 'Cobrança criada com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Criar cobrança recorrente (assinatura) para aluguel mensal
router.post('/recorrente', async (req, res) => {
  try {
    const {
      customer,
      imovel_id,
      valor_aluguel,
      valor_condominio,
      valor_iptu,
      valor_outros,
      descricao_outros,
      cycle = 'MONTHLY',
      nextDueDate,
      description,
      billingType = 'BOLETO',
      discount,
      interest,
      fine
    } = req.body;

    // Validações básicas
    if (!customer || !valor_aluguel || !nextDueDate) {
      return res.status(400).json({
        success: false,
        error: 'Cliente, valor do aluguel e próxima data de vencimento são obrigatórios'
      });
    }

    // Calcular valor total
    const valorTotal = parseFloat(valor_aluguel) + 
                      parseFloat(valor_condominio || 0) + 
                      parseFloat(valor_iptu || 0) + 
                      parseFloat(valor_outros || 0);

    // Preparar descrição detalhada
    let descricaoDetalhada = description || 'Aluguel Mensal';
    
    const detalhes = [];
    detalhes.push(`Aluguel: R$ ${parseFloat(valor_aluguel).toFixed(2)}`);
    
    if (valor_condominio && parseFloat(valor_condominio) > 0) {
      detalhes.push(`Condomínio: R$ ${parseFloat(valor_condominio).toFixed(2)}`);
    }
    
    if (valor_iptu && parseFloat(valor_iptu) > 0) {
      detalhes.push(`IPTU: R$ ${parseFloat(valor_iptu).toFixed(2)}`);
    }
    
    if (valor_outros && parseFloat(valor_outros) > 0) {
      detalhes.push(`${descricao_outros || 'Outros'}: R$ ${parseFloat(valor_outros).toFixed(2)}`);
    }

    if (imovel_id) {
      descricaoDetalhada += ` - Imóvel ID: ${imovel_id}`;
    }
    
    descricaoDetalhada += `\n\nDetalhamento:\n${detalhes.join('\n')}\nTotal: R$ ${valorTotal.toFixed(2)}`;

    // Preparar dados da assinatura
    const dadosAssinatura = {
      customer,
      billingType,
      value: valorTotal,
      nextDueDate,
      cycle,
      description: descricaoDetalhada
    };

    // Adicionar desconto se especificado
    if (discount) {
      dadosAssinatura.discount = discount;
    }

    // Adicionar juros se especificado
    if (interest) {
      dadosAssinatura.interest = interest;
    }

    // Adicionar multa se especificado
    if (fine) {
      dadosAssinatura.fine = fine;
    }

    const assinatura = await asaas.criarAssinatura(dadosAssinatura);
    
    res.status(201).json({
      success: true,
      data: assinatura,
      message: 'Cobrança recorrente criada com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Obter dados do boleto (linha digitável, código de barras)
router.get('/:id/boleto', async (req, res) => {
  try {
    const boleto = await asaas.obterBoleto(req.params.id);
    res.json({
      success: true,
      data: boleto
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Listar assinaturas (cobranças recorrentes)
router.get('/assinaturas/listar', async (req, res) => {
  try {
    const { page = 1, limit = 20, customer, status } = req.query;
    
    const filtros = {
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    };

    if (customer) filtros.customer = customer;
    if (status) filtros.status = status;

    const assinaturas = await asaas.listarAssinaturas(filtros);
    
    res.json({
      success: true,
      data: assinaturas.data,
      totalCount: assinaturas.totalCount,
      hasMore: assinaturas.hasMore,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Relatório de inadimplência
router.get('/relatorios/inadimplencia', async (req, res) => {
  try {
    const { dias_atraso = 5 } = req.query;
    
    // Data limite para considerar em atraso
    const dataLimite = moment().subtract(dias_atraso, 'days').format('YYYY-MM-DD');
    
    const cobrancasVencidas = await asaas.listarCobrancas({
      status: 'OVERDUE',
      dueDate_le: dataLimite,
      limit: 100
    });

    // Agrupar por cliente
    const inadimplenciaPorCliente = {};
    let valorTotalInadimplencia = 0;

    cobrancasVencidas.data.forEach(cobranca => {
      const customerId = cobranca.customer;
      
      if (!inadimplenciaPorCliente[customerId]) {
        inadimplenciaPorCliente[customerId] = {
          customer: cobranca.customer,
          customerName: cobranca.customerName || 'N/A',
          cobrancas: [],
          valorTotal: 0,
          diasAtraso: 0
        };
      }
      
      inadimplenciaPorCliente[customerId].cobrancas.push(cobranca);
      inadimplenciaPorCliente[customerId].valorTotal += cobranca.value;
      
      // Calcular dias de atraso
      const diasAtrasoCobranca = moment().diff(moment(cobranca.dueDate), 'days');
      if (diasAtrasoCobranca > inadimplenciaPorCliente[customerId].diasAtraso) {
        inadimplenciaPorCliente[customerId].diasAtraso = diasAtrasoCobranca;
      }
      
      valorTotalInadimplencia += cobranca.value;
    });

    res.json({
      success: true,
      data: {
        inadimplenciaPorCliente: Object.values(inadimplenciaPorCliente),
        resumo: {
          totalClientes: Object.keys(inadimplenciaPorCliente).length,
          totalCobrancas: cobrancasVencidas.data.length,
          valorTotal: valorTotalInadimplencia,
          diasAtrasoFiltro: dias_atraso
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Relatório de cobranças por período
router.get('/relatorios/periodo', async (req, res) => {
  try {
    const { 
      data_inicio = moment().startOf('month').format('YYYY-MM-DD'),
      data_fim = moment().endOf('month').format('YYYY-MM-DD')
    } = req.query;

    const cobrancas = await asaas.listarCobrancas({
      dateCreated_ge: data_inicio,
      dateCreated_le: data_fim,
      limit: 1000
    });

    // Agrupar por status
    const resumoPorStatus = {
      PENDING: { count: 0, value: 0 },
      RECEIVED: { count: 0, value: 0 },
      OVERDUE: { count: 0, value: 0 },
      CONFIRMED: { count: 0, value: 0 }
    };

    let valorTotal = 0;

    cobrancas.data.forEach(cobranca => {
      const status = cobranca.status;
      if (resumoPorStatus[status]) {
        resumoPorStatus[status].count++;
        resumoPorStatus[status].value += cobranca.value;
      }
      valorTotal += cobranca.value;
    });

    res.json({
      success: true,
      data: {
        periodo: {
          inicio: data_inicio,
          fim: data_fim
        },
        resumo: {
          totalCobrancas: cobrancas.data.length,
          valorTotal: valorTotal,
          porStatus: resumoPorStatus
        },
        cobrancas: cobrancas.data
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;