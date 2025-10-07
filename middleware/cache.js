const NodeCache = require('node-cache');

// Cache com TTL de 5 minutos para dados financeiros
const cache = new NodeCache({ 
    stdTTL: 300, // 5 minutos
    checkperiod: 60, // Verificar expiração a cada 1 minuto
    useClones: false
});

// Middleware de cache para rotas específicas
function cacheMiddleware(ttl = 300) {
    return (req, res, next) => {
        // Gerar chave única baseada na rota e parâmetros
        const key = generateCacheKey(req);
        
        // Verificar se existe no cache
        const cachedData = cache.get(key);
        
        if (cachedData) {
            console.log(`Cache HIT para: ${key}`);
            return res.json(cachedData);
        }
        
        console.log(`Cache MISS para: ${key}`);
        
        // Interceptar o res.json para salvar no cache
        const originalJson = res.json;
        res.json = function(data) {
            // Só cachear respostas de sucesso
            if (data.success) {
                cache.set(key, data, ttl);
                console.log(`Dados salvos no cache: ${key}`);
            }
            
            return originalJson.call(this, data);
        };
        
        next();
    };
}

// Gerar chave de cache baseada na requisição
function generateCacheKey(req) {
    const { method, path, query, body } = req;
    
    // Para GET, usar path + query params
    if (method === 'GET') {
        const queryString = Object.keys(query)
            .sort()
            .map(key => `${key}=${query[key]}`)
            .join('&');
        
        return `${method}:${path}${queryString ? '?' + queryString : ''}`;
    }
    
    // Para POST, incluir dados do body (apenas para consultas)
    if (method === 'POST' && path.includes('consultar')) {
        const bodyString = JSON.stringify(body);
        return `${method}:${path}:${bodyString}`;
    }
    
    // Para outras operações, não cachear
    return null;
}

// Cache específico para dados que mudam pouco
const longTermCache = new NodeCache({ 
    stdTTL: 3600, // 1 hora
    checkperiod: 300 // Verificar a cada 5 minutos
});

// Middleware para cache de longo prazo (dados de configuração, etc.)
function longTermCacheMiddleware(ttl = 3600) {
    return (req, res, next) => {
        const key = generateCacheKey(req);
        
        if (!key) return next();
        
        const cachedData = longTermCache.get(key);
        
        if (cachedData) {
            console.log(`Long-term cache HIT para: ${key}`);
            return res.json(cachedData);
        }
        
        const originalJson = res.json;
        res.json = function(data) {
            if (data.success) {
                longTermCache.set(key, data, ttl);
                console.log(`Dados salvos no long-term cache: ${key}`);
            }
            
            return originalJson.call(this, data);
        };
        
        next();
    };
}

// Função para invalidar cache específico
function invalidateCache(pattern) {
    const keys = cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    
    keysToDelete.forEach(key => {
        cache.del(key);
        console.log(`Cache invalidado: ${key}`);
    });
    
    return keysToDelete.length;
}

// Função para limpar todo o cache
function clearCache() {
    const deletedKeys = cache.keys().length;
    cache.flushAll();
    longTermCache.flushAll();
    console.log(`Cache limpo: ${deletedKeys} chaves removidas`);
    return deletedKeys;
}

// Estatísticas do cache
function getCacheStats() {
    return {
        shortTerm: {
            keys: cache.keys().length,
            stats: cache.getStats()
        },
        longTerm: {
            keys: longTermCache.keys().length,
            stats: longTermCache.getStats()
        }
    };
}

module.exports = {
    cache,
    longTermCache,
    cacheMiddleware,
    longTermCacheMiddleware,
    invalidateCache,
    clearCache,
    getCacheStats
};