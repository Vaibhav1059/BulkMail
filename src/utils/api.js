export const API_BASE = import.meta.env.VITE_API_BASE || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:5000/api'
);

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('aerosend_token');
  const headers = {
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    headers
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('aerosend_token');
    localStorage.removeItem('aerosend_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  return res;
};
