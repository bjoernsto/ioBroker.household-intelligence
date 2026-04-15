'use strict';

const RELEVANT_ROLES = [
    'value.power', 'value.energy', 'value.temperature', 'value.humidity',
    'value.brightness', 'switch', 'switch.light', 'switch.power',
    'sensor.motion', 'sensor.door', 'sensor.window',
    'value.current', 'value.voltage', 'value.fill', 'value.co2',
    'value.pressure', 'value.wind', 'value.rain',
    'value.lock', 'value.heat', 'value.valve',
];

const RELEVANT_UNITS = ['W', 'kWh', '°C', '%', 'V', 'A', 'lux', 'ppm', 'hPa', 'l', 'm³'];

const SKIP_PREFIXES = [
    'system.', 'admin.', 'javascript.', 'script.',
    'household-intelligence.', '0_userdata.',
    'info.', 'vis.', 'vis-2.', 'ping.',
    'tr-064.', 'node-red.',
];

// Skip states that are clearly not useful for analysis
const SKIP_PATTERNS = [
    'reachable', 'rssi', 'updateAvailable', 'lastUpdate',
    'firmware', 'lowbat', 'unreach', 'sticky', 'config',
    'working', 'direction', 'connected', 'error', 'sabotage',
];

const CATEGORY_MAP = {
    'value.power':       'power',
    'value.energy':      'power',
    'value.current':     'power',
    'value.voltage':     'power',
    'value.temperature': 'temperature',
    'value.humidity':    'temperature',
    'value.pressure':    'temperature',
    'switch.light':      'light',
    'value.brightness':  'light',
    'sensor.motion':     'presence',
    'sensor.door':       'security',
    'sensor.window':     'security',
    'value.lock':        'security',
    'value.co2':         'other',
    'value.fill':        'water',
    'value.heat':        'heating',
    'value.valve':       'heating',
};

function getCategoryByUnit(unit) {
    if (['W', 'kWh', 'V', 'A'].includes(unit)) return 'power';
    if (['°C', '%', 'hPa'].includes(unit)) return 'temperature';
    if (['lux'].includes(unit)) return 'light';
    if (['l', 'm³'].includes(unit)) return 'water';
    return 'other';
}

// Max datapoints to avoid overwhelming the LLM
const MAX_DATAPOINTS = 50;

class AutoDiscovery {
    constructor(adapter) {
        this.adapter = adapter;
    }

    async discoverDatapoints() {
        this.adapter.log.info('Auto-discovering relevant datapoints...');
        const datapoints = [];

        try {
            const objects = await this.adapter.getForeignObjectsAsync('*', 'state');
            if (!objects) return [];

            for (const [id, obj] of Object.entries(objects)) {
                if (!obj || !obj.common) continue;

                // Skip system/internal states
                if (SKIP_PREFIXES.some(p => id.startsWith(p))) continue;
                if (SKIP_PATTERNS.some(p => id.toLowerCase().includes(p))) continue;

                // Skip non-readable or wrong types
                if (obj.common.read === false) continue;
                if (['string', 'object', 'array', 'file'].includes(obj.common.type)) continue;

                const role = obj.common.role || '';
                const unit = obj.common.unit || '';
                const name = obj.common.name || id;

                const isRelevantRole = RELEVANT_ROLES.some(r => role === r || role.startsWith(r + '.'));
                const isRelevantUnit = RELEVANT_UNITS.includes(unit);

                if (!isRelevantRole && !isRelevantUnit) continue;

                // Prefer states with units (more meaningful for analysis)
                const priority = (unit !== '' ? 2 : 0) + (isRelevantRole ? 1 : 0);

                const category = CATEGORY_MAP[role] ||
                    (isRelevantUnit ? getCategoryByUnit(unit) : 'other');

                const label = typeof name === 'object'
                    ? (name.de || name.en || id.split('.').pop())
                    : String(name);

                datapoints.push({
                    id,
                    label: label.substring(0, 60),
                    category,
                    unit,
                    priority,
                });
            }

            // Sort by priority (states with units first) and limit
            datapoints.sort((a, b) => b.priority - a.priority);
            const limited = datapoints.slice(0, MAX_DATAPOINTS);

            // Remove priority field before saving
            const clean = limited.map(({ id, label, category, unit }) =>
                ({ id, label, category, unit }));

            this.adapter.log.info(`Auto-discovery: ${datapoints.length} candidates → using top ${clean.length}`);
            return clean;

        } catch (err) {
            this.adapter.log.error('Auto-discovery failed: ' + err.message);
            return [];
        }
    }

    async saveDiscoveredDatapoints(datapoints) {
        try {
            const obj = await this.adapter.getForeignObjectAsync(
                `system.adapter.${this.adapter.namespace}`
            );
            if (!obj) return false;

            obj.native.datapointsJson = JSON.stringify(datapoints);
            obj.native.autoDiscoveryDone = true;
            obj.native.autoDiscover = false; // Don't re-run on next start

            // Use extendForeignObject to avoid triggering adapter restart
            await this.adapter.extendForeignObjectAsync(
                `system.adapter.${this.adapter.namespace}`,
                { native: obj.native }
            );

            this.adapter.log.info(`${datapoints.length} datapoints saved to config`);
            return true;
        } catch (err) {
            this.adapter.log.error('Failed to save datapoints: ' + err.message);
            return false;
        }
    }
}

module.exports = AutoDiscovery;
