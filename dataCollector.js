'use strict';

const https = require('https');
const http = require('http');

/**
 * LLMClient - supports Ollama (local) and OpenAI (cloud)
 */
class LLMClient {
    constructor(config, log) {
        this.config = config;
        this.log = log;
        this.backend = config.llmBackend || 'ollama'; // 'ollama' | 'openai'
        this.ollamaHost = config.ollamaHost || 'http://localhost:11434';
        this.ollamaModel = config.ollamaModel || 'llama3';
        this.openaiApiKey = config.openaiApiKey || '';
        this.openaiModel = config.openaiModel || 'gpt-4o-mini';
        this.maxTokens = config.maxTokens || 1500;
        this.timeoutMs = (config.timeoutSeconds || 60) * 1000;
    }

    async testConnection() {
        try {
            if (this.backend === 'ollama') {
                const result = await this._fetchJSON(`${this.ollamaHost}/api/tags`, 'GET');
                return result && Array.isArray(result.models);
            } else if (this.backend === 'openai') {
                return this.openaiApiKey && this.openaiApiKey.length > 10;
            }
        } catch (err) {
            this.log.error('LLM connection test failed: ' + err.message);
            return false;
        }
    }

    async complete(systemPrompt, userPrompt) {
        if (this.backend === 'ollama') {
            return this._ollamaComplete(systemPrompt, userPrompt);
        } else if (this.backend === 'openai') {
            return this._openaiComplete(systemPrompt, userPrompt);
        }
        throw new Error('Unknown LLM backend: ' + this.backend);
    }

    async _ollamaComplete(systemPrompt, userPrompt) {
        const payload = {
            model: this.ollamaModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: {
                num_predict: this.maxTokens,
                temperature: 0.3,
            }
        };

        const result = await this._fetchJSON(
            `${this.ollamaHost}/api/chat`,
            'POST',
            payload
        );

        if (!result || !result.message) {
            throw new Error('Invalid Ollama response');
        }
        return result.message.content;
    }

    async _openaiComplete(systemPrompt, userPrompt) {
        const payload = {
            model: this.openaiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: this.maxTokens,
            temperature: 0.3,
        };

        const result = await this._fetchJSON(
            'https://api.openai.com/v1/chat/completions',
            'POST',
            payload,
            { Authorization: `Bearer ${this.openaiApiKey}` }
        );

        if (!result || !result.choices || !result.choices[0]) {
            throw new Error('Invalid OpenAI response');
        }
        return result.choices[0].message.content;
    }

    _fetchJSON(url, method, body, extraHeaders) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const lib = isHttps ? https : http;
            const bodyStr = body ? JSON.stringify(body) : null;

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
                    ...(extraHeaders || {}),
                },
                timeout: this.timeoutMs,
            };

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        reject(new Error('Failed to parse JSON response: ' + data.substring(0, 200)));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`LLM request timed out after ${this.timeoutMs}ms`));
            });

            if (bodyStr) req.write(bodyStr);
            req.end();
        });
    }
}

module.exports = LLMClient;
