# Saucelabs axe-core WebdriverIO

Automated accessibility testing using WebdriverIO and axe-core on Saucelabs cloud infrastructure.

## Features

- 🔍 Comprehensive accessibility testing with axe-core
- ☁️ Cloud-based testing on Saucelabs
- 🌐 Multiple browser and platform support
- 📊 Detailed accessibility reports in JSON format
- 🎯 Configurable WCAG compliance levels
- 📝 Console output with violation details
- 🔗 Direct links to Saucelabs test sessions

## Prerequisites

- Node.js >= 14.0.0
- Saucelabs account with valid credentials
- npm or yarn package manager

## Installation

```bash
# Clone or navigate to the package directory
cd saucelabs-axe-core-webdriverio

# Install dependencies
npm install
```

## Configuration

### 1. Environment Variables

Create a `.env` file in the package root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Saucelabs Credentials (Required)
SAUCE_USERNAME=your_username
SAUCE_ACCESS_KEY=your_access_key

# Test Configuration
TEST_URL=https://example.com
BROWSER_NAME=chrome
BROWSER_VERSION=latest
PLATFORM_NAME=macOS 12

# Optional Configuration
SAUCE_REGION=us-east-1
SAUCE_DATA_CENTER=us
AXE_RULES=wcag2a,wcag2aa
OUTPUT_DIR=.tmp
OUTPUT_FILENAME=axe-report.json
OUTPUT_CONSOLE=true
LOG_LEVEL=error
DEBUG=false
RUN_ON_SAUCELABS=true
```

### 2. Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SAUCE_USERNAME` | Your Saucelabs username | Required |
| `SAUCE_ACCESS_KEY` | Your Saucelabs access key | Required |
| `TEST_URL` | URL to test for accessibility | `https://webdriver.io/` |
| `BROWSER_NAME` | Browser to use for testing | `chrome` |
| `BROWSER_VERSION` | Browser version | `latest` |
| `PLATFORM_NAME` | Operating system platform | `macOS 12` |
| `SAUCE_REGION` | Saucelabs region | `us-east-1` |
| `SAUCE_DATA_CENTER` | Saucelabs data center | `us` |
| `AXE_RULES` | Comma-separated list of axe rules | `wcag2a,wcag2aa` |
| `OUTPUT_DIR` | Directory for output reports | `.tmp` |
| `OUTPUT_FILENAME` | Name of the report file | `axe-report.json` |
| `OUTPUT_CONSOLE` | Show violations in console | `true` |
| `LOG_LEVEL` | WebDriver log level | `error` |
| `DEBUG` | Enable debug output | `false` |
| `RUN_ON_SAUCELABS` | Run tests on Saucelabs | `true` |

## Usage

### Basic Usage

Run accessibility tests with default configuration:

```bash
npm start
```

### Custom Test URL

Test a specific website:

```bash
TEST_URL=https://mywebsite.com npm start
```

### Different Browser Configuration

Test on Firefox:

```bash
BROWSER_NAME=firefox BROWSER_VERSION=latest npm start
```

### Local Testing

Run tests locally without Saucelabs:

```bash
RUN_ON_SAUCELABS=false npm start
```

### Test Specific WCAG Levels

Test only WCAG 2.1 Level A:

```bash
AXE_RULES=wcag21a npm start
```

## Output

### Console Output

The script provides detailed console output including:
- Connection status
- Test progress
- Accessibility violations with details
- Summary statistics
- Saucelabs session URL

### JSON Report

A comprehensive JSON report is saved containing:
- Test metadata (URL, timestamp, duration)
- Browser and platform information
- Complete axe-core results
- Violation details with affected elements
- Pass/fail statistics

Example report structure:

```json
{
  "url": "https://example.com",
  "pageTitle": "Example Page",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "testDuration": "5.23s",
  "sessionId": "abc123...",
  "browserInfo": {
    "name": "chrome",
    "version": "latest",
    "platform": "macOS 12"
  },
  "summary": {
    "violations": 0,
    "passes": 45,
    "incomplete": 2,
    "inapplicable": 10
  },
  "results": { ... }
}
```

## Supported Accessibility Standards

- **WCAG 2.0 Level A** (`wcag2a`)
- **WCAG 2.0 Level AA** (`wcag2aa`)
- **WCAG 2.0 Level AAA** (`wcag2aaa`)
- **WCAG 2.1 Level A** (`wcag21a`)
- **WCAG 2.1 Level AA** (`wcag21aa`)
- **Section 508** (`section508`)
- **Best Practices** (`best-practice`)

Multiple standards can be tested simultaneously:

```bash
AXE_RULES=wcag2a,wcag2aa,best-practice npm start
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Accessibility Tests
on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: |
          cd saucelabs-axe-core-webdriverio
          npm install

      - name: Run accessibility tests
        env:
          SAUCE_USERNAME: ${{ secrets.SAUCE_USERNAME }}
          SAUCE_ACCESS_KEY: ${{ secrets.SAUCE_ACCESS_KEY }}
          TEST_URL: https://your-site.com
        run: |
          cd saucelabs-axe-core-webdriverio
          npm start

      - name: Upload report
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: accessibility-report
          path: saucelabs-axe-core-webdriverio/.tmp/axe-report.json
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any

    environment {
        SAUCE_USERNAME = credentials('sauce-username')
        SAUCE_ACCESS_KEY = credentials('sauce-access-key')
        PLATFORM = 'jenkins'
    }

    stages {
        stage('Test') {
            steps {
                sh '''
                    cd saucelabs-axe-core-webdriverio
                    npm install
                    npm start
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '.tmp/*.json'
        }
    }
}
```

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Verify your Saucelabs credentials are correct
2. Check your internet connection and proxy settings
3. Ensure your Saucelabs account has available concurrency
4. Try a different data center (US/EU)

### Test Failures

If tests fail unexpectedly:

1. Check the Saucelabs session recording at the provided URL
2. Enable debug mode: `DEBUG=true npm start`
3. Review the generated log files
4. Verify the test URL is accessible
5. Try running locally first: `RUN_ON_SAUCELABS=false npm start`

### Common Error Messages

- **"SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are required"**
  - Solution: Set up your `.env` file with valid credentials

- **"Failed to connect to Saucelabs"**
  - Solution: Verify credentials and network connectivity

- **"axe-core is not available on this page"**
  - Solution: The page may have CSP restrictions or JavaScript errors

## API Usage

You can also use this package programmatically:

```javascript
import { runAccessibilityTest } from './index.mjs';

const results = await runAccessibilityTest({
  test: {
    url: 'https://example.com'
  },
  browser: {
    name: 'chrome',
    version: 'latest'
  }
});

console.log(results.report);
```

## License

ISC

## Support

For issues or questions:
- Check the [Saucelabs documentation](https://docs.saucelabs.com)
- Review [axe-core documentation](https://www.deque.com/axe/core-documentation/)
- Open an issue in this repository