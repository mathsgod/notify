const { loadConfig } = require('./config');

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
}

module.exports = { register };
