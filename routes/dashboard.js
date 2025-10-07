const express = require('express');
const router = express.Router();
const asaas = require('../config/asaas');
const moment = require('moment');

// Dashboard principal - dados gerais
router.get('/', async (req, res) => {
  try {
    // Período padrão: mês atual
    const inicioMes = moment().startOf('month').format('YYYY-MM-DD');
    const fimMes = moment().endOf('month').format('YYYY-MM-DD');

    // Buscar cobranças do mês atual
    const cobrancasMes = await asaas.listarCobrancas({
      dateCreated_ge: inicioMes,
      dateCreated_le: fimMes,
      limit: 1000
    });

    // Buscar cobranças vencidas
    const cobrancasVencidas = await asaas.listarCobrancas({
      status: 'OVERDUE',
      limit: 100
    });

    // Buscar cobranças pendentes
    const cobrancasPendentes = await asaas.listarCobrancas({
      status: 'PENDING',
      limit: 100
    });

    // Calcular métricas
    let receitaTotal = 0;
    let receitaRecebida = 0;
    let receitaPendente = 0;
    let receitaVencida = 0;

    const resumoPorStatus = {
      PENDING: { count: 0, value: 0 },
      RECEIVED: { count: 0, value: 0 },
      OVERDUE: { count: 0, value: 0 },
      CONFIRMED: { count: 0, value: 0 }
    };

    // Processar cobranças do mês
    cobrancasMes.data.forEach(cobranca => {
      receitaTotal += cobranca.value;
      
      if (resumoPorStatus[cobranca.status]) {
        resumoPorStatus[cobranca.status].count++;
        resumoPorStatus[cobranca.status].value += cobranca.value;
      }

      switch (cobranca.status) {
        case 'RECEIVED':
        case 'CONFIRMED':
          receitaRecebida += cobranca.value;
          break;
        case 'PENDING':
          receitaPendente += cobranca.value;
          break;
        case 'OVERDUE':
          receitaVencida += cobranca.value;
          break;
      }
    });

    // Calcular valor total vencido
    const valorTotalVencido = cobrancasVencidas.data.reduce((total, cobranca) => {
      return total + cobranca.value;
    }, 0);

    // Calcular valor total pendente
    const valorTotalPendente = cobrancasPendentes.data.reduce((total, cobranca) => {
      return total + cobranca.value;
    }, 0);

    // Calcular taxa de inadimplência
    const taxaInadimplencia = receitaTotal > 0 ? (receitaVencida / receitaTotal) * 100 : 0;

    // Dados para gráfico de receita dos últimos 6 meses
    const receitaUltimos6Meses = [];
    for (let i = 5; i >= 0; i--) {
      const mes = moment().subtract(i, 'months');
      const inicioMesGrafico = mes.startOf('month').format('YYYY-MM-DD');
      const fimMesGrafico = mes.endOf('month').format('YYYY-MM-DD');

      try {
        const cobrancasMesGrafico = await asaas.listarCobrancas({
          dateCreated_ge: inicioMesGrafico,
          dateCreated_le: fimMesGrafico,
          status: 'RECEIVED',
          limit: 1000
        });

        const receitaMes = cobrancasMesGrafico.data.reduce((total, cobranca) => {
          return total + cobranca.value;
        }, 0);

        receitaUltimos6Meses.push({
          mes: mes.format('YYYY-MM'),
          mesNome: mes.format('MMM/YYYY'),
          receita: receitaMes
        });
      } catch (error) {
        console.error(`Erro ao buscar receita do mês ${mes.format('YYYY-MM')}:`, error.message);
        receitaUltimos6Meses.push({
          mes: mes.format('YYYY-MM'),
          mesNome: mes.format('MMM/YYYY'),
          receita: 0
        });
      }
    }

    res.json({
      success: true,
      data: {
        resumoFinanceiro: {
          receitaTotal,
          receitaRecebida,
          receitaPendente,
          receitaVencida: valorTotalVencido,
          taxaInadimplencia: parseFloat(taxaInadimplencia.toFixed(2))
        },
        contadores: {
          totalCobrancas: cobrancasMes.data.length,
          cobrancasRecebidas: resumoPorStatus.RECEIVED.count + resumoPorStatus.CONFIRMED.count,
          cobrancasPendentes: cobrancasPendentes.data.length,
          cobrancasVencidas: cobrancasVencidas.data.length
        },
        resumoPorStatus,
        receitaUltimos6Meses,
        periodo: {
          inicio: inicioMes,
          fim: fimMes
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

// Dados de inadimplência detalhados
router.get('/inadimplencia', async (req, res) => {
  try {
    const { dias_atraso = 1 } = req.query;
    
    // Buscar todas as cobranças vencidas
    const cobrancasVencidas = await asaas.listarCobrancas({
      status: 'OVERDUE',
      limit: 1000
    });

    // Agrupar por faixas de dias em atraso
    const faixasAtraso = {
      '1-7': { count: 0, value: 0, cobrancas: [] },
      '8-15': { count: 0, value: 0, cobrancas: [] },
      '16-30': { count: 0, value: 0, cobrancas: [] },
      '31-60': { count: 0, value: 0, cobrancas: [] },
      '60+': { count: 0, value: 0, cobrancas: [] }
    };

    // Agrupar por cliente
    const inadimplenciaPorCliente = {};

    cobrancasVencidas.data.forEach(cobranca => {
      const diasAtraso = moment().diff(moment(cobranca.dueDate), 'days');
      
      // Determinar faixa de atraso
      let faixa;
      if (diasAtraso <= 7) faixa = '1-7';
      else if (diasAtraso <= 15) faixa = '8-15';
      else if (diasAtraso <= 30) faixa = '16-30';
      else if (diasAtraso <= 60) faixa = '31-60';
      else faixa = '60+';

      faixasAtraso[faixa].count++;
      faixasAtraso[faixa].value += cobranca.value;
      faixasAtraso[faixa].cobrancas.push({
        ...cobranca,
        diasAtraso
      });

      // Agrupar por cliente
      const customerId = cobranca.customer;
      if (!inadimplenciaPorCliente[customerId]) {
        inadimplenciaPorCliente[customerId] = {
          customer: customerId,
          customerName: cobranca.customerName || 'N/A',
          cobrancas: [],
          valorTotal: 0,
          maiorAtraso: 0
        };
      }

      inadimplenciaPorCliente[customerId].cobrancas.push({
        ...cobranca,
        diasAtraso
      });
      inadimplenciaPorCliente[customerId].valorTotal += cobranca.value;
      
      if (diasAtraso > inadimplenciaPorCliente[customerId].maiorAtraso) {
        inadimplenciaPorCliente[customerId].maiorAtraso = diasAtraso;
      }
    });

    // Ordenar clientes por valor total em atraso (decrescente)
    const clientesOrdenados = Object.values(inadimplenciaPorCliente)
      .sort((a, b) => b.valorTotal - a.valorTotal);

    // Top 10 maiores inadimplentes
    const top10Inadimplentes = clientesOrdenados.slice(0, 10);

    const valorTotalInadimplencia = cobrancasVencidas.data.reduce((total, cobranca) => {
      return total + cobranca.value;
    }, 0);

    res.json({
      success: true,
      data: {
        resumo: {
          totalCobrancasVencidas: cobrancasVencidas.data.length,
          valorTotalInadimplencia,
          totalClientesInadimplentes: Object.keys(inadimplenciaPorCliente).length
        },
        faixasAtraso,
        top10Inadimplentes,
        todosInadimplentes: clientesOrdenados
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Dados de receita por período
router.get('/receita', async (req, res) => {
  try {
    const { 
      periodo = 'mes',
      data_inicio,
      data_fim 
    } = req.query;

    let inicio, fim;

    // Definir período baseado no parâmetro
    switch (periodo) {
      case 'hoje':
        inicio = moment().startOf('day').format('YYYY-MM-DD');
        fim = moment().endOf('day').format('YYYY-MM-DD');
        break;
      case 'semana':
        inicio = moment().startOf('week').format('YYYY-MM-DD');
        fim = moment().endOf('week').format('YYYY-MM-DD');
        break;
      case 'mes':
        inicio = moment().startOf('month').format('YYYY-MM-DD');
        fim = moment().endOf('month').format('YYYY-MM-DD');
        break;
      case 'ano':
        inicio = moment().startOf('year').format('YYYY-MM-DD');
        fim = moment().endOf('year').format('YYYY-MM-DD');
        break;
      case 'personalizado':
        inicio = data_inicio || moment().startOf('month').format('YYYY-MM-DD');
        fim = data_fim || moment().endOf('month').format('YYYY-MM-DD');
        break;
      default:
        inicio = moment().startOf('month').format('YYYY-MM-DD');
        fim = moment().endOf('month').format('YYYY-MM-DD');
    }

    // Buscar cobranças do período
    const cobrancasPeriodo = await asaas.listarCobrancas({
      dateCreated_ge: inicio,
      dateCreated_le: fim,
      limit: 1000
    });

    // Agrupar por status
    const receitaPorStatus = {
      recebida: 0,
      pendente: 0,
      vencida: 0,
      total: 0
    };

    // Agrupar por dia (para gráfico)
    const receitaPorDia = {};

    cobrancasPeriodo.data.forEach(cobranca => {
      receitaPorStatus.total += cobranca.value;

      switch (cobranca.status) {
        case 'RECEIVED':
        case 'CONFIRMED':
          receitaPorStatus.recebida += cobranca.value;
          break;
        case 'PENDING':
          receitaPorStatus.pendente += cobranca.value;
          break;
        case 'OVERDUE':
          receitaPorStatus.vencida += cobranca.value;
          break;
      }

      // Agrupar por dia
      const dia = moment(cobranca.dateCreated).format('YYYY-MM-DD');
      if (!receitaPorDia[dia]) {
        receitaPorDia[dia] = {
          data: dia,
          recebida: 0,
          pendente: 0,
          vencida: 0,
          total: 0
        };
      }

      receitaPorDia[dia].total += cobranca.value;
      
      switch (cobranca.status) {
        case 'RECEIVED':
        case 'CONFIRMED':
          receitaPorDia[dia].recebida += cobranca.value;
          break;
        case 'PENDING':
          receitaPorDia[dia].pendente += cobranca.value;
          break;
        case 'OVERDUE':
          receitaPorDia[dia].vencida += cobranca.value;
          break;
      }
    });

    // Converter para array e ordenar por data
    const receitaDiaria = Object.values(receitaPorDia)
      .sort((a, b) => moment(a.data).diff(moment(b.data)));

    res.json({
      success: true,
      data: {
        periodo: {
          inicio,
          fim,
          tipo: periodo
        },
        resumo: receitaPorStatus,
        receitaDiaria,
        totalCobrancas: cobrancasPeriodo.data.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Próximos vencimentos
router.get('/vencimentos', async (req, res) => {
  try {
    const { dias = 7 } = req.query;
    
    const hoje = moment().format('YYYY-MM-DD');
    const dataLimite = moment().add(dias, 'days').format('YYYY-MM-DD');

    // Buscar cobranças pendentes que vencem nos próximos dias
    const cobrancasVencendo = await asaas.listarCobrancas({
      status: 'PENDING',
      dueDate_ge: hoje,
      dueDate_le: dataLimite,
      limit: 100
    });

    // Agrupar por data de vencimento
    const vencimentosPorDia = {};
    let valorTotal = 0;

    cobrancasVencendo.data.forEach(cobranca => {
      const dataVencimento = cobranca.dueDate;
      
      if (!vencimentosPorDia[dataVencimento]) {
        vencimentosPorDia[dataVencimento] = {
          data: dataVencimento,
          cobrancas: [],
          valorTotal: 0,
          quantidade: 0
        };
      }

      vencimentosPorDia[dataVencimento].cobrancas.push(cobranca);
      vencimentosPorDia[dataVencimento].valorTotal += cobranca.value;
      vencimentosPorDia[dataVencimento].quantidade++;
      
      valorTotal += cobranca.value;
    });

    // Converter para array e ordenar por data
    const vencimentosOrdenados = Object.values(vencimentosPorDia)
      .sort((a, b) => moment(a.data).diff(moment(b.data)));

    res.json({
      success: true,
      data: {
        resumo: {
          totalCobrancas: cobrancasVencendo.data.length,
          valorTotal,
          diasConsiderados: parseInt(dias)
        },
        vencimentosPorDia: vencimentosOrdenados,
        todasCobrancas: cobrancasVencendo.data
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