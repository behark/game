/**
 * Speed Rivals Test Suite
 * Basic test runner for the game functionality
 */

const http = require('http');

const TESTS_CONFIG = {
  serverUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 5000
};

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🏁 Speed Rivals Test Suite\n');
    console.log('='.repeat(50));

    for (const test of this.tests) {
      this.results.total++;
      try {
        await test.fn();
        this.results.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log('='.repeat(50));
    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${this.results.passed}/${this.results.total}`);
    console.log(`   Failed: ${this.results.failed}/${this.results.total}`);
    console.log(`   Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%\n`);

    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Helper functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, TESTS_CONFIG.serverUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      timeout: TESTS_CONFIG.timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Create test runner
const runner = new TestRunner();

// Server Health Tests
runner.test('Server is running', async () => {
  const response = await makeRequest('/health');
  assertEqual(response.statusCode, 200, 'Health endpoint should return 200');
});

runner.test('Health endpoint returns valid JSON', async () => {
  const response = await makeRequest('/health');
  const health = JSON.parse(response.body);
  assert(health.status, 'Health should have status field');
  assert(health.services, 'Health should have services field');
});

// Static File Tests
runner.test('Main page loads', async () => {
  const response = await makeRequest('/');
  assertEqual(response.statusCode, 200, 'Main page should return 200');
});

runner.test('Game hub loads', async () => {
  const response = await makeRequest('/hub');
  assertEqual(response.statusCode, 200, 'Game hub should return 200');
});

runner.test('3D game loads', async () => {
  const response = await makeRequest('/3d-working');
  assertEqual(response.statusCode, 200, '3D game should return 200');
});

runner.test('Multiplayer page loads', async () => {
  const response = await makeRequest('/multiplayer');
  assertEqual(response.statusCode, 200, 'Multiplayer page should return 200');
});

runner.test('Mobile racing loads', async () => {
  const response = await makeRequest('/mobile-racing');
  assertEqual(response.statusCode, 200, 'Mobile racing should return 200');
});

// Library Tests
runner.test('Three.js library is accessible', async () => {
  const response = await makeRequest('/libs/three.min.js');
  assertEqual(response.statusCode, 200, 'Three.js should be accessible');
  assert(response.body.length > 0, 'Three.js should have content');
});

runner.test('Cannon.js library is accessible', async () => {
  const response = await makeRequest('/libs/cannon.min.js');
  assertEqual(response.statusCode, 200, 'Cannon.js should be accessible');
  assert(response.body.length > 0, 'Cannon.js should have content');
});

// PWA Tests
runner.test('PWA manifest is accessible', async () => {
  const response = await makeRequest('/manifest.json');
  assertEqual(response.statusCode, 200, 'Manifest should return 200');
  const manifest = JSON.parse(response.body);
  assert(manifest.name, 'Manifest should have name');
  assert(manifest.short_name, 'Manifest should have short_name');
});

runner.test('Service worker is accessible', async () => {
  const response = await makeRequest('/sw.js');
  assertEqual(response.statusCode, 200, 'Service worker should return 200');
  assert(response.headers['content-type'].includes('javascript'), 'Service worker should be JavaScript');
});

// API Tests (basic connectivity)
runner.test('API leaderboard endpoint exists', async () => {
  const response = await makeRequest('/api/leaderboard');
  assert(response.statusCode === 200 || response.statusCode === 401, 'Leaderboard endpoint should exist');
});

runner.test('API achievements endpoint exists', async () => {
  const response = await makeRequest('/api/achievements');
  assert(response.statusCode === 200 || response.statusCode === 401, 'Achievements endpoint should exist');
});

// Error Handling Tests
runner.test('404 handling for non-existent pages', async () => {
  const response = await makeRequest('/this-page-does-not-exist');
  assertEqual(response.statusCode, 404, 'Non-existent pages should return 404');
});

// Run all tests
console.log('Starting Speed Rivals test suite...\n');
setTimeout(() => runner.run(), 1000);
