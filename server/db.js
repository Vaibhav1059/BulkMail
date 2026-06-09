import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

class JSONDb {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
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
      campaigns: [
        {
          id: 'c1',
          name: 'Q3 Product Newsletter Launch',
          subject: 'Introducing our new automation workflow Builder! 🚀',
          body: 'Hi {{name}},\n\nWe are thrilled to present our brand new automation workflow features. As a valued employee at {{company}}, you get exclusive early access!\n\nBest,\nThe Team',
          recipientsCount: 1450,
          sentCount: 1450,
          failedCount: 0,
          status: 'Completed',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          creator: 'Marcus Chen',
          smtpUsed: 'smtp.sendgrid.net',
          sendTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString(),
          completionTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      recipients: [],
      audit_logs: [
        {
          id: 'l1',
          date: new Date().toISOString(),
          user: 'Vaibhav Soni',
          action: 'Database schema successfully initialized in JSON fallback mode',
          status: 'Success',
          campaignId: null,
          campaignName: null,
          subject: null,
          senderEmail: null,
          recipientCount: 0,
          deliveryStatus: null,
          openStatus: 'Not Opened',
          failureDetails: null,
          deletedAt: null
        }
      ],
      users: [
        { id: '1', name: 'Alexander Wright', email: 'alex@enterprise.com', role: 'Admin', status: 'Active', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' },
        { id: '2', name: 'Marcus Chen', email: 'marcus@enterprise.com', role: 'Manager', status: 'Active', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' },
        { id: '3', name: 'Sarah Jenkins', email: 'sarah.j@enterprise.com', role: 'Operator', status: 'Active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' }
      ],
      templates: [
        {
          id: 't1',
          name: 'Monthly Product Newsletter',
          subject: 'Newsletter: Latest updates from {{company}}',
          body: 'Hi {{name}},\n\nHere are the top stories this month from {{company}}:\n\n1. Product Automations are now live.\n2. Security parameters have been updated.\n\nEnjoy the reads!\n\nBest,\nThe Newsletter Team',
          date: new Date().toISOString()
        },
        {
          id: 't2',
          name: 'Welcome Onboarding Mailer',
          subject: 'Welcome to AeroSend, {{name}}!',
          body: 'Hello {{name}},\n\nThank you for setting up your account under {{email}}. We are excited to support your journey.\n\nLet us know if you need help.\n\nRegards,\nCustomer Success',
          date: new Date().toISOString()
        },
        {
          id: 't3',
          name: 'Exclusive Promo Discount',
          subject: 'Exclusive deal for {{name}}',
          body: 'Hey {{name}},\n\nWe have generated a custom coupon for {{company}} employees. Use code AEROSEND20 to get 20% off your active subscription.\n\nAct fast!\nSales Team',
          date: new Date().toISOString()
        },
        {
          id: 't4',
          name: 'Happy Birthday Card',
          subject: 'Wishing you a very Happy Birthday! 🎂🎉',
          body: `<div style="background: linear-gradient(135deg, #ff6b81, #ffb347); padding: 30px 15px; border-radius: 16px; text-align: center; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 10px auto;">
  <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; text-align: center;">
    
    <img src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600"
         alt="Birthday Cake"
         style="width: 180px; height: 180px; object-fit: cover; border-radius: 50%; border: 4px solid #ff6b81; margin: 0 auto 20px;">

    <h1 style="color: #ff4d6d; font-size: 32px; margin: 0 0 10px 0; font-family: 'Outfit', sans-serif;">
        🎂 Happy Birthday 🎉
    </h1>

    <h2 style="color: #444444; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">
        Dear {{name}}
    </h2>

    <p style="font-size: 15px; color: #666666; line-height: 1.6; margin: 0 0 15px 0;">
        Wishing you a day filled with happiness, laughter, and unforgettable memories.
        May your special day bring you endless joy, success, and all the wonderful
        things you deserve in life.
    </p>

    <p style="font-size: 15px; color: #666666; line-height: 1.6; margin: 0 0 25px 0;">
        May this new year of your life be full of exciting opportunities,
        good health, and countless reasons to smile.
    </p>

    <div style="margin-top: 25px;">
        <span style="background: #ff4d6d; color: #ffffff; padding: 10px 24px; border-radius: 20px; font-size: 15px; font-weight: bold; display: inline-block;">
            🎈 Have an Amazing Day! 🎈
        </span>
    </div>

  </div>
</div>`,
          date: new Date().toISOString()
        }
      ]
    };
    this.read();
  }

  read() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(fileContent);
        // Ensure properties exist on read
        if (!this.data.audit_logs) this.data.audit_logs = [];
        if (!this.data.recipients) this.data.recipients = [];
        if (!this.data.campaigns) this.data.campaigns = [];
        if (!this.data.templates) this.data.templates = [];
        if (!this.data.users) this.data.users = [];
      } else {
        this.write();
      }
    } catch (err) {
      console.error('Failed to read JSON db:', err);
    }
  }

  write() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write JSON db:', err);
    }
  }
}

function executeJsonQuery(jsonDb, sql, params = []) {
  sql = sql.trim().replace(/\s+/g, ' ');
  const normalizedSql = sql.toLowerCase();

  // 1. SELECT * FROM settings WHERE id = 1;
  if (normalizedSql.startsWith('select * from settings')) {
    return [jsonDb.data.settings];
  }

  // 2. SELECT * FROM campaigns ORDER BY date DESC;
  if (normalizedSql.startsWith('select * from campaigns order by date desc')) {
    const list = [...jsonDb.data.campaigns];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [list];
  }

  // 3. SELECT * FROM audit_logs ORDER BY date DESC;
  if (normalizedSql.startsWith('select * from audit_logs order by date desc')) {
    const list = [...jsonDb.data.audit_logs];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [list];
  }

  // 4. SELECT * FROM users;
  if (normalizedSql.startsWith('select * from users')) {
    return [jsonDb.data.users];
  }

  // 5. SELECT name FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('select name from campaigns where id = ?')) {
    const id = params[0];
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    return [[{ name: camp ? camp.name : id }]];
  }

  // 5b. SELECT * FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('select * from campaigns where id = ?')) {
    const id = params[0];
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    return [camp ? [camp] : []];
  }

  // 6. SELECT subject, body FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('select subject, body from campaigns where id = ?')) {
    const id = params[0];
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    return [[{ subject: camp ? camp.subject : '', body: camp ? camp.body : '' }]];
  }

  // 7. SELECT * FROM recipients WHERE campaignId = ?
  if (normalizedSql.startsWith('select * from recipients where campaignid = ?')) {
    const campaignId = params[0];
    const list = jsonDb.data.recipients.filter(r => r.campaignId === campaignId);
    return [list];
  }

  // Fallback support for scheduled campaign queries
  if (normalizedSql.startsWith("select * from campaigns where status = 'scheduled' and scheduledate <= ?")) {
    const nowUtc = params[0];
    const list = jsonDb.data.campaigns.filter(c => c.status === 'Scheduled' && c.scheduleDate && c.scheduleDate <= nowUtc);
    list.sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate));
    return [list];
  }

  if (normalizedSql.startsWith("select * from campaigns where status = 'sending'")) {
    const list = jsonDb.data.campaigns.filter(c => c.status === 'Sending');
    return [list];
  }

  if (normalizedSql.startsWith("update campaigns set status = 'sending', sendtime = ? where id = ?") ||
    normalizedSql.startsWith("update campaigns set status = \"sending\", sendtime = ? where id = ?")) {
    const [sendTime, id] = params;
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    if (camp) {
      camp.status = 'Sending';
      camp.sendTime = sendTime;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  if (normalizedSql.startsWith('update recipients set status = ?, reason = ?, sentat = ? where id = ?')) {
    const [status, reason, sentAt, id] = params;
    const recipient = jsonDb.data.recipients.find(r => String(r.id) === String(id));
    if (recipient) {
      recipient.status = status;
      recipient.reason = reason;
      recipient.sentAt = sentAt;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  if (normalizedSql.startsWith("update campaigns set status = 'draft', scheduledate = null where id = ?") ||
    normalizedSql.startsWith("update campaigns set status = \"draft\", scheduledate = null where id = ?")) {
    const id = params[0];
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    if (camp) {
      camp.status = 'Draft';
      camp.scheduleDate = null;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  if (normalizedSql.startsWith("update campaigns set scheduledate = ? where id = ?")) {
    const [scheduleDate, id] = params;
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    if (camp) {
      camp.scheduleDate = scheduleDate;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 8. INSERT INTO campaigns
  if (normalizedSql.startsWith('insert into campaigns')) {
    const [id, name, subject, body, status, date, creator, recipientsCount, scheduleDate] = params;

    // Check if campaign already exists, delete it first (upsert behavior)
    jsonDb.data.campaigns = jsonDb.data.campaigns.filter(c => c.id !== id);

    jsonDb.data.campaigns.push({
      id, name, subject, body, status, date, creator,
      recipientsCount: recipientsCount || 0,
      sentCount: 0,
      failedCount: 0,
      smtpUsed: null,
      sendTime: null,
      completionTime: null,
      scheduleDate: scheduleDate || null
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 9. UPDATE campaigns SET sentCount = ?, failedCount = ? WHERE id = ?;
  if (normalizedSql.startsWith('update campaigns set sentcount = ?, failedcount = ? where id = ?')) {
    const [sentCount, failedCount, id] = params;
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    if (camp) {
      camp.sentCount = sentCount;
      camp.failedCount = failedCount;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 10. UPDATE campaigns status, timing and smtp settings
  if (normalizedSql.startsWith('update campaigns set status = "sending", sentcount = 0, failedcount = 0, recipientscount = ?, smtpused = ?, sendtime = ? where id = ?')) {
    const [recipientsCount, smtpUsed, sendTime, id] = params;
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    if (camp) {
      camp.status = 'Sending';
      camp.recipientsCount = recipientsCount;
      camp.sentCount = 0;
      camp.failedCount = 0;
      camp.smtpUsed = smtpUsed;
      camp.sendTime = sendTime;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  if (normalizedSql.startsWith('update campaigns set status = "completed", sentcount = ?, failedcount = ?, completiontime = ? where id = ?')) {
    const [sentCount, failedCount, completionTime, id] = params;
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    if (camp) {
      camp.status = 'Completed';
      camp.sentCount = sentCount;
      camp.failedCount = failedCount;
      camp.completionTime = completionTime;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  if (normalizedSql.startsWith('update campaigns set sentcount = 0, failedcount = 0, status = "draft" where id = ?')) {
    const id = params[0];
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    if (camp) {
      camp.sentCount = 0;
      camp.failedCount = 0;
      camp.status = 'Draft';
      camp.smtpUsed = null;
      camp.sendTime = null;
      camp.completionTime = null;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // Legacy fallback status parsers
  if (normalizedSql.startsWith('update campaigns set status = "completed"') || normalizedSql.startsWith('update campaigns set status = ?')) {
    if (normalizedSql.includes('status = "completed"')) {
      const [sentCount, failedCount, id] = params;
      const camp = jsonDb.data.campaigns.find(c => c.id === id);
      if (camp) {
        camp.status = 'Completed';
        camp.sentCount = sentCount;
        camp.failedCount = failedCount;
        jsonDb.write();
      }
    } else if (normalizedSql.includes('status = "sending"')) {
      const [recipientsCount, id] = params;
      const camp = jsonDb.data.campaigns.find(c => c.id === id);
      if (camp) {
        camp.status = 'Sending';
        camp.recipientsCount = recipientsCount;
        camp.sentCount = 0;
        camp.failedCount = 0;
        jsonDb.write();
      }
    }
    return [{ affectedRows: 1 }];
  }

  // 11. DELETE FROM campaigns WHERE id = ?; (Without manual cascade delete)
  if (normalizedSql.startsWith('delete from campaigns where id = ?')) {
    const id = params[0];
    jsonDb.data.campaigns = jsonDb.data.campaigns.filter(c => c.id !== id);
    // Keep recipients and audit logs for historical reference
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
