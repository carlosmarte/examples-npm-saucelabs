import 'dotenv/config';
import { URL } from 'url';

// Handle Jenkins environment proxy settings
if (/jenkins/.test(process.env.PLATFORM)) {
  process.env.GLOBAL_AGENT_HTTP_PROXY = "";
  process.env.GLOBAL_AGENT_HTTPS_PROXY = "";
  process.env.GLOBAL_AGENT_NO_PROXY = "";
}

import "global-agent/bootstrap.js";
import SauceLabs from "saucelabs";
import AbortController from "abort-controller";
import fetch from "node-fetch";
import path from "path";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import axeCore from "axe-core";
import jsonfile from "jsonfile";
import { mkdirp } from "mkdirp";

// Configuration with environment variable support (matching spec requirements)
const config = {
  saucelabs: {
    enabled: process.env.RUN_ON_SAUCELABS !== 'false',
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    region: process.env.SAUCE_REGION || 'us-west-1',
    dataCenter: process.env.SAUCE_DATA_CENTER || 'us-west',
    hubUrl: process.env.SAUCE_LABS_HUB || null
  },
  test: {
    url: process.env.TEST_URL || 'https://webdriver.io/',
    name: process.env.TEST_NAME || `Accessibility Test - ${new Date().toISOString()}`
  },
  browser: {
    name: process.env.BROWSER_NAME || 'chrome',
    version: process.env.BROWSER_VERSION || 'latest',
    platform: process.env.PLATFORM_NAME || 'macOS 12'
  },
  axe: {
    runOnly: process.env.AXE_RULES ? process.env.AXE_RULES.split(',') : ['wcag2a', 'wcag2aa'],
    resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable']
  },
  output: {
    dir: process.env.OUTPUT_DIR || '.tmp',
    filename: process.env.OUTPUT_FILENAME || 'axe-report.json',
    console: process.env.OUTPUT_CONSOLE !== 'false'
  },
  system: {
    logLevel: process.env.LOG_LEVEL || 'error',
    debug: process.env.DEBUG === 'true'
  }
};

// Parse custom Saucelabs hub URL if provided
function parseSaucelabsHub(hubUrl) {
  if (!hubUrl) return null;

  try {
    const url = new URL(hubUrl);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      username: url.username || config.saucelabs.username,
      password: url.password || config.saucelabs.accessKey
    };
  } catch (error) {
    console.error('Invalid SAUCE_LABS_HUB URL:', error.message);
    return null;
  }
}

// Validate Saucelabs connection (FR-1.2.2)
async function validateSaucelabsConnection() {
  const hubConfig = parseSaucelabsHub(config.saucelabs.hubUrl);

  const saucelabs = new SauceLabs.default({
    user: hubConfig?.username || config.saucelabs.username,
    key: hubConfig?.password || config.saucelabs.accessKey,
    region: config.saucelabs.region,
    headless: true,
    logfile: path.join(process.cwd(), "saucelabs.log"),
  });

  const controller = new AbortController();

  try {
    // Test connection to Saucelabs hub status endpoint
    const statusUrl = hubConfig
      ? `${hubConfig.protocol}//${hubConfig.hostname}:${hubConfig.port}/status`
      : saucelabs.webdriverEndpoint;

    const response = await fetch(statusUrl, {
      signal: controller.signal,
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${config.saucelabs.username}:${config.saucelabs.accessKey}`).toString('base64')
      }
    });

    console.log(`✓ Saucelabs connection: ${response.ok ? 'SUCCESS' : 'FAILED'}`);

    if (!response.ok) {
      throw new Error("Failed to connect to Saucelabs. Please check your credentials.");
    }

    return true;
  } finally {
    controller.abort();
  }
}

// Get Playwright browser instance based on configuration
function getBrowserType(browserName) {
  const browsers = {
    'chrome': chromium,
    'chromium': chromium,
    'firefox': firefox,
    'webkit': webkit,
    'safari': webkit
  };

  return browsers[browserName.toLowerCase()] || chromium;
}

// Upload test results to Saucelabs
async function uploadToSaucelabs(sessionData, passed, report) {
  if (!config.saucelabs.enabled) return null;

  try {
    const saucelabs = new SauceLabs.default({
      user: config.saucelabs.username,
      key: config.saucelabs.accessKey,
      region: config.saucelabs.region
    });

    // Create a test session in Saucelabs
    const session = await saucelabs.createResultJob({
      name: config.test.name,
      user: config.saucelabs.username,
      framework: 'playwright-axe',
      passed: passed,
      public: 'public',
      build: process.env.BUILD_NUMBER || `build-${Date.now()}`,
      tags: ['accessibility', 'axe-core', 'playwright'],
      customData: {
        axeVersion: axeCore.version,
        violations: report.summary.violations,
        passes: report.summary.passes,
        url: config.test.url
      }
    });

    return session.id;
  } catch (error) {
    console.warn('⚠️  Failed to upload results to Saucelabs:', error.message);
    return null;
  }
}

// Main accessibility testing function (FR-1.1.1)
async function runAccessibilityTest() {
  // Display configuration (FR-1.3.1)
  console.log('\n🚀 Starting Accessibility Testing with Playwright + axe-core\n');
  console.log('Configuration:');
  console.log(`  - URL: ${config.test.url}`);
  console.log(`  - Browser: ${config.browser.name} ${config.browser.version}`);
  console.log(`  - Platform: ${config.browser.platform}`);
  console.log(`  - Accessibility Rules: ${config.axe.runOnly.join(', ')}`);
  console.log(`  - Saucelabs: ${config.saucelabs.enabled ? 'ENABLED' : 'DISABLED'}`);
  if (config.saucelabs.hubUrl) {
    console.log(`  - Custom Hub: ${config.saucelabs.hubUrl}`);
  }
  console.log('');

  // Validate Saucelabs connection if enabled (FR-1.2.2)
  if (config.saucelabs.enabled) {
    if (!config.saucelabs.username || !config.saucelabs.accessKey) {
      throw new Error('SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are required when running on Saucelabs');
    }
    await validateSaucelabsConnection();
  }

  let browser;
  let context;
  let page;
  const startTime = Date.now();
  let sessionId = null;

  try {
    // Configure browser launch options (FR-1.1.2)
    const browserType = getBrowserType(config.browser.name);
    const launchOptions = {
      headless: process.env.HEADLESS !== 'false',
    };

    // Add Saucelabs-specific configuration (FR-1.4.2)
    if (config.saucelabs.enabled) {
      // For Saucelabs, we need to connect via their tunnel
      // This is a simplified approach - in production, you'd use Sauce Connect
      console.log('⚠️  Note: Direct Saucelabs integration requires Sauce Connect Proxy');
      console.log('    Running tests locally and uploading results to Saucelabs dashboard\n');
    }

    // Launch browser (FR-1.4.1)
    console.log('🔌 Launching browser...');
    browser = await browserType.launch(launchOptions);

    // Create context with viewport settings
    context = await browser.newContext({
      viewport: { width: 2048, height: 1536 }, // Matching spec requirement
      recordVideo: config.saucelabs.enabled ? { dir: '.tmp/videos' } : undefined,
      ignoreHTTPSErrors: true
    });

    // Create page
    page = await context.newPage();

    // Set up console logging if debug mode
    if (config.system.debug) {
      page.on('console', msg => console.log('Browser console:', msg.text()));
      page.on('pageerror', error => console.error('Page error:', error));
    }

    // Navigate to test URL
    console.log(`📄 Navigating to ${config.test.url}...`);
    await page.goto(config.test.url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const pageTitle = await page.title();
    console.log(`✓ Page loaded: "${pageTitle}"`);

    // Run accessibility tests with axe-core (FR-1.1.3)
    console.log(`🔍 Running accessibility tests (${config.axe.runOnly.join(', ')})...`);

    const accessibilityBuilder = await new AxeBuilder({ page });

    // Configure axe-core rules
    const results = await accessibilityBuilder
      .withTags(config.axe.runOnly)
      .analyze();

    const testDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Tests completed in ${testDuration}s\n`);

    // Create unique session ID for tracking
    sessionId = `playwright-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Process and create report (FR-1.3.2)
    const report = {
      url: config.test.url,
      pageTitle: pageTitle,
      timestamp: new Date().toISOString(),
      testDuration: `${testDuration}s`,
      sessionId: sessionId,
      browserInfo: {
        name: config.browser.name,
        version: config.browser.version,
        platform: config.browser.platform
      },
      axeVersion: axeCore.version,
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      },
      results: results
    };

    // Display summary statistics (FR-1.3.1)
    console.log('📊 Accessibility Test Summary:');
    console.log(`  ❌ Violations: ${report.summary.violations}`);
    console.log(`  ✅ Passes: ${report.summary.passes}`);
    console.log(`  ⚠️  Incomplete: ${report.summary.incomplete}`);
    console.log(`  ➖ Inapplicable: ${report.summary.inapplicable}\n`);

    // Display violation details if any (FR-1.3.3)
    if (results.violations.length > 0 && config.output.console) {
      console.log('⚠️  Accessibility Violations Found:\n');
      results.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.description}`);
        console.log(`   Impact: ${violation.impact.toUpperCase()}`);
        console.log(`   Help: ${violation.help}`);
        console.log(`   More info: ${violation.helpUrl}`);
        console.log(`   Affected elements: ${violation.nodes.length}`);

        // Show up to 3 affected elements
        violation.nodes.slice(0, 3).forEach(node => {
          console.log(`     - ${node.target.join(' > ')}`);
        });

        if (violation.nodes.length > 3) {
          console.log(`     ... and ${violation.nodes.length - 3} more`);
        }
        console.log('');
      });
    }

    // Save report to file (FR-1.3.2)
    await mkdirp(path.join(process.cwd(), config.output.dir));
    const outputPath = path.join(process.cwd(), config.output.dir, config.output.filename);
    await jsonfile.writeFile(outputPath, report, { spaces: 2 });
    console.log(`📁 Report saved to: ${outputPath}`);

    // Take screenshot if violations found
    if (results.violations.length > 0) {
      const screenshotPath = path.join(process.cwd(), config.output.dir, 'violations-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    }

    // Upload results to Saucelabs if enabled
    const passed = results.violations.length === 0;
    if (config.saucelabs.enabled) {
      const sauceSessionId = await uploadToSaucelabs(sessionId, passed, report);
      if (sauceSessionId) {
        console.log(`\n🔗 Saucelabs Dashboard: https://app.saucelabs.com/tests/${sauceSessionId}`);
      }
    }

    // Return test status (NFR-2.2.2)
    if (passed) {
      console.log('\n✨ All accessibility tests passed!');
    } else {
      console.log(`\n⚠️  Found ${results.violations.length} accessibility violation(s)`);
    }

    return { passed, report };

  } catch (error) {
    // Error handling (NFR-2.2.1)
    console.error('\n❌ Error during testing:', error.message);
    if (config.system.debug) {
      console.error('Stack trace:', error.stack);
    }
    throw error;

  } finally {
    // Cleanup (FR-1.4.1)
    if (page) {
      await page.close();
    }
    if (context) {
      await context.close();
    }
    if (browser) {
      console.log('\n🔌 Closing browser...');
      await browser.close();
    }
  }
}

// Main execution entry point
(async () => {
  try {
    const { passed } = await runAccessibilityTest();
    // Set exit code based on results (Section 6: Exit Codes)
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (process.env.DEBUG === 'true') {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();