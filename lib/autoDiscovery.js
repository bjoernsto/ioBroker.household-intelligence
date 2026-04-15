'use strict';

const RELEVANT_ROLES = [
    'value.power', 'value.energy', 'value.temperature', 'value.humidity',
    'value.brightness', 'switch', 'switch.light', 'switch.power',
    'sensor.motion', 'sensor.door', 'sensor.window',
    'value.current', 'value.voltage', 'value.fill', 'value.co2',
    'value.pressure', 'value.wind', 'value.rain', 'value.uv',
    'value.lock', 'value.heat', 'value.valve',
];

const RELEVANT_UNITS = ['W', 'kWh', '°C', '°F', '%', 'V', 'A', 'lux', 'ppm', 'hPa', 'mbar', 'l', 'm³'];

const SKIP_PREFIXES = [
    'system.', 'admin.', 'javascript.', 'script.',
    'household-intelligence.', 'info.', '0_userdata.',
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
    if (['°C', '°F', '%', 'hPa', 'mbar'].includes(unit)) return 'temperature';
    if (['lux'].includes(unit)) return 'light';
    if (['l', 'm³'].includes(unit)) return 'water';
    return 'other';
}

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
                // Skip write-only or non-readable
                if (obj.common.read === false) continue;
                // Skip strings and objects
                if (['string', 'object', 'array', 'file'].includes(obj.common.type)) continue;

                const role = obj.common.role || '';
                const unit = obj.common.unit || '';
                const name = obj.common.name || id;

                const isRelevantRole = RELEVANT_ROLES.some(r => role === r || role.startsWith(r + '.'));
                const isRelevantUnit = RELEVANT_UNITS.includes(unit);

                if (!isRelevantRole && !isRelevantUnit) continue;

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
                });
            }

            this.adapter.log.info(`Auto-discovery found ${datapoints.length} relevant datapoints`);
            return datapoints;

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
            await this.adapter.setForeignObjectAsync(
                `system.adapter.${this.adapter.namespace}`, obj
            );
            this.adapter.log.info('Discovered datapoints saved to config');
            return true;
        } catch (err) {
            this.adapter.log.error('Failed to save discovered datapoints: ' + err.message);
            return false;
        }
    }
}

module.exports = AutoDiscovery;
