{
  "type": "tabs",
  "items": {
    "tab_llm": {
      "type": "tab",
      "label": "🤖 LLM Backend",
      "items": {
        "llmBackend": {
          "type": "select",
          "label": "LLM Backend",
          "options": [
            { "label": "Ollama (lokal, empfohlen)", "value": "ollama" },
            { "label": "OpenAI (Cloud)", "value": "openai" }
          ],
          "default": "ollama",
          "sm": 12
        },
        "_ollamaHeader": {
          "type": "header",
          "text": "Ollama Einstellungen",
          "hidden": "data.llmBackend !== 'ollama'"
        },
        "ollamaHost": {
          "type": "text",
          "label": "Ollama Host URL",
          "default": "http://localhost:11434",
          "hidden": "data.llmBackend !== 'ollama'",
          "sm": 12
        },
        "ollamaModel": {
          "type": "text",
          "label": "Ollama Modell (z.B. llama3, mistral, phi4)",
          "default": "llama3",
          "hidden": "data.llmBackend !== 'ollama'",
          "sm": 12
        },
        "_openaiHeader": {
          "type": "header",
          "text": "OpenAI Einstellungen",
          "hidden": "data.llmBackend !== 'openai'"
        },
        "openaiApiKey": {
          "type": "password",
          "label": "OpenAI API Key",
          "hidden": "data.llmBackend !== 'openai'",
          "sm": 12
        },
        "openaiModel": {
          "type": "select",
          "label": "OpenAI Modell",
          "options": [
            { "label": "GPT-4o mini (günstig)", "value": "gpt-4o-mini" },
            { "label": "GPT-4o (besser)", "value": "gpt-4o" }
          ],
          "default": "gpt-4o-mini",
          "hidden": "data.llmBackend !== 'openai'",
          "sm": 12
        },
        "_advHeader": {
          "type": "header",
          "text": "Erweitert"
        },
        "maxTokens": {
          "type": "number",
          "label": "Max. Tokens pro Anfrage",
          "default": 1500,
          "min": 500,
          "max": 4000,
          "sm": 6
        },
        "timeoutSeconds": {
          "type": "number",
          "label": "Timeout (Sekunden)",
          "default": 60,
          "min": 10,
          "max": 300,
          "sm": 6
        }
      }
    },
    "tab_schedule": {
      "type": "tab",
      "label": "⏱ Zeitplan",
      "items": {
        "analysisIntervalHours": {
          "type": "select",
          "label": "Analyse-Intervall",
          "options": [
            { "label": "Jede Stunde", "value": 1 },
            { "label": "Alle 3 Stunden", "value": 3 },
            { "label": "Alle 6 Stunden (empfohlen)", "value": 6 },
            { "label": "Einmal täglich", "value": 24 }
          ],
          "default": 6,
          "sm": 12
        }
      }
    },
    "tab_datapoints": {
      "type": "tab",
      "label": "📡 Datenpunkte",
      "items": {
        "_dpInfo": {
          "type": "staticText",
          "text": "Füge hier die ioBroker-Datenpunkte hinzu, die der Adapter überwachen soll (z.B. Stromzähler, Temperaturen, Geräte).",
          "sm": 12
        },
        "datapoints": {
          "type": "table",
          "label": "Überwachte Datenpunkte",
          "sm": 12,
          "objKeyName": "id",
          "columns": [
            {
              "attr": "id",
              "label": "Datenpunkt ID",
              "type": "id",
              "width": "35%"
            },
            {
              "attr": "label",
              "label": "Bezeichnung (für KI)",
              "type": "text",
              "width": "25%"
            },
            {
              "attr": "category",
              "label": "Kategorie",
              "type": "select",
              "options": [
                { "label": "Strom", "value": "power" },
                { "label": "Temperatur", "value": "temperature" },
                { "label": "Heizung", "value": "heating" },
                { "label": "Wasser", "value": "water" },
                { "label": "Beleuchtung", "value": "light" },
                { "label": "Anwesenheit", "value": "presence" },
                { "label": "Sicherheit", "value": "security" },
                { "label": "PV / Solar", "value": "solar" },
                { "label": "Sonstiges", "value": "other" }
              ],
              "width": "25%"
            },
            {
              "attr": "unit",
              "label": "Einheit",
              "type": "text",
              "width": "15%"
            }
          ]
        }
      }
    },
    "tab_notifications": {
      "type": "tab",
      "label": "🔔 Benachrichtigungen",
      "items": {
        "notifyTelegram": {
          "type": "checkbox",
          "label": "Telegram (benötigt Telegram Adapter)",
          "sm": 12
        },
        "telegramUser": {
          "type": "text",
          "label": "Telegram Benutzername (leer = alle)",
          "hidden": "!data.notifyTelegram",
          "sm": 12
        },
        "notifyPushover": {
          "type": "checkbox",
          "label": "Pushover (benötigt Pushover Adapter)",
          "sm": 12
        },
        "notifyEmail": {
          "type": "checkbox",
          "label": "E-Mail (benötigt Email Adapter)",
          "sm": 12
        },
        "emailTo": {
          "type": "text",
          "label": "E-Mail Empfänger",
          "hidden": "!data.notifyEmail",
          "sm": 12
        }
      }
    }
  }
}
