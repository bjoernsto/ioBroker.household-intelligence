{
  "name": "iobroker.household-intelligence",
  "version": "0.1.0",
  "description": "AI-powered smart home analysis adapter for ioBroker with local LLM (Ollama) and OpenAI support",
  "author": {
    "name": "ioBroker Community",
    "email": "info@iobroker.net"
  },
  "homepage": "https://github.com/YOUR_USER/ioBroker.household-intelligence",
  "license": "MIT",
  "keywords": [
    "ioBroker",
    "smarthome",
    "AI",
    "LLM",
    "Ollama",
    "energy",
    "automation"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USER/ioBroker.household-intelligence"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@iobroker/adapter-core": "^3.0.0"
  },
  "devDependencies": {
    "@iobroker/testing": "^4.0.0",
    "mocha": "^10.0.0"
  },
  "main": "main.js",
  "files": [
    "admin/",
    "lib/",
    "main.js",
    "io-package.json"
  ],
  "scripts": {
    "test": "mocha test/*.test.js --timeout 10000",
    "lint": "eslint main.js lib/"
  }
}
