const { loadConfig } = require('./config');

function maskValue(value) {
  if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    return value; // env var reference, show as-is
  }
  if (typeof value === 'string' && value.length > 4) {
    return value.slice(0, 2) + '***' + value.slice(-2);
  }
  return '****';
}

function printConfig(obj, indent) {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log(`${indent}${key}:`);
      printConfig(value, indent + '  ');
    } else if (typeof value === 'string') {
      const sensitive = ['pass', 'secret', 'token', 'webhook', 'password'];
      const isSensitive = sensitive.some(s => key.toLowerCase().includes(s));
      console.log(`${indent}${key}: ${isSensitive ? maskValue(value) : value}`);
    } else {
      console.log(`${indent}${key}: ${value}`);
    }
  }
}

function register(program) {
  const channelsCmd = program
    .command('channels')
    .description('Manage notification channels');

  channelsCmd
    .command('list')
    .description('List all configured channels')
    .option('-c, --config <path>', 'path to config file', 'notify.json')
    .action((options) => {
      const config = loadConfig(options.config);

      if (!config.channels || typeof config.channels !== 'object' || Object.keys(config.channels).length === 0) {
        console.log('No channels defined.');
        return;
      }

      const entries = Object.entries(config.channels);
      console.log(`Found ${entries.length} channel(s):\n`);

      entries.forEach(([name, cfg], i) => {
        console.log(`  ${i + 1}. ${name}`);
        printConfig(cfg, '     ');
        console.log('');
      });
    });
}

module.exports = { register };
