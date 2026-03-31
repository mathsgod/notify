const nodemailer = require('nodemailer');
const { resolveEnv } = require('../env');

async function send(smtpConfig, notify) {
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port || 587,
    secure: smtpConfig.secure || false,
    auth: {
      user: resolveEnv(smtpConfig.auth.user),
      pass: resolveEnv(smtpConfig.auth.pass)
    }
  });

  await transporter.sendMail({
    from: smtpConfig.from || resolveEnv(smtpConfig.auth.user),
    to: Array.isArray(notify.to) ? notify.to.join(', ') : notify.to,
    subject: notify.subject || 'Notification',
    text: notify.body || 'Condition met.'
  });
}

module.exports = { send };
