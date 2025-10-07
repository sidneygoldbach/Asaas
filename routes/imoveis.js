const express = require('express');
const router = express.Router();

// Simulação de banco de dados em memória para imóveis
let imoveis = [];
let nextId = 1;

// Listar todos os imóveis
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, tipo, status, cidade } = req.query;
    
    let imoveisFiltrados = [...imoveis];
    
    // Aplicar filtros
    if (tipo) {
      imoveisFiltrados = imoveisFiltrados.filter(imovel => 
        imovel.tipo.toLowerCase().includes(tipo.toLowerCase())
      );
    }
    
    if (status) {
      imoveisFiltrados = imoveisFiltrados.filter(imovel => 
        imovel.status === status
      );
    }
    
    if (cidade) {
      imoveisFiltrados = imoveisFiltrados.filter(imovel => 
        imovel.endereco.cidade.toLowerCase().includes(cidade.toLowerCase())
      );
    }

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const imoveisPaginados = imoveisFiltrados.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: imoveisPaginados,
      totalCount: imoveisFiltrados.length,
      hasMore: endIndex < imoveisFiltrados.length,
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

// Buscar imóvel por ID
router.get('/:id', (req, res) => {
  try {
    const imovel = imoveis.find(i => i.id === parseInt(req.params.id));
    
    if (!imovel) {
      return res.status(404).json({
        success: false,
        error: 'Imóvel não encontrado'
      });
    }

    res.json({
      success: true,
      data: imovel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Criar novo imóvel
router.post('/', (req, res) => {
  try {
    const {
      codigo,
      tipo,
      endereco,
      area,
      quartos,
      banheiros,
      vagas_garagem,
      valor_aluguel,
      valor_condominio,
      valor_iptu,
      descricao,
      caracteristicas,
      proprietario_nome,
      proprietario_contato,
      proprietario_cpf_cnpj,
      fotos
    } = req.body;

    // Validações básicas
    if (!codigo || !tipo || !endereco || !valor_aluguel) {
      return res.status(400).json({
        success: false,
        error: 'Código, tipo, endereço e valor do aluguel são obrigatórios'
      });
    }

    // Verificar se código já existe
    const codigoExiste = imoveis.find(i => i.codigo === codigo);
    if (codigoExiste) {
      return res.status(400).json({
        success: false,
        error: 'Código do imóvel já existe'
      });
    }

    const novoImovel = {
      id: nextId++,
      codigo,
      tipo,
      endereco: {
        logradouro: endereco.logradouro || '',
        numero: endereco.numero || '',
        complemento: endereco.complemento || '',
        bairro: endereco.bairro || '',
        cidade: endereco.cidade || '',
        estado: endereco.estado || '',
        cep: endereco.cep || ''
      },
      area: parseFloat(area) || 0,
      quartos: parseInt(quartos) || 0,
      banheiros: parseInt(banheiros) || 0,
      vagas_garagem: parseInt(vagas_garagem) || 0,
      valor_aluguel: parseFloat(valor_aluguel),
      valor_condominio: parseFloat(valor_condominio) || 0,
      valor_iptu: parseFloat(valor_iptu) || 0,
      descricao: descricao || '',
      caracteristicas: caracteristicas || [],
      proprietario: {
        nome: proprietario_nome || '',
        contato: proprietario_contato || '',
        cpf_cnpj: proprietario_cpf_cnpj || ''
      },
      fotos: fotos || [],
      status: 'disponivel', // disponivel, alugado, manutencao
      data_cadastro: new Date().toISOString(),
      data_atualizacao: new Date().toISOString()
    };

    imoveis.push(novoImovel);

    res.status(201).json({
      success: true,
      data: novoImovel,
      message: 'Imóvel cadastrado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Atualizar imóvel
router.put('/:id', (req, res) => {
  try {
    const imovelIndex = imoveis.findIndex(i => i.id === parseInt(req.params.id));
    
    if (imovelIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Imóvel não encontrado'
      });
    }

    const {
      codigo,
      tipo,
      endereco,
      area,
      quartos,
      banheiros,
      vagas_garagem,
      valor_aluguel,
      valor_condominio,
      valor_iptu,
      descricao,
      caracteristicas,
      proprietario_nome,
      proprietario_contato,
      proprietario_cpf_cnpj,
      fotos,
      status
    } = req.body;

    // Verificar se código já existe em outro imóvel
    if (codigo && codigo !== imoveis[imovelIndex].codigo) {
      const codigoExiste = imoveis.find(i => i.codigo === codigo && i.id !== parseInt(req.params.id));
      if (codigoExiste) {
        return res.status(400).json({
          success: false,
          error: 'Código do imóvel já existe'
        });
      }
    }

    // Atualizar dados
    const imovelAtualizado = {
      ...imoveis[imovelIndex],
      codigo: codigo || imoveis[imovelIndex].codigo,
      tipo: tipo || imoveis[imovelIndex].tipo,
      endereco: endereco ? {
        logradouro: endereco.logradouro || imoveis[imovelIndex].endereco.logradouro,
        numero: endereco.numero || imoveis[imovelIndex].endereco.numero,
        complemento: endereco.complemento || imoveis[imovelIndex].endereco.complemento,
        bairro: endereco.bairro || imoveis[imovelIndex].endereco.bairro,
        cidade: endereco.cidade || imoveis[imovelIndex].endereco.cidade,
        estado: endereco.estado || imoveis[imovelIndex].endereco.estado,
        cep: endereco.cep || imoveis[imovelIndex].endereco.cep
      } : imoveis[imovelIndex].endereco,
      area: area !== undefined ? parseFloat(area) : imoveis[imovelIndex].area,
      quartos: quartos !== undefined ? parseInt(quartos) : imoveis[imovelIndex].quartos,
      banheiros: banheiros !== undefined ? parseInt(banheiros) : imoveis[imovelIndex].banheiros,
      vagas_garagem: vagas_garagem !== undefined ? parseInt(vagas_garagem) : imoveis[imovelIndex].vagas_garagem,
      valor_aluguel: valor_aluguel !== undefined ? parseFloat(valor_aluguel) : imoveis[imovelIndex].valor_aluguel,
      valor_condominio: valor_condominio !== undefined ? parseFloat(valor_condominio) : imoveis[imovelIndex].valor_condominio,
      valor_iptu: valor_iptu !== undefined ? parseFloat(valor_iptu) : imoveis[imovelIndex].valor_iptu,
      descricao: descricao !== undefined ? descricao : imoveis[imovelIndex].descricao,
      caracteristicas: caracteristicas !== undefined ? caracteristicas : imoveis[imovelIndex].caracteristicas,
      proprietario: {
        nome: proprietario_nome !== undefined ? proprietario_nome : imoveis[imovelIndex].proprietario.nome,
        contato: proprietario_contato !== undefined ? proprietario_contato : imoveis[imovelIndex].proprietario.contato,
        cpf_cnpj: proprietario_cpf_cnpj !== undefined ? proprietario_cpf_cnpj : imoveis[imovelIndex].proprietario.cpf_cnpj
      },
      fotos: fotos !== undefined ? fotos : imoveis[imovelIndex].fotos,
      status: status || imoveis[imovelIndex].status,
      data_atualizacao: new Date().toISOString()
    };

    imoveis[imovelIndex] = imovelAtualizado;

    res.json({
      success: true,
      data: imovelAtualizado,
      message: 'Imóvel atualizado com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Deletar imóvel
router.delete('/:id', (req, res) => {
  try {
    const imovelIndex = imoveis.findIndex(i => i.id === parseInt(req.params.id));
    
    if (imovelIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Imóvel não encontrado'
      });
    }

    // Verificar se imóvel está alugado
    if (imoveis[imovelIndex].status === 'alugado') {
      return res.status(400).json({
        success: false,
        error: 'Não é possível excluir um imóvel que está alugado'
      });
    }

    imoveis.splice(imovelIndex, 1);

    res.json({
      success: true,
      message: 'Imóvel excluído com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Buscar imóveis disponíveis
router.get('/status/disponiveis', (req, res) => {
  try {
    const imoveisDisponiveis = imoveis.filter(imovel => imovel.status === 'disponivel');
    
    res.json({
      success: true,
      data: imoveisDisponiveis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;