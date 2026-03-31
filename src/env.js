function resolveEnv(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\{(\w+)\}/g, (_, key) => {
    const env = process.env[key];
    if (!env) {
      console.error(`Environment variable ${key} is not set`);
      process.exit(1);
    }
    return env;
  });
}

module.exports = { resolveEnv };
