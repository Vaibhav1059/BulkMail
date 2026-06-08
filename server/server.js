import express from 'express';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import pool from './db.js';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Setup file capture folders
const sentEmailsDir = path.join(process.cwd(), 'server', 'sent_emails');
if (!fs.existsSync(sentEmailsDir)) {
  fs.mkdirSync(sentEmailsDir, { recursive: true });
}

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Global state for background dispatch queue
let activeSendingState = {
  campaignId: null,
  campaignName: '',
  subject: '',
  body: '',
  total: 0,
  sent: 0,
  failed: 0,
  remaining: 0,
  status: 'idle', // 'idle' | 'sending' | 'paused' | 'stopped' | 'completed'
  logs: [],
  failedList: [],
  recipientData: [],
  mappedFields: { name: '', email: '', company: '' },
  concurrency: 1,
  delayOverride: 0.5,
  showAdminSummary: false
};

let sendingTimer = null;

// Helper to log audit events into MySQL database
async function logEvent(user, action, status = 'Success') {
  const id = 'l' + Math.random().toString(36).substr(2, 9);
  const date = new Date().toISOString();
  try {
    await pool.query(
      'INSERT INTO audit_logs (id, date, user, action, status) VALUES (?, ?, ?, ?, ?);',
      [id, date, user, action, status]
    );
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

// REST API Endpoints

// 1. Fetch campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM campaigns ORDER BY date DESC;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Save campaign
app.post('/api/campaigns', async (req, res) => {
  const { id, name, subject, body, status, date, creator, recipientsCount } = req.body;
  try {
    await pool.query(
      `INSERT INTO campaigns (id, name, subject, body, status, date, creator, recipientsCount, sentCount, failedCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0);`,
      [id, name, subject, body, status, date, creator, recipientsCount]
    );
    await logEvent(creator, `Created Campaign "${name}"`, 'Success');
    res.json({ success: true, campaignId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete campaign
app.delete('/api/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [camp] = await pool.query('SELECT name FROM campaigns WHERE id = ?;', [id]);
    const campaignName = camp[0]?.name || id;
    
    await pool.query('DELETE FROM campaigns WHERE id = ?;', [id]);
    await pool.query('DELETE FROM recipients WHERE campaignId = ?;', [id]);
    
    await logEvent('Administrator', `Deleted Campaign "${campaignName}"`, 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Fetch SMTP Settings
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1;');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update SMTP Settings
app.post('/api/settings', async (req, res) => {
  const { host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts } = req.body;
  try {
    await pool.query(
      `UPDATE settings SET 
        host = ?, port = ?, username = ?, password = ?, encryption = ?, 
        senderEmail = ?, senderName = ?, emailsPerHour = ?, emailsPerDay = ?, 
        delaySeconds = ?, connectionTimeout = ?, retryAttempts = ? 
       WHERE id = 1;`,
      [host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts]
    );
    await logEvent('Administrator', 'Updated SMTP Server Settings', 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Fetch Audit Logs
app.get('/api/logs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY date DESC;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Management API Endpoints

const avatarUrls = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80'
];

// Fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  const { name, email, role } = req.body;
  const id = 'u' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  const avatar = avatarUrls[Math.floor(Math.random() * avatarUrls.length)];
  try {
    await pool.query(
      'INSERT INTO users (id, name, email, role, status, avatar) VALUES (?, ?, ?, ?, "Active", ?);',
      [id, name, email, role, avatar]
    );
    await logEvent('Administrator', `Created User Profile: ${name} (${role})`, 'Success');
    res.json({ success: true, userId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user details
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?;',
      [name, email, role, id]
    );
    await logEvent('Administrator', `Updated User Profile: ${name}`, 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle user status
app.patch('/api/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const [user] = await pool.query('SELECT name FROM users WHERE id = ?;', [id]);
    const userName = user[0]?.name || id;
    
    await pool.query('UPDATE users SET status = ? WHERE id = ?;', [status, id]);
    await logEvent('Administrator', `${status === 'Active' ? 'Activated' : 'Deactivated'} User: ${userName}`, 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await pool.query('SELECT name FROM users WHERE id = ?;', [id]);
    const userName = user[0]?.name || id;
    
    await pool.query('DELETE FROM users WHERE id = ?;', [id]);
    await logEvent('Administrator', `Deleted User: ${userName}`, 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Templates CRUD API Endpoints

// 1. Fetch all templates
app.get('/api/templates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM templates;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create a new template
app.post('/api/templates', async (req, res) => {
  const { id, name, subject, body } = req.body;
  const date = new Date().toISOString();
  try {
    await pool.query(
      'INSERT INTO templates (id, name, subject, body, date) VALUES (?, ?, ?, ?, ?);',
      [id, name, subject, body, date]
    );
    await logEvent('Administrator', `Created Reusable Template "${name}"`, 'Success');
    res.json({ success: true, templateId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update an existing template
app.put('/api/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name, subject, body } = req.body;
  const date = new Date().toISOString();
  try {
    await pool.query(
      'UPDATE templates SET name = ?, subject = ?, body = ?, date = ? WHERE id = ?;',
      [name, subject, body, date, id]
    );
    await logEvent('Administrator', `Updated Reusable Template "${name}"`, 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete an existing template
app.delete('/api/templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [tpl] = await pool.query('SELECT name FROM templates WHERE id = ?;', [id]);
    const templateName = tpl[0]?.name || id;
    
    await pool.query('DELETE FROM templates WHERE id = ?;', [id]);
    await logEvent('Administrator', `Deleted Reusable Template "${templateName}"`, 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Verify SMTP Connection (Test SMTP Route)
app.post('/api/settings/verify', async (req, res) => {
  const { host, port, username, password, encryption, senderEmail } = req.body;
  
  if (host.includes('mock') || password.includes('mock')) {
    // Simulate latency for mock verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    return res.json({ success: true, isMock: true, message: 'Mock SMTP verification successful.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: encryption === 'SSL',
      auth: {
        user: username,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();
    res.json({ success: true, isMock: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7b. Send Test Email (Real and Mock delivery)
app.post('/api/campaigns/send-test', async (req, res) => {
  const { testEmail, subject, body } = req.body;
  try {
    const smtpSettings = await getSMTPSettings();
    const isMock = smtpSettings.host.includes('mock') || smtpSettings.password.includes('mock');

    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await logEvent('Administrator', `Sent simulated test email to ${testEmail}`, 'Success');
      return res.json({ success: true, isMock: true, message: 'Mock test email sent successfully.' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: parseInt(smtpSettings.port),
      secure: smtpSettings.encryption === 'SSL',
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Compile templates with sample user info
    const sampleName = 'Test Recipient';
    const sampleCompany = 'AeroSend Sandbox';
    
    const compiledSubject = (subject || '')
      .replace(/{{name}}/g, sampleName)
      .replace(/{{email}}/g, testEmail)
      .replace(/{{company}}/g, sampleCompany);

    const compiledBody = (body || '')
      .replace(/{{name}}/g, sampleName)
      .replace(/{{email}}/g, testEmail)
      .replace(/{{company}}/g, sampleCompany)
      .replace(/\n\n/g, '</p><p style="margin-top: 10px; margin-bottom: 10px;">')
      .replace(/\n/g, '<br/>');

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; min-height: 320px; background-color: #f8fafc; color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; padding: 24px; font-size: 14px; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <!-- Header Logo Simulation -->
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
            <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">A</div>
            <span style="font-size: 14px; font-weight: bold; color: #0f172a;">AeroSend System</span>
          </div>

          <div style="color: #0f172a;">
            <p style="margin: 0 0 12px 0;">${compiledBody}</p>
          </div>

          <div style="margin-top: 30px; padding-top: 15px; font-size: 11px; text-align: center; border-top: 1px solid #f1f5f9; color: #64748b;">
            You are receiving this email because you are registered under ${sampleName}.<br/>
            AeroSend Inc, 100 Pine St, San Francisco, CA. <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${smtpSettings.senderName}" <${smtpSettings.senderEmail}>`,
      to: testEmail,
      subject: `[Test] ${compiledSubject}`,
      html: htmlBody
    });

    await logEvent('Administrator', `Sent test email to ${testEmail}`, 'Success');
    res.json({ success: true, isMock: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. CSV Parsing endpoint
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const csvText = req.file.buffer.toString('utf8');
  res.json({ csvText });
});

// Sending Simulation Queue Thread

// Fetch SMTP settings helper
async function getSMTPSettings() {
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1;');
  return rows[0];
}

// Helper to compile placeholders in template text
function compileTemplate(text, recipient, nameVal, companyVal, emailAddress) {
  let compiled = text || '';
  compiled = compiled
    .replace(/{{name}}/g, nameVal)
    .replace(/{{email}}/g, emailAddress)
    .replace(/{{company}}/g, companyVal);
    
  if (recipient && recipient.data) {
    Object.keys(recipient.data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      compiled = compiled.replace(regex, recipient.data[key] || '');
    });
  }
  return compiled;
}

// Helper to compile email body into layout HTML
function compileBodyToHtml(bodyText, recipient, nameVal, companyVal, emailAddress) {
  const compiledText = compileTemplate(bodyText, recipient, nameVal, companyVal, emailAddress);
  const formattedTextHtml = compiledText
    .replace(/\n\n/g, '</p><p style="margin-top: 12px; margin-bottom: 12px;">')
    .replace(/\n/g, '<br/>');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; min-height: 320px; background-color: #f8fafc; color: #0f172a;">
      <div style="max-width: 500px; margin: 0 auto; padding: 24px; font-size: 14px; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <!-- Header Logo Simulation -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
          <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">A</div>
          <span style="font-size: 14px; font-weight: bold; color: #0f172a;">AeroSend System</span>
        </div>

        <div style="color: #0f172a;">
          <p style="margin: 0 0 12px 0;">${formattedTextHtml}</p>
        </div>

        <div style="margin-top: 30px; padding-top: 15px; font-size: 11px; text-align: center; border-top: 1px solid #f1f5f9; color: #64748b;">
          You are receiving this email because you are registered under ${nameVal}.<br/>
          AeroSend Inc, 100 Pine St, San Francisco, CA. <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
        </div>
      </div>
    </div>
  `;
}

async function processQueueStep() {
  if (activeSendingState.status !== 'sending' || activeSendingState.remaining <= 0) {
    return;
  }

  const currentRecipientIndex = activeSendingState.sent + activeSendingState.failed;
  if (currentRecipientIndex >= activeSendingState.recipientData.length) {
    // Mark completed
    await completeCampaignDispatch();
    return;
  }

  const smtpSettings = await getSMTPSettings();
  const batchSize = Math.min(activeSendingState.concurrency || 1, activeSendingState.remaining);
  let newSent = activeSendingState.sent;
  let newFailed = activeSendingState.failed;
  const newFailedList = [...activeSendingState.failedList];

  for (let i = 0; i < batchSize; i++) {
    const index = currentRecipientIndex + i;
    if (index >= activeSendingState.recipientData.length) break;

    const recipient = activeSendingState.recipientData[index];
    const emailAddress = recipient.email;
    const nameVal = recipient.data[activeSendingState.mappedFields.name] || 'Customer';
    const companyVal = recipient.data[activeSendingState.mappedFields.company] || 'Enterprise';

    const isInvalid = recipient.status === 'Invalid';
    const timestamp = new Date().toLocaleTimeString();

    if (isInvalid) {
      const logMessage = `[${timestamp}] Skipped invalid email user: ${nameVal} (${emailAddress || 'missing'})`;
      activeSendingState.logs.unshift(logMessage);
      newFailed++;
      newFailedList.push(recipient);
      
      // Update recipient status in DB
      await pool.query(
        'INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [activeSendingState.campaignId, emailAddress, nameVal, companyVal, 'Skipped', 'Invalid Email Syntax', new Date().toISOString()]
      );
      continue;
    }

    // Try real send or local HTML write
    let success = false;
    let errorMsg = 'SMTP delivery timeout';

    // 1. Local HTML Capture write (Verification folder)
    const sanitizedCampName = activeSendingState.campaignName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const campaignFolder = path.join(sentEmailsDir, sanitizedCampName);
    if (!fs.existsSync(campaignFolder)) {
      fs.mkdirSync(campaignFolder, { recursive: true });
    }

    // Compile message templates
    const compiledSubject = compileTemplate(activeSendingState.subject, recipient, nameVal, companyVal, emailAddress);
    const compiledHtml = compileBodyToHtml(activeSendingState.body, recipient, nameVal, companyVal, emailAddress);
    
    const emailFileName = `${index + 1}_${emailAddress.replace(/[^a-z0-9]/gi, '_')}.html`;
    const emailFilePath = path.join(campaignFolder, emailFileName);
    fs.writeFileSync(emailFilePath, compiledHtml);

    // 2. Nodemailer Real SMTP Attempt
    const isMock = smtpSettings.host.includes('mock') || smtpSettings.password.includes('mock');
    if (!isMock) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpSettings.host,
          port: parseInt(smtpSettings.port),
          secure: smtpSettings.encryption === 'SSL',
          auth: {
            user: smtpSettings.username,
            pass: smtpSettings.password
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        await transporter.sendMail({
          from: `"${smtpSettings.senderName}" <${smtpSettings.senderEmail}>`,
          to: emailAddress,
          subject: compiledSubject,
          html: compiledHtml
        });
        success = true;
      } catch (err) {
        success = false;
        errorMsg = err.message;
      }
    } else {
      // Mock Success/Failure
      success = Math.random() > 0.03; // 97% success in mock mode
    }

    const logMessage = success 
      ? `[${timestamp}] Sent successfully to ${nameVal} (${emailAddress}) [Captured in server/sent_emails/]`
      : `[${timestamp}] Failed sending to ${nameVal} (${emailAddress}) - ${errorMsg}`;

    activeSendingState.logs.unshift(logMessage);

    if (success) {
      newSent++;
    } else {
      newFailed++;
      newFailedList.push(recipient);
    }

    // Insert recipient status log in MySQL
    await pool.query(
      'INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [activeSendingState.campaignId, emailAddress, nameVal, companyVal, success ? 'Sent' : 'Failed', success ? '' : errorMsg, new Date().toISOString()]
    );
  }

  const newRemaining = Math.max(0, activeSendingState.remaining - batchSize);
  
  activeSendingState.sent = newSent;
  activeSendingState.failed = newFailed;
  activeSendingState.remaining = newRemaining;
  activeSendingState.failedList = newFailedList;

  // Sync progress back to Campaigns Table in MySQL
  await pool.query(
    'UPDATE campaigns SET sentCount = ?, failedCount = ? WHERE id = ?;',
    [newSent, newFailed, activeSendingState.campaignId]
  );

  if (newRemaining === 0) {
    await completeCampaignDispatch();
  } else {
    // Schedule next tick
    const delay = (activeSendingState.delayOverride || smtpSettings.delaySeconds || 0.5) * 1000;
    sendingTimer = setTimeout(processQueueStep, delay);
  }
}

async function completeCampaignDispatch() {
  activeSendingState.status = 'completed';
  activeSendingState.remaining = 0;
  activeSendingState.showAdminSummary = true;

  if (sendingTimer) {
    clearTimeout(sendingTimer);
    sendingTimer = null;
  }

  // Update MySQL campaigns status to Completed
  await pool.query(
    'UPDATE campaigns SET status = "Completed", sentCount = ?, failedCount = ? WHERE id = ?;',
    [activeSendingState.sent, activeSendingState.failed, activeSendingState.campaignId]
  );

  await logEvent(
    'System Mailer',
    `Campaign "${activeSendingState.campaignName}" finished sending. (${activeSendingState.sent} Sent, ${activeSendingState.failed} Failed)`,
    activeSendingState.failed > 0 ? 'Warning' : 'Success'
  );

  // Send admin summary report if not mock SMTP
  const smtpSettings = await getSMTPSettings();
  const isMock = smtpSettings.host.includes('mock') || smtpSettings.password.includes('mock');
  if (!isMock && smtpSettings.senderEmail) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: parseInt(smtpSettings.port),
        secure: smtpSettings.encryption === 'SSL',
        auth: {
          user: smtpSettings.username,
          pass: smtpSettings.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const successRate = activeSendingState.total > 0 ? Math.round((activeSendingState.sent / activeSendingState.total) * 100) : 0;
      let htmlReport = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">AeroSend Campaign Dispatch Report</h2>
          <p><strong>Campaign Name:</strong> ${activeSendingState.campaignName}</p>
          <p><strong>Finished At:</strong> ${new Date().toLocaleString()}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr>
              <th style="padding: 8px; border-bottom: 1px solid #eee;">Metric</th>
              <th style="padding: 8px; border-bottom: 1px solid #eee;">Value</th>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">Total Targeted</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${activeSendingState.total}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #059669;">Successfully Sent</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold; color: #059669;">${activeSendingState.sent}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc2626;">Failed / Bounces</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold; color: #dc2626;">${activeSendingState.failed}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">Delivery Success Rate</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold;">${successRate}%</td>
            </tr>
          </table>
      `;

      if (activeSendingState.failedList.length > 0) {
        htmlReport += `
          <h3 style="margin-top: 30px; color: #dc2626;">Bounced/Failed Recipients Detail</h3>
          <ul style="padding-left: 20px; font-family: monospace; font-size: 13px;">
        `;
        activeSendingState.failedList.forEach((item, index) => {
          htmlReport += `<li style="margin-bottom: 5px;">Row ${item.index || index + 1}: <strong>${item.email}</strong> - ${item.reason || 'SMTP timeout/rejection'}</li>`;
        });
        htmlReport += `</ul>`;
      }

      htmlReport += `
          <p style="margin-top: 35px; font-size: 11px; color: #888;">This is an automated delivery summary from your AeroSend platform instance.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"${smtpSettings.senderName}" <${smtpSettings.senderEmail}>`,
        to: smtpSettings.senderEmail,
        subject: `[AeroSend Report] Dispatch: ${activeSendingState.campaignName}`,
        html: htmlReport
      });
    } catch (err) {
      console.error('Failed to dispatch admin notification email:', err);
    }
  }
}

// Launch Endpoint
app.post('/api/sending/launch', async (req, res) => {
  const { campaignId, campaignName, subject, body, recipients, range, concurrency, delay } = req.body;
  
  if (sendingTimer) {
    clearTimeout(sendingTimer);
  }

  let filteredRecipients = [...recipients];
  if (range && range.from && range.to) {
    const startIdx = Math.max(0, parseInt(range.from) - 1);
    const endIdx = Math.min(recipients.length, parseInt(range.to));
    filteredRecipients = recipients.slice(startIdx, endIdx);
  }

  const totalCount = filteredRecipients.length;

  activeSendingState = {
    campaignId,
    campaignName,
    subject: subject || '',
    body: body || '',
    total: totalCount,
    sent: 0,
    failed: 0,
    remaining: totalCount,
    status: 'sending',
    logs: [`[${new Date().toLocaleTimeString()}] Starting Campaign transmission (simulating ${concurrency} parallel thread(s))...`],
    failedList: [],
    recipientData: filteredRecipients,
    mappedFields: req.body.mappedFields || { name: 'name', email: 'email', company: 'company' },
    concurrency: parseInt(concurrency) || 1,
    delayOverride: parseFloat(delay) || 0.5,
    showAdminSummary: false,
    rangeIndex: range
  };

  // Update DB status to Sending
  await pool.query(
    'UPDATE campaigns SET status = "Sending", sentCount = 0, failedCount = 0, recipientsCount = ? WHERE id = ?;',
    [totalCount, campaignId]
  );

  await logEvent(
    'System Queue',
    `Launched Campaign "${campaignName}" targeting ${totalCount} recipients.`,
    'Success'
  );

  // Start sending loop
  const smtpSettings = await getSMTPSettings();
  const initDelay = (activeSendingState.delayOverride || smtpSettings.delaySeconds || 0.5) * 1000;
  sendingTimer = setTimeout(processQueueStep, initDelay);

  res.json({ success: true });
});

app.get('/api/sending/active', (req, res) => {
  res.json(activeSendingState);
});

app.post('/api/sending/pause', async (req, res) => {
  if (sendingTimer) {
    clearTimeout(sendingTimer);
    sendingTimer = null;
  }
  activeSendingState.status = 'paused';
  activeSendingState.logs.unshift(`[${new Date().toLocaleTimeString()}] Transmission paused by user.`);
  await logEvent('Administrator', `Paused Campaign "${activeSendingState.campaignName}"`, 'Success');
  res.json({ success: true });
});

app.post('/api/sending/resume', async (req, res) => {
  activeSendingState.status = 'sending';
  activeSendingState.logs.unshift(`[${new Date().toLocaleTimeString()}] Transmission resumed.`);
  await logEvent('Administrator', `Resumed Campaign "${activeSendingState.campaignName}"`, 'Success');
  
  const smtpSettings = await getSMTPSettings();
  const initDelay = (activeSendingState.delayOverride || smtpSettings.delaySeconds || 0.5) * 1000;
  sendingTimer = setTimeout(processQueueStep, initDelay);
  
  res.json({ success: true });
});

app.post('/api/sending/stop', async (req, res) => {
  if (sendingTimer) {
    clearTimeout(sendingTimer);
    sendingTimer = null;
  }
  
  activeSendingState.status = 'stopped';
  activeSendingState.remaining = 0;
  activeSendingState.logs.unshift(`[${new Date().toLocaleTimeString()}] Transmission terminated by user.`);
  
  await pool.query(
    'UPDATE campaigns SET status = "Completed", sentCount = ?, failedCount = ? WHERE id = ?;',
    [activeSendingState.sent, activeSendingState.failed, activeSendingState.campaignId]
  );

  await logEvent('Administrator', `Stopped Campaign "${activeSendingState.campaignName}"`, 'Warning');
  res.json({ success: true });
});

app.post('/api/sending/retry', async (req, res) => {
  if (activeSendingState.failedList.length === 0) {
    return res.status(400).json({ error: 'No failed recipients to retry.' });
  }

  const toRetry = [...activeSendingState.failedList];
  const totalCount = toRetry.length;

  const resetRetryList = toRetry.map(item => ({
    ...item,
    status: item.status === 'Invalid' ? 'Invalid' : 'Valid'
  }));

  activeSendingState.total = activeSendingState.total + totalCount;
  activeSendingState.remaining = totalCount;
  activeSendingState.failed = activeSendingState.failed - totalCount;
  activeSendingState.status = 'sending';
  activeSendingState.logs.unshift(`[${new Date().toLocaleTimeString()}] Retrying ${totalCount} failed emails...`);
  activeSendingState.failedList = [];
  activeSendingState.recipientData = [...activeSendingState.recipientData, ...resetRetryList];

  await logEvent('Administrator', `Retrying ${totalCount} failed emails.`, 'Success');

  const smtpSettings = await getSMTPSettings();
  const initDelay = (activeSendingState.delayOverride || smtpSettings.delaySeconds || 0.5) * 1000;
  sendingTimer = setTimeout(processQueueStep, initDelay);

  res.json({ success: true });
});

app.post('/api/sending/dismiss-summary', (req, res) => {
  activeSendingState.showAdminSummary = false;
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
