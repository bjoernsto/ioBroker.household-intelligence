'use strict';

const utils = require('@iobroker/adapter-core');
const LLMClient = require('./lib/llmClient');
const DataCollector = require('./lib/dataCollector');
const Analyzer = require('./lib/analyzer');
const NotificationManager = require('./lib/notificationManager');

class HouseholdIntelligence extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'household-intelligence' });

        this.llmClient = null;
        this.dataCollector = null;
        this.analyzer = null;
        this.notificationManager = null;
        this.analysisInterval = null;
        this.anomalyInterval = null;

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.log.info('Household Intelligence Adapter starting...');

        // Init LLM client (Ollama or OpenAI depending on config)
        this.llmClient = new LLMClient(this.config, this.log);
        const connected = await this.llmClient.testConnection();

        if (!connected) {
            this.log.error('Could not connect to LLM backend! Check your configuration.');
            this.setState('info.connection', false, true);
            return;
        }

        this.setState('info.connection', true, true);
        this.log.info(`Connected to LLM backend: ${this.config.llmBackend}`);

        // Init sub-modules
        this.dataCollector = new DataCollector(this);
        this.analyzer = new Analyzer(this.llmClient, this.log);
        this.notificationManager = new NotificationManager(this);

        // Subscribe to configured datapoints
        await this.dataCollector.subscribeToDatapoints();

        // Create state objects
        await this.createStateObjects();

        // Run initial analysis
        await this.runFullAnalysis();

        // Schedule recurring analysis (default: every 6 hours)
        const analysisIntervalHours = this.config.analysisIntervalHours || 6;
        this.analysisInterval = setInterval(
            () => this.runFullAnalysis(),
            analysisIntervalHours * 60 * 60 * 1000
        );

        // Schedule anomaly detection (default: every 15 minutes)
        this.anomalyInterval = setInterval(
            () => this.runAnomalyDetection(),
            15 * 60 * 1000
        );

        this.log.info('Household Intelligence Adapter ready!');
    }

    async createStateObjects() {
        const states = [
            { id: 'analysis.lastReport', name: 'Last Analysis Report', type: 'string', role: 'text' },
            { id: 'analysis.lastRunTime', name: 'Last Analysis Timestamp', type: 'string', role: 'date' },
            { id: 'analysis.savingsTipCount', name: 'Number of savings tips', type: 'number', role: 'value' },
            { id: 'anomaly.lastDetected', name: 'Last Anomaly Detected', type: 'string', role: 'text' },
            { id: 'anomaly.activeAlerts', name: 'Active Anomaly Alerts (JSON)', type: 'string', role: 'json' },
            { id: 'automation.suggestions', name: 'Automation Suggestions (JSON)', type: 'string', role: 'json' },
            { id: 'automation.pendingCount', name: 'Pending Suggestions Count', type: 'number', role: 'value' },
            { id: 'info.connection', name: 'LLM Backend Connected', type: 'boolean', role: 'indicator.connected' },
            { id: 'control.triggerAnalysis', name: 'Trigger Manual Analysis', type: 'boolean', role: 'button' },
            { id: 'control.clearAlerts', name: 'Clear All Alerts', type: 'boolean', role: 'button' },
        ];

        for (const s of states) {
            await this.setObjectNotExistsAsync(s.id, {
                type: 'state',
                common: {
                    name: s.name,
                    type: s.type,
                    role: s.role,
                    read: true,
                    write: s.role === 'button',
                },
                native: {},
            });
        }
    }

    async runFullAnalysis() {
        this.log.info('Running full household analysis...');
        try {
            const snapshot = await this.dataCollector.collectSnapshot();
            const report = await this.analyzer.analyzeHousehold(snapshot);

            await this.setState('analysis.lastReport', JSON.stringify(report.summary), true);
            await this.setState('analysis.lastRunTime', new Date().toISOString(), true);
            await this.setState('analysis.savingsTipCount', report.savingsTips.length, true);
            await this.setState('automation.suggestions', JSON.stringify(report.automationSuggestions), true);
            await this.setState('automation.pendingCount', report.automationSuggestions.length, true);

            if (report.savingsTips.length > 0) {
                const msg = `💡 ${report.savingsTips.length} neue Spar-Tipps verfügbar:\n` +
                    report.savingsTips.slice(0, 3).map(t => `• ${t}`).join('\n');
                await this.notificationManager.send(msg);
            }

            this.log.info(`Analysis complete. ${report.savingsTips.length} tips, ${report.automationSuggestions.length} suggestions.`);
        } catch (err) {
            this.log.error('Analysis failed: ' + err.message);
        }
    }

    async runAnomalyDetection() {
        try {
            const snapshot = await this.dataCollector.collectSnapshot();
            const anomalies = await this.analyzer.detectAnomalies(snapshot);

            if (anomalies.length > 0) {
                const alertMsg = anomalies.map(a => `⚠️ ${a.device}: ${a.description}`).join('\n');
                await this.setState('anomaly.lastDetected', alertMsg, true);
                await this.setState('anomaly.activeAlerts', JSON.stringify(anomalies), true);
                await this.notificationManager.send('🚨 Anomalie erkannt!\n' + alertMsg);
                this.log.warn('Anomalies detected: ' + alertMsg);
            }
        } catch (err) {
            this.log.error('Anomaly detection failed: ' + err.message);
        }
    }

    async onStateChange(id, state) {
        if (!state || state.ack) return;

        if (id.endsWith('control.triggerAnalysis') && state.val) {
            this.log.info('Manual analysis triggered');
            await this.runFullAnalysis();
            await this.setState('control.triggerAnalysis', false, true);
        }

        if (id.endsWith('control.clearAlerts') && state.val) {
            await this.setState('anomaly.activeAlerts', '[]', true);
            await this.setState('anomaly.lastDetected', '', true);
            await this.setState('control.clearAlerts', false, true);
        }

        // Feed new state value into data collector history
        if (this.dataCollector) {
            this.dataCollector.recordStateChange(id, state);
        }
    }

    async onMessage(obj) {
        if (!obj || !obj.command) return;

        if (obj.command === 'askLLM' && obj.message) {
            try {
                const snapshot = await this.dataCollector.collectSnapshot();
                const answer = await this.analyzer.askFreeQuestion(snapshot, obj.message);
                this.sendTo(obj.from, obj.command, { result: answer }, obj.callback);
            } catch (err) {
                this.sendTo(obj.from, obj.command, { error: err.message }, obj.callback);
            }
        }

        if (obj.command === 'getReport') {
            const state = await this.getStateAsync('analysis.lastReport');
            this.sendTo(obj.from, obj.command, { result: state ? state.val : 'No report yet' }, obj.callback);
        }
    }

    onUnload(callback) {
        try {
            if (this.analysisInterval) clearInterval(this.analysisInterval);
            if (this.anomalyInterval) clearInterval(this.anomalyInterval);
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new HouseholdIntelligence(options);
} else {
    new HouseholdIntelligence();
}
