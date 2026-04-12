# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-12

### Added
- Initial release
- LLM backend support: Ollama (local) and OpenAI (cloud)
- Household analysis with savings tips every 1–24 hours
- Anomaly detection every 15 minutes (statistical + LLM)
- Automation suggestions based on usage patterns
- Notifications via Telegram, Pushover, E-Mail
- Free-text questions via `sendTo` API
- Admin UI with datapoint table (category, unit, label)
- GitHub Actions CI/CD pipeline
