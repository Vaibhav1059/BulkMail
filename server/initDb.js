import mysql from 'mysql2/promise';

async function initDB() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    port: 3306
  });

  console.log('Connecting to MySQL host...');

  try {
    // 1. Create Database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS aerosend_db;');
    console.log('Database "aerosend_db" checked/created.');

    // 2. Select Database
    await connection.query('USE aerosend_db;');

    // 3. Create Settings Table (Don't drop to preserve SMTP credentials)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY DEFAULT 1,
        host VARCHAR(255) DEFAULT 'smtp.sendgrid.net',
        port VARCHAR(10) DEFAULT '587',
        username VARCHAR(255) DEFAULT 'apikey',
        password VARCHAR(255) DEFAULT 'SG.mock_api_key_value_example',
        encryption VARCHAR(50) DEFAULT 'TLS',
        senderEmail VARCHAR(255) DEFAULT 'campaigns@enterprise.com',
        senderName VARCHAR(255) DEFAULT 'Enterprise Bulk Mailer',
        emailsPerHour INT DEFAULT 5000,
        emailsPerDay INT DEFAULT 50000,
        delaySeconds FLOAT DEFAULT 0.5,
        connectionTimeout INT DEFAULT 10,
        retryAttempts INT DEFAULT 3
      );
    `);
    console.log('Settings table checked.');

    // Seed default settings row if empty
    const [settingsRows] = await connection.query('SELECT COUNT(*) as count FROM settings;');
    if (settingsRows[0].count === 0) {
      await connection.query(`
        INSERT INTO settings (id) VALUES (1);
      `);
      console.log('Default settings row initialized.');
    }

    // Drop tables to apply clean new constraints, relationships and foreign keys (except settings and templates)
    console.log('Dropping existing campaign and logging tables for schema synchronization...');
    await connection.query('DROP TABLE IF EXISTS list_contacts;');
    await connection.query('DROP TABLE IF EXISTS contact_lists;');
    await connection.query('DROP TABLE IF EXISTS contacts;');
    await connection.query('DROP TABLE IF EXISTS smtp_configs;');
    await connection.query('DROP TABLE IF EXISTS followup_sequences;');
    await connection.query('DROP TABLE IF EXISTS recipients;');
    await connection.query('DROP TABLE IF EXISTS audit_logs;');
    await connection.query('DROP TABLE IF EXISTS campaigns;');

    // 4. Create Campaigns Table with upgraded audit parameters
    await connection.query(`
      CREATE TABLE campaigns (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        recipientsCount INT DEFAULT 0,
        sentCount INT DEFAULT 0,
        failedCount INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Draft',
        date VARCHAR(50),
        scheduleDate VARCHAR(50),
        creator VARCHAR(255),
        smtpUsed VARCHAR(255) DEFAULT NULL,
        sendTime VARCHAR(50) DEFAULT NULL,
        completionTime VARCHAR(50) DEFAULT NULL
      );
    `);
    console.log('Upgraded Campaigns table created.');

    // 5. Create Recipients Table with ON DELETE CASCADE foreign keys
    await connection.query(`
      CREATE TABLE recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaignId VARCHAR(50),
        email VARCHAR(255),
        name VARCHAR(255),
        company VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Valid',
        reason VARCHAR(255) DEFAULT '',
        sentAt VARCHAR(50) DEFAULT '',
        openedAt DATETIME DEFAULT NULL,
        clickedAt DATETIME DEFAULT NULL,
        repliedAt DATETIME DEFAULT NULL,
        followupStep INT DEFAULT 0,
        INDEX idx_campaignId (campaignId),
        INDEX idx_email (email)
      );
    `);
    console.log('Upgraded Recipients table created.');

    // 5b. Create Follow-up Sequences Table
    await connection.query(`
      CREATE TABLE followup_sequences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaignId VARCHAR(50) NOT NULL,
        step INT NOT NULL DEFAULT 1,
        delayDays INT NOT NULL DEFAULT 3,
        conditions TEXT,
        condition_logic VARCHAR(10) DEFAULT 'AND',
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        scheduledAt DATETIME DEFAULT NULL,
        executedAt DATETIME DEFAULT NULL,
        sentCount INT DEFAULT 0,
        INDEX idx_fu_campaignId (campaignId),
        INDEX idx_fu_status (status)
      );
    `);
    console.log('Follow-up Sequences table created.');

    // 6. Create Audit Logs Table with campaign tracking columns and cascade rules
    await connection.query(`
      CREATE TABLE audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50),
        user VARCHAR(255),
        action VARCHAR(255),
        status VARCHAR(50),
        campaignId VARCHAR(50) DEFAULT NULL,
        campaignName VARCHAR(255) DEFAULT NULL,
        subject VARCHAR(255) DEFAULT NULL,
        body TEXT DEFAULT NULL,
        senderEmail VARCHAR(255) DEFAULT NULL,
        recipientCount INT DEFAULT 0,
        deliveryStatus VARCHAR(50) DEFAULT NULL,
        openStatus VARCHAR(50) DEFAULT 'Not Opened',
        failureDetails TEXT DEFAULT NULL,
        deletedAt VARCHAR(50) DEFAULT NULL,
        INDEX idx_audit_campaignId (campaignId)
      );
    `);
    console.log('Upgraded Audit Logs table created.');

    // 6b. Create Contacts and Lists Tables (Audience)
    await connection.query(`
      CREATE TABLE contacts (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) DEFAULT 'Recipient',
        company VARCHAR(255) DEFAULT 'Enterprise',
        status VARCHAR(50) DEFAULT 'Subscribed',
        unsubscribe_token VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Contacts table created.');

    await connection.query(`
      CREATE TABLE contact_lists (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Contact Lists table created.');

    await connection.query(`
      CREATE TABLE list_contacts (
        list_id VARCHAR(50),
        contact_id VARCHAR(50),
        PRIMARY KEY (list_id, contact_id),
        FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);
    console.log('List Contacts junction table created.');

    // 6c. Create SMTP Configs Table
    await connection.query(`
      CREATE TABLE smtp_configs (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        username VARCHAR(255),
        password VARCHAR(255),
        encryption VARCHAR(50) DEFAULT 'TLS',
        sender_email VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255),
        is_active INT DEFAULT 1
      );
    `);
    console.log('SMTP Configs table created.');

    // Seed default SMTP Config
    await connection.query(`
      INSERT INTO smtp_configs (id, name, host, port, username, password, encryption, sender_email, sender_name, is_active)
      VALUES ('default', 'Default SMTP Server', 'smtp.sendgrid.net', 587, 'apikey', 'SG.mock_api_key_value_example', 'TLS', 'campaigns@enterprise.com', 'Enterprise Bulk Mailer', 1);
    `);
    console.log('Default SMTP Config seeded.');

    // 7. Create Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        avatar VARCHAR(255)
      );
    `);
    console.log('Users table checked.');

    // Seed default users (clean and seed only Vaibhav Soni)
    await connection.query('DELETE FROM users;');
    const defaultUsers = [
      { id: '1', name: 'Vaibhav Soni', email: 'vaibhavsoni1059@gmail.com', role: 'Admin', status: 'Active', avatar: '/male_boy_avatar.png' }
    ];
    for (const u of defaultUsers) {
      await connection.query(`
        INSERT INTO users (id, name, email, role, status, avatar)
        VALUES (?, ?, ?, ?, ?, ?);
      `, [u.id, u.name, u.email, u.role, u.status, u.avatar]);
    }
    console.log('Seeded Vaibhav Soni as the sole user in database.');

    // 8. Create Templates Table (Don't drop to preserve templates)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        date VARCHAR(50)
      );
    `);
    console.log('Templates table checked.');

    // Seed default templates if table is empty
    const [templateRows] = await connection.query('SELECT COUNT(*) as count FROM templates;');
    if (templateRows[0].count === 0) {
      const defaultTemplates = [
        {
          id: 't1',
          name: 'Monthly Product Newsletter',
          subject: 'Newsletter: Latest updates from {{company}}',
          body: 'Hi {{name}},\n\nHere are the top stories this month from {{company}}:\n\n1. Product Automations are now live.\n2. Security parameters have been updated.\n\nEnjoy the reads!\n\nBest,\nThe Newsletter Team'
        },
        {
          id: 't2',
          name: 'Welcome Onboarding Mailer',
          subject: 'Welcome to AeroSend, {{name}}!',
          body: 'Hello {{name}},\n\nThank you for setting up your account under {{email}}. We are excited to support your journey.\n\nLet us know if you need help.\n\nRegards,\nCustomer Success'
        },
        {
          id: 't3',
          name: 'Exclusive Promo Discount',
          subject: 'Exclusive deal for {{name}}',
          body: 'Hey {{name}},\n\nWe have generated a custom coupon for {{company}} employees. Use code AEROSEND20 to get 20% off your active subscription.\n\nAct fast!\nSales Team'
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
</div>`
        }
      ];

      for (const t of defaultTemplates) {
        await connection.query(`
          INSERT INTO templates (id, name, subject, body, date)
          VALUES (?, ?, ?, ?, ?);
        `, [t.id, t.name, t.subject, t.body, new Date().toISOString()]);
      }
      console.log('Seeded default templates.');
    }

    // Seed default campaigns with upgraded audit parameters
    const defaultCampaigns = [
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
        creator: 'Marcus Chen',
        smtpUsed: null,
        sendTime: null,
        completionTime: null
      }
    ];

    for (const camp of defaultCampaigns) {
      await connection.query(`
        INSERT INTO campaigns (id, name, subject, body, recipientsCount, sentCount, failedCount, status, date, scheduleDate, creator, smtpUsed, sendTime, completionTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [camp.id, camp.name, camp.subject, camp.body, camp.recipientsCount, camp.sentCount, camp.failedCount, camp.status, camp.date, camp.scheduleDate || null, camp.creator, camp.smtpUsed, camp.sendTime, camp.completionTime]);
    }
    console.log('Seeded default campaigns.');

    // Seed default recipients matching campaigns
    const defaultRecipients = [
      { campaignId: 'c2', email: 'jane.smith@stripe.com', name: 'Jane Smith', company: 'Stripe Inc', status: 'Sent', reason: '', sentAt: new Date(Date.now() - 2*24*60*60*1000 - 15*60*1000).toISOString() },
      { campaignId: 'c2', email: 'bob.johnson@netflix.com', name: 'Bob Johnson', company: 'Netflix', status: 'Failed', reason: 'SMTP delivery timeout/bounce', sentAt: new Date(Date.now() - 2*24*60*60*1000 - 10*60*1000).toISOString() }
    ];

    for (const r of defaultRecipients) {
      await connection.query(`
        INSERT INTO recipients (campaignId, email, name, company, status, reason, sentAt)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `, [r.campaignId, r.email, r.name, r.company, r.status, r.reason, r.sentAt]);
    }
    console.log('Seeded default campaign recipients.');

    // Seed default audit logs associated with campaigns
    const defaultLogs = [
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

    for (const log of defaultLogs) {
      await connection.query(`
        INSERT INTO audit_logs (id, date, user, action, status, campaignId, campaignName, subject, senderEmail, recipientCount, deliveryStatus, openStatus, failureDetails, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);
      `, [log.id, log.date, log.user, log.action, log.status, log.campaignId, log.campaignName, log.subject, log.senderEmail, log.recipientCount, log.deliveryStatus, log.openStatus, log.failureDetails]);
    }
    console.log('Seeded default audit logs.');

    // Seed default contact lists
    const defaultLists = [
      { id: 'l1', name: 'Premium Subscribers', description: 'VIP customers and active premium plan subscribers' },
      { id: 'l2', name: 'Partner Outreach', description: 'Enterprise partners and affiliate contacts' }
    ];

    for (const list of defaultLists) {
      await connection.query(`
        INSERT INTO contact_lists (id, name, description)
        VALUES (?, ?, ?);
      `, [list.id, list.name, list.description]);
    }
    console.log('Seeded default contact lists.');

    // Seed default contacts
    const defaultContacts = [
      { id: 'ct1', email: 'alice.johnson@acme.com', name: 'Alice Johnson', company: 'Acme Corp', status: 'Subscribed', unsubscribe_token: 'ut_alice_123' },
      { id: 'ct2', email: 'bob.miller@globex.com', name: 'Bob Miller', company: 'Globex Inc', status: 'Subscribed', unsubscribe_token: 'ut_bob_456' },
      { id: 'ct3', email: 'charlie.davis@hooli.com', name: 'Charlie Davis', company: 'Hooli', status: 'Subscribed', unsubscribe_token: 'ut_charlie_789' },
      { id: 'ct4', email: 'diana.prince@wayne.com', name: 'Diana Prince', company: 'Wayne Enterprises', status: 'Subscribed', unsubscribe_token: 'ut_diana_012' }
    ];

    for (const c of defaultContacts) {
      await connection.query(`
        INSERT INTO contacts (id, email, name, company, status, unsubscribe_token)
        VALUES (?, ?, ?, ?, ?, ?);
      `, [c.id, c.email, c.name, c.company, c.status, c.unsubscribe_token]);
    }
    console.log('Seeded default contacts.');

    // Seed default list contacts mappings
    const defaultListContacts = [
      { list_id: 'l1', contact_id: 'ct1' },
      { list_id: 'l1', contact_id: 'ct2' },
      { list_id: 'l2', contact_id: 'ct3' },
      { list_id: 'l2', contact_id: 'ct4' }
    ];

    for (const lc of defaultListContacts) {
      await connection.query(`
        INSERT INTO list_contacts (list_id, contact_id)
        VALUES (?, ?);
      `, [lc.list_id, lc.contact_id]);
    }
    console.log('Seeded default list-contact relations.');

    console.log('Database initialization completed successfully.');
  } catch (err) {
    console.error('Error during database initialization:', err);
  } finally {
    await connection.end();
  }
}

initDB();
