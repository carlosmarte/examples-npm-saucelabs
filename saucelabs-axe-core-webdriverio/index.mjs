import 'dotenv/config';

if (/jenkins/.test(process.env.PLATFORM)) {
  process.env.GLOBAL_AGENT_HTTP_PROXY = "";
  process.env.GLOBAL_AGENT_HTTPS_PROXY = "";
  process.env.GLOBAL_AGENT_NO_PROXY = "";
}

import "global-agent/bootstrap.js";
import AbortController from "abort-controller";
import fetch from "node-fetch";
import path from "path";
import { remote } from "webdriverio";
import axeCore from "axe-core";
import jsonfile from "jsonfile";
import mkdirp from "mkdirp";

// Configuration with environment variable support
const config = {
  saucelabs: {
    enabled: process.env.RUN_ON_SAUCELABS !== 'false',
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    region: process.env.SAUCE_REGION || 'us-west-1',
    dataCenter: process.env.SAUCE_DATA_CENTER || 'us-west'
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
  }
};

async function validateSaucelabsConnection() {
  const controller = new AbortController();

  try {
    let statusUrl;
    let authHeader;

    if (process.env.SAUCE_LABS_HUB) {
      // Parse the full hub URL with credentials
      const hubUrl = new URL(process.env.SAUCE_LABS_HUB);
      statusUrl = `${hubUrl.protocol}//${hubUrl.hostname}:${hubUrl.port || 443}/wd/hub/status`;
      authHeader = 'Basic ' + Buffer.from(`${hubUrl.username || config.saucelabs.username}:${hubUrl.password || config.saucelabs.accessKey}`).toString('base64');
    } else {
      statusUrl = `https://ondemand.${config.saucelabs.region}.saucelabs.com/wd/hub/status`;
      authHeader = 'Basic ' + Buffer.from(`${config.saucelabs.username}:${config.saucelabs.accessKey}`).toString('base64');
    }

    const response = await fetch(statusUrl, {
      signal: controller.signal,
      headers: {
        'Authorization': authHeader
      }
    });

    console.log(`✓ Saucelabs connection: ${response.ok ? 'SUCCESS' : 'FAILED'}`);

    if (!response.ok) {
      throw new Error(`Failed to connect to Saucelabs at ${statusUrl}. Please check your credentials.`);
    }

    return true;
  } finally {
    controller.abort();
  }
}

async function runAccessibilityTest() {
  console.log('\n🚀 Starting Accessibility Testing with axe-core on Saucelabs\n');
  console.log('Configuration:');
  console.log(`  - URL: ${config.test.url}`);
  console.log(`  - Browser: ${config.browser.name} ${config.browser.version}`);
  console.log(`  - Platform: ${config.browser.platform}`);
  console.log(`  - Accessibility Rules: ${config.axe.runOnly.join(', ')}`);
  console.log(`  - Saucelabs: ${config.saucelabs.enabled ? 'ENABLED' : 'DISABLED'}\n`);

  // Validate Saucelabs connection if enabled
  if (config.saucelabs.enabled) {
    if (!config.saucelabs.username || !config.saucelabs.accessKey) {
      throw new Error('SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are required when running on Saucelabs');
    }
    await validateSaucelabsConnection();
  }

  // Configure WebDriver
  const webdriverSettings = {
    logLevel: process.env.LOG_LEVEL || 'error',
    capabilities: {
      browserName: config.browser.name,
      browserVersion: config.browser.version,
      platformName: config.browser.platform,
    }
  };

  // Add Saucelabs-specific configuration
  if (config.saucelabs.enabled) {
    webdriverSettings.capabilities['sauce:options'] = {
      region: config.saucelabs.dataCenter,
      name: config.test.name,
      'custom-data': {
        tool: 'axe-core',
        version: axeCore.version
      },
      public: 'public',
      recordScreenshots: true,
      screenResolution: '2048x1536',
      extendedDebugging: true,
      capturePerformance: true,
    };

    // Use custom hub URL if provided
    if (process.env.SAUCE_LABS_HUB) {
      // Parse the full hub URL with credentials
      const hubUrl = new URL(process.env.SAUCE_LABS_HUB);
      Object.assign(webdriverSettings, {
        user: hubUrl.username || config.saucelabs.username,
        key: hubUrl.password || config.saucelabs.accessKey,
        hostname: hubUrl.hostname,
        port: parseInt(hubUrl.port) || 443,
        protocol: hubUrl.protocol.replace(':', ''),
        path: hubUrl.pathname
      });
    } else {
      // Use default configuration
      Object.assign(webdriverSettings, {
        user: config.saucelabs.username,
        key: config.saucelabs.accessKey,
        hostname: `ondemand.${config.saucelabs.region}.saucelabs.com`,
        port: 443,
        protocol: 'https',
        path: '/wd/hub'
      });
    }
  }

  let browser;

  try {
    // Connect to browser
    console.log('🔌 Connecting to browser...');
    browser = await remote(webdriverSettings);
    const sessionId = browser.sessionId;

    // Navigate to test URL
    console.log(`📄 Navigating to ${config.test.url}...`);
    await browser.url(config.test.url);
    const pageTitle = await browser.getTitle();
    console.log(`✓ Page loaded: "${pageTitle}"`);

    // Inject axe-core
    console.log('💉 Injecting axe-core...');
    await browser.execute(axeCore.source);

    // Run accessibility tests
    console.log(`🔍 Running accessibility tests (${config.axe.runOnly.join(', ')})...`);
    const startTime = Date.now();

    const [axeError, results] = await browser.executeAsync(
      function (axeConfig, done) {
        if (typeof window.axe === 'undefined' || typeof axe.run !== 'function') {
          return done([new Error('axe-core is not available on this page')]);
        }

        const context = window.document;
        axe
          .run(context, { runOnly: axeConfig.runOnly })
          .then(function (results) {
            done([null, results]);
          })
          .catch(function (error) {
            done([error]);
          });
      },
      config.axe
    );

    if (axeError) {
      throw axeError;
    }

    const testDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Tests completed in ${testDuration}s\n`);

    // Process and display results
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
      axeVersion: results.testEngine.version,
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      },
      results: results
    };

    // Display summary
    console.log('📊 Accessibility Test Summary:');
    console.log(`  ❌ Violations: ${report.summary.violations}`);
    console.log(`  ✅ Passes: ${report.summary.passes}`);
    console.log(`  ⚠️  Incomplete: ${report.summary.incomplete}`);
    console.log(`  ➖ Inapplicable: ${report.summary.inapplicable}\n`);

    // Display violations details if any
    if (results.violations.length > 0 && config.output.console) {
      console.log('⚠️  Accessibility Violations Found:\n');
      results.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.description}`);
        console.log(`   Impact: ${violation.impact.toUpperCase()}`);
        console.log(`   Help: ${violation.help}`);
        console.log(`   More info: ${violation.helpUrl}`);
        console.log(`   Affected elements: ${violation.nodes.length}`);
        violation.nodes.slice(0, 3).forEach(node => {
          console.log(`     - ${node.target.join(' > ')}`);
        });
        if (violation.nodes.length > 3) {
          console.log(`     ... and ${violation.nodes.length - 3} more`);
        }
        console.log('');
      });
    }

    // Save report to file
    mkdirp.sync(path.join(process.cwd(), config.output.dir));
    const outputPath = path.join(process.cwd(), config.output.dir, config.output.filename);
    await jsonfile.writeFile(outputPath, report, { spaces: 2 });
    console.log(`📁 Report saved to: ${outputPath}`);

    // Display Saucelabs session URL
    if (config.saucelabs.enabled) {
      const saucelabsUrl = `https://app.saucelabs.com/tests/${sessionId}`;
      console.log(`\n🔗 Saucelabs Session: ${saucelabsUrl}`);
    }

    // Return test status
    const passed = results.violations.length === 0;
    if (passed) {
      console.log('\n✨ All accessibility tests passed!');
    } else {
      console.log(`\n⚠️  Found ${results.violations.length} accessibility violation(s)`);
    }

    return { passed, report };

  } finally {
    if (browser) {
      console.log('\n🔌 Closing browser session...');
      await browser.deleteSession();
    }
  }
}

// Main execution
(async () => {
  try {
    const { passed } = await runAccessibilityTest();
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error during accessibility testing:', error.message);
    if (process.env.DEBUG === 'true') {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();