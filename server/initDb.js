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

    // 3. Create Settings Table
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

    // 4. Create Campaigns Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
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
        creator VARCHAR(255)
      );
    `);
    console.log('Campaigns table checked.');

    // 5. Create Recipients Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaignId VARCHAR(50),
        email VARCHAR(255),
        name VARCHAR(255),
        company VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Valid',
        reason VARCHAR(255) DEFAULT '',
        sentAt VARCHAR(50) DEFAULT ''
      );
    `);
    console.log('Recipients table checked.');

    // 6. Create Audit Logs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50),
        user VARCHAR(255),
        action VARCHAR(255),
        status VARCHAR(50)
      );
    `);
    console.log('Audit logs table checked.');

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

    // Seed default users if table is empty
    const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users;');
    if (userRows[0].count === 0) {
      const defaultUsers = [
        { id: '1', name: 'Alexander Wright', email: 'alex@enterprise.com', role: 'Admin', status: 'Active', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' },
        { id: '2', name: 'Marcus Chen', email: 'marcus@enterprise.com', role: 'Manager', status: 'Active', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' },
        { id: '3', name: 'Sarah Jenkins', email: 'sarah.j@enterprise.com', role: 'Operator', status: 'Active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' },
      ];
      for (const u of defaultUsers) {
        await connection.query(`
          INSERT INTO users (id, name, email, role, status, avatar)
          VALUES (?, ?, ?, ?, ?, ?);
        `, [u.id, u.name, u.email, u.role, u.status, u.avatar]);
      }
      console.log('Seeded default users.');
    }

    // 8. Create Templates Table
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

    // Seed default campaigns if table is empty
    const [campRows] = await connection.query('SELECT COUNT(*) as count FROM campaigns;');
    if (campRows[0].count === 0) {
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
      ];

      for (const camp of defaultCampaigns) {
        await connection.query(`
          INSERT INTO campaigns (id, name, subject, body, recipientsCount, sentCount, failedCount, status, date, scheduleDate, creator)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [camp.id, camp.name, camp.subject, camp.body, camp.recipientsCount, camp.sentCount, camp.failedCount, camp.status, camp.date, camp.scheduleDate || null, camp.creator]);
      }
      console.log('Seeded default campaigns.');
    }

    // Seed default audit logs if empty
    const [logRows] = await connection.query('SELECT COUNT(*) as count FROM audit_logs;');
    if (logRows[0].count === 0) {
      const defaultLogs = [
        { id: 'l1', date: new Date().toISOString(), user: 'Alexander Wright', action: 'Database schema successfully initialized', status: 'Success' },
        { id: 'l2', date: new Date(Date.now() - 3600000).toISOString(), user: 'Marcus Chen', action: 'Created Campaign "Developer API Conference Invitation"', status: 'Success' }
      ];
      for (const log of defaultLogs) {
        await connection.query(`
          INSERT INTO audit_logs (id, date, user, action, status)
          VALUES (?, ?, ?, ?, ?);
        `, [log.id, log.date, log.user, log.action, log.status]);
      }
      console.log('Seeded default audit logs.');
    }

    console.log('Database initialization completed successfully.');
  } catch (err) {
    console.error('Error during database initialization:', err);
  } finally {
    await connection.end();
  }
}

initDB();
