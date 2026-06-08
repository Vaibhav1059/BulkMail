import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const API_BASE = 'http://localhost:5000/api';

export const AppProvider = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState('Admin'); // 'Admin' | 'Manager' | 'Operator'
  const [users, setUsers] = useState([]);

  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({
    smtp: { host: '', port: '', username: '', password: '', encryption: '', senderEmail: '', senderName: '' },
    limits: { emailsPerHour: 5000, emailsPerDay: 50000, delaySeconds: 0.5 },
    timeouts: { connectionTimeout: 10, retryAttempts: 3 }
  });

  const [csvData, setCsvData] = useState({
    fileName: '',
    headers: [],
    rawRows: [],
    mappedFields: { email: '', name: '', company: '' },
    validationReport: null
  });

  const [campaignWorkspace, setCampaignWorkspace] = useState({
    name: 'New Promo Campaign',
    subject: 'Special offer for {{name}} at {{company}}!',
    body: 'Hi {{name}},\n\nWe would love to offer {{company}} special pricing of 20% off. Let us know if this works for you!\n\nBest,\nSales Team',
    attachments: [],
    scheduleOption: 'immediate',
    scheduleDate: '',
  });

  const [sendingState, setSendingState] = useState({
    campaignId: null,
    campaignName: '',
    total: 0,
    sent: 0,
    failed: 0,
    remaining: 0,
    status: 'idle',
    logs: [],
    failedList: [],
    recipientData: [],
    mappedFields: { name: '', email: '', company: '' },
    concurrency: 1,
    delayOverride: 0.5,
    showAdminSummary: false,
    rangeIndex: null
  });

  // Load initial MySQL data from API
  const refreshData = async () => {
    try {
      const resCamp = await fetch(`${API_BASE}/campaigns`);
      const dataCamp = await resCamp.json();
      setCampaigns(dataCamp);

      const resLogs = await fetch(`${API_BASE}/logs`);
      const dataLogs = await resLogs.json();
      setAuditLogs(dataLogs);

      const resUsers = await fetch(`${API_BASE}/users`);
      const dataUsers = await resUsers.json();
      setUsers(dataUsers);

      const resSettings = await fetch(`${API_BASE}/settings`);
      const dataSettings = await resSettings.json();

      const resTemplates = await fetch(`${API_BASE}/templates`);
      const dataTemplates = await resTemplates.json();
      setTemplates(dataTemplates);
      
      setSettings({
        smtp: {
          host: dataSettings.host || '',
          port: dataSettings.port || '',
          username: dataSettings.username || '',
          password: dataSettings.password || '',
          encryption: dataSettings.encryption || 'TLS',
          senderEmail: dataSettings.senderEmail || '',
          senderName: dataSettings.senderName || '',
        },
        limits: {
          emailsPerHour: dataSettings.emailsPerHour || 5000,
          emailsPerDay: dataSettings.emailsPerDay || 50000,
          delaySeconds: dataSettings.delaySeconds || 0.5,
        },
        timeouts: {
          connectionTimeout: dataSettings.connectionTimeout || 10,
          retryAttempts: dataSettings.retryAttempts || 3,
        }
      });
    } catch (err) {
      console.error('Failed to connect to full-stack API server:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Poll sending status from Node backend
  useEffect(() => {
    let timer;
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/sending/active`);
        const active = await res.json();
        setSendingState(active);
        
        if (active.status === 'sending' || active.status === 'completed') {
          const resCamp = await fetch(`${API_BASE}/campaigns`);
          const dataCamp = await resCamp.json();
          setCampaigns(dataCamp);
        }

        if (active.status === 'sending' || active.status === 'paused') {
          timer = setTimeout(checkStatus, 1000);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    };

    if (sendingState.status === 'sending' || sendingState.status === 'paused') {
      timer = setTimeout(checkStatus, 1000);
    }

    return () => clearTimeout(timer);
  }, [sendingState.status]);

  // Log action
  const logEvent = async (action, status = 'Success') => {
    await refreshData();
  };

  // Add User (MySQL API)
  const addUser = async (name, email, role) => {
    try {
      await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role })
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    try {
      await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userToUpdate.name,
          email: userToUpdate.email,
          role: newRole
        })
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateUser = async (userId, updatedDetails) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    const merged = {
      name: updatedDetails.name !== undefined ? updatedDetails.name : userToUpdate.name,
      email: updatedDetails.email !== undefined ? updatedDetails.email : userToUpdate.email,
      role: updatedDetails.role !== undefined ? updatedDetails.role : userToUpdate.role
    };
    try {
      await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUserStatus = async (userId) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    const newStatus = userToUpdate.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE'
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save campaign to MySQL via API
  const saveCampaign = async (campaignData) => {
    const creatorNames = { Admin: 'Alexander Wright', Manager: 'Marcus Chen', Operator: 'Sarah Jenkins' };
    const creator = creatorNames[currentUserRole] || 'System Mailer';
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    
    const payload = {
      id,
      ...campaignData,
      date: new Date().toISOString(),
      creator
    };

    try {
      await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshData();
      return id;
    } catch (err) {
      console.error(err);
      return id;
    }
  };

  // Delete campaign from MySQL
  const deleteCampaign = async (campaignId) => {
    try {
      await fetch(`${API_BASE}/campaigns/${campaignId}`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const saveTemplate = async (templateData) => {
    const id = templateData.id || 't' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const payload = { id, ...templateData };
    try {
      await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshData();
      return id;
    } catch (err) {
      console.error(err);
      return id;
    }
  };

  const updateTemplate = async (templateId, templateData) => {
    try {
      await fetch(`${API_BASE}/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTemplate = async (templateId) => {
    try {
      await fetch(`${API_BASE}/templates/${templateId}`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings to MySQL
  const updateSettings = async (newSettings) => {
    const payload = {
      host: newSettings.smtp.host,
      port: newSettings.smtp.port,
      username: newSettings.smtp.username,
      password: newSettings.smtp.password,
      encryption: newSettings.smtp.encryption,
      senderEmail: newSettings.smtp.senderEmail,
      senderName: newSettings.smtp.senderName,
      emailsPerHour: newSettings.limits.emailsPerHour,
      emailsPerDay: newSettings.limits.emailsPerDay,
      delaySeconds: newSettings.limits.delaySeconds,
      connectionTimeout: newSettings.timeouts.connectionTimeout,
      retryAttempts: newSettings.timeouts.retryAttempts,
    };

    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const sendTestEmail = async (testEmail, subject, body) => {
    try {
      const res = await fetch(`${API_BASE}/campaigns/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, subject, body })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }
      await refreshData();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Launch Queue on Node.js Server
  const launchCampaign = async (campaignId, campaignName, subject, body, recipients, range, concurrency, delay) => {
    const payload = {
      campaignId,
      campaignName,
      subject,
      body,
      recipients,
      range,
      concurrency,
      delay,
      mappedFields: csvData.mappedFields
    };

    try {
      await fetch(`${API_BASE}/sending/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setSendingState(prev => ({
        ...prev,
        status: 'sending'
      }));

      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const pauseSending = async () => {
    await fetch(`${API_BASE}/sending/pause`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeSending = async () => {
    await fetch(`${API_BASE}/sending/resume`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'sending' }));
  };

  const stopSending = async () => {
    await fetch(`${API_BASE}/sending/stop`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'stopped', remaining: 0 }));
    await refreshData();
  };

  const retryFailedEmails = async () => {
    await fetch(`${API_BASE}/sending/retry`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'sending' }));
  };

  const dismissAdminSummary = async () => {
    await fetch(`${API_BASE}/sending/dismiss-summary`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, showAdminSummary: false }));
  };

  return (
    <AppContext.Provider value={{
      currentUserRole,
      setCurrentUserRole,
      users,
      addUser,
      updateUser,
      updateUserRole,
      toggleUserStatus,
      deleteUser,
      campaigns,
      saveCampaign,
      deleteCampaign,
      auditLogs,
      logEvent,
      settings,
      updateSettings,
      csvData,
      setCsvData,
      campaignWorkspace,
      setCampaignWorkspace,
      sendingState,
      launchCampaign,
      sendTestEmail,
      pauseSending,
      resumeSending,
      stopSending,
      retryFailedEmails,
      dismissAdminSummary,
      templates,
      saveTemplate,
      updateTemplate,
      deleteTemplate
    }}>
      {children}
    </AppContext.Provider>
  );
};
