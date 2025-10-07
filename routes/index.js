const express = require('express');
const router = express.Router();

// Página inicial - Dashboard
router.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard - Sistema de Imóveis',
    page: 'dashboard'
  });
});

// Página de clientes
router.get('/clientes', (req, res) => {
  res.render('clientes', {
    title: 'Clientes - Sistema de Imóveis',
    page: 'clientes'
  });
});

// Página de imóveis
router.get('/imoveis', (req, res) => {
  res.render('imoveis', {
    title: 'Imóveis - Sistema de Imóveis',
    page: 'imoveis'
  });
});

// Página de contratos
router.get('/contratos', (req, res) => {
  res.render('contratos', {
    title: 'Contratos - Sistema de Imóveis',
    page: 'contratos'
  });
});

// Página de cobranças
router.get('/cobrancas', (req, res) => {
  res.render('cobrancas', {
    title: 'Cobranças - Sistema de Imóveis',
    page: 'cobrancas'
  });
});

// Página de relatórios
router.get('/relatorios', (req, res) => {
  res.render('relatorios', {
    title: 'Relatórios - Sistema de Imóveis',
    page: 'relatorios'
  });
});

module.exports = router;