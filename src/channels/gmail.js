const nodemailer = require('nodemailer');
const { resolveEnv } = require('../env');

async function send(gmailConfig, notify) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: gmailConfig.email,
      clientId: gmailConfig.clientId,
      clientSecret: resolveEnv(gmailConfig.clientSecret),
      refreshToken: resolveEnv(gmailConfig.refreshToken)
    }
  });

  await transporter.sendMail({
    from: gmailConfig.email,
    to: Array.isArray(notify.to) ? notify.to.join(', ') : notify.to,
    subject: notify.subject || 'Notification',
    text: notify.body || 'Condition met.'
  });
}

module.exports = { send };
