const axios = require('axios');
const { execSync } = require('child_process');
const { loadConfig } = require('./config');
const emailChannel = require('./channels/email');
const slackChannel = require('./channels/slack');
const gmailChannel = require('./channels/gmail');

function parseCommandOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {}
  const start = stdout.search(/[{[]/);
  if (start === -1) return stdout;
  const open = stdout[start];
  const close = open === '{' ? '}' : ']';
  const end = stdout.lastIndexOf(close);
  if (end > start) {
    try {
      return JSON.parse(stdout.slice(start, end + 1));
    } catch {}
  }
  return stdout;
}

function register(program) {
  program
    .command('run')
    .description('Run all checks defined in notify.json')
    .option('-c, --config <path>', 'path to config file', 'notify.json')
    .action(async (options) => {
      const config = loadConfig(options.config);

      if (!config.channels || (!config.channels.email && !config.channels.slack && !config.channels.gmail)) {
        console.error('Missing "channels.email", "channels.slack" or "channels.gmail" config in notify.json');
        process.exit(1);
      }

      if (!config.checks || !Array.isArray(config.checks) || config.checks.length === 0) {
        console.error('No checks defined in notify.json');
        process.exit(1);
      }

      console.log(`Running ${config.checks.length} check(s)...\n`);

      for (const check of config.checks) {
        await runCheck(check, config);
      }

      console.log('\nDone.');
    });
}

async function runCheck(check, config) {
  const label = check.name || check.url || check.command;
  const source = check.url || check.command;

  if (!source) {
    console.log(`[${label}] Missing "url" or "command"`);
    return;
  }

  process.stdout.write(`[${label}] Running ${source} ... `);

  let data;
  try {
    if (check.url) {
      const response = await axios({
        method: check.method || 'GET',
        url: check.url,
        timeout: 30000,
        headers: check.headers || {}
      });
      data = response.data;
    } else {
      const stdout = execSync(check.command, {
        timeout: 60000,
        encoding: 'utf-8',
        shell: '/bin/bash'
      }).trim();
      data = parseCommandOutput(stdout);
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    return;
  }

  const result = evaluateCondition(data, check.condition);

  if (!result) {
    console.log('Condition not met. No notification sent.');
    return;
  }

  console.log('Condition met! Sending notifications...');

  const channels = check.notify.channels || ['email'];

  if (channels.includes('email') && check.notify.to) {
    if (config.channels.email) {
      try {
        await emailChannel.send(config.channels.email, check.notify);
        console.log(`[${label}] Email sent to ${check.notify.to.join(', ')}`);
      } catch (err) {
        console.log(`[${label}] Failed to send email: ${err.message}`);
      }
    } else {
      console.log(`[${label}] Email channel selected but not configured`);
    }
  }

  if (channels.includes('slack')) {
    const webhook = (config.channels.slack && config.channels.slack.webhook) || (check.notify.slack && check.notify.slack.webhook);
    if (webhook) {
      try {
        await slackChannel.send(webhook, check.notify);
        console.log(`[${label}] Slack notification sent`);
      } catch (err) {
        console.log(`[${label}] Failed to send Slack: ${err.message}`);
      }
    } else {
      console.log(`[${label}] Slack channel selected but no webhook configured`);
    }
  }

  if (channels.includes('gmail') && check.notify.to) {
    if (config.channels.gmail) {
      try {
        await gmailChannel.send(config.channels.gmail, check.notify);
        console.log(`[${label}] Gmail sent to ${check.notify.to.join(', ')}`);
      } catch (err) {
        console.log(`[${label}] Failed to send Gmail: ${err.message}`);
      }
    } else {
      console.log(`[${label}] Gmail channel selected but not configured`);
    }
  }
}

function evaluateCondition(data, condition) {
  if (!condition) return true;

  let value = getNestedValue(data, condition.field);

  switch (condition.operator) {
    case 'length_gt':
      return Array.isArray(value) && value.length > condition.value;
    case 'gt':
      return Number(value) > Number(condition.value);
    case 'lt':
      return Number(value) < Number(condition.value);
    case 'eq':
      return value === condition.value;
    case 'neq':
      return value !== condition.value;
    case 'contains':
      return typeof value === 'string' && value.includes(condition.value);
    case 'truthy':
      return !!value;
    case 'falsy':
      return !value;
    default:
      console.warn(`Unknown operator: ${condition.operator}`);
      return false;
  }
}

function getNestedValue(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((acc, part) => {
    if (acc == null) return undefined;
    const match = part.match(/^(\w+)\[(-?\d+)\]$/);
    if (match) {
      const arr = acc[match[1]];
      if (Array.isArray(arr)) {
        const idx = parseInt(match[2]);
        return idx < 0 ? arr[arr.length + idx] : arr[idx];
      }
      return undefined;
    }
    return acc[part];
  }, obj);
}

module.exports = { register };
