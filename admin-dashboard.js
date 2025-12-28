// ======================================================================
// admin-dashboard.js
// Admin Panel Controller
// Loads Stats, Users, Bookings
// ======================================================================

// ================================
// Check Admin Authentication
// ================================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || !user || user.role !== "admin") {
    alert("Unauthorized: Admins only");
    window.location.href = "../login.html";
}

// API base URL
const API = "http://localhost:5000/api";

// ================================
// DOM Elements
// ================================
const statsUsers = document.getElementById("stats-users");
const statsProviders = document.getElementById("stats-providers");
const statsBookings = document.getElementById("stats-bookings");

const tableUsers = document.getElementById("table-users");
const tableBookings = document.getElementById("table-bookings");

// ================================
// Fetch Admin Stats
// ================================
async function loadAdminStats() {
    try {
        const res = await fetch(`${API}/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (!data.success) throw new Error("Failed to load stats");

        statsUsers.textContent = data.users;
        statsProviders.textContent = data.providers;
        statsBookings.textContent = data.bookings;

    } catch (err) {
        console.error(err);
        alert("Failed to load dashboard stats.");
    }
}

// ================================
// Load All Users
// ================================
async function loadUsers() {
    try {
        const res = await fetch(`${API}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (!data.success) throw new Error("Failed to load users");

        tableUsers.innerHTML = "";

        data.users.forEach(u => {
            tableUsers.innerHTML += `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error(err);
    }
}

// ================================
// Load All Bookings
// ================================
async function loadBookings() {
    try {
        const res = await fetch(`${API}/admin/bookings`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (!data.success) throw new Error("Failed to load bookings");

        tableBookings.innerHTML = "";

        data.bookings.forEach(b => {
            tableBookings.innerHTML += `
                <tr>
                    <td>${b.id}</td>
                    <td>${b.customerName}</td>
                    <td>${b.providerName}</td>
                    <td>${b.service}</td>
                    <td>${b.when}</td>
                    <td>${b.status}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error(err);
    }
}

// ================================
// Logout
// ================================
document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../login.html";
});

// ================================
// Init Dashboard
// ================================
loadAdminStats();
loadUsers();
loadBookings();
