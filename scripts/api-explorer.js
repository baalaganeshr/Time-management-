#!/usr/bin/env node

/**
 * Quick Kimai API Explorer
 * Test different API endpoints to understand the available API
 */

const http = require('http');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8001,
            path: path,
            method: method,
            headers: {
                'User-Agent': 'Kimai-API-Explorer/1.0',
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: responseData
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(data);
        }

        req.end();
    });
}

async function exploreAPI() {
    console.log('🔍 Exploring Kimai API endpoints...\n');

    const endpoints = [
        '/api',
        '/api/config',
        '/api/version',
        '/api/ping',
        '/api/doc',
        '/api/projects',
        '/api/timesheets',
        '/api/activities'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint}...`);
            const response = await makeRequest(endpoint);
            
            if (response.statusCode === 200) {
                console.log(`✅ ${endpoint} - Status: ${response.statusCode}`);
                if (response.body) {
                    try {
                        const parsed = JSON.parse(response.body);
                        if (Array.isArray(parsed)) {
                            console.log(`   Data: Array with ${parsed.length} items`);
                        } else {
                            console.log(`   Data: ${JSON.stringify(parsed).substring(0, 100)}...`);
                        }
                    } catch (e) {
                        console.log(`   Data: ${response.body.substring(0, 100)}...`);
                    }
                }
            } else {
                console.log(`⚠️  ${endpoint} - Status: ${response.statusCode}`);
                if (response.statusCode === 401) {
                    console.log('   → Authentication required');
                } else if (response.statusCode === 404) {
                    console.log('   → Endpoint not found');
                } else {
                    console.log(`   → ${response.body.substring(0, 100)}...`);
                }
            }
        } catch (error) {
            console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
        console.log('');
    }
}

exploreAPI().catch(console.error);