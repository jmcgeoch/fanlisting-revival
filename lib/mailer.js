const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;
if (config.mail.host) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
}

function renderTemplate(name, vars) {
  const filePath = path.join(__dirname, '..', 'emails', `${name}.txt`);
  let text = fs.readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    text = text.split(`{{${key}}}`).join(value ?? '');
  }
  return text;
}

async function sendTemplateEmail(to, subjectTemplate, templateName, vars) {
  const subject = subjectTemplate.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  const body = renderTemplate(templateName, vars);

  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipping email to ${to}: ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: config.mail.from,
    to,
    subject,
    text: body,
  });
}

module.exports = { sendTemplateEmail };
