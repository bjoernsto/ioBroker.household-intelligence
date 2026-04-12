# ioBroker.household-intelligence

> **KI-gestützter Smart-Home-Adapter** für ioBroker – mit lokalem LLM (Ollama) oder OpenAI

---

## Was macht dieser Adapter?

- 🔍 **Verbrauchsanalyse** – Analysiert Strom, Heizung, Wasser und gibt Spar-Tipps
- 🚨 **Anomalie-Erkennung** – Erkennt ungewöhnliches Verhalten (defektes Gerät, Einbruch, vergessenes Licht)
- 💡 **Automationsvorschläge** – Schlägt sinnvolle Automationen vor, die der Nutzer per Klick bestätigen kann
- 💬 **Freie Fragen** – Über `sendTo` können Fragen an das LLM gestellt werden

---

## Voraussetzungen

- ioBroker (Node.js >= 18)
- **Für Ollama (empfohlen auf Proxmox):** Ollama läuft im selben Netzwerk
- **Für OpenAI:** API-Key von platform.openai.com

---

## Ollama auf Proxmox einrichten

```bash
# In einem LXC oder der VM:
curl -fsSL https://ollama.com/install.sh | sh

# Modell laden (einmalig, ~4GB):
ollama pull llama3

# Oder kleineres Modell für schwächere Hardware:
ollama pull mistral      # 4GB RAM ausreichend
ollama pull phi4-mini    # 2GB RAM ausreichend

# Ollama für Netzwerkzugriff freigeben:
# /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"

systemctl daemon-reload && systemctl restart ollama
```

---

## Installation

### Methode 1: Via GitHub (empfohlen für Entwickler)

```bash
cd /opt/iobroker
npm install https://github.com/YOUR_USER/ioBroker.household-intelligence/tarball/main
iobroker upload household-intelligence
iobroker restart admin
```

### Methode 2: Manuell

```bash
cp -r /path/to/iobroker-household-intelligence /opt/iobroker/node_modules/iobroker.household-intelligence
cd /opt/iobroker
iobroker upload household-intelligence
```

---

## Konfiguration

### 1. LLM Backend wählen

| Backend | Wann? | Kosten |
|---|---|---|
| Ollama (lokal) | Proxmox/Server mit ≥8GB RAM | Kostenlos |
| OpenAI | Wenig RAM, beste Qualität | ~0,01-0,10€/Analyse |

### 2. Datenpunkte hinzufügen

In der Admin-Oberfläche unter **"Datenpunkte"** die zu überwachenden States eintragen:

| Datenpunkt | Bezeichnung | Kategorie | Einheit |
|---|---|---|---|
| `shelly.0.SHELLY_1.Power` | Wohnzimmer Strom | Strom | W |
| `hm-rpc.0.THERMOSTAT.TEMPERATURE` | Wohnzimmer Temperatur | Temperatur | °C |
| `tr-064.0.presence.HANDY_MAX` | Max anwesend | Anwesenheit | |
| `sma.0.total.GridConsumedEnergy` | Netzbezug heute | Strom | kWh |

### 3. Benachrichtigungen

Telegram, Pushover oder E-Mail können aktiviert werden (benötigen den jeweiligen ioBroker-Adapter).

---

## Datenpunkte des Adapters

| Datenpunkt | Beschreibung |
|---|---|
| `analysis.lastReport` | Letzter Analysebericht (JSON) |
| `analysis.lastRunTime` | Zeitstempel der letzten Analyse |
| `analysis.savingsTipCount` | Anzahl Spar-Tipps |
| `anomaly.activeAlerts` | Aktive Anomalie-Warnungen (JSON) |
| `automation.suggestions` | Automationsvorschläge (JSON) |
| `control.triggerAnalysis` | Auf `true` setzen → manuelle Analyse |
| `control.clearAlerts` | Auf `true` setzen → Warnungen löschen |
| `info.connection` | LLM-Verbindungsstatus |

---

## Freie Fragen per sendTo (Blockly/JavaScript)

```javascript
// Im JavaScript-Adapter:
sendTo('household-intelligence.0', 'askLLM',
  'Wie viel Strom hat die Heizung heute verbraucht?',
  (result) => {
    console.log(result.result);
  }
);
```

---

## Empfohlene Modelle nach Hardware

| RAM | Empfohlenes Modell | Qualität |
|---|---|---|
| 4 GB | `phi4-mini` | Gut |
| 8 GB | `mistral` | Sehr gut |
| 16 GB | `llama3` | Ausgezeichnet |
| 32 GB | `llama3:70b` | Exzellent |

---

## Lizenz

MIT © ioBroker Community
