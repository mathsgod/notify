const axios = require('axios');
const { execSync } = require('child_process');
const { loadConfig } = require('./config');

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

function evaluateCondition(data, condition) {
  if (!condition) return { met: true, value: data };

  let value = getNestedValue(data, condition.field);

  let met;
  switch (condition.operator) {
    case 'length_gt':
      met = Array.isArray(value) && value.length > condition.value;
      break;
    case 'gt':
      met = Number(value) > Number(condition.value);
      break;
    case 'lt':
      met = Number(value) < Number(condition.value);
      break;
    case 'eq':
      met = value === condition.value;
      break;
    case 'neq':
      met = value !== condition.value;
      break;
    case 'contains':
      met = typeof value === 'string' && value.includes(condition.value);
      break;
    case 'truthy':
      met = !!value;
      break;
    case 'falsy':
      met = !value;
      break;
    default:
      met = false;
  }

  return { met, value };
}

function register(program) {
  const checksCmd = program
    .command('checks')
    .description('Manage checks');

  checksCmd
    .command('list')
    .description('List all configured checks')
    .option('-c, --config <path>', 'path to config file', 'notify.json')
    .action((options) => {
      const config = loadConfig(options.config);

      if (!config.checks || !Array.isArray(config.checks) || config.checks.length === 0) {
        console.log('No checks defined.');
        return;
      }

      console.log(`Found ${config.checks.length} check(s):\n`);

      config.checks.forEach((check, i) => {
        const c = check.condition || {};
        const channels = (check.notify && check.notify.channels) || ['email'];
        const to = (check.notify && check.notify.to) || [];

        console.log(`  ${i + 1}. ${check.name || '(unnamed)'}`);
        if (check.url) {
          console.log(`     URL:       ${check.method || 'GET'} ${check.url}`);
        } else if (check.command) {
          console.log(`     Command:   ${check.command}`);
        }
        console.log(`     Condition: ${c.field ? c.field + '.' : ''}${c.operator || 'truthy'} ${c.value !== undefined ? c.value : ''}`);
        console.log(`     Channels:  ${channels.join(', ')}`);
        if (channels.includes('email')) {
          console.log(`     To:        ${to.join(', ') || '(none)'}`);
        }
        if (channels.includes('slack')) {
          console.log(`     Slack:     configured`);
        }
        console.log('');
      });
    });

  checksCmd
    .command('inspect')
    .description('Run a check and show its return value (no notifications sent)')
    .option('-c, --config <path>', 'path to config file', 'notify.json')
    .option('-n, --name <name>', 'check name to inspect (default: first check)')
    .option('-i, --index <number>', 'check index to inspect (1-based)')
    .action(async (options) => {
      const config = loadConfig(options.config);

      if (!config.checks || !Array.isArray(config.checks) || config.checks.length === 0) {
        console.log('No checks defined.');
        return;
      }

      let check;
      if (options.index) {
        const idx = parseInt(options.index) - 1;
        check = config.checks[idx];
        if (!check) {
          console.error(`Check index ${options.index} not found. Available: 1-${config.checks.length}`);
          process.exit(1);
        }
      } else if (options.name) {
        check = config.checks.find(c => c.name === options.name);
        if (!check) {
          console.error(`Check "${options.name}" not found.`);
          console.log('Available checks:', config.checks.map(c => c.name || '(unnamed)').join(', '));
          process.exit(1);
        }
      } else {
        check = config.checks[0];
      }

      const label = check.name || check.url || check.command;
      const source = check.url || check.command;

      console.log(`Inspecting: ${label}`);
      console.log(`Source:     ${source}\n`);

      if (!source) {
        console.error('Missing "url" or "command" in check.');
        process.exit(1);
      }

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
        console.error(`ERROR: ${err.message}`);
        process.exit(1);
      }

      console.log('Return value:');
      console.log(JSON.stringify(data, null, 2));

      if (check.condition) {
        const { met, value } = evaluateCondition(data, check.condition);
        const c = check.condition;
        console.log(`\nCondition:  ${c.field || ''} ${c.operator || 'truthy'} ${c.value !== undefined ? c.value : ''}`);
        console.log(`Field value: ${JSON.stringify(value)}`);
        console.log(`Result:     ${met ? 'TRUE (would notify)' : 'FALSE (no notification)'}`);
      } else {
        console.log('\nNo condition defined. Would always notify.');
      }
    });
}

module.exports = { register };
