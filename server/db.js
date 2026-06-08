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
          date: new Date(Date.now() - 5*24*60*60*1000).toISOString(),
          creator: 'Marcus Chen'
        },
        {
          id: 'c2',
          name: 'Customer Re-engagement Campaign',
          subject: 'We miss you, {{name}}! Here is 50% off.',
          body: 'Hey {{name}},\n\nIt has been a while since you logged in. Check out the latest updates at {{company}} and enjoy 50% off your next billing cycle.\n\nCheers,\nGrowth Team',
          recipientsCount: 840,
          sentCount: 832,
          failedCount: 8,
          status: 'Completed',
          date: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
          creator: 'Alexander Wright'
        },
        {
          id: 'c3',
          name: 'Developer API Conference Invitation',
          subject: 'Register now for {{company}} API DevCon 2026',
          body: 'Hello {{name}},\n\nGet ready for our annual developer conference. Tickets are moving fast. Register with your email {{email}} now.\n\nRegards,\nDevRel Team',
          recipientsCount: 2100,
          sentCount: 0,
          failedCount: 0,
          status: 'Scheduled',
          date: new Date(Date.now() + 10*24*60*60*1000).toISOString(),
          scheduleDate: new Date(Date.now() + 10*24*60*60*1000).toISOString(),
          creator: 'Marcus Chen'
        }
      ],
      recipients: [],
      audit_logs: [
        { id: 'l1', date: new Date().toISOString(), user: 'Alexander Wright', action: 'Database schema successfully initialized in JSON fallback mode', status: 'Success' },
        { id: 'l2', date: new Date(Date.now() - 3600000).toISOString(), user: 'Marcus Chen', action: 'Created Campaign "Developer API Conference Invitation"', status: 'Success' }
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

  // 6. SELECT subject, body FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('select subject, body from campaigns where id = ?')) {
    const id = params[0];
    const camp = jsonDb.data.campaigns.find(c => c.id === id);
    return [[{ subject: camp ? camp.subject : '', body: camp ? camp.body : '' }]];
  }

  // 7. INSERT INTO campaigns
  if (normalizedSql.startsWith('insert into campaigns')) {
    const [id, name, subject, body, status, date, creator, recipientsCount] = params;
    
    // Check if campaign already exists, delete it first (upsert behavior)
    jsonDb.data.campaigns = jsonDb.data.campaigns.filter(c => c.id !== id);

    jsonDb.data.campaigns.push({
      id, name, subject, body, status, date, creator,
      recipientsCount: recipientsCount || 0,
      sentCount: 0,
      failedCount: 0
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 8. UPDATE campaigns SET sentCount = ?, failedCount = ? WHERE id = ?;
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

  // 9. UPDATE campaigns SET status = ?, sentCount = ?, failedCount = ? WHERE id = ?; (or status = "Completed")
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

  // 10. DELETE FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('delete from campaigns where id = ?')) {
    const id = params[0];
    jsonDb.data.campaigns = jsonDb.data.campaigns.filter(c => c.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 11. DELETE FROM recipients WHERE campaignId = ?;
  if (normalizedSql.startsWith('delete from recipients where campaignid = ?')) {
    const campaignId = params[0];
    jsonDb.data.recipients = jsonDb.data.recipients.filter(r => r.campaignId !== campaignId);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 12. UPDATE settings SET host = ? ... WHERE id = 1;
  if (normalizedSql.startsWith('update settings set')) {
    const [host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts] = params;
    jsonDb.data.settings[0] = {
      id: 1, host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts
    };
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 13. INSERT INTO audit_logs (id, date, user, action, status) VALUES (?, ?, ?, ?, ?);
  if (normalizedSql.startsWith('insert into audit_logs')) {
    const [id, date, user, action, status] = params;
    jsonDb.data.audit_logs.push({ id, date, user, action, status });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 14. INSERT INTO users (id, name, email, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?);
  if (normalizedSql.startsWith('insert into users')) {
    const [id, name, email, role, status, avatar] = params;
    jsonDb.data.users.push({ id, name, email, role, status, avatar });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 15. UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?;
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

  // 16. UPDATE users SET status = ? WHERE id = ?;
  if (normalizedSql.startsWith('update users set status = ?')) {
    const [status, id] = params;
    const user = jsonDb.data.users.find(u => u.id === id);
    if (user) {
      user.status = status;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 17. DELETE FROM users WHERE id = ?;
  if (normalizedSql.startsWith('delete from users where id = ?')) {
    const id = params[0];
    jsonDb.data.users = jsonDb.data.users.filter(u => u.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 18. INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?);
  if (normalizedSql.startsWith('insert into recipients')) {
    const [campaignId, email, name, company, status, reason, sentAt] = params;
    jsonDb.data.recipients.push({
      id: jsonDb.data.recipients.length + 1,
      campaignId, email, name, company, status, reason, sentAt
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 19. SELECT * FROM templates
  if (normalizedSql.startsWith('select * from templates')) {
    const list = [...(jsonDb.data.templates || [])];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [list];
  }

  // 20. INSERT INTO templates
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

  // 21. UPDATE templates SET
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

  // 22. DELETE FROM templates WHERE id = ?
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
