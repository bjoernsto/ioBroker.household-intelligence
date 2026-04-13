'use strict';

class DataCollector {
    constructor(adapter) {
        this.adapter = adapter;
        this.history = {};
        this.maxHistoryEntries = 288;
    }

    _getDatapoints() {
        const cfg = this.adapter.config;
        // Support both old 'datapoints' array and new 'datapointsJson' string
        if (cfg.datapointsJson) {
            try {
                const parsed = typeof cfg.datapointsJson === 'string'
                    ? JSON.parse(cfg.datapointsJson)
                    : cfg.datapointsJson;
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                this.adapter.log.error('Invalid datapointsJson: ' + e.message);
                return [];
            }
        }
        return cfg.datapoints || [];
    }

    async subscribeToDatapoints() {
        const dp = this._getDatapoints();
        if (dp.length === 0) {
            this.adapter.log.warn('No datapoints configured! Please add datapoints in adapter settings.');
            return;
        }
        for (const point of dp) {
            if (point.id) {
                await this.adapter.subscribeForeignStatesAsync(point.id);
                this.adapter.log.debug('Subscribed to: ' + point.id);
            }
        }
        this.adapter.log.info('Subscribed to ' + dp.length + ' datapoints');
    }

    recordStateChange(id, state) {
        if (!this.history[id]) this.history[id] = [];
        this.history[id].push({ ts: state.ts || Date.now(), val: state.val });
        if (this.history[id].length > this.maxHistoryEntries) {
            this.history[id] = this.history[id].slice(-this.maxHistoryEntries);
        }
    }

    async collectSnapshot() {
        const dp = this._getDatapoints();
        const snapshot = {
            timestamp: new Date().toISOString(),
            currentValues: {},
            history: {},
            deviceGroups: {},
        };

        for (const point of dp) {
            if (!point.id) continue;
            try {
                const state = await this.adapter.getForeignStateAsync(point.id);
                snapshot.currentValues[point.id] = {
                    value: state ? state.val : null,
                    unit: point.unit || '',
                    label: point.label || point.id,
                    category: point.category || 'other',
                    ts: state ? state.ts : null,
                };
                if (this.history[point.id]) {
                    snapshot.history[point.id] = this.history[point.id].slice(-48);
                }
                const cat = point.category || 'other';
                if (!snapshot.deviceGroups[cat]) snapshot.deviceGroups[cat] = [];
                snapshot.deviceGroups[cat].push(point.id);
            } catch (err) {
                this.adapter.log.warn('Could not read state ' + point.id + ': ' + err.message);
            }
        }

        snapshot.context = {
            time: new Date().toLocaleTimeString('de-DE'),
            date: new Date().toLocaleDateString('de-DE'),
            dayOfWeek: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][new Date().getDay()],
            season: this._getSeason(),
        };

        return snapshot;
    }

    _getSeason() {
        const m = new Date().getMonth() + 1;
        if (m >= 3 && m <= 5) return 'Frühling';
        if (m >= 6 && m <= 8) return 'Sommer';
        if (m >= 9 && m <= 11) return 'Herbst';
        return 'Winter';
    }
}

module.exports = DataCollector;
