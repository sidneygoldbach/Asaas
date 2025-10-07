const express = require('express');
const router = express.Router();
const AsaasAPI = require('../config/asaas');

// Instância da API Asaas
const asaas = new AsaasAPI();

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, name, email, cpfCnpj } = req.query;
    
    const filtros = {
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    };

    if (name) filtros.name = name;
    if (email) filtros.email = email;
    if (cpfCnpj) filtros.cpfCnpj = cpfCnpj;

    const clientes = await asaas.listarClientes(filtros);
    
    res.json({
      success: true,
      data: clientes.data,
      totalCount: clientes.totalCount,
      hasMore: clientes.hasMore,
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

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const cliente = await asaas.buscarCliente(req.params.id);
    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Criar novo cliente
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      mobilePhone,
      cpfCnpj,
      postalCode,
      address,
      addressNumber,
      complement,
      province,
      city,
      state,
      observations,
      // Campos específicos para inquilinos
      profissao,
      rendaMensal,
      estadoCivil,
      contato_emergencia_nome,
      contato_emergencia_telefone
    } = req.body;

    // Validações básicas
    if (!name || !email || !cpfCnpj) {
      return res.status(400).json({
        success: false,
        error: 'Nome, email e CPF/CNPJ são obrigatórios'
      });
    }

    // Validar CPF/CNPJ
    const cpfCnpjLimpo = cpfCnpj.replace(/[^\d]/g, '');
    if (cpfCnpjLimpo.length === 11 && !asaas.validarCPF(cpfCnpjLimpo)) {
      return res.status(400).json({
        success: false,
        error: 'CPF inválido'
      });
    }
    if (cpfCnpjLimpo.length === 14 && !asaas.validarCNPJ(cpfCnpjLimpo)) {
      return res.status(400).json({
        success: false,
        error: 'CNPJ inválido'
      });
    }

    // Preparar dados para o Asaas
    const dadosCliente = {
      name,
      email,
      phone,
      mobilePhone,
      cpfCnpj: cpfCnpjLimpo,
      postalCode,
      address,
      addressNumber,
      complement,
      province,
      city,
      state,
      observations: observations || ''
    };

    // Adicionar informações específicas do inquilino nas observações
    if (profissao || rendaMensal || estadoCivil || contato_emergencia_nome) {
      const infoInquilino = [];
      if (profissao) infoInquilino.push(`Profissão: ${profissao}`);
      if (rendaMensal) infoInquilino.push(`Renda Mensal: R$ ${rendaMensal}`);
      if (estadoCivil) infoInquilino.push(`Estado Civil: ${estadoCivil}`);
      if (contato_emergencia_nome) {
        infoInquilino.push(`Contato de Emergência: ${contato_emergencia_nome} - ${contato_emergencia_telefone || 'N/A'}`);
      }
      
      dadosCliente.observations = `${dadosCliente.observations}\n\nINFORMAÇÕES DO INQUILINO:\n${infoInquilino.join('\n')}`.trim();
    }

    const cliente = await asaas.criarCliente(dadosCliente);
    
    res.status(201).json({
      success: true,
      data: cliente,
      message: 'Cliente criado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      mobilePhone,
      postalCode,
      address,
      addressNumber,
      complement,
      province,
      city,
      state,
      observations,
      // Campos específicos para inquilinos
      profissao,
      rendaMensal,
      estadoCivil,
      contato_emergencia_nome,
      contato_emergencia_telefone
    } = req.body;

    // Preparar dados para atualização
    const dadosCliente = {
      name,
      email,
      phone,
      mobilePhone,
      postalCode,
      address,
      addressNumber,
      complement,
      province,
      city,
      state,
      observations: observations || ''
    };

    // Adicionar informações específicas do inquilino nas observações
    if (profissao || rendaMensal || estadoCivil || contato_emergencia_nome) {
      const infoInquilino = [];
      if (profissao) infoInquilino.push(`Profissão: ${profissao}`);
      if (rendaMensal) infoInquilino.push(`Renda Mensal: R$ ${rendaMensal}`);
      if (estadoCivil) infoInquilino.push(`Estado Civil: ${estadoCivil}`);
      if (contato_emergencia_nome) {
        infoInquilino.push(`Contato de Emergência: ${contato_emergencia_nome} - ${contato_emergencia_telefone || 'N/A'}`);
      }
      
      dadosCliente.observations = `${dadosCliente.observations}\n\nINFORMAÇÕES DO INQUILINO:\n${infoInquilino.join('\n')}`.trim();
    }

    const cliente = await asaas.atualizarCliente(req.params.id, dadosCliente);
    
    res.json({
      success: true,
      data: cliente,
      message: 'Cliente atualizado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Buscar clientes por nome (para autocomplete)
router.get('/buscar/nome', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const clientes = await asaas.listarClientes({
      name: q,
      limit: 10
    });
    
    const clientesSimplificados = clientes.data.map(cliente => ({
      id: cliente.id,
      name: cliente.name,
      email: cliente.email,
      cpfCnpj: cliente.cpfCnpj
    }));

    res.json({
      success: true,
      data: clientesSimplificados
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;