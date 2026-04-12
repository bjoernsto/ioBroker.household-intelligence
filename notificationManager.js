'use strict';

const SYSTEM_PROMPT_ANALYSIS = `Du bist ein intelligenter Smart-Home-Assistent für ein deutsches Haushaltssystem (ioBroker).
Du analysierst Sensordaten, Verbrauchswerte und Gerätezustände und gibst praktische Empfehlungen.
Antworte IMMER als gültiges JSON-Objekt ohne Markdown-Backticks.
Sei konkret, hilfreich und auf Deutsch.`;

const SYSTEM_PROMPT_ANOMALY = `Du bist ein Anomalie-Erkennungssystem für ein Smart Home (ioBroker).
Analysiere die aktuellen Sensorwerte und erkenne ungewöhnliche Abweichungen.
Antworte IMMER als gültiges JSON-Array ohne Markdown-Backticks.
Melde nur echte Anomalien, keine Normalzustände.`;

const SYSTEM_PROMPT_CHAT = `Du bist ein freundlicher Smart-Home-Assistent für ein ioBroker-System.
Du hast Zugriff auf aktuelle Gerätedaten und beantwortest Fragen des Nutzers auf Deutsch.
Antworte klar, präzise und hilfreich.`;

class Analyzer {
    constructor(llmClient, log) {
        this.llm = llmClient;
        this.log = log;
        this.anomalyBaseline = {}; // { stateId: { avg, stddev } }
    }

    async analyzeHousehold(snapshot) {
        const prompt = this._buildAnalysisPrompt(snapshot);

        let raw;
        try {
            raw = await this.llm.complete(SYSTEM_PROMPT_ANALYSIS, prompt);
            const result = this._parseJSON(raw);
            this._updateBaseline(snapshot);
            return result;
        } catch (err) {
            this.log.error('Analysis LLM call failed: ' + err.message);
            return {
                summary: 'Analyse fehlgeschlagen: ' + err.message,
                savingsTips: [],
                automationSuggestions: [],
                insights: [],
            };
        }
    }

    async detectAnomalies(snapshot) {
        // First check statistical anomalies without LLM (fast)
        const statAnomalies = this._detectStatisticalAnomalies(snapshot);

        // Only call LLM if we have suspicious values or periodically
        if (statAnomalies.length === 0 && Math.random() > 0.1) {
            return []; // Skip LLM call 90% of the time when nothing suspicious
        }

        const prompt = this._buildAnomalyPrompt(snapshot, statAnomalies);

        try {
            const raw = await this.llm.complete(SYSTEM_PROMPT_ANOMALY, prompt);
            return this._parseJSONArray(raw);
        } catch (err) {
            this.log.error('Anomaly LLM call failed: ' + err.message);
            return statAnomalies; // Fallback to statistical results
        }
    }

    async askFreeQuestion(snapshot, question) {
        const context = this._buildContextSummary(snapshot);
        const prompt = `Aktuelle Haushaltsdaten:\n${context}\n\nFrage des Nutzers: ${question}`;

        return this.llm.complete(SYSTEM_PROMPT_CHAT, prompt);
    }

    _buildAnalysisPrompt(snapshot) {
        const values = Object.entries(snapshot.currentValues)
            .map(([id, v]) => `${v.label} (${v.category}): ${v.value} ${v.unit}`)
            .join('\n');

        return `Analysiere folgende Smart-Home-Daten und gib Empfehlungen.

AKTUELLE WERTE (${snapshot.context.dayOfWeek}, ${snapshot.context.time}, ${snapshot.context.season}):
${values}

Antworte als JSON-Objekt mit genau diesem Format:
{
  "summary": "Kurze Zusammenfassung in 2-3 Sätzen",
  "savingsTips": ["Tipp 1", "Tipp 2"],
  "automationSuggestions": [
    {
      "title": "Name der Automation",
      "description": "Was sie tun würde",
      "trigger": "Auslöser",
      "action": "Aktion",
      "estimatedSavingEuro": 0.0
    }
  ],
  "insights": ["Beobachtung 1", "Beobachtung 2"]
}`;
    }

    _buildAnomalyPrompt(snapshot, statAnomalies) {
        const values = Object.entries(snapshot.currentValues)
            .map(([id, v]) => `${v.label}: ${v.value} ${v.unit}`)
            .join('\n');

        const statInfo = statAnomalies.length > 0
            ? `\nStatistisch auffällig:\n${statAnomalies.map(a => `- ${a.device}: ${a.description}`).join('\n')}`
            : '';

        return `Prüfe diese Smart-Home-Werte auf Anomalien:

${values}
${statInfo}

Zeit: ${snapshot.context.dayOfWeek} ${snapshot.context.time}

Antworte als JSON-Array. Nur echte Anomalien melden:
[
  {
    "device": "Gerätename",
    "description": "Was ist ungewöhnlich",
    "severity": "low|medium|high",
    "recommendation": "Was zu tun ist"
  }
]
Wenn keine Anomalien: []`;
    }

    _buildContextSummary(snapshot) {
        return Object.entries(snapshot.currentValues)
            .map(([id, v]) => `${v.label}: ${v.value} ${v.unit}`)
            .join('\n');
    }

    _detectStatisticalAnomalies(snapshot) {
        const anomalies = [];

        for (const [id, data] of Object.entries(snapshot.currentValues)) {
            const val = parseFloat(data.value);
            if (isNaN(val)) continue;

            const baseline = this.anomalyBaseline[id];
            if (!baseline) continue;

            const deviation = Math.abs(val - baseline.avg);
            if (baseline.stddev > 0 && deviation > baseline.stddev * 3) {
                anomalies.push({
                    device: data.label,
                    description: `Wert ${val}${data.unit} weicht stark vom Durchschnitt (${baseline.avg.toFixed(1)}${data.unit}) ab`,
                    severity: deviation > baseline.stddev * 5 ? 'high' : 'medium',
                    recommendation: 'Gerät prüfen',
                });
            }
        }

        return anomalies;
    }

    _updateBaseline(snapshot) {
        for (const [id, data] of Object.entries(snapshot.currentValues)) {
            const history = snapshot.history[id];
            if (!history || history.length < 5) continue;

            const vals = history.map(h => parseFloat(h.val)).filter(v => !isNaN(v));
            if (vals.length < 5) continue;

            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            const variance = vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length;
            const stddev = Math.sqrt(variance);

            this.anomalyBaseline[id] = { avg, stddev };
        }
    }

    _parseJSON(raw) {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch {
            // Try to extract JSON object
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error('Could not parse LLM JSON response');
        }
    }

    _parseJSONArray(raw) {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch {
            const match = cleaned.match(/\[[\s\S]*\]/);
            if (match) return JSON.parse(match[0]);
            return [];
        }
    }
}

module.exports = Analyzer;
