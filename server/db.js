import mysql from 'mysql2/promise';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

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

      let dataChanged = false;

      // Seed the default administrator user if empty
      if (!this.data.users || this.data.users.length === 0) {
        this.data.users = [{
          id: '1',
          name: 'Vaibhav Soni',
          email: 'vaibhavsoni1059@gmail.com',
          password: bcrypt.hashSync('admin123', 10),
          role: 'Admin',
          status: 'Active',
          avatar: '/male_boy_avatar.png'
        }];
        dataChanged = true;
        console.log('Seeded default admin user to local JSON database fallback.');
      }

      // Seed default templates if empty
      if (!this.data.templates || this.data.templates.length === 0) {
        this.data.templates = [
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
          }
        ];
        dataChanged = true;
        console.log('Seeded default templates to local JSON database fallback.');
      }

      // Seed default campaigns if empty
      if (!this.data.campaigns || this.data.campaigns.length === 0) {
        this.data.campaigns = [
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
            creator: 'Marcus Chen',
            smtpUsed: 'smtp.sendgrid.net',
            sendTime: new Date(Date.now() - 5*24*60*60*1000 - 30*60*1000).toISOString(),
            completionTime: new Date(Date.now() - 5*24*60*60*1000).toISOString()
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
            creator: 'Alexander Wright',
            smtpUsed: 'smtp.sendgrid.net',
            sendTime: new Date(Date.now() - 2*24*60*60*1000 - 20*60*1000).toISOString(),
            completionTime: new Date(Date.now() - 2*24*60*60*1000).toISOString()
          }
        ];
        dataChanged = true;
        console.log('Seeded default campaigns to local JSON database fallback.');
      }

      // Seed default recipients if empty
      if (!this.data.recipients || this.data.recipients.length === 0) {
        this.data.recipients = [
          { id: 1, campaignId: 'c2', email: 'jane.smith@stripe.com', name: 'Jane Smith', company: 'Stripe Inc', status: 'Sent', reason: '', sentAt: new Date(Date.now() - 2*24*60*60*1000 - 15*60*1000).toISOString() },
          { id: 2, campaignId: 'c2', email: 'bob.johnson@netflix.com', name: 'Bob Johnson', company: 'Netflix', status: 'Failed', reason: 'SMTP delivery timeout/bounce', sentAt: new Date(Date.now() - 2*24*60*60*1000 - 10*60*1000).toISOString() }
        ];
        dataChanged = true;
      }

      // Seed default audit logs if empty
      if (!this.data.audit_logs || this.data.audit_logs.length === 0) {
        this.data.audit_logs = [
          {
            id: 'l1',
            date: new Date().toISOString(),
            user: 'Alexander Wright',
            action: 'Database schema successfully synchronized with upgraded constraints',
            status: 'Success',
            campaignId: null,
            campaignName: null,
            subject: null,
            senderEmail: null,
            recipientCount: 0,
            deliveryStatus: null,
            openStatus: 'Not Opened',
            failureDetails: null
          },
          {
            id: 'l2',
            date: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
            user: 'Alexander Wright',
            action: 'Campaign "Customer Re-engagement Campaign" finished sending. (832 Sent, 8 Failed)',
            status: 'Warning',
            campaignId: 'c2',
            campaignName: 'Customer Re-engagement Campaign',
            subject: 'We miss you, {{name}}! Here is 50% off.',
            senderEmail: 'campaigns@enterprise.com',
            recipientCount: 840,
            deliveryStatus: 'Completed with Warnings',
            openStatus: 'Not Opened',
            failureDetails: '8 email(s) bounced or failed.'
          }
        ];
        dataChanged = true;
      }

      if (dataChanged) {
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

  // 3. SELECT * FROM smtp_configs WHERE id = ?;
  if (normalizedSql.startsWith('select * from smtp_configs where id = ?')) {
    const id = params[0];
    const filtered = jsonDb.data.smtp_configs.filter(c => c.id === id);
    return [filtered];
  }

  // 4. SELECT * FROM smtp_configs;
  if (normalizedSql.startsWith('select * from smtp_configs')) {
    return [jsonDb.data.smtp_configs];
  }

  // 5. SELECT * FROM users;
  if (normalizedSql.startsWith('select * from users')) {
    return [jsonDb.data.users];
  }

  // 6. SELECT * FROM users WHERE email = ?;
  if (normalizedSql.startsWith('select * from users where email = ?')) {
    const email = params[0];
    const filtered = jsonDb.data.users.filter(u => u.email.toLowerCase() === email.toLowerCase());
    return [filtered];
  }

  // 7. SELECT * FROM contact_lists ORDER BY created_at DESC;
  if (normalizedSql.startsWith('select * from contact_lists')) {
    const lists = [...(jsonDb.data.contact_lists || [])];
    lists.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return [lists];
  }

  // 8. SELECT * FROM contacts WHERE email = ?;
  if (normalizedSql.startsWith('select * from contacts where email = ?')) {
    const email = params[0];
    const filtered = jsonDb.data.contacts.filter(c => c.email.toLowerCase() === email.toLowerCase());
    return [filtered];
  }

  // 9. SELECT * FROM contacts WHERE id = ? AND unsubscribe_token = ?;
  if (normalizedSql.startsWith('select * from contacts where id = ?')) {
    const [id, token] = params;
    const filtered = jsonDb.data.contacts.filter(c => c.id === id && c.unsubscribe_token === token);
    return [filtered];
  }

  // 10. SELECT * FROM contacts;
  if (normalizedSql.startsWith('select * from contacts')) {
    return [jsonDb.data.contacts];
  }

  // 11. SELECT * FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('select * from campaigns where id = ?')) {
    const id = params[0];
    const filtered = jsonDb.data.campaigns.filter(c => c.id === id);
    return [filtered];
  }

  // 12. SELECT * FROM campaigns WHERE status = 'Sending';
  if (normalizedSql.startsWith('select * from campaigns where status = \'sending\'')) {
    const filtered = jsonDb.data.campaigns.filter(c => c.status === 'Sending');
    return [filtered];
  }

  // 13. SELECT * FROM campaigns WHERE status = 'Scheduled' AND scheduleDate <= ? ORDER BY scheduleDate ASC LIMIT 1;
  if (normalizedSql.startsWith('select * from campaigns where status = \'scheduled\'')) {
    const nowUtc = params[0];
    const filtered = jsonDb.data.campaigns.filter(c => c.status === 'Scheduled' && c.scheduleDate <= nowUtc);
    filtered.sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate));
    return [filtered];
  }

  // 14. SELECT * FROM campaigns ORDER BY date DESC;
  if (normalizedSql.startsWith('select * from campaigns')) {
    const campaigns = [...jsonDb.data.campaigns];
    campaigns.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [campaigns];
  }

  // 15. SELECT * FROM audit_logs WHERE deletedAt IS NULL ORDER BY date DESC;
  if (normalizedSql.startsWith('select * from audit_logs where deletedat is null')) {
    const logs = jsonDb.data.audit_logs.filter(l => !l.deletedAt);
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [logs];
  }

  // 16. SELECT * FROM audit_logs WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC;
  if (normalizedSql.startsWith('select * from audit_logs where deletedat is not null')) {
    const logs = jsonDb.data.audit_logs.filter(l => !!l.deletedAt);
    logs.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    return [logs];
  }

  // 17. SELECT * FROM audit_logs WHERE campaignId = ?;
  if (normalizedSql.startsWith('select * from audit_logs where campaignid = ?')) {
    const campaignId = params[0];
    const logs = jsonDb.data.audit_logs.filter(l => l.campaignId === campaignId);
    return [logs];
  }

  // 18. SELECT * FROM recipients WHERE campaignId = ? ORDER BY id ASC;
  if (normalizedSql.startsWith('select * from recipients where campaignid = ?')) {
    const campaignId = params[0];
    const filtered = jsonDb.data.recipients.filter(r => r.campaignId === campaignId);
    return [filtered];
  }

  // 19. INSERT INTO campaigns ...
  if (normalizedSql.startsWith('insert into campaigns')) {
    const [id, name, subject, body, status, date, creator, recipientsCount, smtpUsed, scheduleDate] = params;
    jsonDb.data.campaigns.push({
      id, name, subject, body, status, date, creator,
      recipientsCount: parseInt(recipientsCount) || 0,
      sentCount: 0, failedCount: 0, smtpUsed: smtpUsed || 'default', sendTime: null, completionTime: null, scheduleDate
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 20. UPDATE campaigns SET ...
  if (normalizedSql.startsWith('update campaigns set')) {
    let campaignId = null;
    if (normalizedSql.includes('status = \'draft\', scheduledate = null')) {
      campaignId = params[0];
      const campaign = jsonDb.data.campaigns.find(c => c.id === campaignId);
      if (campaign) {
        campaign.status = 'Draft';
        campaign.scheduleDate = null;
      }
    } else if (normalizedSql.includes('scheduledate = ?')) {
      const [scheduleDate, id] = params;
      campaignId = id;
      const campaign = jsonDb.data.campaigns.find(c => c.id === campaignId);
      if (campaign) {
        campaign.scheduleDate = scheduleDate;
      }
    } else if (normalizedSql.includes('status = "completed", sentcount = ?, failedcount = ?, completiontime = ?')) {
      const [sentCount, failedCount, completionTime, id] = params;
      campaignId = id;
      const campaign = jsonDb.data.campaigns.find(c => c.id === campaignId);
      if (campaign) {
        campaign.status = 'Completed';
        campaign.sentCount = parseInt(sentCount) || 0;
        campaign.failedCount = parseInt(failedCount) || 0;
        campaign.completionTime = completionTime;
      }
    } else if (normalizedSql.includes('status = \'completed\', completiontime = ?')) {
      const [completionTime, id] = params;
      campaignId = id;
      const campaign = jsonDb.data.campaigns.find(c => c.id === campaignId);
      if (campaign) {
        campaign.status = 'Completed';
        campaign.completionTime = completionTime;
      }
    } else if (normalizedSql.includes('sentcount = ?, failedcount = ?')) {
      const [sentCount, failedCount, id] = params;
      campaignId = id;
      const campaign = jsonDb.data.campaigns.find(c => c.id === campaignId);
      if (campaign) {
        campaign.sentCount = parseInt(sentCount) || 0;
        campaign.failedCount = parseInt(failedCount) || 0;
      }
    } else if (normalizedSql.includes('status = "sending"')) {
      const [recipientsCount, smtpUsed, sendTime, id] = params;
      campaignId = id;
      const campaign = jsonDb.data.campaigns.find(c => c.id === campaignId);
      if (campaign) {
        campaign.status = 'Sending';
        campaign.sentCount = 0;
        campaign.failedCount = 0;
        campaign.recipientsCount = parseInt(recipientsCount) || 0;
        campaign.smtpUsed = smtpUsed;
        campaign.sendTime = sendTime;
      }
    } else if (normalizedSql.includes('sentcount = 0, failedcount = 0, status = "draft"')) {
      campaignId = params[0];
      const campaign = jsonDb.data.campaigns.find(c => c.id === campaignId);
      if (campaign) {
        campaign.sentCount = 0;
        campaign.failedCount = 0;
        campaign.status = 'Draft';
        campaign.smtpUsed = null;
        campaign.sendTime = null;
        campaign.completionTime = null;
      }
    }
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 21. DELETE FROM campaigns WHERE id = ?;
  if (normalizedSql.startsWith('delete from campaigns where id = ?')) {
    const id = params[0];
    jsonDb.data.campaigns = jsonDb.data.campaigns.filter(c => c.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 22. DELETE FROM recipients WHERE campaignId = ?;
  if (normalizedSql.startsWith('delete from recipients where campaignid = ?')) {
    const campaignId = params[0];
    jsonDb.data.recipients = jsonDb.data.recipients.filter(r => r.campaignId !== campaignId);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 23. UPDATE settings SET host = ? ... WHERE id = 1; (Fixing the 11 vs 12 param shifting bug!)
  if (normalizedSql.startsWith('update settings set')) {
    if (params.length === 11) {
      const [host, port, username, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts] = params;
      const currentPassword = jsonDb.data.settings[0]?.password || '';
      jsonDb.data.settings[0] = {
        id: 1, host, port, username, password: currentPassword, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts
      };
    } else {
      const [host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts] = params;
      jsonDb.data.settings[0] = {
        id: 1, host, port, username, password, encryption, senderEmail, senderName, emailsPerHour, emailsPerDay, delaySeconds, connectionTimeout, retryAttempts
      };
    }
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 24. INSERT INTO audit_logs ...
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

  // 25. DELETE FROM audit_logs ...
  if (normalizedSql.startsWith('delete from audit_logs where id = ?')) {
    const id = params[0];
    jsonDb.data.audit_logs = jsonDb.data.audit_logs.filter(a => a.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  if (normalizedSql.startsWith('delete from audit_logs where campaignid = ?')) {
    const campaignId = params[0];
    jsonDb.data.audit_logs = jsonDb.data.audit_logs.filter(a => a.campaignId !== campaignId);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 26. UPDATE audit_logs ...
  if (normalizedSql.startsWith('update audit_logs set deletedat = ? where id = ?')) {
    const [deletedAt, id] = params;
    const log = jsonDb.data.audit_logs.find(a => a.id === id);
    if (log) {
      log.deletedAt = deletedAt;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  if (normalizedSql.startsWith('update audit_logs set deletedat = null where id = ?')) {
    const id = params[0];
    const log = jsonDb.data.audit_logs.find(a => a.id === id);
    if (log) {
      log.deletedAt = null;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 27. INSERT INTO users ...
  if (normalizedSql.startsWith('insert into users')) {
    const [id, name, email, role, status, avatar] = params;
    jsonDb.data.users.push({ id, name, email, role, status, avatar });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 28. UPDATE users ...
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

  if (normalizedSql.startsWith('update users set status = ?')) {
    const [status, id] = params;
    const user = jsonDb.data.users.find(u => u.id === id);
    if (user) {
      user.status = status;
      jsonDb.write();
    }
    return [{ affectedRows: 1 }];
  }

  // 29. DELETE FROM users ...
  if (normalizedSql.startsWith('delete from users where id = ?')) {
    const id = params[0];
    jsonDb.data.users = jsonDb.data.users.filter(u => u.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 30. INSERT INTO recipients ...
  if (normalizedSql.startsWith('insert into recipients')) {
    const [campaignId, email, name, company, status, reason, sentAt] = params;
    jsonDb.data.recipients.push({
      id: jsonDb.data.recipients.length + 1,
      campaignId, email, name, company, status, reason, sentAt
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 31. UPDATE recipients ...
  if (normalizedSql.startsWith('update recipients set')) {
    if (normalizedSql.includes('status = ?, reason = ?, sentat = ?')) {
      const [status, reason, sentAt, id] = params;
      const rec = jsonDb.data.recipients.find(r => r.id === parseInt(id));
      if (rec) {
        rec.status = status;
        rec.reason = reason;
        rec.sentAt = sentAt;
      }
    } else if (normalizedSql.includes('status = \'opened\'')) {
      const [openedAt, sentAt, id] = params;
      const rec = jsonDb.data.recipients.find(r => r.id === parseInt(id));
      if (rec && rec.status === 'Sent') {
        rec.status = 'Opened';
        rec.openedAt = openedAt;
        rec.sentAt = sentAt;
      }
    } else if (normalizedSql.includes('status = \'clicked\'')) {
      const [clickedAt, sentAt, id] = params;
      const rec = jsonDb.data.recipients.find(r => r.id === parseInt(id));
      if (rec) {
        rec.status = 'Clicked';
        rec.clickedAt = clickedAt;
        rec.sentAt = sentAt;
      }
    } else if (normalizedSql.includes('followupstep = ?')) {
      const [followupStep, id] = params;
      const rec = jsonDb.data.recipients.find(r => r.id === parseInt(id));
      if (rec) {
        rec.followupStep = parseInt(followupStep) || 0;
      }
    }
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 32. UPDATE contacts ...
  if (normalizedSql.startsWith('update contacts set')) {
    if (normalizedSql.includes('name = ?, company = ?')) {
      const [name, company, id] = params;
      const contact = jsonDb.data.contacts.find(c => c.id === id);
      if (contact) {
        contact.name = name;
        contact.company = company;
      }
    } else if (normalizedSql.includes('status = \'unsubscribed\'')) {
      const id = params[0];
      const contact = jsonDb.data.contacts.find(c => c.id === id);
      if (contact) {
        contact.status = 'Unsubscribed';
      }
    }
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 33. INSERT INTO contacts ...
  if (normalizedSql.startsWith('insert into contacts')) {
    const [id, email, name, company, unsubscribe_token] = params;
    jsonDb.data.contacts.push({
      id, email, name, company, status: 'Subscribed', unsubscribe_token, created_at: new Date().toISOString()
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 34. INSERT INTO smtp_configs ...
  if (normalizedSql.startsWith('insert into smtp_configs')) {
    const [id, name, host, port, username, password, encryption, sender_email, sender_name, is_active] = params;
    jsonDb.data.smtp_configs.push({
      id, name, host, port: parseInt(port) || 587, username, password, encryption, sender_email, sender_name, is_active: parseInt(is_active) || 0
    });
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 35. UPDATE smtp_configs ...
  if (normalizedSql.startsWith('update smtp_configs set')) {
    if (params.length === 9) {
      const [name, host, port, username, encryption, sender_email, sender_name, is_active, id] = params;
      const cfg = jsonDb.data.smtp_configs.find(c => c.id === id);
      if (cfg) {
        cfg.name = name;
        cfg.host = host;
        cfg.port = parseInt(port) || 587;
        cfg.username = username;
        cfg.encryption = encryption;
        cfg.sender_email = sender_email;
        cfg.sender_name = sender_name;
        cfg.is_active = parseInt(is_active) || 0;
      }
    } else {
      const [name, host, port, username, password, encryption, sender_email, sender_name, is_active, id] = params;
      const cfg = jsonDb.data.smtp_configs.find(c => c.id === id);
      if (cfg) {
        cfg.name = name;
        cfg.host = host;
        cfg.port = parseInt(port) || 587;
        cfg.username = username;
        cfg.password = password;
        cfg.encryption = encryption;
        cfg.sender_email = sender_email;
        cfg.sender_name = sender_name;
        cfg.is_active = parseInt(is_active) || 0;
      }
    }
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 36. DELETE FROM smtp_configs WHERE id = ?;
  if (normalizedSql.startsWith('delete from smtp_configs')) {
    const id = params[0];
    jsonDb.data.smtp_configs = jsonDb.data.smtp_configs.filter(c => c.id !== id);
    jsonDb.write();
    return [{ affectedRows: 1 }];
  }

  // 37. SELECT * FROM templates
  if (normalizedSql.startsWith('select * from templates')) {
    const list = [...(jsonDb.data.templates || [])];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return [list];
  }

  // 38. INSERT INTO templates
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

  // 39. UPDATE templates SET
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

  // 40. DELETE FROM templates WHERE id = ?
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
let pgPool = null;
let usePg = false;

// 1. Try to connect to PostgreSQL if DATABASE_URL starts with postgres:// or postgresql://
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))) {
  try {
    pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    // Test PostgreSQL connection
    await pgPool.query('SELECT 1;');
    usePg = true;
    console.log('Successfully connected to PostgreSQL database using DATABASE_URL.');
  } catch (err) {
    console.warn('⚠️ Could not connect to PostgreSQL database using DATABASE_URL. Falling back to local/other database settings.', err.message);
  }
}

// 2. If not using PostgreSQL, attempt to connect to MySQL
if (!usePg) {
  try {
    const mysqlConfig = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('mysql://') || process.env.DATABASE_URL.startsWith('mysql2://'))
      ? process.env.DATABASE_URL
      : {
          host: process.env.DB_HOST || '127.0.0.1',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'aerosend_db',
          port: parseInt(process.env.DB_PORT) || 3306,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        };
    
    pool = mysql.createPool(mysqlConfig);
    // Test MySQL connection
    await pool.query('SELECT 1;');
    console.log('Successfully connected to MySQL database.');
  } catch (err) {
    console.warn('⚠️ Could not connect to MySQL database. Falling back to local JSON database storage.', err.message);
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
}

const pgKeyMap = {
  // settings
  senderemail: 'senderEmail',
  sendername: 'senderName',
  emailsperhour: 'emailsPerHour',
  emailsperday: 'emailsPerDay',
  delayseconds: 'delaySeconds',
  connectiontimeout: 'connectionTimeout',
  retryattempts: 'retryAttempts',
  
  // campaigns
  recipientscount: 'recipientsCount',
  sentcount: 'sentCount',
  failedcount: 'failedCount',
  scheduledate: 'scheduleDate',
  smtpused: 'smtpUsed',
  sendtime: 'sendTime',
  completiontime: 'completionTime',
  
  // recipients
  campaignid: 'campaignId',
  sentat: 'sentAt',
  openedat: 'openedAt',
  clickedat: 'clickedAt',
  repliedat: 'repliedAt',
  followupstep: 'followupStep',
  
  // followup_sequences
  delaydays: 'delayDays',
  scheduledat: 'scheduledAt',
  executedat: 'executedAt',
  
  // audit_logs
  campaignname: 'campaignName',
  recipientcount: 'recipientCount',
  deliverystatus: 'deliveryStatus',
  openstatus: 'openStatus',
  failuredetails: 'failureDetails',
  deletedat: 'deletedAt'
};

function normalizePgRowKeys(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  for (const key of Object.keys(row)) {
    const targetKey = pgKeyMap[key] || key;
    normalized[targetKey] = row[key];
  }
  return normalized;
}

const queryWrapper = {
  query: async (sql, params = []) => {
    if (usePg) {
      // Convert MySQL '?' placeholders to PostgreSQL '$1', '$2', ...
      let index = 1;
      let pgSql = sql.replace(/\?/g, () => `$${index++}`);
      // Escape the reserved 'user' column keyword for PostgreSQL
      pgSql = pgSql.replace(/\buser\b/g, '"user"');
      
      const res = await pgPool.query(pgSql, params);
      
      // Check query type
      const trimmedSql = sql.trim().toLowerCase();
      const isSelect = trimmedSql.startsWith('select') || trimmedSql.startsWith('show') || trimmedSql.startsWith('describe');
      if (isSelect) {
        const normalizedRows = res.rows.map(normalizePgRowKeys);
        return [normalizedRows, res.fields];
      } else {
        return [{ affectedRows: res.rowCount }, null];
      }
    } else if (useFallback) {
      return executeJsonQuery(fallbackDb, sql, params);
    } else {
      return pool.query(sql, params);
    }
  },
  get isPg() {
    return usePg;
  }
};

export default queryWrapper;
