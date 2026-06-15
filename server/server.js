import express from 'express';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}
function isPasswordMasked(password) {
  if (!password) return true;
  if (password === '••••••••') return true;
  if (password.includes('•') || password.includes('●')) return true;
  return /^[•*]+$/.test(password);
}
import path from 'path';
import dotenv from 'dotenv';
import pool from './db.js';
import jwt from 'jsonwebtoken';
import dns from 'dns/promises';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Security and Performance Middlewares
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false // Allow dynamic scripts/Vite during local development/production integration
}));
app.use(compression());

// Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Configure Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

const testEmailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many test email requests. Please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/campaigns/send-test', testEmailLimiter);

const JWT_SECRET = process.env.JWT_SECRET || (
  console.warn('⚠️  JWT_SECRET environment variable is not set. Generating a temporary random key for this session.'),
  crypto.randomBytes(32).toString('hex')
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    const isAllowedFrontend = origin === (process.env.FRONTEND_URL || 'http://localhost:5173');
    const isRender = process.env.RENDER_EXTERNAL_HOSTNAME && origin.includes(process.env.RENDER_EXTERNAL_HOSTNAME);
    const isRenderSubdomain = origin.includes('onrender.com');
    if (isLocalhost || isAllowedFrontend || isRender || isRenderSubdomain) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Authentication token missing.' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authenticated session required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access Forbidden. You do not have permissions for this action.' });
    }
    next();
  };
}

// Global API Interceptor for authentication
app.use((req, res, next) => {
  // Normalize path to prevent double slashes (e.g. /api//auth/login) or trailing slashes (e.g. /api/auth/login/)
  const normalizedPath = req.path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

  // Allow non-API routes (frontend routes, assets) to bypass authentication check
  if (!normalizedPath.startsWith('/api')) {
    return next();
  }

  const publicPaths = [
    '/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/tracker/click',
    '/api/unsubscribe/confirm'
  ];
  
  const isPublic = publicPaths.includes(normalizedPath) || 
                   normalizedPath.startsWith('/api/tracker/open/') || 
                   normalizedPath.startsWith('/api/unsubscribe/');
                   
  if (isPublic) {
    return next();
  }
  
  authenticateToken(req, res, next);
});

// Setup file capture folders
const sentEmailsDir = path.join(process.cwd(), 'server', 'sent_emails');
if (!fs.existsSync(sentEmailsDir)) {
  fs.mkdirSync(sentEmailsDir, { recursive: true });
}

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    // Check DB connectivity
    await pool.query('SELECT 1;');
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
});

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

// Helper to log audit events into database
async function logEvent(user, action, status = 'Success', campaignId = null, extraFields = {}) {
  const id = 'l' + Math.random().toString(36).substr(2, 9);
  const date = new Date().toISOString();
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        id, date, user, action, status, campaignId, campaignName, subject, body, senderEmail, recipientCount, deliveryStatus, openStatus, failureDetails, deletedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [
        id,
        date,
        user,
        action,
        status,
        campaignId,
        extraFields.campaignName || null,
        extraFields.subject || null,
        extraFields.body || null,
        extraFields.senderEmail || null,
        extraFields.recipientCount || 0,
        extraFields.deliveryStatus || null,
        extraFields.openStatus || 'Not Opened',
        extraFields.failureDetails || null
      ]
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

// 1b. Fetch single campaign
app.get('/api/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?;', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Save campaign
app.post('/api/campaigns', async (req, res) => {
  const { id, name, subject, body, status, date, creator, recipientsCount, scheduleDate, recipients, mappedFields, smtpUsed } = req.body;
  try {
    await pool.query(
      `INSERT INTO campaigns (id, name, subject, body, status, date, creator, recipientsCount, sentCount, failedCount, smtpUsed, sendTime, completionTime, scheduleDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NULL, NULL, ?);`,
      [id, name, subject, body, status, date, creator, recipientsCount, smtpUsed || 'default', scheduleDate || null]
    );

    if (recipients && Array.isArray(recipients) && mappedFields) {
      for (const rec of recipients) {
        const emailAddress = rec.email;
        const nameVal = rec.data[mappedFields.name] || 'Customer';
        const companyVal = rec.data[mappedFields.company] || 'Enterprise';
        await pool.query(
          `INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt)
           VALUES (?, ?, ?, ?, 'Pending', '', '');`,
          [id, emailAddress, nameVal, companyVal]
        );
      }
    }

    await logEvent(creator, `Created Campaign "${name}"`, 'Success', id, { campaignName: name, subject, body, recipientCount: recipientsCount });
    res.json({ success: true, campaignId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete campaign (With Cascade cleans)
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

// 3b. Cancel campaign scheduling
app.post('/api/campaigns/:id/cancel-schedule', async (req, res) => {
  const { id } = req.params;
  try {
    const [camp] = await pool.query('SELECT name FROM campaigns WHERE id = ?;', [id]);
    if (camp.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const campaignName = camp[0].name;

    await pool.query(
      `UPDATE campaigns SET status = 'Draft', scheduleDate = NULL WHERE id = ?;`,
      [id]
    );

    await pool.query(
      `DELETE FROM recipients WHERE campaignId = ?;`,
      [id]
    );

    await logEvent('Administrator', `Cancelled Scheduling for Campaign "${campaignName}"`, 'Success', id, { campaignName });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3c. Reschedule campaign
app.post('/api/campaigns/:id/update-schedule', async (req, res) => {
  const { id } = req.params;
  const { scheduleDate } = req.body;
  try {
    const [camp] = await pool.query('SELECT name FROM campaigns WHERE id = ?;', [id]);
    if (camp.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const campaignName = camp[0].name;

    await pool.query(
      `UPDATE campaigns SET scheduleDate = ? WHERE id = ?;`,
      [scheduleDate, id]
    );

    await logEvent(
      'Administrator', 
      `Rescheduled Campaign "${campaignName}" to ${new Date(scheduleDate).toLocaleString()}`, 
      'Success', 
      id, 
      { campaignName, scheduleDate }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/debug-settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT password FROM settings WHERE id = 1;');
    const pass = rows[0] ? rows[0].password : null;
    res.json({
      exists: !!pass,
      length: pass ? pass.length : 0,
      hasBullets1: pass ? pass.includes('•') : false,
      hasBullets2: pass ? pass.includes('●') : false,
      prefix: pass ? pass.substring(0, 8) : '',
      isMasked: pass ? isPasswordMasked(pass) : true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Fetch SMTP Settings (with masked password for security)
app.get('/api/settings', requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1;');
    const config = rows[0] || {};
    if (config.password) {
      config.password = '••••••••';
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update SMTP Settings
app.post('/api/settings', requireRole('Admin'), async (req, res) => {
  const { host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts } = req.body;
  try {
    const isMasked = isPasswordMasked(password);
    if (isMasked) {
      // Retain existing password in database
      await pool.query(
        `UPDATE settings SET 
          host = ?, port = ?, username = ?, encryption = ?, 
          senderEmail = ?, senderName = ?, emailsPerHour = ?, emailsPerDay = ?, 
          delaySeconds = ?, connectionTimeout = ?, retryAttempts = ? 
         WHERE id = 1;`,
        [host, port, username, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts]
      );
    } else {
      // Update with new password
      await pool.query(
        `UPDATE settings SET 
          host = ?, port = ?, username = ?, password = ?, encryption = ?, 
          senderEmail = ?, senderName = ?, emailsPerHour = ?, emailsPerDay = ?, 
          delaySeconds = ?, connectionTimeout = ?, retryAttempts = ? 
         WHERE id = 1;`,
        [host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts]
      );
    }
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
app.get('/api/users', requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user
app.post('/api/users', requireRole('Admin'), async (req, res) => {
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
app.put('/api/users/:id', requireRole('Admin'), async (req, res) => {
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
app.patch('/api/users/:id/status', requireRole('Admin'), async (req, res) => {
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
app.delete('/api/users/:id', requireRole('Admin'), async (req, res) => {
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
  let { host, port, username, password, encryption } = req.body;
  
  const isMasked = isPasswordMasked(password);
  if (isMasked) {
    const [rows] = await pool.query('SELECT password FROM settings WHERE id = 1;');
    if (rows[0] && rows[0].password) {
      password = rows[0].password;
    }
  }
  
  if (host.includes('mock') || (password && password.includes('mock'))) {
    // Simulate latency for mock verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    return res.json({ success: true, isMock: true, message: 'Mock SMTP verification successful.' });
  }

  try {
    const result = await verifyCredentials(host, port, username, password, encryption);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7b. Send Test Email (Real and Mock delivery)
app.post('/api/campaigns/send-test', async (req, res) => {
  const { testEmail, subject, body, smtpUsed } = req.body;
  try {
    const smtpSettings = await getSMTPSettings(smtpUsed);
    const isMock = smtpSettings.host.includes('mock') || smtpSettings.password.includes('mock');

    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await logEvent('Administrator', `Sent simulated test email to ${testEmail}`, 'Success');
      return res.json({ success: true, isMock: true, message: 'Mock test email sent successfully.' });
    }

    // Compile templates with sample user info
    const sampleName = 'Test Recipient';
    const sampleCompany = 'AeroSend Sandbox';
    
    const compiledSubject = (subject || '')
      .replace(/{{name}}/g, sampleName)
      .replace(/{{email}}/g, testEmail)
      .replace(/{{company}}/g, sampleCompany);

    const isHtml = /<\/?[a-z][\s\S]*>/i.test(body || '');
    const compiledBody = (body || '')
      .replace(/{{name}}/g, sampleName)
      .replace(/{{email}}/g, testEmail)
      .replace(/{{company}}/g, sampleCompany);

    const formattedBody = isHtml ? compiledBody : compiledBody
      .replace(/\n\n/g, '</p><p style="margin-top: 10px; margin-bottom: 10px;">')
      .replace(/\n/g, '<br/>');

    const htmlBody = isHtml ? compiledBody : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; min-height: 320px; background-color: #f8fafc; color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; padding: 24px; font-size: 14px; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <!-- Header Logo Simulation -->
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
            <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">A</div>
            <span style="font-size: 14px; font-weight: bold; color: #0f172a;">AeroSend System</span>
          </div>
 
          <div style="color: #0f172a;">
            <p style="margin: 0 0 12px 0;">${formattedBody}</p>
          </div>

          <div style="margin-top: 30px; padding-top: 15px; font-size: 11px; text-align: center; border-top: 1px solid #f1f5f9; color: #64748b;">
            You are receiving this email because you are registered under ${sampleName}.<br/>
            AeroSend Inc, 100 Pine St, San Francisco, CA. <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
          </div>
        </div>
      </div>
    `;

    await sendEmailViaConfig(smtpSettings, testEmail, `[Test] ${compiledSubject}`, htmlBody);

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

  // Validate CSV extension and MIME type to block malicious uploads
  const allowedExtensions = ['.csv'];
  const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/x-csv', 'application/vnd.msexcel'];
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExt) && !allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file format. Only CSV files are allowed.' });
  }

  const csvText = req.file.buffer.toString('utf8');
  res.json({ csvText });
});

// Sending Simulation Queue Thread

// Fetch SMTP settings helper
async function getSMTPSettings(profileId = null) {
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || '587',
      username: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      encryption: process.env.SMTP_SECURE === 'true' ? 'SSL' : 'TLS',
      senderEmail: process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER,
      senderName: process.env.SMTP_SENDER_NAME || 'System Mailer',
      emailsPerHour: parseInt(process.env.SMTP_EMAILS_PER_HOUR) || 5000,
      emailsPerDay: parseInt(process.env.SMTP_EMAILS_PER_DAY) || 50000,
      delaySeconds: parseFloat(process.env.SMTP_DELAY_SECONDS) || 0.5,
      connectionTimeout: parseInt(process.env.SMTP_TIMEOUT) || 10,
      retryAttempts: parseInt(process.env.SMTP_RETRY_ATTEMPTS) || 3
    };
  }
  
  if (profileId && profileId !== 'default' && profileId !== 'Local Mock') {
    const [rows] = await pool.query('SELECT * FROM smtp_configs WHERE id = ?;', [profileId]);
    if (rows && rows.length > 0) {
      const cfg = rows[0];
      const [limitRows] = await pool.query('SELECT emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts FROM settings WHERE id = 1;');
      const limits = limitRows[0] || {};
      return {
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        password: cfg.password,
        encryption: cfg.encryption,
        senderEmail: cfg.sender_email,
        senderName: cfg.sender_name,
        emailsPerHour: limits.emailsPerHour || 5000,
        emailsPerDay: limits.emailsPerDay || 50000,
        delaySeconds: limits.delaySeconds || 0.5,
        connectionTimeout: limits.connectionTimeout || 10,
        retryAttempts: limits.retryAttempts || 3
      };
    }
  }
  
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1;');
  return rows[0];
}

// Intercept email sending to route via HTTP APIs if provider matches
async function sendEmailViaConfig(smtpSettings, to, subject, html) {
  const host = (smtpSettings.host || '').toLowerCase();
  const isResend = host.includes('resend');
  const isSendGrid = host.includes('sendgrid');
  const password = smtpSettings.password || '';

  if (isPasswordMasked(password)) {
    throw new Error('SMTP password is not configured or is invalid (contains bullet characters). Please go to Settings, re-enter your actual password/API key, and save.');
  }

  if (isResend) {
    const apiKey = smtpSettings.password;
    const fromStr = smtpSettings.senderName 
      ? `"${smtpSettings.senderName}" <${smtpSettings.senderEmail}>`
      : smtpSettings.senderEmail;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromStr,
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend HTTP API failed: ${res.status} - ${errText}`);
    }
    return { success: true, provider: 'Resend' };
  } else if (isSendGrid) {
    const apiKey = smtpSettings.password;
    const fromObj = {
      email: smtpSettings.senderEmail
    };
    if (smtpSettings.senderName) {
      fromObj.name = smtpSettings.senderName;
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: fromObj,
        subject: subject,
        content: [{ type: 'text/html', value: html }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid HTTP API failed: ${res.status} - ${errText}`);
    }
    return { success: true, provider: 'SendGrid' };
  } else {
    // Standard SMTP fallback via Nodemailer
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
      to: to,
      subject: subject,
      html: html
    });
    return { success: true, provider: 'Nodemailer' };
  }
}

async function verifyCredentials(host, port, username, password, encryption) {
  if (isPasswordMasked(password)) {
    throw new Error('SMTP password is not configured or is invalid (contains bullet characters). Please go to Settings, re-enter your actual password/API key, and save.');
  }

  const hostLower = (host || '').toLowerCase();
  const isResend = hostLower.includes('resend');
  const isSendGrid = hostLower.includes('sendgrid');

  if (isResend) {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${password}`
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API key verification failed: ${res.status} - ${errText}`);
    }
    return { success: true, isMock: false, provider: 'Resend' };
  } else if (isSendGrid) {
    const res = await fetch('https://api.sendgrid.com/v3/scopes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${password}`
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid API key verification failed: ${res.status} - ${errText}`);
    }
    return { success: true, isMock: false, provider: 'SendGrid' };
  } else {
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
    return { success: true, isMock: false, provider: 'SMTP' };
  }
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
function compileBodyToHtml(bodyText, recipient, nameVal, companyVal, emailAddress, contactId = 'unknown', token = 'default') {
  const compiledText = compileTemplate(bodyText, recipient, nameVal, companyVal, emailAddress);
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(bodyText || '');

  if (isHtml) {
    return compiledText;
  }

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
          AeroSend Inc, 100 Pine St, San Francisco, CA. <a href="http://localhost:5000/api/unsubscribe/${contactId}/${token}" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
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

  const smtpSettings = await getSMTPSettings(activeSendingState.smtpUsed);
  const batchSize = Math.min(activeSendingState.concurrency || 1, activeSendingState.remaining);
  let newSent = activeSendingState.sent;
  let newFailed = activeSendingState.failed;
  const newFailedList = [...activeSendingState.failedList];

  for (let i = 0; i < batchSize; i++) {
    const index = currentRecipientIndex + i;
    if (index >= activeSendingState.recipientData.length) break;

    const recipient = activeSendingState.recipientData[index];
    const emailAddress = recipient.email;

    // Support both immediate sending (from frontend CSV) and scheduled sending (from DB)
    let nameVal;
    let companyVal;
    
    if (recipient.data && activeSendingState.mappedFields) {
      nameVal = recipient.data[activeSendingState.mappedFields.name] || 'Customer';
      companyVal = recipient.data[activeSendingState.mappedFields.company] || 'Enterprise';
    } else {
      nameVal = recipient.name || 'Customer';
      companyVal = recipient.company || 'Enterprise';
    }

    const isInvalid = recipient.status === 'Invalid';
    const timestamp = new Date().toLocaleTimeString();

    if (isInvalid) {
      const logMessage = `[${timestamp}] Skipped invalid email user: ${nameVal} (${emailAddress || 'missing'})`;
      activeSendingState.logs.unshift(logMessage);
      newFailed++;
      newFailedList.push(recipient);
      
      // Update recipient status in DB
      if (recipient.id) {
        await pool.query(
          'UPDATE recipients SET status = ?, reason = ?, sentAt = ? WHERE id = ?;',
          ['Skipped', 'Invalid Email Syntax', new Date().toISOString(), recipient.id]
        );
      } else {
        await pool.query(
          'INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [activeSendingState.campaignId, emailAddress, nameVal, companyVal, 'Skipped', 'Invalid Email Syntax', new Date().toISOString()]
        );
      }
      continue;
    }

    // Try real send or local HTML write
    let success;
    let errorMsg = 'SMTP delivery timeout';

    // 1. Local HTML Capture write (Verification folder)
    const sanitizedCampName = activeSendingState.campaignName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const campaignFolder = path.join(sentEmailsDir, sanitizedCampName);
    if (!fs.existsSync(campaignFolder)) {
      fs.mkdirSync(campaignFolder, { recursive: true });
    }

    // Lookup contact for unsubscribe token & id mapping
    let contactId = 'unknown';
    let token = 'default';
    try {
      const [contactRows] = await pool.query('SELECT id, unsubscribe_token FROM contacts WHERE email = ? LIMIT 1;', [emailAddress]);
      if (contactRows && contactRows.length > 0) {
        contactId = contactRows[0].id;
        token = contactRows[0].unsubscribe_token;
      }
    } catch (dbErr) {
      console.error('Failed contact lookup for tracking:', dbErr.message);
    }

    // Compile message templates
    const compiledSubject = compileTemplate(activeSendingState.subject, recipient, nameVal, companyVal, emailAddress);
    let compiledHtml = compileBodyToHtml(activeSendingState.body, recipient, nameVal, companyVal, emailAddress, contactId, token);
    
    // Inject click tracking for other links
    compiledHtml = compiledHtml.replace(/href="([^"]+)"/g, (match, url) => {
      if (url.includes('/api/unsubscribe/') || url === '#') {
        return match;
      }
      return `href="http://localhost:5000/api/tracker/click?recipient=${recipient.id || 'unknown'}&url=${encodeURIComponent(url)}"`;
    });
    
    // Inject open tracking GIF before body tag ends
    compiledHtml = compiledHtml + `\n<!-- Open Tracker --><img src="http://localhost:5000/api/tracker/open/${recipient.id || 'unknown'}.gif" width="1" height="1" style="display:none;" />`;
    
    const emailFileName = `${index + 1}_${emailAddress.replace(/[^a-z0-9]/gi, '_')}.html`;
    const emailFilePath = path.join(campaignFolder, emailFileName);
    fs.writeFileSync(emailFilePath, compiledHtml);

    // 2. HTTP Send or Nodemailer Real SMTP Attempt
    const isMock = smtpSettings.host.includes('mock') || smtpSettings.password.includes('mock');
    if (!isMock) {
      const maxRetries = parseInt(smtpSettings.retryAttempts) || 3;
      let attempt = 0;
      success = false;

      while (attempt < maxRetries && !success) {
        try {
          await sendEmailViaConfig(smtpSettings, emailAddress, compiledSubject, compiledHtml);
          success = true;
        } catch (err) {
          attempt++;
          errorMsg = err.message;
          if (attempt < maxRetries) {
            console.warn(`[Queue Retry] Temporary failure sending to ${emailAddress} (Attempt ${attempt}/${maxRetries}): ${errorMsg}. Retrying in 1s...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
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

    // Insert/Update recipient status log in MySQL
    if (recipient.id) {
      await pool.query(
        'UPDATE recipients SET status = ?, reason = ?, sentAt = ? WHERE id = ?;',
        [success ? 'Sent' : 'Failed', success ? '' : errorMsg, new Date().toISOString(), recipient.id]
      );
    } else {
      await pool.query(
        'INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [activeSendingState.campaignId, emailAddress, nameVal, companyVal, success ? 'Sent' : 'Failed', success ? '' : errorMsg, new Date().toISOString()]
      );
    }
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

  const completionTime = new Date().toISOString();
  // Update MySQL campaigns status to Completed with completionTime
  await pool.query(
    'UPDATE campaigns SET status = "Completed", sentCount = ?, failedCount = ?, completionTime = ? WHERE id = ?;',
    [activeSendingState.sent, activeSendingState.failed, completionTime, activeSendingState.campaignId]
  );

  const smtpSettings = await getSMTPSettings(activeSendingState.smtpUsed);
  await logEvent(
    'System Mailer',
    `Campaign "${activeSendingState.campaignName}" finished sending. (${activeSendingState.sent} Sent, ${activeSendingState.failed} Failed)`,
    activeSendingState.failed > 0 ? 'Warning' : 'Success',
    activeSendingState.campaignId,
    {
      campaignName: activeSendingState.campaignName,
      subject: activeSendingState.subject,
      body: activeSendingState.body,
      senderEmail: smtpSettings.senderEmail || 'system@aerosend.com',
      recipientCount: activeSendingState.total,
      deliveryStatus: activeSendingState.failed > 0 ? 'Completed with Warnings' : 'Completed',
      openStatus: 'Not Opened',
      failureDetails: activeSendingState.failed > 0 ? `${activeSendingState.failed} email(s) bounced or failed.` : null
    }
  );

  // Send admin summary report if not mock SMTP
  const isMock = smtpSettings.host.includes('mock') || smtpSettings.password.includes('mock');
  if (!isMock && smtpSettings.senderEmail) {
    try {
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

      await sendEmailViaConfig(smtpSettings, smtpSettings.senderEmail, `[AeroSend Report] Dispatch: ${activeSendingState.campaignName}`, htmlReport);
    } catch (err) {
      console.error('Failed to dispatch admin notification email:', err);
    }
  }
}

async function resumeInterruptedCampaigns() {
  try {
    const [runningCampaigns] = await pool.query(
      "SELECT * FROM campaigns WHERE status = 'Sending';"
    );
    
    if (runningCampaigns && runningCampaigns.length > 0) {
      console.log(`[Startup Recovery] Found ${runningCampaigns.length} interrupted campaign(s) in "Sending" status.`);
      
      for (const campaign of runningCampaigns) {
        const [recipients] = await pool.query(
          "SELECT * FROM recipients WHERE campaignId = ? ORDER BY id ASC;",
          [campaign.id]
        );
        
        const sentCount = recipients.filter(r => r.status === 'Sent').length;
        const failedCount = recipients.filter(r => r.status === 'Failed').length;
        const skippedCount = recipients.filter(r => r.status === 'Skipped').length;
        
        const remainingRecipients = recipients.filter(r => r.status !== 'Sent' && r.status !== 'Failed' && r.status !== 'Skipped');
        
        console.log(`[Startup Recovery] Resuming campaign "${campaign.name}" (${campaign.id}): Already Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}, Remaining: ${remainingRecipients.length}`);
        
        if (remainingRecipients.length === 0) {
          const completionTime = new Date().toISOString();
          await pool.query(
            "UPDATE campaigns SET status = 'Completed', completionTime = ? WHERE id = ?;",
            [completionTime, campaign.id]
          );
          continue;
        }
        
        if (activeSendingState.status === 'idle') {
          const smtpSettings = await getSMTPSettings(campaign.smtpUsed);
          activeSendingState = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            subject: campaign.subject || '',
            body: campaign.body || '',
            total: recipients.length,
            sent: sentCount + skippedCount,
            failed: failedCount,
            remaining: remainingRecipients.length,
            status: 'sending',
            logs: [`[${new Date().toLocaleTimeString()}] Resuming interrupted campaign sending loop after system restart...`],
            failedList: recipients.filter(r => r.status === 'Failed'),
            recipientData: recipients,
            mappedFields: { name: 'name', email: 'email', company: 'company' },
            concurrency: 1,
            delayOverride: smtpSettings.delaySeconds || 0.5,
            showAdminSummary: false,
            smtpUsed: campaign.smtpUsed || 'default'
          };
          
          const initDelay = (activeSendingState.delayOverride || smtpSettings.delaySeconds || 0.5) * 1000;
          sendingTimer = setTimeout(processQueueStep, initDelay);
          break;
        }
      }
    }
  } catch (err) {
    console.error('[Startup Recovery Error]:', err.message);
  }
}

// Launch Endpoint
app.post('/api/sending/launch', async (req, res) => {
  const { campaignId, campaignName, subject, body, recipients, range, concurrency, delay, smtpUsed } = req.body;
  
  if (activeSendingState.status === 'sending') {
    return res.status(400).json({ error: 'Another campaign is currently sending. Please pause or stop the active campaign first.' });
  }

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
    rangeIndex: range,
    smtpUsed: smtpUsed || 'default'
  };

  const smtpSettings = await getSMTPSettings(smtpUsed);
  const sendTime = new Date().toISOString();

  // Update DB status to Sending with SMTP metadata and Send Time
  await pool.query(
    'UPDATE campaigns SET status = "Sending", sentCount = 0, failedCount = 0, recipientsCount = ?, smtpUsed = ?, sendTime = ? WHERE id = ?;',
    [totalCount, smtpUsed || 'default', sendTime, campaignId]
  );

  await logEvent(
    'System Queue',
    `Launched Campaign "${campaignName}" targeting ${totalCount} recipients.`,
    'Success',
    campaignId,
    {
      campaignName,
      subject: subject || '',
      body: body || '',
      senderEmail: smtpSettings.senderEmail || 'system@aerosend.com',
      recipientCount: totalCount,
      deliveryStatus: 'Sending',
      openStatus: 'Not Opened'
    }
  );

  // Start sending loop
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
  
  const smtpSettings = await getSMTPSettings(activeSendingState.smtpUsed);
  await logEvent(
    'Administrator', 
    `Paused Campaign "${activeSendingState.campaignName}"`, 
    'Success',
    activeSendingState.campaignId,
    {
      campaignName: activeSendingState.campaignName,
      subject: activeSendingState.subject,
      body: activeSendingState.body,
      senderEmail: smtpSettings.senderEmail || 'system@aerosend.com',
      recipientCount: activeSendingState.total,
      deliveryStatus: 'Paused'
    }
  );
  res.json({ success: true });
});

app.post('/api/sending/resume', async (req, res) => {
  activeSendingState.status = 'sending';
  activeSendingState.logs.unshift(`[${new Date().toLocaleTimeString()}] Transmission resumed.`);
  
  const smtpSettings = await getSMTPSettings(activeSendingState.smtpUsed);
  await logEvent(
    'Administrator', 
    `Resumed Campaign "${activeSendingState.campaignName}"`, 
    'Success',
    activeSendingState.campaignId,
    {
      campaignName: activeSendingState.campaignName,
      subject: activeSendingState.subject,
      body: activeSendingState.body,
      senderEmail: smtpSettings.senderEmail || 'system@aerosend.com',
      recipientCount: activeSendingState.total,
      deliveryStatus: 'Sending'
    }
  );
  
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
  
  const completionTime = new Date().toISOString();
  await pool.query(
    'UPDATE campaigns SET status = "Completed", sentCount = ?, failedCount = ?, completionTime = ? WHERE id = ?;',
    [activeSendingState.sent, activeSendingState.failed, completionTime, activeSendingState.campaignId]
  );

  const smtpSettings = await getSMTPSettings(activeSendingState.smtpUsed);
  await logEvent(
    'Administrator', 
    `Stopped Campaign "${activeSendingState.campaignName}"`, 
    'Warning',
    activeSendingState.campaignId,
    {
      campaignName: activeSendingState.campaignName,
      subject: activeSendingState.subject,
      body: activeSendingState.body,
      senderEmail: smtpSettings.senderEmail || 'system@aerosend.com',
      recipientCount: activeSendingState.total,
      deliveryStatus: 'Stopped',
      openStatus: 'Not Opened',
      failureDetails: `Stopped by Administrator after sending ${activeSendingState.sent} email(s).`
    }
  );
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

  await logEvent('Administrator', `Retrying ${totalCount} failed emails.`, 'Success', activeSendingState.campaignId);

  const smtpSettings = await getSMTPSettings(activeSendingState.smtpUsed);
  const initDelay = (activeSendingState.delayOverride || smtpSettings.delaySeconds || 0.5) * 1000;
  sendingTimer = setTimeout(processQueueStep, initDelay);

  res.json({ success: true });
});

app.post('/api/sending/dismiss-summary', (req, res) => {
  activeSendingState.showAdminSummary = false;
  res.json({ success: true });
});

// 12. Fetch recipients logs for a specific campaign
app.get('/api/campaigns/:id/recipients', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM recipients WHERE campaignId = ? ORDER BY id ASC;', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Delete a single audit log entry (soft/permanent)
app.delete('/api/logs/:id', async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query; // 'true' or 'false'
  try {
    if (permanent === 'true') {
      await pool.query('DELETE FROM audit_logs WHERE id = ?;', [id]);
    } else {
      const deletedAt = new Date().toISOString();
      await pool.query('UPDATE audit_logs SET deletedAt = ? WHERE id = ?;', [deletedAt, id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Bulk delete audit logs (soft/permanent)
app.post('/api/logs/delete-bulk', async (req, res) => {
  const { ids, permanent } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }
  try {
    if (permanent) {
      for (const id of ids) {
        await pool.query('DELETE FROM audit_logs WHERE id = ?;', [id]);
      }
    } else {
      const deletedAt = new Date().toISOString();
      for (const id of ids) {
        await pool.query('UPDATE audit_logs SET deletedAt = ? WHERE id = ?;', [deletedAt, id]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Bulk restore audit logs
app.post('/api/logs/restore-bulk', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }
  try {
    for (const id of ids) {
      await pool.query('UPDATE audit_logs SET deletedAt = NULL WHERE id = ?;', [id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Clear dispatch history for a campaign (all recipients & logs, resets campaign statistics)
app.delete('/api/campaigns/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM recipients WHERE campaignId = ?;', [id]);
    await pool.query('DELETE FROM audit_logs WHERE campaignId = ?;', [id]);
    await pool.query('UPDATE campaigns SET sentCount = 0, failedCount = 0, status = "Draft", smtpUsed = NULL, sendTime = NULL, completionTime = NULL WHERE id = ?;', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?;', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user email. Access Denied.' });
    }
    const user = rows[0];

    // Verify password
    if (!bcrypt.compareSync(password || '', user.password)) {
      return res.status(401).json({ error: 'Incorrect password. Access Denied.' });
    }

    if (user.status === 'Pending') {
      return res.status(403).json({ error: 'Your registration is pending approval by an administrator.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields (Name, Email, and Password).' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?;', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const userId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    const hashedPassword = hashPassword(password);
    const role = 'Operator';
    const status = 'Pending';
    const avatar = '/male_boy_avatar.png'; // default avatar

    await pool.query(
      'INSERT INTO users (id, name, email, password, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [userId, name, email, hashedPassword, role, status, avatar]
    );

    // Send email alert to admin
    try {
      const [settingsRows] = await pool.query('SELECT * FROM settings WHERE id = 1;');
      if (settingsRows.length > 0) {
        const settings = settingsRows[0];
        const transporter = nodemailer.createTransport({
          host: settings.host,
          port: parseInt(settings.port),
          secure: settings.encryption === 'SSL',
          auth: {
            user: settings.username,
            pass: settings.password
          }
        });

        const mailOptions = {
          from: `"${settings.senderName || 'AeroSend'}" <${settings.senderEmail || 'sandbox@aerosend.local'}>`,
          to: 'vaibhavsoni1059@gmail.com',
          subject: `[AeroSend] New User Registration Pending Approval: ${name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #4f46e5; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-top: 0;">AeroSend User Registration Request</h2>
              <p>Hello Admin,</p>
              <p>A new user has signed up for the AeroSend platform and is currently <strong>Pending Approval</strong>:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;">Full Name:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email Address:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;"><a href="mailto:${email}" style="color: #4f46e5; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: bold; color: #64748b;">Request Date:</td>
                  <td style="padding: 12px 16px; color: #0f172a;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
              <p>To approve or reject this request, please log into your Admin account, go to <strong>Settings</strong>, and open the <strong>Users & Permissions</strong> panel.</p>
              <p style="margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">This is an automated system notification from AeroSend.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Registration approval email sent to Admin for user: ${email}`);
      }
    } catch (mailErr) {
      console.error('Failed to send registration notification email to Admin:', mailErr.message);
    }

    res.status(201).json({ success: true, message: 'Registration submitted successfully. Awaiting administrator approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry tracker: Open rate pixel resolver
app.get('/api/tracker/open/:recipientId.gif', async (req, res) => {
  const { recipientId } = req.params;
  try {
    const openedAt = new Date();
    await pool.query(
      "UPDATE recipients SET status = 'Opened', openedAt = ?, sentAt = ? WHERE id = ? AND status = 'Sent';",
      [openedAt, openedAt.toISOString(), recipientId]
    );
    await logEvent('Tracker Engine', `Recipient ID ${recipientId} opened the email.`, 'Success');
  } catch (err) {
    console.error('[Open Tracker Error]:', err.message);
  }

  const imgBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': imgBuffer.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
  });
  res.end(imgBuffer);
});

// Telemetry tracker: Click redirect handler
app.get('/api/tracker/click', async (req, res) => {
  const { recipient, url } = req.query;
  
  if (!url) {
    return res.status(400).send('Invalid redirect parameters.');
  }

  // Validate URL to prevent Open Redirect/phishing vulnerabilities
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).send('Invalid redirect URL.');
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).send('Unsafe protocol in redirect URL.');
  }

  try {
    if (recipient) {
      const clickedAt = new Date();
      await pool.query(
        "UPDATE recipients SET status = 'Clicked', clickedAt = ?, sentAt = ? WHERE id = ?;",
        [clickedAt, clickedAt.toISOString(), recipient]
      );
      await logEvent('Tracker Engine', `Recipient ID ${recipient} clicked link: ${url}`, 'Success');
    }
  } catch (err) {
    console.error('[Click Tracker Error]:', err.message);
  }

  res.redirect(url);
});

// ─────────────────────────────────────────────────────────────────
// FOLLOW-UP SEQUENCE ROUTES
// ─────────────────────────────────────────────────────────────────

// Create follow-up sequence steps for a campaign
app.post('/api/campaigns/:id/followups', async (req, res) => {
  const { id } = req.params;
  const { sequences } = req.body;
  if (!Array.isArray(sequences) || sequences.length === 0) {
    return res.status(400).json({ error: 'No sequence steps provided.' });
  }
  try {
    await pool.query('DELETE FROM followup_sequences WHERE campaignId = ?;', [id]);
    for (const seq of sequences) {
      const conditionsJson = JSON.stringify(Array.isArray(seq.conditions) ? seq.conditions : [seq.conditions || 'not_opened']);
      const condLogic = (seq.condition_logic || 'AND').toUpperCase();
      await pool.query(
        `INSERT INTO followup_sequences (campaignId, step, delayDays, conditions, condition_logic, subject, body, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending');`,
        [id, seq.step, seq.delayDays, conditionsJson, condLogic, seq.subject, seq.body]
      );
    }
    await logEvent('Vaibhav Soni', `Configured ${sequences.length} follow-up step(s) for campaign ${id}.`, 'Success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get follow-up sequences for a campaign
app.get('/api/campaigns/:id/followups', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM followup_sequences WHERE campaignId = ? ORDER BY step ASC;',
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a single follow-up step
app.put('/api/followups/:id', async (req, res) => {
  const { id } = req.params;
  const { delayDays, conditions, condition_logic, subject, body } = req.body;
  try {
    const conditionsJson = JSON.stringify(Array.isArray(conditions) ? conditions : [conditions || 'not_opened']);
    const condLogic = (condition_logic || 'AND').toUpperCase();
    await pool.query(
      'UPDATE followup_sequences SET delayDays = ?, conditions = ?, condition_logic = ?, subject = ?, body = ? WHERE id = ?;',
      [delayDays, conditionsJson, condLogic, subject, body, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a follow-up step
app.delete('/api/followups/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM followup_sequences WHERE id = ?;', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all follow-up sequences (for dashboard overview)
app.get('/api/followups', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fs.*, c.name as campaignName 
       FROM followup_sequences fs
       LEFT JOIN campaigns c ON fs.campaignId = c.id
       ORDER BY fs.campaignId, fs.step ASC;`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// FOLLOW-UP CRON ENGINE (runs every hour)
// ─────────────────────────────────────────────────────────────────

// Build WHERE clause for a single condition keyword
function conditionToSQL(cond) {
  switch (cond) {
    case 'not_opened':  return "openedAt IS NULL AND status = 'Sent'";
    case 'not_clicked': return "clickedAt IS NULL";
    case 'no_reply':    return "clickedAt IS NULL AND repliedAt IS NULL";
    default:            return "openedAt IS NULL AND status = 'Sent'";
  }
}

async function checkAndSendFollowups() {
  try {
    const [sequences] = await pool.query(
      "SELECT * FROM followup_sequences WHERE status = 'pending' ORDER BY campaignId, step ASC;"
    );
    if (!sequences || sequences.length === 0) return;

    for (const seq of sequences) {
      const [campRows] = await pool.query(
        "SELECT * FROM campaigns WHERE id = ? AND status = 'Completed';",
        [seq.campaignId]
      );
      if (!campRows || campRows.length === 0) continue;

      const campaign = campRows[0];
      const smtpSettings = await getSMTPSettings(campaign.smtpUsed);
      const isMock = smtpSettings.host.includes('mock') || smtpSettings.password.includes('mock');

      const completionTime = campaign.completionTime ? new Date(campaign.completionTime) : null;
      if (!completionTime) continue;

      const now = new Date();
      const triggerTime = new Date(completionTime.getTime() + seq.delayDays * 24 * 60 * 60 * 1000);
      if (now < triggerTime) continue;

      console.log(`[Follow-up Engine] Processing Step ${seq.step} for "${campaign.name}"...`);

      // ── Build multi-condition WHERE clause ──────────────────────
      let conditionsList = ['not_opened'];
      try { conditionsList = JSON.parse(seq.conditions || '["not_opened"]'); } catch { /* ignore parsing errors */ }
      const logic = (seq.condition_logic || 'AND').toUpperCase();
      const condClauses = conditionsList.map(c => `(${conditionToSQL(c)})`).join(` ${logic} `);
      const whereClause = `campaignId = ? AND (${condClauses}) AND followupStep < ?`;
      // ────────────────────────────────────────────────────────────

      const [recipients] = await pool.query(
        `SELECT * FROM recipients WHERE ${whereClause};`,
        [seq.campaignId, seq.step]
      );

      if (!recipients || recipients.length === 0) {
        await pool.query(
          "UPDATE followup_sequences SET status = 'executed', executedAt = ?, sentCount = 0 WHERE id = ?;",
          [now, seq.id]
        );
        await logEvent('Follow-up Engine', `Follow-up Step ${seq.step} for "${campaign.name}": No eligible recipients.`, 'Success');
        continue;
      }

      let followupSent = 0;
      let followupFailed = 0;

      for (const recipient of recipients) {
        const nameVal = recipient.name || 'Customer';
        const companyVal = recipient.company || 'Enterprise';
        const emailAddress = recipient.email;

        const compiledSubject = compileTemplate(seq.subject, { data: recipient }, nameVal, companyVal, emailAddress);
        const compiledHtml = compileBodyToHtml(seq.body, { data: recipient }, nameVal, companyVal, emailAddress, 'unknown', 'default');
        const trackedHtml = compiledHtml + `\n<!-- Follow-up Open Tracker --><img src="http://localhost:5000/api/tracker/open/${recipient.id}.gif" width="1" height="1" style="display:none;" />`;

        let success = false;
        if (!isMock) {
          try {
            await sendEmailViaConfig(smtpSettings, emailAddress, compiledSubject, trackedHtml);
            success = true;
          } catch (err) {
            console.error(`[Follow-up Engine] Failed to send to ${emailAddress}:`, err.message);
          }
        } else {
          success = Math.random() > 0.05;
        }

        if (success) {
          followupSent++;
          await pool.query('UPDATE recipients SET followupStep = ? WHERE id = ?;', [seq.step, recipient.id]);
        } else {
          followupFailed++;
        }
      }

      await pool.query(
        "UPDATE followup_sequences SET status = 'executed', executedAt = ?, sentCount = ? WHERE id = ?;",
        [now, followupSent, seq.id]
      );

      const condLabel = `${conditionsList.join(` ${logic} `)} (${logic})`;
      await logEvent(
        'Follow-up Engine',
        `Follow-up Step ${seq.step} for "${campaign.name}" executed. Sent: ${followupSent}, Failed: ${followupFailed}. Conditions: [${condLabel}].`,
        followupFailed > 0 ? 'Warning' : 'Success',
        seq.campaignId
      );
      console.log(`[Follow-up Engine] Step ${seq.step} done — ${followupSent} sent, ${followupFailed} failed. Logic: ${condLabel}`);
    }
  } catch (err) {
    console.error('[Follow-up Engine Error]:', err.message);
  }
}

// Unsubscribe web page confirmation
app.get('/api/unsubscribe/:recipientId/:token', async (req, res) => {
  const { recipientId, token } = req.params;

  // Validate parameters to prevent Reflected XSS
  const safeIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!safeIdRegex.test(recipientId) || !safeIdRegex.test(token)) {
    return res.status(400).send('Invalid unsubscribe parameters.');
  }

  res.send(`
    <html>
      <head>
        <title>Unsubscribe Confirmation</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0; }
          .card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
          h2 { color: #0f172a; margin: 0 0 12px 0; }
          p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
          button { background: #6366f1; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px; }
          button:hover { background: #4f46e5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Confirm Unsubscribe</h2>
          <p>Are you sure you want to opt out and stop receiving marketing emails from this sender?</p>
          <form action="/api/unsubscribe/confirm" method="POST">
            <input type="hidden" name="recipientId" value="${recipientId}" />
            <input type="hidden" name="token" value="${token}" />
            <button type="submit">Yes, Unsubscribe</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

// Unsubscribe submit action
app.post('/api/unsubscribe/confirm', async (req, res) => {
  const { recipientId, token } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM contacts WHERE id = ? AND unsubscribe_token = ?;', [recipientId, token]);
    if (rows.length > 0) {
      const contact = rows[0];
      await pool.query("UPDATE contacts SET status = 'Unsubscribed' WHERE id = ?;", [contact.id]);
      await logEvent('Unsubscribe Engine', `User ${contact.email} opted out successfully.`, 'Success');
      res.send(`
        <html>
          <head>
            <title>Unsubscribed Successfully</title>
            <style>
              body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0; }
              .card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
              h2 { color: #059669; margin: 0 0 12px 0; }
              p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Opt-out Successful</h2>
              <p>You have been successfully removed from our mailing list.</p>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(400).send('Invalid or expired unsubscribe token parameters.');
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Contacts APIs
app.get('/api/contacts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  const { email, name, company } = req.body;
  const id = 'ct' + Math.random().toString(36).substr(2, 9);
  const token = Math.random().toString(36).substr(2, 12);
  try {
    const [existing] = await pool.query('SELECT * FROM contacts WHERE email = ?;', [email]);
    if (existing.length > 0) {
      await pool.query('UPDATE contacts SET name = ?, company = ? WHERE id = ?;', [name, company, existing[0].id]);
      return res.json({ success: true, contactId: existing[0].id });
    }
    await pool.query(
      `INSERT INTO contacts (id, email, name, company, status, unsubscribe_token)
       VALUES (?, ?, ?, ?, 'Subscribed', ?);`,
      [id, email, name, company, token]
    );
    res.json({ success: true, contactId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lists APIs
app.get('/api/lists', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contact_lists ORDER BY created_at DESC;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists', async (req, res) => {
  const { name, description } = req.body;
  const id = 'l' + Math.random().toString(36).substr(2, 9);
  try {
    await pool.query('INSERT INTO contact_lists (id, name, description) VALUES (?, ?, ?);', [id, name, description]);
    res.json({ success: true, listId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lists/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contact_lists WHERE id = ?;', [id]);
    await pool.query('DELETE FROM list_contacts WHERE list_id = ?;', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lists/:id/contacts', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT c.* FROM contacts c 
       JOIN list_contacts lc ON c.id = lc.contact_id 
       WHERE lc.list_id = ?;`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists/:id/contacts', async (req, res) => {
  const { id } = req.params;
  const { contacts } = req.body; // Array of { email, name, company }
  try {
    for (const c of contacts) {
      const contactId = 'ct' + Math.random().toString(36).substr(2, 9);
      const token = Math.random().toString(36).substr(2, 12);
      
      const [existing] = await pool.query('SELECT * FROM contacts WHERE email = ?;', [c.email]);
      let finalContactId = contactId;
      if (existing.length > 0) {
        finalContactId = existing[0].id;
        await pool.query('UPDATE contacts SET name = ?, company = ? WHERE id = ?;', [c.name || 'Recipient', c.company || 'Enterprise', finalContactId]);
      } else {
        await pool.query(
          `INSERT INTO contacts (id, email, name, company, status, unsubscribe_token)
           VALUES (?, ?, ?, ?, 'Subscribed', ?);`,
          [contactId, c.email, c.name || 'Recipient', c.company || 'Enterprise', token]
        );
      }
      await pool.query('INSERT INTO list_contacts (list_id, contact_id) VALUES (?, ?);', [id, finalContactId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SMTP Configs APIs
app.get('/api/smtp-configs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM smtp_configs;');
    const configs = rows.map(cfg => {
      const copy = { ...cfg };
      if (copy.password) {
        copy.password = '••••••••';
      }
      return copy;
    });
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/smtp-configs', async (req, res) => {
  const { name, host, port, username, password, encryption, sender_email, sender_name, is_active } = req.body;
  const id = 'smtp' + Math.random().toString(36).substr(2, 9);
  try {
    await pool.query(
      `INSERT INTO smtp_configs (id, name, host, port, username, password, encryption, sender_email, sender_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, name, host, parseInt(port), username, password, encryption, sender_email, sender_name, is_active ? 1 : 0]
    );
    res.json({ success: true, configId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/smtp-configs/:id', async (req, res) => {
  const { id } = req.params;
  const { name, host, port, username, password, encryption, sender_email, sender_name, is_active } = req.body;
  try {
    const isMasked = isPasswordMasked(password);
    if (isMasked) {
      await pool.query(
        `UPDATE smtp_configs SET name = ?, host = ?, port = ?, username = ?, encryption = ?, sender_email = ?, sender_name = ?, is_active = ?
         WHERE id = ?;`,
        [name, host, parseInt(port), username, encryption, sender_email, sender_name, is_active ? 1 : 0, id]
      );
    } else {
      await pool.query(
        `UPDATE smtp_configs SET name = ?, host = ?, port = ?, username = ?, password = ?, encryption = ?, sender_email = ?, sender_name = ?, is_active = ?
         WHERE id = ?;`,
        [name, host, parseInt(port), username, password, encryption, sender_email, sender_name, is_active ? 1 : 0, id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/smtp-configs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM smtp_configs WHERE id = ?;', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/smtp-configs/verify', async (req, res) => {
  let { host, port, username, password, encryption } = req.body;
  
  const isMasked = isPasswordMasked(password);
  if (isMasked && req.body.id) {
    const [rows] = await pool.query('SELECT password FROM smtp_configs WHERE id = ?;', [req.body.id]);
    if (rows[0] && rows[0].password) {
      password = rows[0].password;
    }
  }
  
  if (host.includes('mock') || (password && password.includes('mock'))) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return res.json({ success: true, isMock: true, message: 'Mock SMTP verification successful.' });
  }

  try {
    const result = await verifyCredentials(host, port, username, password, encryption);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function checkAndLaunchScheduledCampaigns() {
  if (activeSendingState.status === 'sending') {
    return;
  }

  try {
    const nowUtc = new Date().toISOString();
    const [dueCampaigns] = await pool.query(
      `SELECT * FROM campaigns 
       WHERE status = 'Scheduled' 
       AND scheduleDate <= ? 
       ORDER BY scheduleDate ASC 
       LIMIT 1;`,
      [nowUtc]
    );

    if (!dueCampaigns || dueCampaigns.length === 0) {
      return;
    }

    const campaign = dueCampaigns[0];
    console.log(`[Scheduler] Found due campaign: "${campaign.name}" (${campaign.id}) scheduled for ${campaign.scheduleDate}`);

    const smtpSettings = await getSMTPSettings(campaign.smtpUsed);
    const [result] = await pool.query(
      `UPDATE campaigns SET status = 'Sending', sendTime = ? WHERE id = ? AND status = 'Scheduled';`,
      [nowUtc, campaign.id]
    );

    if (result.affectedRows === 0) {
      console.log(`[Scheduler] Campaign "${campaign.name}" (${campaign.id}) was already claimed by another scheduler instance.`);
      return;
    }

    const [recipients] = await pool.query(
      `SELECT * FROM recipients WHERE campaignId = ? ORDER BY id ASC;`,
      [campaign.id]
    );

    console.log(`[Scheduler] Loaded ${recipients.length} recipients for campaign: "${campaign.name}"`);

    if (recipients.length === 0) {
      const completionTime = new Date().toISOString();
      await pool.query(
        `UPDATE campaigns SET status = 'Completed', completionTime = ? WHERE id = ?;`,
        [completionTime, campaign.id]
      );
      
      await logEvent(
        'System Scheduler',
        `Scheduled campaign "${campaign.name}" finished immediately (0 recipients).`,
        'Success',
        campaign.id
      );
      return;
    }

    activeSendingState = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      subject: campaign.subject || '',
      body: campaign.body || '',
      total: recipients.length,
      sent: 0,
      failed: 0,
      remaining: recipients.length,
      status: 'sending',
      logs: [`[${new Date().toLocaleTimeString()}] Scheduled Campaign triggered and starting transmission...`],
      failedList: [],
      recipientData: recipients,
      mappedFields: { name: 'name', email: 'email', company: 'company' },
      concurrency: 1,
      delayOverride: smtpSettings.delaySeconds || 0.5,
      showAdminSummary: false,
      smtpUsed: campaign.smtpUsed || 'default'
    };

    await logEvent(
      'System Scheduler',
      `Triggered Scheduled Campaign "${campaign.name}" targeting ${recipients.length} recipients.`,
      'Success',
      campaign.id,
      {
        campaignName: campaign.name,
        subject: campaign.subject || '',
        body: campaign.body || '',
        senderEmail: smtpSettings.senderEmail || 'system@aerosend.com',
        recipientCount: recipients.length,
        deliveryStatus: 'Sending'
      }
    );

    const initDelay = (activeSendingState.delayOverride || smtpSettings.delaySeconds || 0.5) * 1000;
    sendingTimer = setTimeout(processQueueStep, initDelay);

  } catch (err) {
    console.error('[Scheduler Error]:', err.message);
  }
}

// MX DNS cache to avoid repeated lookups for the same domain in one session
const mxCache = new Map();

// Bulk Email MX Validation Route
// Accepts: { emails: string[] }
// Returns: { results: [{ email, status, reason }] }
app.post('/api/validate-emails', async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'No emails provided.' });
  }

  // Cap at 500 per request to avoid abuse
  const emailList = emails.slice(0, 500);

  // Basic syntax regex
  const syntaxRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Pre-collect unique domains to batch DNS lookups
  const domainSet = new Set();
  for (const email of emailList) {
    const parts = String(email).trim().split('@');
    if (parts.length === 2 && syntaxRegex.test(String(email).trim())) {
      domainSet.add(parts[1].toLowerCase());
    }
  }

  // Resolve MX for each unique domain (parallel, cached)
  const domainResults = {};
  await Promise.all([...domainSet].map(async (domain) => {
    if (mxCache.has(domain)) {
      domainResults[domain] = mxCache.get(domain);
      return;
    }
    try {
      const records = await dns.resolveMx(domain);
      const hasMx = Array.isArray(records) && records.length > 0;
      domainResults[domain] = hasMx ? 'ok' : 'no_mx';
    } catch {
      domainResults[domain] = 'no_mx';
    }
    // Cache for the duration of this server session
    mxCache.set(domain, domainResults[domain]);
  }));

  // Build per-email results
  const results = emailList.map(rawEmail => {
    const email = String(rawEmail).trim();
    if (!syntaxRegex.test(email)) {
      return { email, status: 'invalid_syntax', reason: 'Malformed email format' };
    }
    const domain = email.split('@')[1].toLowerCase();
    if (domainResults[domain] === 'no_mx') {
      return { email, status: 'no_mx', reason: `No mail server found for domain: ${domain}` };
    }
    return { email, status: 'valid', reason: '' };
  });

  res.json({ results });
});

// Start the scheduled campaign polling loop (checks every 10 seconds)
setInterval(checkAndLaunchScheduledCampaigns, 10000);

// Run database column modification migration safely
async function runMigrations() {
  try {
    if (pool.isPg) {
      await pool.query('ALTER TABLE followup_sequences ALTER COLUMN "delayDays" TYPE DECIMAL(12,5), ALTER COLUMN "delayDays" SET DEFAULT 3.00000;');
    } else {
      await pool.query("ALTER TABLE followup_sequences MODIFY COLUMN delayDays DECIMAL(12,5) NOT NULL DEFAULT 3.00000;");
    }
    console.log("[Migration] Modified followup_sequences.delayDays column to DECIMAL(12,5).");
  } catch (err) {
    if (!err.message.includes("Table") && !err.message.includes("does not exist") && !err.message.includes("executeJsonQuery")) {
      console.warn("[Migration Warning]: Failed to alter delayDays column:", err.message);
    }
  }
}
runMigrations();

// Follow-up email cron — runs every minute to support minute-level and hour-level follow-ups
setInterval(checkAndSendFollowups, 60 * 1000);
// Also run once on startup to catch any follow-ups that were due while server was down
setTimeout(checkAndSendFollowups, 5000);

// Run startup recovery checks for any interrupted campaigns
resumeInterruptedCampaigns();

// Serve static assets in production
const __dirname = path.resolve();
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  console.log('Serving production static assets from: dist');
  app.use(express.static(path.join(__dirname, 'dist')));
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      const normalizedPath = req.path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
      const isApiOrPublic = normalizedPath.startsWith('/api') || 
                            normalizedPath === '/health' || 
                            normalizedPath.startsWith('/api/tracker') || 
                            normalizedPath.startsWith('/api/unsubscribe');
      if (!isApiOrPublic) {
        return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      }
    }
    next();
  });
}

// Global Error Handler Middleware
app.use((err, req, res, _next) => {
  console.error('[Global Error Handler]:', err.stack || err.message || err);
  
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred on the server.'
    : err.message || 'Internal Server Error';
    
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
