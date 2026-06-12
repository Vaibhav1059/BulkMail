import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

class JSONDb {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      campaigns: [],
      recipients: [],
      audit_logs: [],
      contacts: [],
      contact_lists: [],
      list_contacts: [],
      smtp_configs: [],
      users: [],
      settings: [{
        id: 1,
        host: 'smtp.sendgrid.net',
        port: '587',
        username: 'apikey',
        password: 'SG.mock_api_key_value_example',
        encryption: 'TLS',
        senderEmail: 'campaigns@enterprise.com',
        senderName: 'Enterprise Bulk Mailer',
        emailsPerHour: 5000,
        emailsPerDay: 50000,
        delaySeconds: 0.5,
        connectionTimeout: 10,
        retryAttempts: 3
      }],
      templates: []
    };
    this.read();
  }

  read() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.write();
      }
    } catch (err) {
      console.error('Error reading JSON DB file:', err);
    }
  }

  write() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing JSON DB file:', err);
    }
  }
}

function executeJsonQuery(jsonDb, sql, params = []) {
  const normalizedSql = sql.trim().toLowerCase().replace(/\s+/g, ' ');

  // 1. SELECT * FROM settings WHERE id = 1;
  if (normalizedSql.startsWith('select * from settings')) {
    return [[jsonDb.data.settings[0]]];
  }

  // 2. SELECT * FROM smtp_configs WHERE is_active = 1 LIMIT 1;
  if (normalizedSql.startsWith('select * from smtp_configs where is_active = 1')) {
    const activeConfigs = jsonDb.data.smtp_configs.filter(c => c.is_active === 1 || c.is_active === '1');
    return [activeConfigs.slice(0, 1)];
  }

  // 3. SELECT * FROM smtp_configs;
  if (normalizedSql.startsWith('select * from smtp_configs')) {
    return [jsonDb.data.smtp_configs];
  }

  // 4. SELECT * FROM users;
  if (normalizedSql.startsWith('select * from users')) {
    return [jsonDb.data.users];
  }

  // 5. SELECT * FROM users WHERE email = ?;
  if (normalizedSql.startsWith('select * from users where email = ?')) {
    const email = params[0];
    const filtered = jsonDb.data.users.filter(u => u.email.toLowerCase() === email.toLowerCase());
    return [filtered];
  }

  // 6. SELECT * FROM contact_lists ORDER BY created_at DESC;
  if (normalizedSql.startsWith('select * from contact_lists')) {
    const lists = [...(jsonDb.data.contact_lists || [])];
    lists.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return [lists];
  }

  // 7. SELECT * FROM contacts;
  if (normalizedSql.startsWith('select * from contacts')) {
    return [jsonDb.data.contacts];
  }

  // 8. SELECT * FROM campaigns ORDER BY date DESC;
  if (normalizedSql.startsWith('select * from campaigns')) {
    const campaigns = [...jsonDb.data.campaigns];
    campaigns.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [campaigns];
  }

  // 9. SELECT * FROM audit_logs WHERE deletedAt IS NULL ORDER BY date DESC;
  if (normalizedSql.startsWith('select * from audit_logs where deletedat is null')) {
    const logs = jsonDb.data.audit_logs.filter(l => !l.deletedAt);
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [logs];
  }

  // 10. SELECT * FROM audit_logs WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC;
  if (normalizedSql.startsWith('select * from audit_logs where deletedat is not null')) {
    const logs = jsonDb.data.audit_logs.filter(l => !!l.deletedAt);
    logs.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    return [logs];
  }

  // 10b. SELECT * FROM audit_logs WHERE campaignId = ?;
  if (normalizedSql.startsWith('select * from audit_logs where campaignid = ?')) {
    const campaignId = params[0];
    const logs = jsonDb.data.audit_logs.filter(l => l.campaignId === campaignId);
    return [logs];
  }

  // 11. DELETE FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('delete from campaigns where id = ?')) {
    const id = params[0];
    jsonDb.data.campaigns = jsonDb.data.campaigns.filter(c => c.id !== id);
    // jsonDb.data.recipients = jsonDb.data.recipients.filter(r => r.campaignId !== id);
    // jsonDb.data.audit_logs = jsonDb.data.audit_logs.filter(a => a.campaignId !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 12. DELETE FROM recipients WHERE campaignId = ?;
  if (normalizedSql.startsWith('delete from recipients where campaignid = ?')) {
    const campaignId = params[0];
    jsonDb.data.recipients = jsonDb.data.recipients.filter(r => r.campaignId !== campaignId);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 13. UPDATE settings SET host = ? ... WHERE id = 1;
  if (normalizedSql.startsWith('update settings set')) {
    const [host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts] = params;
    jsonDb.data.settings[0] = {
      id: 1, host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts
    };
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 14. INSERT INTO audit_logs (id, date, user, action, status...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  if (normalizedSql.startsWith('insert into audit_logs')) {
    if (params.length === 5) {
      const [id, date, user, action, status] = params;
      jsonDb.data.audit_logs.push({
        id, date, user, action, status,
        campaignId: null, campaignName: null, subject: null, body: null, senderEmail: null,
        recipientCount: 0, deliveryStatus: null, openStatus: 'Not Opened', failureDetails: null, deletedAt: null
      });
    } else {
      const [
        id, date, user, action, status,
        campaignId, campaignName, subject, body, senderEmail,
        recipientCount, deliveryStatus, openStatus, failureDetails
      ] = params;
      jsonDb.data.audit_logs.push({
        id, date, user, action, status,
        campaignId: campaignId || null,
        campaignName: campaignName || null,
        subject: subject || null,
        body: body || null,
        senderEmail: senderEmail || null,
        recipientCount: recipientCount || 0,
        deliveryStatus: deliveryStatus || null,
        openStatus: openStatus || 'Not Opened',
        failureDetails: failureDetails || null,
        deletedAt: null
      });
    }
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 15. DELETE FROM audit_logs WHERE id = ?
  if (normalizedSql.startsWith('delete from audit_logs where id = ?')) {
    const id = params[0];
    jsonDb.data.audit_logs = jsonDb.data.audit_logs.filter(a => a.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 16. DELETE FROM audit_logs WHERE campaignId = ?
  if (normalizedSql.startsWith('delete from audit_logs where campaignid = ?')) {
    const campaignId = params[0];
    jsonDb.data.audit_logs = jsonDb.data.audit_logs.filter(a => a.campaignId !== campaignId);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 17. UPDATE audit_logs SET deletedAt = ? WHERE id = ?
  if (normalizedSql.startsWith('update audit_logs set deletedat = ? where id = ?')) {
    const [deletedAt, id] = params;
    const log = jsonDb.data.audit_logs.find(a => a.id === id);
    if (log) {
      log.deletedAt = deletedAt;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 18. UPDATE audit_logs SET deletedAt = NULL WHERE id = ?
  if (normalizedSql.startsWith('update audit_logs set deletedat = null where id = ?')) {
    const id = params[0];
    const log = jsonDb.data.audit_logs.find(a => a.id === id);
    if (log) {
      log.deletedAt = null;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 19. INSERT INTO users (id, name, email, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?);
  if (normalizedSql.startsWith('insert into users')) {
    const [id, name, email, role, status, avatar] = params;
    jsonDb.data.users.push({ id, name, email, role, status, avatar });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 20. UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?;
  if (normalizedSql.startsWith('update users set name = ?')) {
    const [name, email, role, id] = params;
    const user = jsonDb.data.users.find(u => u.id === id);
    if (user) {
      user.name = name;
      user.email = email;
      user.role = role;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 21. UPDATE users SET status = ? WHERE id = ?;
  if (normalizedSql.startsWith('update users set status = ?')) {
    const [status, id] = params;
    const user = jsonDb.data.users.find(u => u.id === id);
    if (user) {
      user.status = status;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 22. DELETE FROM users WHERE id = ?;
  if (normalizedSql.startsWith('delete from users where id = ?')) {
    const id = params[0];
    jsonDb.data.users = jsonDb.data.users.filter(u => u.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 23. INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?);
  if (normalizedSql.startsWith('insert into recipients')) {
    const [campaignId, email, name, company, status, reason, sentAt] = params;
    jsonDb.data.recipients.push({
      id: jsonDb.data.recipients.length + 1,
      campaignId, email, name, company, status, reason, sentAt
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 24. SELECT * FROM templates
  if (normalizedSql.startsWith('select * from templates')) {
    const list = [...(jsonDb.data.templates || [])];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [list];
  }

  // 25. INSERT INTO templates
  if (normalizedSql.startsWith('insert into templates')) {
    const [id, name, subject, body, date] = params;
    if (!jsonDb.data.templates) {
      jsonDb.data.templates = [];
    }
    jsonDb.data.templates = jsonDb.data.templates.filter(t => t.id !== id);
    jsonDb.data.templates.push({ id, name, subject, body, date });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 26. UPDATE templates SET
  if (normalizedSql.startsWith('update templates set')) {
    const [name, subject, body, date, id] = params;
    const tpl = jsonDb.data.templates.find(t => t.id === id);
    if (tpl) {
      tpl.name = name;
      tpl.subject = subject;
      tpl.body = body;
      tpl.date = date;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 27. DELETE FROM templates WHERE id = ?
  if (normalizedSql.startsWith('delete from templates where id = ?')) {
    const id = params[0];
    jsonDb.data.templates = jsonDb.data.templates.filter(t => t.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  return [[]];
}

let useFallback = false;
let fallbackDb = null;
let pool = null;

try {
  pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'aerosend_db',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Try to execute a test connection query
  await pool.query('SELECT 1;');
  console.log('Successfully connected to MySQL database on 127.0.0.1:3306.');
} catch (err) {
  console.warn('⚠️  Could not connect to MySQL database on 127.0.0.1:3306. Falling back to local JSON database storage.');
  useFallback = true;
  const dbPath = path.join(process.cwd(), 'server', 'db.json');
  const dbExamplePath = path.join(process.cwd(), 'server', 'db.json.example');
  if (!fs.existsSync(dbPath) && fs.existsSync(dbExamplePath)) {
    try {
      fs.copyFileSync(dbExamplePath, dbPath);
      console.log('Cloned db.json from db.json.example.');
    } catch (copyErr) {
      console.error('Failed to clone db.json from example:', copyErr);
    }
  }
  fallbackDb = new JSONDb(dbPath);
}

const queryWrapper = {
  query: async (sql, params) => {
    if (useFallback) {
      return executeJsonQuery(fallbackDb, sql, params);
    } else {
      return pool.query(sql, params);
    }
  }
};

export default queryWrapper;
