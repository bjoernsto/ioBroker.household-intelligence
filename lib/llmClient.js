'use strict';

const https = require('https');
const http = require('http');

class LLMClient {
    constructor(config, log) {
        this.config = config;
        this.log = log;
        this.backend = config.llmBackend || 'ollama';
        this.ollamaHost = config.ollamaHost || 'http://localhost:11434';
        this.ollamaModel = config.ollamaModel || 'llama3';
        this.openaiApiKey = config.openaiApiKey || '';
        this.openaiModel = config.openaiModel || 'gpt-4o-mini';
        this.maxTokens = config.maxTokens || 1500;
        // Total timeout for the entire request (not just socket inactivity)
        this.timeoutMs = (config.timeoutSeconds || 300) * 1000;
    }

    async testConnection() {
        try {
            if (this.backend === 'ollama') {
                const result = await this._fetchJSON(`${this.ollamaHost}/api/tags`, 'GET', null, null, 10000);
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

        this.log.debug(`Sending request to Ollama: ${this.ollamaHost}/api/chat`);
        const result = await this._fetchJSON(`${this.ollamaHost}/api/chat`, 'POST', payload);

        if (!result || !result.message) {
            throw new Error('Invalid Ollama response: ' + JSON.stringify(result));
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

    _fetchJSON(url, method, body, extraHeaders, overrideTimeout) {
        return new Promise((resolve, reject) => {
            const totalTimeout = overrideTimeout || this.timeoutMs;
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
                // No socket timeout here - Ollama holds connection open while computing
            };

            // Use a wall-clock timer instead of socket timeout
            const timer = setTimeout(() => {
                req.destroy();
                reject(new Error(`LLM request timed out after ${totalTimeout}ms`));
            }, totalTimeout);

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    clearTimeout(timer);
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        reject(new Error('Failed to parse JSON: ' + data.substring(0, 200)));
                    }
                });
            });

            req.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });

            if (bodyStr) req.write(bodyStr);
            req.end();
        });
    }
}

module.exports = LLMClient;
