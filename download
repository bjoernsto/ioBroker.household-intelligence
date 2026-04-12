'use strict';

const assert = require('assert');

// Mock logger
const mockLog = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
};

describe('LLMClient', () => {
    const LLMClient = require('../lib/llmClient');

    it('should instantiate with ollama config', () => {
        const client = new LLMClient({
            llmBackend: 'ollama',
            ollamaHost: 'http://localhost:11434',
            ollamaModel: 'llama3',
        }, mockLog);
        assert.strictEqual(client.backend, 'ollama');
        assert.strictEqual(client.ollamaModel, 'llama3');
    });

    it('should instantiate with openai config', () => {
        const client = new LLMClient({
            llmBackend: 'openai',
            openaiApiKey: 'sk-test',
            openaiModel: 'gpt-4o-mini',
        }, mockLog);
        assert.strictEqual(client.backend, 'openai');
        assert.strictEqual(client.openaiModel, 'gpt-4o-mini');
    });

    it('should fail connection test when no openai key', async () => {
        const client = new LLMClient({
            llmBackend: 'openai',
            openaiApiKey: '',
        }, mockLog);
        const result = await client.testConnection();
        assert.strictEqual(result, false);
    });
});

describe('Analyzer', () => {
    const Analyzer = require('../lib/analyzer');

    const mockLLM = {
        complete: async () => JSON.stringify({
            summary: 'Test summary',
            savingsTips: ['Tip 1'],
            automationSuggestions: [],
            insights: [],
        }),
    };

    it('should return analysis result', async () => {
        const analyzer = new Analyzer(mockLLM, mockLog);
        const snapshot = {
            timestamp: new Date().toISOString(),
            currentValues: {
                'test.0.power': { value: 100, unit: 'W', label: 'Test', category: 'power' },
            },
            history: {},
            deviceGroups: {},
            context: { time: '12:00', date: '12.04.2026', dayOfWeek: 'Samstag', season: 'Frühling' },
        };
        const result = await analyzer.analyzeHousehold(snapshot);
        assert.ok(result.summary);
        assert.ok(Array.isArray(result.savingsTips));
    });

    it('should return empty anomaly array when no baseline', async () => {
        const analyzer = new Analyzer(mockLLM, mockLog);
        const snapshot = {
            currentValues: {},
            history: {},
            context: { time: '12:00', dayOfWeek: 'Samstag' },
        };
        const result = await analyzer.detectAnomalies(snapshot);
        assert.ok(Array.isArray(result));
    });
});

describe('DataCollector', () => {
    it('should record state changes and cap history', () => {
        // Minimal mock adapter
        const mockAdapter = {
            config: { datapoints: [] },
            log: mockLog,
            subscribeForeignStatesAsync: async () => {},
        };
        const DataCollector = require('../lib/dataCollector');
        const dc = new DataCollector(mockAdapter);

        for (let i = 0; i < 300; i++) {
            dc.recordStateChange('test.0.val', { ts: Date.now(), val: i });
        }
        assert.ok(dc.history['test.0.val'].length <= dc.maxHistoryEntries);
    });
});
