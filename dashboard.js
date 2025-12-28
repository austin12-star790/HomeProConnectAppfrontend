// ======================================================================
// IMPORT API CONNECTOR
// ======================================================================
import { api } from "./api.js"; // adjust path if needed

// ======================================================================
// DOM ELEMENTS
// ======================================================================
const providerList = document.getElementById("providerList");
const upcomingBookings = document.getElementById("upcomingBookings");
const searchInput = document.getElementById("providerSearch");

const bookModal = document.getElementById("bookModal");
const bookDate = document.getElementById("bookDate");
const bookNotes = document.getElementById("bookNotes");
const bookingProviderName = document.getElementById("bookingProviderName");
const confirmBookingBtn = document.getElementById("confirmBookingBtn");

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileRole = document.getElementById("profile-role");

const notificationsContainer = document.getElementById("notifications-list");
const themeToggleBtn = document.getElementById("themeToggle");
const themeStylesheet = document.getElementById("themeStylesheet");

// ======================================================================
// USER DATA
// ======================================================================
const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!token) {
    alert("You are not logged in.");
    window.location.href = "login.html";
}

let selectedProvider = null;
let bookingIdToEdit = null;

// ======================================================================
// LOAD PROFILE
// ======================================================================
async function loadProfile() {
    try {
        const profile = await api.user.getProfile();
        profileName.textContent = profile.name;
        profileEmail.textContent = profile.email;
        profileRole.textContent = profile.role;
    } catch (err) {
        console.error("PROFILE ERROR:", err);
        alert("Failed to load profile.");
    }
}

// ======================================================================
// LOAD PROVIDERS
// ======================================================================
async function loadProviders() {
    try {
        const res = await fetch("http://localhost:5000/api/providers");
        const providers = await res.json();

        renderProviders(providers);

        searchInput.addEventListener("input", () => {
            const filtered = providers.filter(p =>
                p.name.toLowerCase().includes(searchInput.value.toLowerCase())
            );
            renderProviders(filtered);
        });
    } catch (err) {
        console.error(err);
        providerList.innerHTML = "<p>Error loading providers...</p>";
    }
}

// ======================================================================
// RENDER PROVIDERS
// ======================================================================
function renderProviders(providers) {
    providerList.innerHTML = "";

    providers.forEach((p) => {
        const card = document.createElement("div");
        card.className = "provider-card";

        card.innerHTML = `
            <h3>${p.name}</h3>
            <p>${p.service}</p>
            <p class="small gray">${p.description || ""}</p>
            <button class="btn">Book</button>
        `;

        card.querySelector("button").addEventListener("click", () => {
            selectedProvider = p;
            bookingProviderName.textContent = `${p.name} — ${p.service}`;
            bookDate.value = "";
            bookNotes.value = "";
            bookingIdToEdit = null;
            bookModal.style.display = "flex";
        });

        providerList.appendChild(card);
    });
}

// ======================================================================
// CREATE/EDIT BOOKING
// ======================================================================
confirmBookingBtn.addEventListener("click", async () => {
    if (!bookDate.value) return alert("Please choose a booking date!");

    const body = {
        providerId: selectedProvider.id,
        provider: selectedProvider.name,
        service: selectedProvider.service,
        when: bookDate.value,
        notes: bookNotes.value
    };

    try {
        let res;

        if (bookingIdToEdit) {
            res = await fetch(`http://localhost:5000/api/bookings/${bookingIdToEdit}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
        } else {
            res = await fetch("http://localhost:5000/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
        }

        const data = await res.json();
        if (!res.ok) return alert(data.error);

        bookModal.style.display = "none";
        loadBookings();
    } catch (err) {
        console.error(err);
        alert("Network error");
    }
});

// ======================================================================
// LOAD BOOKINGS
// ======================================================================
async function loadBookings() {
    upcomingBookings.innerHTML = "<p>Loading bookings...</p>";

    try {
        const bookings = await api.bookings.getUserBookings();
        renderBookings(bookings);
    } catch (err) {
        console.error(err);
        upcomingBookings.innerHTML = "<p>Error loading bookings...</p>";
    }
}

// ======================================================================
// RENDER BOOKINGS
// ======================================================================
function renderBookings(bookings) {
    upcomingBookings.innerHTML = "";

    if (!bookings.length) {
        upcomingBookings.innerHTML = "<p>No bookings yet.</p>";
        return;
    }

    bookings.forEach((b) => {
        const div = document.createElement("div");
        div.className = "book-card";

        const dateStr = new Date(b.when || b.date).toLocaleString();
        const status = b.status || "scheduled";

        div.innerHTML = `
            <strong>${b.service}</strong>
            <span class="statusBadge ${status}">${status}</span>
            <div class="small">${dateStr}</div>
            <div class="small gray">${b.notes || ""}</div>

            <div class="booking-actions">
                <button class="btn small editBookingBtn">Edit</button>
                <button class="btn small deleteBookingBtn">Delete</button>
                <button class="btn small statusBookingBtn">${
                    status === "completed" ? "Undo" : "Mark Completed"
                }</button>
                <button class="btn small remindBookingBtn">Email Reminder</button>
            </div>
        `;

        upcomingBookings.appendChild(div);

        // EDIT
        div.querySelector(".editBookingBtn").addEventListener("click", () => {
            bookingIdToEdit = b._id;
            selectedProvider = {
                id: b.providerId,
                name: b.provider,
                service: b.service
            };
            bookingProviderName.textContent = `${b.provider} — ${b.service}`;
            bookDate.value = b.when.slice(0, 16);
            bookNotes.value = b.notes || "";
            bookModal.style.display = "flex";
        });

        // DELETE
        div.querySelector(".deleteBookingBtn").addEventListener("click", () => {
            deleteBooking(b._id);
        });

        // STATUS
        div.querySelector(".statusBookingBtn").addEventListener("click", () => {
            updateStatus(b._id, status === "completed" ? "scheduled" : "completed");
        });

        // EMAIL REMINDER
        div.querySelector(".remindBookingBtn").addEventListener("click", () => {
            sendReminder(b);
        });
    });
}

// ======================================================================
// DELETE BOOKING
// ======================================================================
async function deleteBooking(id) {
    if (!confirm("Delete this booking?")) return;

    try {
        await fetch(`http://localhost:5000/api/bookings/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        loadBookings();
    } catch (err) {
        console.error(err);
        alert("Delete failed");
    }
}

// ======================================================================
// UPDATE BOOKING STATUS
// ======================================================================
async function updateStatus(id, status) {
    try {
        await fetch(`http://localhost:5000/api/bookings/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        loadBookings();
    } catch (err) {
        console.error(err);
    }
}

// ======================================================================
// SEND EMAIL REMINDER
// ======================================================================
async function sendReminder(b) {
    try {
        const res = await fetch("http://localhost:5000/api/bookings/remind", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: user.email,
                provider: b.provider,
                service: b.service,
                when: b.when
            })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error);

        alert("Reminder email sent!");
    } catch (err) {
        console.error(err);
    }
}

// ======================================================================
// LOAD NOTIFICATIONS
// ======================================================================
async function loadNotifications() {
    notificationsContainer.innerHTML = "<p>Loading notifications...</p>";

    try {
        const notes = await api.notifications.getAll();

        if (!notes.length) {
            notificationsContainer.innerHTML = "<p>No notifications.</p>";
            return;
        }

        notificationsContainer.innerHTML = "";

        notes.forEach((n) => {
            const div = document.createElement("div");
            div.className = "notification-item";

            div.innerHTML = `
                <strong>${n.title}</strong>
                <p class="small gray">${n.message}</p>
                <p class="small">${new Date(n.createdAt).toLocaleString()}</p>
                <hr>
            `;

            notificationsContainer.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        notificationsContainer.innerHTML = "<p>Error loading notifications.</p>";
    }
}

// ======================================================================
// THEME TOGGLE
// ======================================================================
const lightModeCSS = "assets/css/dashboard.css";
const darkModeCSS  = "assets/css/dashboard-dark.css";

// Load saved theme
window.addEventListener("load", () => {
    const savedTheme = localStorage.getItem("theme") || "light";

    if (savedTheme === "dark") {
        themeStylesheet.href = darkModeCSS;
        themeToggleBtn.textContent = "☀️ Light Mode";
    } else {
        themeStylesheet.href = lightModeCSS;
        themeToggleBtn.textContent = "🌙 Dark Mode";
    }
});

// Toggle theme
themeToggleBtn.addEventListener("click", () => {
    const isDark = themeStylesheet.href.includes("dashboard-dark.css");

    if (isDark) {
        themeStylesheet.href = lightModeCSS;
        localStorage.setItem("theme", "light");
        themeToggleBtn.textContent = "🌙 Dark Mode";
    } else {
        themeStylesheet.href = darkModeCSS;
        localStorage.setItem("theme", "dark");
        themeToggleBtn.textContent = "☀️ Light Mode";
    }
});

// ======================================================================
// INITIAL PAGE LOAD
// ======================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadProviders();
    loadBookings();
    loadNotifications();
});




