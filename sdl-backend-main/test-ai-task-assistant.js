/**
 * Test script for AI Task Assistant API
 * Usage: node test-ai-task-assistant.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';
let authToken = '';
let testUserId = null;
let testProjectId = null;
let testTaskId = null;

// Test data
const TEST_USER = {
  account: 'stone881129',
  password: '0921457822a'
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${ step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: authToken ? { 'accessToken': authToken } : {}
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Test 1: Login
async function testLogin() {
  logStep(1, 'Testing login');

  try {
    const response = await apiRequest('POST', '/users/login', TEST_USER);

    if (response.accessToken) {
      authToken = response.accessToken;
      testUserId = response.id;
      logSuccess(`Login successful. User ID: ${testUserId}`);
      return true;
    } else {
      logError('Login failed: No token received');
      return false;
    }
  } catch (error) {
    logError(`Login failed: ${error.message}`);
    logWarning('Please ensure:');
    logWarning('1. Backend server is running (docker-compose up)');
    logWarning(`2. Test user exists: ${TEST_USER.email}`);
    return false;
  }
}

// Test 2: Get user's projects
async function testGetProjects() {
  logStep(2, 'Getting user projects');

  try {
    const response = await apiRequest('GET', '/projects');

    if (response && response.length > 0) {
      testProjectId = response[0].id;
      logSuccess(`Found ${response.length} projects. Using project ID: ${testProjectId}`);
      log(`Project name: ${response[0].name}`, 'blue');
      return true;
    } else {
      logWarning('No projects found. Please create a project first.');
      return false;
    }
  } catch (error) {
    logError(`Failed to get projects: ${error.message}`);
    return false;
  }
}

// Test 3: Get project tasks
async function testGetTasks() {
  logStep(3, 'Getting project tasks');

  try {
    const response = await apiRequest('GET', `/kanbans/${testProjectId}`);

    if (response && Array.isArray(response)) {
      // Find first non-empty task
      for (const column of response) {
        if (column.task && column.task.length > 0) {
          testTaskId = column.task[0].id;
          logSuccess(`Found task ID: ${testTaskId}`);
          log(`Task title: ${column.task[0].title}`, 'blue');
          return true;
        }
      }
      logWarning('No tasks found in this project. Please create a task first.');
      return false;
    } else {
      logError('Invalid response format');
      return false;
    }
  } catch (error) {
    logError(`Failed to get tasks: ${error.message}`);
    return false;
  }
}

// Test 4: Analyze card
async function testAnalyzeCard() {
  logStep(4, 'Testing card analysis');

  try {
    const response = await apiRequest('POST', '/ai-task-assistant/analyze-card', {
      taskId: testTaskId,
      projectId: testProjectId
    });

    logSuccess(`Card analyzed successfully`);
    log(`Issues found: ${response.issuesCount}`, 'blue');

    if (response.issues && response.issues.length > 0) {
      response.issues.forEach((issue, index) => {
        log(`  ${index + 1}. [${issue.severity}] ${issue.message}`, 'yellow');
      });
    }

    return true;
  } catch (error) {
    logError(`Card analysis failed: ${error.message}`);
    return false;
  }
}

// Test 5: Generate suggestions
async function testGenerateSuggestions() {
  logStep(5, 'Testing AI suggestions generation');

  try {
    const response = await apiRequest('POST', '/ai-task-assistant/generate-suggestions', {
      taskId: testTaskId,
      projectId: testProjectId,
      selectedState: 'initial_idea',
      answers: { q1: 'Test answer' },
      askedSources: ['同學', '老師'],
      skippedThinking: false
    });

    logSuccess('AI suggestions generated successfully');
    log(`Help-seeking type: ${response.helpSeekingType}`, 'blue');
    log(`Log ID: ${response.logId}`, 'blue');

    if (response.suggestions) {
      log('\nSuggestions:', 'cyan');

      if (response.suggestions.summary) {
        log(`Summary: ${response.suggestions.summary}`, 'blue');
      }

      if (response.suggestions.thinkingDirections) {
        log(`\nThinking Directions (${response.suggestions.thinkingDirections.length}):`, 'cyan');
        response.suggestions.thinkingDirections.forEach((dir, index) => {
          log(`  ${index + 1}. ${dir.title}`, 'blue');
          log(`     ${dir.description}`, 'reset');
        });
      }

      if (response.suggestions.humanHelpSuggestions) {
        log(`\nHuman Help Suggestions (${response.suggestions.humanHelpSuggestions.length}):`, 'cyan');
        response.suggestions.humanHelpSuggestions.forEach((sug, index) => {
          log(`  ${index + 1}. ${sug}`, 'blue');
        });
      }
    }

    // Save logId for feedback test
    global.testLogId = response.logId;

    return true;
  } catch (error) {
    logError(`Suggestions generation failed: ${error.message}`);
    if (error.message.includes('GEMINI_API_KEY')) {
      logWarning('Please check your .env file has valid GEMINI_API_KEY');
    }
    return false;
  }
}

// Test 6: Submit feedback
async function testSubmitFeedback() {
  logStep(6, 'Testing feedback submission');

  try {
    const response = await apiRequest('POST', '/ai-task-assistant/feedback', {
      taskId: testTaskId,
      projectId: testProjectId,
      helpSeekingLogId: global.testLogId,
      feedbackType: 'helpful',
      feedbackDetail: 'Test feedback detail'
    });

    logSuccess('Feedback submitted successfully');
    return true;
  } catch (error) {
    logError(`Feedback submission failed: ${error.message}`);
    return false;
  }
}

// Test 7: Get help-seeking stats
async function testGetHelpSeekingStats() {
  logStep(7, 'Testing help-seeking stats retrieval');

  try {
    const response = await apiRequest('GET', `/ai-task-assistant/help-seeking-stats/${testUserId}?timeRange=7d`);

    logSuccess('Help-seeking stats retrieved successfully');
    log('\nStats:', 'cyan');
    log(`  Total: ${response.stats.total}`, 'blue');
    log(`  Adaptive: ${response.stats.adaptive}`, 'green');
    log(`  Expedient: ${response.stats.expedient}`, 'yellow');
    log(`  Mixed: ${response.stats.mixed}`, 'blue');
    log(`  Quality Score: ${response.qualityScore.toFixed(2)}`, 'blue');

    if (response.insights && response.insights.length > 0) {
      log('\nInsights:', 'cyan');
      response.insights.forEach((insight, index) => {
        log(`  ${index + 1}. [${insight.type}] ${insight.message}`, 'blue');
        if (insight.reference) {
          log(`     Reference: ${insight.reference}`, 'reset');
        }
      });
    }

    return true;
  } catch (error) {
    logError(`Get stats failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('='.repeat(80), 'cyan');
  log('AI Task Assistant API Test Suite', 'cyan');
  log('='.repeat(80), 'cyan');

  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Get Projects', fn: testGetProjects },
    { name: 'Get Tasks', fn: testGetTasks },
    { name: 'Analyze Card', fn: testAnalyzeCard },
    { name: 'Generate Suggestions', fn: testGenerateSuggestions },
    { name: 'Submit Feedback', fn: testSubmitFeedback },
    { name: 'Get Help-Seeking Stats', fn: testGetHelpSeekingStats }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
      logWarning(`Stopping tests due to failure in: ${test.name}`);
      break;
    }
  }

  log('\n' + '='.repeat(80), 'cyan');
  log('Test Results', 'cyan');
  log('='.repeat(80), 'cyan');
  log(`Passed: ${passed}/${tests.length}`, passed === tests.length ? 'green' : 'yellow');
  if (failed > 0) {
    log(`Failed: ${failed}/${tests.length}`, 'red');
  }

  if (passed === tests.length) {
    log('\n✓ All tests passed!', 'green');
    log('The AI Task Assistant feature is working correctly.', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some tests failed.', 'red');
    log('Please check the errors above and fix them.', 'red');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  logError(`Test suite error: ${error.message}`);
  process.exit(1);
});
