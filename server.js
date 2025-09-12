// server.js - Proxy simple para Hathr API
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Función para generar firma AWS Signature Version 4
function createAWSSignature(method, url, headers, body, accessKey, secretKey, region = 'us-gov-west-1', service = 'execute-api') {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    
    // Headers requeridos
    const amzDate = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substr(0, 8);
    
    const canonicalHeaders = Object.keys(headers)
        .sort()
        .map(key => `${key.toLowerCase()}:${headers[key]}`)
        .join('\n') + '\n';
    
    const signedHeaders = Object.keys(headers)
        .sort()
        .map(key => key.toLowerCase())
        .join(';');
    
    const payloadHash = crypto.createHash('sha256').update(body || '').digest('hex');
    
    const canonicalRequest = [
        method,
        path,
        '', // query string
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    
    const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    
    const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return {
        'Authorization': authorizationHeader,
        'X-Amz-Date': amzDate,
        'Host': host
    };
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
}

// Middleware
app.use(cors( {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
} ));
app.use(express.json());
app.use(express.static('.')); // Servir archivos HTML, CSS, etc.

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'testLLM_clean.html'));
});

// Endpoint para verificar el token
app.post('/verify-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || authHeader;
        
        if (!token) {
            return res.status(400).json({ error: 'No token provided' });
        }
        
        // Decodificar el token JWT
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                return res.status(400).json({ error: 'Invalid token format' });
            }
            
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            
            res.json({
                success: true,
                tokenInfo: {
                    client_id: payload.client_id,
                    scope: payload.scope,
                    token_use: payload.token_use,
                    exp: payload.exp,
                    iat: payload.iat,
                    exp_date: new Date(payload.exp * 1000).toISOString(),
                    iat_date: new Date(payload.iat * 1000).toISOString(),
                    is_expired: Date.now() > payload.exp * 1000
                }
            });
            
        } catch (e) {
            res.status(400).json({ error: 'Could not decode token', details: e.message });
        }
        
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para probar con credenciales AWS
app.post('/test-aws-auth', async (req, res) => {
    try {
        const { accessKeyId, secretAccessKey } = req.body;
        
        if (!accessKeyId || !secretAccessKey) {
            return res.status(400).json({ error: 'Access Key ID and Secret Access Key required' });
        }
        
        const fetch = (await import('node-fetch')).default;
        
        // Probar con AWS Signature
        const testUrl = 'https://api.hathr.ai/v1/chat';
        const testBody = JSON.stringify({ messages: [{ role: 'user', text: 'Hello' }] });
        const testHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        const awsHeaders = createAWSSignature('POST', testUrl, testHeaders, testBody, accessKeyId, secretAccessKey);
        
        console.log('Testing with AWS Signature:', awsHeaders);
        
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                ...testHeaders,
                ...awsHeaders
            },
            body: testBody
        });
        
        const data = await response.json();
        
        res.json({
            success: response.status < 400,
            status: response.status,
            message: data.message || 'Success',
            response: data,
            awsHeaders: awsHeaders
        });
        
    } catch (error) {
        console.error('AWS auth test error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de prueba para debuggear auth
app.post('/test-auth', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || authHeader;
        
        console.log('=== TESTING AUTH FORMATS ===');
        console.log('Original header:', authHeader);
        console.log('Extracted token:', token?.substring(0, 20) + '...');
        
        // Decodificar el token JWT para ver el scope
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                console.log('Token payload:', payload);
                console.log('Token scope:', payload.scope);
                console.log('Token client_id:', payload.client_id);
            }
        } catch (e) {
            console.log('Could not decode token:', e.message);
        }

        const testFormats = [
            { name: 'Bearer Token', value: `Bearer ${token}` },
            { name: 'Token Only', value: token },
        ];
        
        const results = [];
        
        // Probar diferentes endpoints para ver cuáles funcionan
        const endpoints = [
            { name: 'Chat', url: 'https://api.hathr.ai/v1/chat', method: 'POST', body: { messages: [{ role: 'user', text: 'Hello' }] } },
            { name: 'Document List', url: 'https://api.hathr.ai/v1/document/list', method: 'GET', body: null },
            { name: 'Document Upload', url: 'https://api.hathr.ai/v1/document/upload', method: 'POST', body: { filename: 'test.txt', type: 'text/plain' } },
            { name: 'Document Complete', url: 'https://api.hathr.ai/v1/document/complete', method: 'GET', body: null },
        ];

        for (const endpoint of endpoints) {
            for (const format of testFormats) {
                try {
                    console.log(`Testing ${endpoint.name} with ${format.name}...`);
                    
                    const response = await fetch(endpoint.url, {
                        method: endpoint.method,
                        headers: {
                            'Authorization': format.value,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
                    });
                    
                    const data = await response.json();
                    
                    results.push({
                        endpoint: endpoint.name,
                        format: format.name,
                        status: response.status,
                        success: response.status < 400,
                        message: data.message || 'No message',
                        response: data
                    });
                    
                    console.log(`${endpoint.name} (${format.name}): Status ${response.status} - ${data.message || 'OK'}`);
                    
                } catch (error) {
                    results.push({
                        endpoint: endpoint.name,
                        format: format.name,
                        status: 'ERROR',
                        success: false,
                        message: error.message,
                        response: null
                    });
                    console.log(`${endpoint.name} (${format.name}): ERROR - ${error.message}`);
                }
            }
        }
        
        res.json({
            success: true,
            results: results,
            summary: {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            }
        });
        
    } catch (error) {
        console.error('Test auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy para autenticación
app.post('/proxy/auth', async (req, res) => {
    try {
        const { clientId, clientSecret } = req.body;
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(
            'https://hathr.auth-fips.us-gov-west-1.amazoncognito.com/oauth2/token',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`
                },
                body: 'grant_type=client_credentials&scope=hathr/llm'
            }
        );
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy para chat
app.post('/proxy/chat', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        // Extraer credenciales del header
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || authHeader;
        
        // Para AWS Signature, necesitamos las credenciales reales
        // Por ahora, vamos a usar un enfoque diferente
        const response = await fetch('https://api.hathr.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy para listar documentos
app.get('/proxy/document/list', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('https://api.hathr.ai/v1/document/list', {
            headers: {
                'Authorization': req.headers.authorization,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('List documents error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy para obtener URL de upload
app.post('/proxy/document/upload', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        console.log('Upload request body:', req.body);
        console.log('Upload request headers:', req.headers);
        console.log('Authorization header:', req.headers.authorization);
        console.log('Token length:', req.headers.authorization?.length);
        
        // Extraer el token del header Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || authHeader;
        
        console.log('Original auth header:', authHeader);
        console.log('Extracted token:', token?.substring(0, 20) + '...');
        
        // Probar diferentes formatos de Authorization
        const authFormats = [
            token, // Solo el token
            `Bearer ${token}`, // Bearer + token
            `Token ${token}`, // Token + token
            `token=${token}`, // key=value format
            `access_token=${token}`, // access_token=value format
        ];
        
        let response;
        let lastError;
        
        for (let i = 0; i < authFormats.length; i++) {
            const authFormat = authFormats[i];
            console.log(`Trying auth format ${i + 1}: ${authFormat.substring(0, 30)}...`);
            
            try {
                response = await fetch('https://api.hathr.ai/v1/document/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': authFormat,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(req.body)
                });
                
                console.log(`Auth format ${i + 1} response status:`, response.status);
                
                if (response.status !== 403) {
                    console.log(`✅ Auth format ${i + 1} worked! Status: ${response.status}`);
                    break;
                } else {
                    const errorData = await response.json();
                    console.log(`❌ Auth format ${i + 1} failed:`, errorData.message);
                    lastError = errorData;
                }
            } catch (error) {
                console.log(`❌ Auth format ${i + 1} error:`, error.message);
                lastError = error;
            }
        }
        
        if (!response) {
            throw new Error(`All auth formats failed. Last error: ${lastError?.message || 'Unknown error'}`);
        }
        
        console.log('Upload response status:', response.status);
        const data = await response.json();
        console.log('Upload response data:', data);
        
        res.json(data);
    } catch (error) {
        console.error('Upload URL error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy para verificar estado de documento
app.get('/proxy/document/complete', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('https://api.hathr.ai/v1/document/complete', {
            headers: {
                'Authorization': req.headers.authorization,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Document complete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy para chat con documentos
app.post('/proxy/document/chat', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('https://api.hathr.ai/v1/document/chat', {
            method: 'POST',
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Document chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`
    🚀 Servidor proxy corriendo en http://localhost:${PORT}
    📁 Abre tu navegador en: http://localhost:${PORT}
    ✅ El proxy redirigirá todas las peticiones a Hathr API
    `);
});