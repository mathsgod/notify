const axios = require('axios');
const { resolveEnv } = require('../env');

async function send(webhook, notify) {
  await axios.post(resolveEnv(webhook), {
    text: `*${notify.subject || 'Notification'}*\n${notify.body || 'Condition met.'}`
  });
}

module.exports = { send };
