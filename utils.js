// frontend/js/utils.js
// HomePro Connect — Frontend utility functions

// ========================
// LOCAL STORAGE HELPERS
// ========================
export const storage = {
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  get(key, defaultValue = null) {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    try { return JSON.parse(val); }
    catch (err) { console.error('Failed to parse localStorage:', err); return defaultValue; }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  clearAll() {
    localStorage.clear();
  }
};

// ========================
// JWT TOKEN HELPERS
// ========================
export const jwt = {
  getToken() {
    return storage.get('token');
  },
  isLoggedIn() {
    return !!jwt.getToken();
  },
  logout() {
    storage.remove('token');
    storage.remove('user');
    storage.remove('googleTokens');
  }
};

// ========================
// HTML ESCAPE / XSS PREVENTION
// ========================
export function escapeHtml(str) {
  return str?.replace(/[&<>"']/g, s => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[s])) || '';
}

// ========================
// DATE / TIME HELPERS
// ========================
export function formatDateTime(dateStr, options = {}) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', options);
}

export function addMinutes(dateStr, minutes) {
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

// ========================
// FETCH WRAPPER WITH JWT AUTH
// ========================
export async function apiFetch(url, options = {}) {
  const token = jwt.getToken();
  const headers = options.headers || {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API request failed');
    return data;
  } catch (err) {
    console.error('API fetch error:', err);
    throw err;
  }
}

// ========================
// RANDOM ID GENERATOR (for temporary front-end use)
// ========================
export function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

// ========================
// DEBOUNCE FUNCTION (for search input)
// ========================
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
