name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint --if-present

      - name: Run tests
        run: npm test --if-present

  adapter-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
      - run: npm ci
      - name: Check io-package.json
        run: |
          node -e "
            const p = require('./io-package.json');
            const pkg = require('./package.json');
            if (p.common.version !== pkg.version) {
              console.error('Version mismatch: io-package.json vs package.json');
              process.exit(1);
            }
            console.log('Version check OK:', p.common.version);
          "
