/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import { API_BASE, authFetch } from '../utils/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({
    smtp: { host: '', port: '', username: '', password: '', encryption: '', senderEmail: '', senderName: '' },
    limits: { emailsPerHour: 5000, emailsPerDay: 50000, delaySeconds: 0.5 },
    timeouts: { connectionTimeout: 10, retryAttempts: 3 }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('aerosend_user');
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      // Purge stale sessions from old dummy users (not Vaibhav Soni)
      if (parsed && parsed.email && parsed.email !== 'vaibhavsoni1059@gmail.com') {
        localStorage.removeItem('aerosend_token');
        localStorage.removeItem('aerosend_user');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const savedUser = localStorage.getItem('aerosend_user');
    // Only restore token if the saved user is Vaibhav Soni
    try {
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      if (parsed && parsed.email === 'vaibhavsoni1059@gmail.com') {
        return localStorage.getItem('aerosend_token') || null;
      }
    } catch { /* empty */ }
    return null;
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
    if (!localStorage.getItem('aerosend_token')) return;
    try {
      // 1. Fetch campaigns
      try {
        const resCamp = await authFetch(`${API_BASE}/campaigns`);
        if (resCamp.ok) {
          const dataCamp = await resCamp.json();
          setCampaigns(Array.isArray(dataCamp) ? dataCamp : []);
        } else {
          setCampaigns([]);
        }
      } catch (e) {
        console.error('Failed to fetch campaigns:', e);
        setCampaigns([]);
      }

      // 2. Fetch logs
      try {
        const resLogs = await authFetch(`${API_BASE}/logs`);
        if (resLogs.ok) {
          const dataLogs = await resLogs.json();
          setAuditLogs(Array.isArray(dataLogs) ? dataLogs : []);
        } else {
          setAuditLogs([]);
        }
      } catch (e) {
        console.error('Failed to fetch audit logs:', e);
        setAuditLogs([]);
      }

      // 3. Fetch users
      try {
        const resUsers = await authFetch(`${API_BASE}/users`);
        if (resUsers.ok) {
          const dataUsers = await resUsers.json();
          setUsers(Array.isArray(dataUsers) ? dataUsers : []);
        } else {
          setUsers([]);
        }
      } catch (e) {
        console.error('Failed to fetch users:', e);
        setUsers([]);
      }

      // 4. Fetch settings
      try {
        const resSettings = await authFetch(`${API_BASE}/settings`);
        if (resSettings.ok) {
          const dataSettings = await resSettings.json();
          if (dataSettings && !dataSettings.error) {
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
          }
        }
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      }

      // 5. Fetch templates
      try {
        const resTemplates = await authFetch(`${API_BASE}/templates`);
        if (resTemplates.ok) {
          const dataTemplates = await resTemplates.json();
          setTemplates(Array.isArray(dataTemplates) ? dataTemplates : []);
        } else {
          setTemplates([]);
        }
      } catch (e) {
        console.error('Failed to fetch templates:', e);
        setTemplates([]);
      }
    } catch (err) {
      console.error('Failed to connect to full-stack API server:', err);
    }
  };

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshData();
    }
  }, [token]);

  // Poll sending status from Node backend
  useEffect(() => {
    if (!token) return;
    let timer;
    const checkStatus = async () => {
      try {
        const res = await authFetch(`${API_BASE}/sending/active`);
        if (!res.ok) return;
        const active = await res.json();
        setSendingState(active);
        
        if (active.status === 'sending' || active.status === 'completed') {
          const resCamp = await authFetch(`${API_BASE}/campaigns`);
          if (resCamp.ok) {
            const dataCamp = await resCamp.json();
            setCampaigns(dataCamp);
          }
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
  }, [sendingState.status, token]);

  const logEvent = async (_action, _status = 'Success') => {
    await refreshData();
  };

  const login = async (email) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('aerosend_token', data.token);
    localStorage.setItem('aerosend_user', JSON.stringify(data.user));
    setCurrentUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('aerosend_token');
    localStorage.removeItem('aerosend_user');
    setCurrentUser(null);
    setToken(null);
  };

  const addUser = async (name, email, role) => {
    try {
      await authFetch(`${API_BASE}/users`, {
        method: 'POST',
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
      await authFetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
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
      await authFetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
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
      await authFetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await authFetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE'
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const saveCampaign = async (campaignData) => {
    const creator = currentUser?.name || 'Administrator';
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    
    const payload = {
      id,
      ...campaignData,
      date: new Date().toISOString(),
      creator
    };

    try {
      await authFetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await refreshData();
      return id;
    } catch (err) {
      console.error(err);
      return id;
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      await authFetch(`${API_BASE}/campaigns/${campaignId}`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const saveTemplate = async (templateData) => {
    const id = templateData.id || 't' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const payload = { id, ...templateData };
    try {
      await authFetch(`${API_BASE}/templates`, {
        method: 'POST',
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
      await authFetch(`${API_BASE}/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(templateData)
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTemplate = async (templateId) => {
    try {
      await authFetch(`${API_BASE}/templates/${templateId}`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAuditLog = async (id, permanent = false) => {
    try {
      await authFetch(`${API_BASE}/logs/${id}?permanent=${permanent}`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error('Failed to delete audit log:', err);
    }
  };

  const deleteAuditLogsBulk = async (ids, permanent = false) => {
    try {
      await authFetch(`${API_BASE}/logs/delete-bulk`, {
        method: 'POST',
        body: JSON.stringify({ ids, permanent })
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to bulk delete audit logs:', err);
    }
  };

  const restoreAuditLogsBulk = async (ids) => {
    try {
      await authFetch(`${API_BASE}/logs/restore-bulk`, {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to bulk restore audit logs:', err);
    }
  };

  const clearCampaignHistory = async (campaignId) => {
    try {
      await authFetch(`${API_BASE}/campaigns/${campaignId}/history`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error('Failed to clear campaign history:', err);
    }
  };

  const cancelCampaignSchedule = async (campaignId) => {
    try {
      const res = await authFetch(`${API_BASE}/campaigns/${campaignId}/cancel-schedule`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error('Failed to cancel campaign schedule');
      }
      await refreshData();
    } catch (err) {
      console.error('Error canceling campaign schedule:', err);
    }
  };

  const updateCampaignSchedule = async (campaignId, scheduleDate) => {
    try {
      const res = await authFetch(`${API_BASE}/campaigns/${campaignId}/update-schedule`, {
        method: 'POST',
        body: JSON.stringify({ scheduleDate: new Date(scheduleDate).toISOString() })
      });
      if (!res.ok) {
        throw new Error('Failed to update campaign schedule');
      }
      await refreshData();
    } catch (err) {
      console.error('Error updating campaign schedule:', err);
      alert(err.message);
    }
  };

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
      await authFetch(`${API_BASE}/settings`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const sendTestEmail = async (testEmail, subject, body) => {
    try {
      const res = await authFetch(`${API_BASE}/campaigns/send-test`, {
        method: 'POST',
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
      await authFetch(`${API_BASE}/sending/launch`, {
        method: 'POST',
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
    await authFetch(`${API_BASE}/sending/pause`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeSending = async () => {
    await authFetch(`${API_BASE}/sending/resume`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'sending' }));
  };

  const stopSending = async () => {
    await authFetch(`${API_BASE}/sending/stop`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'stopped', remaining: 0 }));
    await refreshData();
  };

  const retryFailedEmails = async () => {
    await authFetch(`${API_BASE}/sending/retry`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, status: 'sending' }));
  };

  const dismissAdminSummary = async () => {
    await authFetch(`${API_BASE}/sending/dismiss-summary`, { method: 'POST' });
    setSendingState(prev => ({ ...prev, showAdminSummary: false }));
  };

  return (
    <AppContext.Provider value={{
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
      deleteTemplate,
      deleteAuditLog,
      deleteAuditLogsBulk,
      restoreAuditLogsBulk,
      clearCampaignHistory,
      cancelCampaignSchedule,
      updateCampaignSchedule,
      currentUser,
      token,
      login,
      logout,
      authFetch
    }}>
      {children}
    </AppContext.Provider>
  );
};
