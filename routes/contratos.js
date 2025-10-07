const express = require('express');
const router = express.Router();
const moment = require('moment');

// Simulação de banco de dados em memória para contratos
let contratos = [];
let nextId = 1;

// Listar todos os contratos
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, status, cliente_id, imovel_id } = req.query;
    
    let contratosFiltrados = [...contratos];
    
    // Aplicar filtros
    if (status) {
      contratosFiltrados = contratosFiltrados.filter(contrato => 
        contrato.status === status
      );
    }
    
    if (cliente_id) {
      contratosFiltrados = contratosFiltrados.filter(contrato => 
        contrato.cliente_id === cliente_id
      );
    }
    
    if (imovel_id) {
      contratosFiltrados = contratosFiltrados.filter(contrato => 
        contrato.imovel_id === parseInt(imovel_id)
      );
    }

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const contratosPaginados = contratosFiltrados.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: contratosPaginados,
      totalCount: contratosFiltrados.length,
      hasMore: endIndex < contratosFiltrados.length,
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

// Buscar contrato por ID
router.get('/:id', (req, res) => {
  try {
    const contrato = contratos.find(c => c.id === parseInt(req.params.id));
    
    if (!contrato) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }

    res.json({
      success: true,
      data: contrato
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Criar novo contrato
router.post('/', (req, res) => {
  try {
    const {
      cliente_id,
      imovel_id,
      data_inicio,
      data_fim,
      valor_aluguel,
      valor_condominio,
      valor_iptu,
      dia_vencimento,
      reajuste_anual,
      indice_reajuste,
      caucao,
      observacoes,
      clausulas_especiais,
      garantias
    } = req.body;

    // Validações básicas
    if (!cliente_id || !imovel_id || !data_inicio || !data_fim || !valor_aluguel || !dia_vencimento) {
      return res.status(400).json({
        success: false,
        error: 'Cliente, imóvel, datas, valor do aluguel e dia de vencimento são obrigatórios'
      });
    }

    // Validar datas
    const dataInicioMoment = moment(data_inicio);
    const dataFimMoment = moment(data_fim);
    
    if (!dataInicioMoment.isValid() || !dataFimMoment.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Datas inválidas'
      });
    }

    if (dataFimMoment.isSameOrBefore(dataInicioMoment)) {
      return res.status(400).json({
        success: false,
        error: 'Data de fim deve ser posterior à data de início'
      });
    }

    // Verificar se já existe contrato ativo para o imóvel
    const contratoAtivoImovel = contratos.find(c => 
      c.imovel_id === parseInt(imovel_id) && 
      c.status === 'ativo' &&
      moment(c.data_fim).isAfter(moment())
    );

    if (contratoAtivoImovel) {
      return res.status(400).json({
        success: false,
        error: 'Já existe um contrato ativo para este imóvel'
      });
    }

    const novoContrato = {
      id: nextId++,
      cliente_id,
      imovel_id: parseInt(imovel_id),
      data_inicio: dataInicioMoment.format('YYYY-MM-DD'),
      data_fim: dataFimMoment.format('YYYY-MM-DD'),
      valor_aluguel: parseFloat(valor_aluguel),
      valor_condominio: parseFloat(valor_condominio) || 0,
      valor_iptu: parseFloat(valor_iptu) || 0,
      dia_vencimento: parseInt(dia_vencimento),
      reajuste_anual: reajuste_anual || false,
      indice_reajuste: indice_reajuste || 'IGPM',
      caucao: parseFloat(caucao) || 0,
      observacoes: observacoes || '',
      clausulas_especiais: clausulas_especiais || [],
      garantias: garantias || [],
      status: 'ativo', // ativo, encerrado, suspenso
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString(),
      assinatura_id: null // ID da assinatura no Asaas para cobrança recorrente
    };

    contratos.push(novoContrato);

    res.status(201).json({
      success: true,
      data: novoContrato,
      message: 'Contrato criado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Atualizar contrato
router.put('/:id', (req, res) => {
  try {
    const contratoIndex = contratos.findIndex(c => c.id === parseInt(req.params.id));
    
    if (contratoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }

    const {
      data_fim,
      valor_aluguel,
      valor_condominio,
      valor_iptu,
      dia_vencimento,
      reajuste_anual,
      indice_reajuste,
      caucao,
      observacoes,
      clausulas_especiais,
      garantias,
      status
    } = req.body;

    // Validar data de fim se fornecida
    if (data_fim) {
      const dataFimMoment = moment(data_fim);
      const dataInicioMoment = moment(contratos[contratoIndex].data_inicio);
      
      if (!dataFimMoment.isValid()) {
        return res.status(400).json({
          success: false,
          error: 'Data de fim inválida'
        });
      }

      if (dataFimMoment.isSameOrBefore(dataInicioMoment)) {
        return res.status(400).json({
          success: false,
          error: 'Data de fim deve ser posterior à data de início'
        });
      }
    }

    // Atualizar dados
    const contratoAtualizado = {
      ...contratos[contratoIndex],
      data_fim: data_fim || contratos[contratoIndex].data_fim,
      valor_aluguel: valor_aluguel !== undefined ? parseFloat(valor_aluguel) : contratos[contratoIndex].valor_aluguel,
      valor_condominio: valor_condominio !== undefined ? parseFloat(valor_condominio) : contratos[contratoIndex].valor_condominio,
      valor_iptu: valor_iptu !== undefined ? parseFloat(valor_iptu) : contratos[contratoIndex].valor_iptu,
      dia_vencimento: dia_vencimento !== undefined ? parseInt(dia_vencimento) : contratos[contratoIndex].dia_vencimento,
      reajuste_anual: reajuste_anual !== undefined ? reajuste_anual : contratos[contratoIndex].reajuste_anual,
      indice_reajuste: indice_reajuste || contratos[contratoIndex].indice_reajuste,
      caucao: caucao !== undefined ? parseFloat(caucao) : contratos[contratoIndex].caucao,
      observacoes: observacoes !== undefined ? observacoes : contratos[contratoIndex].observacoes,
      clausulas_especiais: clausulas_especiais !== undefined ? clausulas_especiais : contratos[contratoIndex].clausulas_especiais,
      garantias: garantias !== undefined ? garantias : contratos[contratoIndex].garantias,
      status: status || contratos[contratoIndex].status,
      data_atualizacao: new Date().toISOString()
    };

    contratos[contratoIndex] = contratoAtualizado;

    res.json({
      success: true,
      data: contratoAtualizado,
      message: 'Contrato atualizado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Encerrar contrato
router.post('/:id/encerrar', (req, res) => {
  try {
    const contratoIndex = contratos.findIndex(c => c.id === parseInt(req.params.id));
    
    if (contratoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }

    const { data_encerramento, motivo } = req.body;

    // Validar data de encerramento
    const dataEncerramentoMoment = moment(data_encerramento);
    if (!dataEncerramentoMoment.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Data de encerramento inválida'
      });
    }

    const dataInicioMoment = moment(contratos[contratoIndex].data_inicio);
    if (dataEncerramentoMoment.isBefore(dataInicioMoment)) {
      return res.status(400).json({
        success: false,
        error: 'Data de encerramento não pode ser anterior à data de início'
      });
    }

    // Atualizar contrato
    contratos[contratoIndex] = {
      ...contratos[contratoIndex],
      status: 'encerrado',
      data_encerramento: dataEncerramentoMoment.format('YYYY-MM-DD'),
      motivo_encerramento: motivo || '',
      data_atualizacao: new Date().toISOString()
    };

    res.json({
      success: true,
      data: contratos[contratoIndex],
      message: 'Contrato encerrado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Renovar contrato
router.post('/:id/renovar', (req, res) => {
  try {
    const contratoIndex = contratos.findIndex(c => c.id === parseInt(req.params.id));
    
    if (contratoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }

    const {
      nova_data_fim,
      novo_valor_aluguel,
      novo_valor_condominio,
      novo_valor_iptu,
      observacoes_renovacao
    } = req.body;

    // Validações
    if (!nova_data_fim) {
      return res.status(400).json({
        success: false,
        error: 'Nova data de fim é obrigatória'
      });
    }

    const novaDataFimMoment = moment(nova_data_fim);
    const dataFimAtualMoment = moment(contratos[contratoIndex].data_fim);

    if (!novaDataFimMoment.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Nova data de fim inválida'
      });
    }

    if (novaDataFimMoment.isSameOrBefore(dataFimAtualMoment)) {
      return res.status(400).json({
        success: false,
        error: 'Nova data de fim deve ser posterior à data de fim atual'
      });
    }

    // Criar histórico da renovação
    const historicoRenovacao = {
      data_renovacao: new Date().toISOString(),
      data_fim_anterior: contratos[contratoIndex].data_fim,
      nova_data_fim: novaDataFimMoment.format('YYYY-MM-DD'),
      valor_anterior: contratos[contratoIndex].valor_aluguel,
      novo_valor: novo_valor_aluguel ? parseFloat(novo_valor_aluguel) : contratos[contratoIndex].valor_aluguel,
      observacoes: observacoes_renovacao || ''
    };

    // Atualizar contrato
    contratos[contratoIndex] = {
      ...contratos[contratoIndex],
      data_fim: novaDataFimMoment.format('YYYY-MM-DD'),
      valor_aluguel: novo_valor_aluguel ? parseFloat(novo_valor_aluguel) : contratos[contratoIndex].valor_aluguel,
      valor_condominio: novo_valor_condominio !== undefined ? parseFloat(novo_valor_condominio) : contratos[contratoIndex].valor_condominio,
      valor_iptu: novo_valor_iptu !== undefined ? parseFloat(novo_valor_iptu) : contratos[contratoIndex].valor_iptu,
      historico_renovacoes: [...(contratos[contratoIndex].historico_renovacoes || []), historicoRenovacao],
      data_atualizacao: new Date().toISOString()
    };

    res.json({
      success: true,
      data: contratos[contratoIndex],
      message: 'Contrato renovado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Listar contratos vencendo
router.get('/vencimentos/proximos', (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    const dataLimite = moment().add(dias, 'days');
    
    const contratosVencendo = contratos.filter(contrato => {
      if (contrato.status !== 'ativo') return false;
      
      const dataFim = moment(contrato.data_fim);
      return dataFim.isSameOrBefore(dataLimite) && dataFim.isAfter(moment());
    });

    // Ordenar por data de vencimento
    contratosVencendo.sort((a, b) => moment(a.data_fim).diff(moment(b.data_fim)));

    res.json({
      success: true,
      data: contratosVencendo,
      totalCount: contratosVencendo.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Relatório de contratos
router.get('/relatorios/geral', (req, res) => {
  try {
    const totalContratos = contratos.length;
    const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;
    const contratosEncerrados = contratos.filter(c => c.status === 'encerrado').length;
    const contratosSuspensos = contratos.filter(c => c.status === 'suspenso').length;

    // Calcular receita mensal total
    const receitaMensal = contratos
      .filter(c => c.status === 'ativo')
      .reduce((total, contrato) => {
        return total + contrato.valor_aluguel + contrato.valor_condominio + contrato.valor_iptu;
      }, 0);

    // Contratos vencendo nos próximos 30 dias
    const dataLimite = moment().add(30, 'days');
    const contratosVencendo = contratos.filter(contrato => {
      if (contrato.status !== 'ativo') return false;
      const dataFim = moment(contrato.data_fim);
      return dataFim.isSameOrBefore(dataLimite) && dataFim.isAfter(moment());
    }).length;

    res.json({
      success: true,
      data: {
        resumo: {
          totalContratos,
          contratosAtivos,
          contratosEncerrados,
          contratosSuspensos,
          receitaMensal,
          contratosVencendo30Dias: contratosVencendo
        },
        contratos: contratos
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