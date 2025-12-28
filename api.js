// frontend/api/api.js
// ======================================================
// HomePro Connect — API Connector
// ======================================================

const API_BASE_URL = "https://connecthome.netlify.app//"; // Change to your deployed backend URL if needed

// Helper: fetch with error handling
async function request(endpoint, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "API Error");
    return data;
  } catch (err) {
    console.error("API Request Error:", err.message);
    throw err;
  }
}

// ======================================================
// AUTH
// ======================================================
export const auth = {
  login: (email, password) =>
    request("/auth/login", "POST", { email, password }),
  
  register: (userData) =>
    request("/auth/register", "POST", userData),

  getProfile: (token) =>
    request("/auth/me", "GET", null, token),

  updateProfile: (token, updates) =>
    request("/auth/me", "PUT", updates, token),
};

// ======================================================
// PROVIDERS
// ======================================================
export const providers = {
  getAll: () => request("/providers"),
  getMe: (token) => request("/providers/me", "GET", null, token),
  updateMe: (token, updates) => request("/providers/me", "PUT", updates, token),
  getPendingBookings: (token) => request("/providers/bookings/pending", "GET", null, token),
  getActiveBookings: (token) => request("/providers/bookings/active", "GET", null, token),
  getBookingHistory: (token) => request("/providers/bookings/history", "GET", null, token),
  acceptBooking: (token, bookingId) => request(`/providers/bookings/${bookingId}/accept`, "POST", null, token),
  declineBooking: (token, bookingId) => request(`/providers/bookings/${bookingId}/decline`, "POST", null, token),
  completeBooking: (token, bookingId) => request(`/providers/bookings/${bookingId}/complete`, "POST", null, token),
};

// ======================================================
// BOOKINGS
// ======================================================
export const bookings = {
  getAll: (token) => request("/bookings", "GET", null, token),
  getBooking: (token, id) => request(`/bookings/${id}`, "GET", null, token),
  create: (token, bookingData) => request("/bookings/google", "POST", bookingData, token),
  updateStatus: (token, id, status) => request(`/bookings/${id}/status`, "PATCH", { status }, token),
  sendReminder: (token, reminderData) => request("/bookings/remind", "POST", reminderData, token),
};

// ======================================================
// ADMIN
// ======================================================
export const admin = {
  getStats: (token) => request("/admin/stats", "GET", null, token),
  getUsers: (token) => request("/admin/users", "GET", null, token),
  getProviders: (token) => request("/admin/providers", "GET", null, token),
  getBookings: (token) => request("/admin/bookings", "GET", null, token),
  updateBookingStatus: (token, id, status) => request(`/admin/booking/${id}/status`, "PATCH", { status }, token),
};

// ======================================================
// NOTIFICATIONS
// ======================================================
export const notifications = {
  getAll: (token) => request("/notifications", "GET", null, token),
  markRead: (token, id) => request(`/notifications/${id}/read`, "PATCH", null, token),
  clearAll: (token) => request("/notifications/clear", "DELETE", null, token),
};

// ======================================================
// EXPORT DEFAULT OBJECT
// ======================================================
export const api = {
  auth,
  providers,
  bookings,
  admin,
  notifications,
};
