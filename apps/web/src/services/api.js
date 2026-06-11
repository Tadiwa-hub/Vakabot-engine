const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const api = {
  async get(endpoint, userId) {
    const headers = userId ? { 'x-user-id': userId } : {};
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async post(endpoint, body, userId) {
    const headers = {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async put(endpoint, body, userId) {
    const headers = {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async patch(endpoint, body, userId) {
    const headers = {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
};

export const instanceService = {
  getInstance: (userId) => api.get(`/api/instance/status/${userId}`, userId),
  createInstance: (data) => api.post('/api/instance/create', data, data.userId),
  toggleInstance: (userId, isActive) => api.patch(`/api/instance/${userId}`, { isActive }, userId),
  disconnectInstance: (userId) => api.post(`/api/instance/disconnect/${userId}`, {}, userId),
};

export const userService = {
  getUser: (id) => api.get(`/api/users/${id}`, id),
  updateUser: (id, data) => api.put(`/api/users/${id}`, data, id),
};

export const insightService = {
  getInsights: (userId) => api.get(`/api/users/${userId}/insights`, userId),
  dismissInsight: (userId, id) => api.patch(`/api/users/${userId}/insights/${id}/dismiss`, {}, userId),
};

export const keywordService = {
  getKeywords: (userId) => api.get(`/api/keywords/${userId}`, userId),
  createKeyword: (data) => api.post('/api/keywords', data, data.userId),
  updateKeyword: (id, data) => api.patch(`/api/keywords/${id}`, data, data.userId),
  deleteKeyword: (id, userId) => {
    return fetch(`${API_BASE_URL}/api/keywords/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId }
    }).then(res => res.json());
  }
};

export const businessService = {
  getServices: (userId) => api.get(`/api/services/${userId}`, userId),
  createService: (data) => api.post('/api/services', data, data.userId),
  updateService: (id, data) => api.patch(`/api/services/${id}`, data, data.userId),
  deleteService: (id, userId) => {
    return fetch(`${API_BASE_URL}/api/services/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId }
    }).then(res => res.json());
  }
};

export const analyticsService = {
  getStats: (userId) => api.get(`/api/analytics/${userId}/stats`, userId),
  getCharts: (userId) => api.get(`/api/analytics/${userId}/charts`, userId),
  getDashboardData: (userId) => api.get(`/api/analytics/${userId}/dashboard`, userId),
};

export const conversationService = {
  getChats: (userId) => api.get(`/api/conversations/${userId}`, userId),
  getHistory: (userId, remoteJid) => api.get(`/api/conversations/${userId}/${remoteJid}`, userId),
};

export const billingService = {
  getHistory: (userId) => api.get(`/api/billing/${userId}/history`, userId),
  pay: (data) => api.post('/api/billing/pay', data, data.userId),
};
