// ========================================================================
// bookingaction.js (MERGED VERSION)
// Combines: Home Page Modal Booking + Dashboard CRUD + Google Calendar Sync
// ========================================================================

import { apiFetch, escapeHtml, storage, jwt, addMinutes, formatDateTime } from './utils.js';

// ========================================================================
// DOM SELECTORS (Optional depending on page)
// ========================================================================
const providersGrid = document.getElementById('providersGrid');
const bookModal = document.getElementById('bookModal');

const bookingProviderName = document.getElementById('bookingProviderName');
const bookingProviderId = document.getElementById('bookingProviderId');

const bookDate = document.getElementById('bookDate');
const bookNotes = document.getElementById('bookNotes');

const submitBooking = document.getElementById('submitBooking');
const cancelBookingBtn = document.getElementById('cancelBooking');

// Dashboard elements
const bookingList = document.getElementById("bookingList");
const createBookingForm = document.getElementById("createBookingForm");
const providerSelect = document.getElementById("provider");
const whenInput = document.getElementById("when");
const notesInput = document.getElementById("notes");
const enableGoogleSync = document.getElementById("calendarSyncToggle");

// Global state
let selectedProvider = null;
let allBookings = [];
const googleTokens = storage.get('googleTokens');

// ========================================================================
// PAGE TYPE DETECTION
// ========================================================================
function isHomePage() { return !!providersGrid; }
function isDashboardPage() { return !!bookingList; }

// ========================================================================
// ======================== HOME PAGE: BOOKING MODAL =======================
// ========================================================================

export function openBookingModal(provider) {
    selectedProvider = provider;
    bookingProviderName.textContent = escapeHtml(provider.name);
    bookingProviderId.value = provider.id;
    bookModal.style.display = 'flex';
}

cancelBookingBtn?.addEventListener('click', () => {
    bookModal.style.display = 'none';
    resetBookingModal();
});

function resetBookingModal() {
    bookDate.value = '';
    bookNotes.value = '';
    selectedProvider = null;
}

submitBooking?.addEventListener('click', async () => {
    if (!selectedProvider) return alert("Select a provider first.");
    if (!bookDate.value) return alert("Choose a date and time.");

    const payload = {
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        service: selectedProvider.service || selectedProvider.name,
        when: bookDate.value,
        notes: bookNotes.value.trim(),
        duration: selectedProvider.serviceDuration || 60,
        calendarSync: googleTokens ? true : false
    };

    try {
        await apiFetch('/api/bookings', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        alert("✅ Booking confirmed!");
        bookModal.style.display = 'none';
        resetBookingModal();
        await loadBookings();
    } catch (err) {
        alert("❌ Error creating booking: " + err.message);
    }
});

// Attach book buttons for provider cards
export function attachBookingButtons() {
    document.querySelectorAll('.bookBtn').forEach(btn => {
        const provider = JSON.parse(btn.dataset.provider || '{}');
        btn.addEventListener('click', () => openBookingModal(provider));
    });
}

// ========================================================================
// ============================= LOAD BOOKINGS =============================
// ========================================================================

export async function loadBookings() {
    if (!jwt.isLoggedIn()) {
        if (isHomePage()) {
            upcomingBookings.innerHTML = "<p>Please login to see bookings.</p>";
        }
        return;
    }

    try {
        const { bookings } = await apiFetch('/api/bookings');
        allBookings = bookings || [];

        if (isHomePage()) renderHomeBookings(allBookings);
        if (isDashboardPage()) renderDashboardBookings(allBookings);

    } catch (err) {
        console.error(err);
    }
}

// ========================================================================
// ====================== HOME PAGE BOOKINGS RENDER ========================
// ========================================================================

function renderHomeBookings(bookings) {
    const upcoming = document.getElementById('upcoming');
    if (!upcoming) return;

    upcoming.innerHTML = '';

    if (!bookings.length) {
        upcoming.innerHTML = "<p>No upcoming bookings.</p>";
        return;
    }

    bookings.forEach(b => {
        const div = document.createElement('div');
        div.className = 'booking-card-home';
        div.innerHTML = `
            <h4>${escapeHtml(b.service)}</h4>
            <p>Provider: ${escapeHtml(b.providerName)}</p>
            <p>Date: ${formatDateTime(b.when)}</p>
            <p>Status: ${escapeHtml(b.status)}</p>
        `;
        upcoming.appendChild(div);
    });
}

// ========================================================================
// ===================== DASHBOARD PROVIDERS LOADER =======================
// ========================================================================

async function loadProviders() {
    if (!providerSelect) return;

    const providers = await apiFetch("/api/providers");
    providerSelect.innerHTML = "";

    providers.forEach(p => {
        providerSelect.innerHTML += `
            <option value="${p.id}" 
                data-name="${p.name}" 
                data-duration="${p.serviceDuration || 60}">
                ${p.name} — ${p.category}
            </option>`;
    });
}

// ========================================================================
// ===================== DASHBOARD BOOKING RENDER =========================
// ========================================================================

function renderDashboardBookings(bookings) {
    bookingList.innerHTML = "";

    if (!bookings.length) {
        bookingList.innerHTML = "<p>No bookings found.</p>";
        return;
    }

    bookings.forEach(b => {
        bookingList.innerHTML += `
            <div class="booking-card" id="booking-${b.id}">
                <h3>${b.service}</h3>
                <p><strong>Provider:</strong> ${b.providerName}</p>
                <p><strong>Date:</strong> ${formatDateTime(b.when)}</p>
                <p><strong>Status:</strong> <span class="status ${b.status}">${b.status}</span></p>

                <div class="booking-actions">
                    <button onclick="openReschedule('${b.id}')" class="edit-btn">Edit / Reschedule</button>
                    <button onclick="cancelBooking('${b.id}')" class="cancel-btn">Cancel</button>
                    <button onclick="deleteBooking('${b.id}')" class="delete-btn">Delete</button>
                    <button onclick="markComplete('${b.id}')" class="complete-btn">Complete</button>
                </div>
            </div>
        `;
    });
}

// ========================================================================
// ===================== DASHBOARD BOOKING CRUD ===========================
// ========================================================================

window.openReschedule = function (id) {
    const newDate = prompt("Enter new date/time (YYYY-MM-DD HH:MM):");
    if (!newDate) return;

    apiFetch(`/api/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ when: newDate })
    }).then(() => loadBookings());
};

window.cancelBooking = function (id) {
    if (!confirm("Cancel this booking?")) return;

    apiFetch(`/api/bookings/${id}/cancel`, { method: 'PUT' })
        .then(() => loadBookings());
};

window.deleteBooking = function (id) {
    if (!confirm("Delete booking permanently?")) return;

    apiFetch(`/api/bookings/${id}`, { method: 'DELETE' })
        .then(() => loadBookings());
};

window.markComplete = function (id) {
    apiFetch(`/api/bookings/${id}/complete`, { method: 'PUT' })
        .then(() => loadBookings());
};

// ========================================================================
// ======================== DASHBOARD CREATE FORM =========================
// ========================================================================

createBookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
        providerId: providerSelect.value,
        providerName: providerSelect.options[providerSelect.selectedIndex].dataset.name,
        service: providerSelect.options[providerSelect.selectedIndex].dataset.name,
        when: whenInput.value,
        notes: notesInput.value,
        duration: Number(providerSelect.options[providerSelect.selectedIndex].dataset.duration),
        calendarSync: googleTokens ? true : false
    };

    await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify(body)
    });

    alert("Booking created!");
    createBookingForm.reset();
    loadBookings();
});

// ========================================================================
// ========================== INITIALIZER ================================
// ========================================================================

window.addEventListener("DOMContentLoaded", async () => {
    if (isDashboardPage()) await loadProviders();
    await loadBookings();

    if (enableGoogleSync) {
        enableGoogleSync.checked = googleTokens ? true : false;
        enableGoogleSync.disabled = !googleTokens;
    }
});

