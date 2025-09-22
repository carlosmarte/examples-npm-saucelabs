# Saucelabs axe-core Playwright

Automated accessibility testing using Playwright and axe-core with Saucelabs cloud integration. This package provides comprehensive WCAG compliance testing with detailed reporting.

## Features

- 🎭 Modern browser automation with Playwright
- 🔍 Comprehensive accessibility testing with axe-core
- ☁️ Saucelabs cloud integration for test results
- 📊 Detailed JSON and console reporting
- 📸 Automatic screenshot capture on violations
- 🎯 Configurable WCAG compliance levels (2.0, 2.1, Section 508)
- 🌐 Cross-browser support (Chrome, Firefox, Safari/WebKit)
- 📹 Optional video recording of test sessions

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn package manager
- Saucelabs account (optional, for cloud reporting)

## Installation

```bash
# Navigate to the package directory
cd saucelabs-axe-core-playwright

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## Configuration

### Environment Variables

Create a `.env` file in the package root:

```bash
cp .env.example .env
```

Configure your settings in `.env`:

```env
# Saucelabs Configuration (Optional)
SAUCE_USERNAME=your_username
SAUCE_ACCESS_KEY=your_access_key
SAUCE_REGION=us-west-1
SAUCE_DATA_CENTER=us-west
SAUCE_LABS_HUB=https://ondemand.us-west-1.saucelabs.com/wd/hub

# Test Configuration
TEST_URL=https://example.com
TEST_NAME=Accessibility Test

# Browser Configuration
BROWSER_NAME=chrome
BROWSER_VERSION=latest
PLATFORM_NAME=macOS 12

# Accessibility Rules
AXE_RULES=wcag2a,wcag2aa

# Output Configuration
OUTPUT_DIR=.tmp
OUTPUT_FILENAME=axe-report.json
OUTPUT_CONSOLE=true

# System Configuration
LOG_LEVEL=error
DEBUG=false
HEADLESS=true
RUN_ON_SAUCELABS=true
```

### Configuration Options Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| **Saucelabs Settings** |
| `SAUCE_USERNAME` | Saucelabs username | - | Yes (if using Saucelabs) |
| `SAUCE_ACCESS_KEY` | Saucelabs access key | - | Yes (if using Saucelabs) |
| `SAUCE_REGION` | Saucelabs region | `us-west-1` | No |
| `SAUCE_DATA_CENTER` | Data center location | `us-west` | No |
| `SAUCE_LABS_HUB` | Custom hub URL | - | No |
| `RUN_ON_SAUCELABS` | Enable Saucelabs integration | `true` | No |
| **Test Settings** |
| `TEST_URL` | URL to test | `https://webdriver.io/` | No |
| `TEST_NAME` | Test name for reporting | `Accessibility Test - {timestamp}` | No |
| **Browser Settings** |
| `BROWSER_NAME` | Browser type (chrome, firefox, webkit) | `chrome` | No |
| `BROWSER_VERSION` | Browser version | `latest` | No |
| `PLATFORM_NAME` | Operating system | `macOS 12` | No |
| `HEADLESS` | Run browser in headless mode | `true` | No |
| **Accessibility Settings** |
| `AXE_RULES` | Comma-separated rule sets | `wcag2a,wcag2aa` | No |
| **Output Settings** |
| `OUTPUT_DIR` | Output directory | `.tmp` | No |
| `OUTPUT_FILENAME` | Report filename | `axe-report.json` | No |
| `OUTPUT_CONSOLE` | Show violations in console | `true` | No |
| **System Settings** |
| `LOG_LEVEL` | Logging level | `error` | No |
| `DEBUG` | Enable debug mode | `false` | No |
| `PLATFORM` | Platform identifier (jenkins, etc.) | - | No |

## Usage

### Basic Usage

```bash
# Run with default configuration
npm start

# Run tests locally without Saucelabs
npm run test:local
```

### Custom Configurations

```bash
# Test specific URL
TEST_URL=https://mywebsite.com npm start

# Use Firefox browser
BROWSER_NAME=firefox npm start

# Test WCAG 2.1 Level AAA
AXE_RULES=wcag21aaa npm start

# Run with visible browser (not headless)
HEADLESS=false npm start

# Enable debug mode
DEBUG=true npm start
```

## Supported Accessibility Standards

The following rule sets can be configured via `AXE_RULES`:

- `wcag2a` - WCAG 2.0 Level A
- `wcag2aa` - WCAG 2.0 Level AA
- `wcag2aaa` - WCAG 2.0 Level AAA
- `wcag21a` - WCAG 2.1 Level A
- `wcag21aa` - WCAG 2.1 Level AA
- `wcag21aaa` - WCAG 2.1 Level AAA
- `section508` - Section 508
- `best-practice` - Best practices
- `wcag-aaa` - All WCAG AAA rules
- `experimental` - Experimental rules

Multiple standards can be tested:

```bash
AXE_RULES=wcag2a,wcag2aa,section508,best-practice npm start
```

## Output

### Console Output

The tool provides detailed console output including:

- ✓ Connection status
- 📄 Page loading progress
- 🔍 Test execution status
- 📊 Summary statistics
- ⚠️ Detailed violation information
- 📁 Report file locations
- 🔗 Saucelabs dashboard links

### JSON Report Structure

Reports are saved in JSON format with the following structure:

```json
{
  "url": "https://example.com",
  "pageTitle": "Page Title",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "testDuration": "5.23s",
  "sessionId": "playwright-1234567890-abc123",
  "browserInfo": {
    "name": "chrome",
    "version": "latest",
    "platform": "macOS 12"
  },
  "axeVersion": "4.8.0",
  "summary": {
    "violations": 2,
    "passes": 45,
    "incomplete": 1,
    "inapplicable": 8
  },
  "results": {
    "violations": [...],
    "passes": [...],
    "incomplete": [...],
    "inapplicable": [...]
  }
}
```

### Screenshots

When violations are found, a full-page screenshot is automatically saved to:
```
.tmp/violations-screenshot.png
```

### Video Recording

When running with Saucelabs enabled, test sessions are recorded and saved to:
```
.tmp/videos/
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Accessibility Testing

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  a11y-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd saucelabs-axe-core-playwright
          npm ci
          npx playwright install --with-deps

      - name: Run accessibility tests
        env:
          SAUCE_USERNAME: ${{ secrets.SAUCE_USERNAME }}
          SAUCE_ACCESS_KEY: ${{ secrets.SAUCE_ACCESS_KEY }}
          TEST_URL: ${{ vars.TEST_URL }}
        run: |
          cd saucelabs-axe-core-playwright
          npm start

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-reports
          path: |
            saucelabs-axe-core-playwright/.tmp/*.json
            saucelabs-axe-core-playwright/.tmp/*.png
            saucelabs-axe-core-playwright/.tmp/videos/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        SAUCE_USERNAME = credentials('sauce-username')
        SAUCE_ACCESS_KEY = credentials('sauce-access-key')
        PLATFORM = 'jenkins'
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    cd saucelabs-axe-core-playwright
                    npm ci
                    npx playwright install --with-deps
                '''
            }
        }

        stage('Accessibility Test') {
            steps {
                sh '''
                    cd saucelabs-axe-core-playwright
                    npm start
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '.tmp/**/*', allowEmptyArchive: true
            publishHTML([
                reportDir: '.tmp',
                reportFiles: 'axe-report.json',
                reportName: 'Accessibility Report'
            ])
        }
    }
}
```

### Docker Support

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV HEADLESS=true

CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

#### Browser Launch Failures

```bash
# Install missing dependencies
npx playwright install-deps

# Or use Docker image
docker run -it mcr.microsoft.com/playwright:v1.40.0-focal
```

#### Saucelabs Connection Issues

1. Verify credentials are correct
2. Check network connectivity
3. Ensure account has available concurrency
4. Try different data center region

#### Test Timeouts

```bash
# Increase timeout for slow sites
PAGE_LOAD_TIMEOUT=60000 npm start
```

#### Memory Issues

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Debug Mode

Enable debug mode for detailed output:

```bash
DEBUG=true npm start
```

This will show:
- Browser console logs
- Page errors
- Detailed stack traces
- Network activity

## Advanced Usage

### Programmatic API

```javascript
import { runAccessibilityTest } from './index.mjs';

// Custom configuration
const config = {
  test: {
    url: 'https://example.com'
  },
  browser: {
    name: 'firefox'
  },
  axe: {
    runOnly: ['wcag21aa']
  }
};

const { passed, report } = await runAccessibilityTest(config);

if (!passed) {
  console.log('Violations found:', report.summary.violations);
}
```

### Custom Rule Configuration

```javascript
// In your test file
const customRules = {
  runOnly: {
    type: 'tag',
    values: ['wcag2aa', 'section508']
  },
  rules: {
    'color-contrast': { enabled: false },
    'valid-lang': { enabled: true }
  }
};
```

### Multiple URL Testing

```bash
# Create a shell script
#!/bin/bash

URLS=("https://example.com" "https://example.org" "https://example.net")

for url in "${URLS[@]}"; do
  TEST_URL="$url" npm start
done
```

## Performance Considerations

- **Headless mode**: Runs faster, use `HEADLESS=true` (default)
- **Browser choice**: Chromium is generally fastest
- **Rule selection**: Test only required standards to reduce execution time
- **Parallel execution**: Run multiple instances with different URLs

## Security Notes

- Never commit `.env` files with real credentials
- Use environment variables in CI/CD systems
- Rotate Saucelabs access keys regularly
- Use read-only credentials when possible

## Exit Codes

- `0` - All tests passed, no accessibility violations
- `1` - One or more violations found or error occurred

## Support

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [axe-core Documentation](https://www.deque.com/axe/core-documentation/)
- [Saucelabs Documentation](https://docs.saucelabs.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## License

ISC