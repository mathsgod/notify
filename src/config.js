const fs = require('fs');
const path = require('path');

function loadConfig(configFile) {
  const configPath = path.resolve(process.cwd(), configFile);

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to parse config: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { loadConfig };
