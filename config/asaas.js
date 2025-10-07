const axios = require('axios');

class AsaasAPI {
  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY;
    this.baseURL = process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3';
    
    if (!this.apiKey) {
      throw new Error('ASAAS_API_KEY não configurada. Verifique o arquivo .env');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Interceptor para log de requests (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      this.client.interceptors.request.use(request => {
        console.log(`🔄 Asaas API: ${request.method?.toUpperCase()} ${request.url}`);
        return request;
      });
    }

    // Interceptor para tratamento de erros
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('❌ Erro na API Asaas:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  // Clientes
  async criarCliente(dadosCliente) {
    try {
      const response = await this.client.post('/customers', dadosCliente);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao criar cliente: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async buscarCliente(clienteId) {
    try {
      const response = await this.client.get(`/customers/${clienteId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao buscar cliente: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async listarClientes(filtros = {}) {
    try {
      const response = await this.client.get('/customers', { params: filtros });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar clientes: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async atualizarCliente(clienteId, dadosCliente) {
    try {
      const response = await this.client.put(`/customers/${clienteId}`, dadosCliente);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao atualizar cliente: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Cobranças
  async criarCobranca(dadosCobranca) {
    try {
      const response = await this.client.post('/payments', dadosCobranca);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao criar cobrança: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async buscarCobranca(cobrancaId) {
    try {
      const response = await this.client.get(`/payments/${cobrancaId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao buscar cobrança: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async listarCobrancas(filtros = {}) {
    try {
      const response = await this.client.get('/payments', { params: filtros });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar cobranças: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async obterBoleto(cobrancaId) {
    try {
      const response = await this.client.get(`/payments/${cobrancaId}/identificationField`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter boleto: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Assinaturas (para aluguéis recorrentes)
  async criarAssinatura(dadosAssinatura) {
    try {
      const response = await this.client.post('/subscriptions', dadosAssinatura);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao criar assinatura: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async listarAssinaturas(filtros = {}) {
    try {
      const response = await this.client.get('/subscriptions', { params: filtros });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar assinaturas: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Webhooks
  async configurarWebhook(dadosWebhook) {
    try {
      const response = await this.client.post('/webhooks', dadosWebhook);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao configurar webhook: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Extrato Financeiro
  async obterExtratoFinanceiro(filtros = {}) {
    try {
      const response = await this.client.get('/financialTransactions', { params: filtros });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter extrato financeiro: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async obterSaldoConta() {
    try {
      const response = await this.client.get('/finance/balance');
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter saldo da conta: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Transferências PIX/TED
  async criarTransferencia(dadosTransferencia) {
    try {
      const response = await this.client.post('/transfers', dadosTransferencia);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao criar transferência: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async listarTransferencias(filtros = {}) {
    try {
      const response = await this.client.get('/transfers', { params: filtros });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar transferências: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async buscarTransferencia(transferenciaId) {
    try {
      const response = await this.client.get(`/transfers/${transferenciaId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao buscar transferência: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Chaves PIX
  async listarChavesPix() {
    try {
      const response = await this.client.get('/pix/addressKeys');
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar chaves PIX: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async criarChavePix(dadosChave) {
    try {
      const response = await this.client.post('/pix/addressKeys', dadosChave);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao criar chave PIX: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Pagamento de Contas/Boletos
  async pagarConta(dadosPagamento) {
    try {
      const response = await this.client.post('/bill', dadosPagamento);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao pagar conta: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async consultarConta(codigoBarras) {
    try {
      const response = await this.client.get(`/bill/simulate`, { 
        params: { identificationField: codigoBarras }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao consultar conta: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  async listarPagamentos(filtros = {}) {
    try {
      const response = await this.client.get('/bill', { params: filtros });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar pagamentos: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Utilitários
  formatarValor(valor) {
    return parseFloat(valor).toFixed(2);
  }

  formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
  }

  validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.length === 11;
  }

  validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    return cnpj.length === 14;
  }
}

module.exports = AsaasAPI;