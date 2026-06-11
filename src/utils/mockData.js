// Mock data structures for the bulk email sender dashboard

export const defaultUsers = [
  { id: '1', name: 'Vaibhav Soni', email: 'vaibhavsoni1059@gmail.com', role: 'Admin', status: 'Active', avatar: '/male_boy_avatar.png' },
];

export const defaultCampaigns = [
  {
    id: 'c1',
    name: 'Q3 Product Newsletter Launch',
    subject: 'Introducing our new automation workflow Builder! 🚀',
    body: 'Hi {{name}},\n\nWe are thrilled to present our brand new automation workflow features. As a valued employee at {{company}}, you get exclusive early access!\n\nBest,\nThe Team',
    recipientsCount: 1450,
    sentCount: 1450,
    failedCount: 0,
    status: 'Completed',
    date: '2026-05-28T10:30:00Z',
    scheduleDate: null,
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
    date: '2026-05-30T14:15:00Z',
    scheduleDate: null,
    creator: 'Vaibhav Soni'
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
    date: '2026-06-15T09:00:00Z',
    scheduleDate: '2026-06-15T09:00:00Z',
    creator: 'Marcus Chen'
  },
  {
    id: 'c4',
    name: 'SaaS Platform Terms Updates',
    subject: 'Important updates regarding your account',
    body: 'Dear {{name}},\n\nWe are updating our terms of service. Please review the changes for your account registered with {{email}}.\n\nThank you,\nLegal Department',
    recipientsCount: 300,
    sentCount: 0,
    failedCount: 0,
    status: 'Draft',
    date: '2026-06-01T16:45:00Z',
    scheduleDate: null,
    creator: 'Sarah Jenkins'
  }
];

export const defaultAuditLogs = [
  { id: 'l1', date: '2026-06-02T11:20:00Z', user: 'Vaibhav Soni', action: 'Updated SMTP Server Configurations', status: 'Success' },
  { id: 'l2', date: '2026-06-02T10:45:00Z', user: 'Vaibhav Soni', action: 'Created Campaign "Developer API Conference Invitation"', status: 'Success' },
  { id: 'l3', date: '2026-06-01T17:15:00Z', user: 'Vaibhav Soni', action: 'Drafted Campaign "SaaS Platform Terms Updates"', status: 'Success' },
  { id: 'l4', date: '2026-05-30T14:15:00Z', user: 'Vaibhav Soni', action: 'Launched Campaign "Customer Re-engagement Campaign"', status: 'Success' },
  { id: 'l5', date: '2026-05-30T14:18:22Z', user: 'System Mailer', action: 'Campaign "Customer Re-engagement Campaign" finished sending. (8 Bounced)', status: 'Warning' },
  { id: 'l6', date: '2026-05-28T10:30:00Z', user: 'Marcus Chen', action: 'Launched Campaign "Q3 Product Newsletter Launch"', status: 'Success' },
  { id: 'l7', date: '2026-05-28T10:35:10Z', user: 'System Mailer', action: 'Campaign "Q3 Product Newsletter Launch" finished sending. (All Sent)', status: 'Success' },
];

export const defaultSettings = {
  smtp: {
    host: 'smtp.sendgrid.net',
    port: '587',
    username: 'apikey',
    password: 'SG.mock_api_key_value_example_1234567890abcdefghijklmnopqrstuvwxyz',
    encryption: 'TLS',
    senderEmail: 'campaigns@enterprise.com',
    senderName: 'Enterprise Bulk Mailer'
  },
  limits: {
    emailsPerHour: 5000,
    emailsPerDay: 50000,
    delaySeconds: 0.5
  },
  timeouts: {
    connectionTimeout: 10,
    retryAttempts: 3
  }
};

export const analyticsData = {
  summary: {
    deliveryRate: 99.4,
    openRate: 64.2,
    clickRate: 28.7,
    bounceRate: 0.6,
  },
  weeklyPerformance: [
    { name: 'Mon', sent: 1200, opened: 800, clicked: 350 },
    { name: 'Tue', sent: 1800, opened: 1100, clicked: 480 },
    { name: 'Wed', sent: 2400, opened: 1650, clicked: 720 },
    { name: 'Thu', sent: 1500, opened: 980, clicked: 410 },
    { name: 'Fri', sent: 3200, opened: 2100, clicked: 950 },
    { name: 'Sat', sent: 800, opened: 520, clicked: 180 },
    { name: 'Sun', sent: 1100, opened: 710, clicked: 290 },
  ],
  bounceReasons: [
    { name: 'Invalid Email Address', value: 45 },
    { name: 'Recipient Inbox Full', value: 25 },
    { name: 'Blocked by Spam Filter', value: 20 },
    { name: 'Server Offline/Timeout', value: 10 },
  ],
  deviceDistribution: [
    { name: 'Gmail Web', value: 48 },
    { name: 'Apple Mail (iOS)', value: 27 },
    { name: 'Outlook Desktop', value: 15 },
    { name: 'Other Clients', value: 10 },
  ]
};
