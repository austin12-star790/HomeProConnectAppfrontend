// frontend/js/provider-dashboard.js
// Provider Dashboard: Bookings, Profile, Availability, Verification, Notifications

const API_BASE = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

// --- simple auth guard: ensure user is provider ---
if (!token || !user || user.role !== "provider") {
  alert("Unauthorized — provider login required");
  window.location.href = "/login.html";
}

// UI elements
const sidebarItems = document.querySelectorAll(".sidebar-menu li");
const pageTitle = document.getElementById("pageTitle");
const providerSub = document.getElementById("providerSub");
const providerNameEl = document.getElementById("providerName");
const providerEmailEl = document.getElementById("providerEmail");
const providerAvatar = document.getElementById("providerAvatar");

const pageOverview = document.getElementById("page-overview");
const pageBookings = document.getElementById("page-bookings");
const pageProfile = document.getElementById("page-profile");
const pageAvailability = document.getElementById("page-availability");
const pageVerification = document.getElementById("page-verification");
const pageNotifications = document.getElementById("page-notifications");

const overviewBookings = document.getElementById("overviewBookings");
const bookingsList = document.getElementById("bookingsList");
const bookingSearch = document.getElementById("bookingSearch");
const bookingFilter = document.getElementById("bookingFilter");

const statUpcoming = document.getElementById("statUpcoming");
const statCompleted = document.getElementById("statCompleted");
const statEarnings = document.getElementById("statEarnings");

// profile
const profileAvatar = document.getElementById("profileAvatar");
const profileAvatarInput = document.getElementById("profileAvatarInput");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profilePhone = document.getElementById("profilePhone");
const saveProfileBtn = document.getElementById("saveProfile");

// availability
const availabilityGrid = document.getElementById("availabilityGrid");
const saveAvailabilityBtn = document.getElementById("saveAvailability");

// verification
const verificationFiles = document.getElementById("verificationFiles");
const uploadVerificationBtn = document.getElementById("uploadVerification");
const uploadedFilesList = document.getElementById("uploadedFilesList");
const verificationStatus = document.getElementById("verificationStatus");

// notifications
const notificationsList = document.getElementById("notificationsList");

// logout
document.getElementById("provider-logout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login.html";
});

// sidebar routing
sidebarItems.forEach(item => {
  item.addEventListener("click", () => {
    sidebarItems.forEach(i=>i.classList.remove("active"));
    item.classList.add("active");
    const page = item.dataset.page;
    showPage(page);
  });
});

function showPage(page) {
  // hide all
  pageOverview.style.display = "none";
  pageBookings.style.display = "none";
  pageProfile.style.display = "none";
  pageAvailability.style.display = "none";
  pageVerification.style.display = "none";
  pageNotifications.style.display = "none";

  switch(page) {
    case "overview":
      pageTitle.textContent = "Overview";
      pageOverview.style.display = "block";
      loadOverview();
      break;
    case "bookings":
      pageTitle.textContent = "Bookings";
      pageBookings.style.display = "block";
      loadBookings();
      break;
    case "profile":
      pageTitle.textContent = "Profile";
      pageProfile.style.display = "block";
      loadProfile();
      break;
    case "availability":
      pageTitle.textContent = "Availability";
      pageAvailability.style.display = "block";
      loadAvailability();
      break;
    case "verification":
      pageTitle.textContent = "Verification";
      pageVerification.style.display = "block";
      loadVerificationStatus();
      break;
    case "notifications":
      pageTitle.textContent = "Notifications";
      pageNotifications.style.display = "block";
      loadNotifications();
      break;
    default:
      pageTitle.textContent = "Overview";
      pageOverview.style.display = "block";
      loadOverview();
  }
}

// --- small helper: api fetch with token ---
async function apiFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  opts.headers["Content-Type"] = opts.formData ? undefined : "application/json";
  opts.headers["Authorization"] = `Bearer ${token}`;
  if (opts.body && !opts.formData) opts.body = JSON.stringify(opts.body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(()=>({ error: res.statusText }));
    throw new Error(err.error || err.message || "API error");
  }
  return res.json();
}

// --- load provider summary (profile top bar) ---
async function loadProviderHeader() {
  try {
    // try provider profile endpoint
    const data = await apiFetch(`${API_BASE}/providers/me`);
    const p = data.provider || data;

    providerNameEl.textContent = p.name || user.name || "Provider";
    providerEmailEl.textContent = p.email || user.email || "";
    providerAvatar.src = p.avatarUrl || p.image || "/img/default-avatar.png";
    profileAvatar.src = p.avatarUrl || p.image || "/img/default-avatar.png";

    // sub
    providerSub.textContent = `${p.service || p.category || ""} • Rating ${p.rating || "—"}`;
  } catch (err) {
    // fallback to stored user
    providerNameEl.textContent = user.name || "Provider";
    providerEmailEl.textContent = user.email || "";
  }
}

// --- Overview ---
async function loadOverview() {
  await loadProviderHeader();
  // load next 3 bookings
  try {
    const data = await apiFetch(`${API_BASE}/providers/bookings?limit=5`);
    overviewBookings.innerHTML = "";
    const upcoming = (data.bookings || []).slice(0,5);
    statUpcoming.textContent = upcoming.length;
    statCompleted.textContent = (data.completedCount || 0);
    statEarnings.textContent = data.estimatedEarnings ? "$" + data.estimatedEarnings : "—";

    if (upcoming.length === 0) {
      overviewBookings.innerHTML = "<p class='small-muted'>No upcoming bookings</p>";
      return;
    }

    upcoming.forEach(b => {
      const div = document.createElement("div");
      div.className = "booking-card";
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>${escapeHtml(b.service)}</strong>
            <div class="small-muted">${escapeHtml(b.customerName || b.customerEmail || b.userId)}</div>
          </div>
          <div>
            <div class="small-muted">${new Date(b.when).toLocaleString()}</div>
            <div style="margin-top:6px;"><span class="status-pill status-${b.status}">${b.status}</span></div>
          </div>
        </div>
      `;
      overviewBookings.appendChild(div);
    });
  } catch (err) {
    overviewBookings.innerHTML = "<p class='small-muted'>Failed to load bookings</p>";
    console.error("Overview load:", err);
  }
}

// --- Bookings list and actions ---
let bookingsCache = [];

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

async function loadBookings() {
  try {
    const q = new URLSearchParams();
    const status = bookingFilter?.value;
    if (status && status !== "all") q.set("status", status);
    const data = await apiFetch(`${API_BASE}/providers/bookings?${q.toString()}`);
    bookingsCache = data.bookings || [];
    renderBookings(bookingsCache);
  } catch (err) {
    bookingsList.innerHTML = "<p class='small-muted'>Failed to load bookings</p>";
    console.error("loadBookings:", err);
  }
}

function renderBookings(list) {
  bookingsList.innerHTML = "";
  if (!list || list.length === 0) {
    bookingsList.innerHTML = "<p class='small-muted'>No bookings found</p>";
    return;
  }

  const searchTerm = (bookingSearch?.value || "").toLowerCase();

  list.filter(b => {
    if (!searchTerm) return true;
    const text = `${b.service} ${b.customerName || ""} ${b.customerEmail || ""}`.toLowerCase();
    return text.includes(searchTerm);
  }).forEach(b => {
    const card = document.createElement("div");
    card.className = "booking-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          <strong>${escapeHtml(b.service)}</strong>
          <div class="small-muted">${escapeHtml(b.customerName || b.customerEmail || b.userId)}</div>
          <div style="margin-top:8px;">${escapeHtml(b.notes || "")}</div>
        </div>
        <div style="width:220px;text-align:right">
          <div class="small-muted">${new Date(b.when).toLocaleString()}</div>
          <div style="margin-top:8px;">
            <span class="status-pill ${statusClass(b.status)}">${b.status}</span>
          </div>
          <div style="margin-top:10px;display:flex;gap:6px;justify-content:flex-end;">
            ${b.status === "pending" ? `<button class="btn-add btn-accept" data-id="${b.id}">Accept</button>
            <button class="btn-delete btn-decline" data-id="${b.id}">Decline</button>` :
            (b.status === "scheduled" ? `<button class="btn-edit btn-complete" data-id="${b.id}">Mark Complete</button>` : ``)}
          </div>
        </div>
      </div>
    `;
    bookingsList.appendChild(card);
  });

  // attach handlers
  document.querySelectorAll(".btn-accept").forEach(btn => {
    btn.addEventListener("click", () => handleAccept(btn.dataset.id));
  });
  document.querySelectorAll(".btn-decline").forEach(btn => {
    btn.addEventListener("click", () => handleDecline(btn.dataset.id));
  });
  document.querySelectorAll(".btn-complete").forEach(btn => {
    btn.addEventListener("click", () => handleComplete(btn.dataset.id));
  });
}

function statusClass(status) {
  if (!status) return "";
  return `status-${status}`;
}

bookingSearch?.addEventListener("input", () => renderBookings(bookingsCache));
bookingFilter?.addEventListener("change", loadBookings);

// actions
async function handleAccept(id) {
  if (!confirm("Accept this booking?")) return;
  try {
    await apiFetch(`${API_BASE}/providers/bookings/${id}/accept`, { method: "PUT" });
    alert("Booking accepted");
    loadBookings();
  } catch (err) {
    alert("Failed to accept: " + err.message);
  }
}
async function handleDecline(id) {
  if (!confirm("Decline this booking?")) return;
  try {
    await apiFetch(`${API_BASE}/providers/bookings/${id}/decline`, { method: "PUT" });
    alert("Booking declined");
    loadBookings();
  } catch (err) {
    alert("Failed to decline: " + err.message);
  }
}
async function handleComplete(id) {
  if (!confirm("Mark as completed?")) return;
  try {
    await apiFetch(`${API_BASE}/providers/bookings/${id}/complete`, { method: "PUT" });
    alert("Marked completed");
    loadBookings();
  } catch (err) {
    alert("Failed: " + err.message);
  }
}

// --- Profile load & update ---
async function loadProfile() {
  try {
    const data = await apiFetch(`${API_BASE}/providers/me`);
    const p = data.provider || data;
    profileName.value = p.name || "";
    profileEmail.value = p.email || user.email || "";
    profilePhone.value = p.phone || "";
    profileAvatar.src = p.avatarUrl || p.image || "/img/default-avatar.png";
  } catch (err) {
    console.warn("loadProfile fallback", err);
    profileName.value = user.name || "";
    profileEmail.value = user.email || "";
  }
}

profileAvatarInput?.addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const fd = new FormData();
  fd.append("avatar", f);
  try {
    const res = await fetch(`${API_BASE}/providers/me/avatar`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    profileAvatar.src = data.avatarUrl || profileAvatar.src;
    providerAvatar.src = data.avatarUrl || providerAvatar.src;
    alert("Avatar updated");
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
});

saveProfileBtn?.addEventListener("click", async () => {
  try {
    const body = { name: profileName.value.trim(), phone: profilePhone.value.trim() };
    await apiFetch(`${API_BASE}/providers/me`, { method: "PUT", body });
    alert("Profile saved");
    await loadProviderHeader();
  } catch (err) {
    alert("Save failed: " + err.message);
  }
});

// --- Availability UI ---
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

async function loadAvailability() {
  availabilityGrid.innerHTML = "";
  try {
    const data = await apiFetch(`${API_BASE}/providers/me/availability`);
    const availability = data.availability || {}; // {0:[{from:"09:00",to:"12:00"},...],...}

    DAYS.forEach((day, idx) => {
      const dayRow = document.createElement("div");
      dayRow.style.background = "#fff";
      dayRow.style.padding = "12px";
      dayRow.style.borderRadius = "8px";
      dayRow.innerHTML = `<strong>${day}</strong><div class="slots" data-day="${idx}" style="margin-top:8px"></div>
        <div style="margin-top:8px;"><button class="btn-add add-slot" data-day="${idx}">Add slot</button></div>`;
      availabilityGrid.appendChild(dayRow);

      const slotsContainer = dayRow.querySelector(".slots");
      const slots = availability[idx] || [];
      slots.forEach(slot => addAvailabilitySlot(slotsContainer, idx, slot.from, slot.to));
    });

    // attach add-slot handlers
    document.querySelectorAll(".add-slot").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const day = e.target.dataset.day;
        const slotsContainer = document.querySelector(`.slots[data-day="${day}"]`);
        addAvailabilitySlot(slotsContainer, day, "09:00", "17:00");
      });
    });

  } catch (err) {
    // create empty grid if API fails
    DAYS.forEach((day, idx) => {
      const dayRow = document.createElement("div");
      dayRow.style.background = "#fff";
      dayRow.style.padding = "12px";
      dayRow.style.borderRadius = "8px";
      dayRow.innerHTML = `<strong>${day}</strong><div class="slots" data-day="${idx}"></div><div style="margin-top:8px;"><button class="btn-add add-slot" data-day="${idx}">Add slot</button></div>`;
      availabilityGrid.appendChild(dayRow);
    });
    document.querySelectorAll(".add-slot").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const day = e.target.dataset.day;
        const slotsContainer = document.querySelector(`.slots[data-day="${day}"]`);
        addAvailabilitySlot(slotsContainer, day, "09:00", "17:00");
      });
    });
  }
}

function addAvailabilitySlot(container, day, from = "09:00", to = "17:00") {
  const slot = document.createElement("div");
  slot.style.marginBottom = "6px";
  slot.innerHTML = `
    <input type="time" class="slot-from" value="${from}" /> to
    <input type="time" class="slot-to" value="${to}" />
    <button class="btn-cancel btn-remove-slot">Remove</button>
  `;
  container.appendChild(slot);
  slot.querySelector(".btn-remove-slot").addEventListener("click", () => slot.remove());
}

saveAvailabilityBtn?.addEventListener("click", async () => {
  try {
    // gather availability
    const payload = {};
    document.querySelectorAll(".slots").forEach(scont => {
      const day = scont.dataset.day;
      const slots = [];
      scont.querySelectorAll(".slot-from").forEach((el, idx) => {
        const from = el.value;
        const to = scont.querySelectorAll(".slot-to")[idx].value;
        if (from && to) slots.push({ from, to });
      });
      payload[day] = slots;
    });

    await apiFetch(`${API_BASE}/providers/me/availability`, { method: "PUT", body: payload });
    alert("Availability saved");
  } catch (err) {
    alert("Save failed: " + err.message);
  }
});

// --- Verification upload ---
uploadVerificationBtn?.addEventListener("click", async () => {
  const files = verificationFiles.files;
  if (!files || files.length === 0) return alert("Choose files to upload");

  const fd = new FormData();
  for (let f of files) fd.append("files", f);

  try {
    const res = await fetch(`${API_BASE}/providers/me/verify`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    alert("Files uploaded for verification");
    loadVerificationStatus();
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
});

async function loadVerificationStatus() {
  try {
    const data = await apiFetch(`${API_BASE}/providers/me`);
    const status = data.provider?.verificationStatus || data.provider?.status || "not_submitted";
    verificationStatus.innerHTML = `<strong>Status:</strong> ${status}`;
    const files = data.provider?.verificationFiles || [];
    uploadedFilesList.innerHTML = files.length ? files.map(f=>`<div>${escapeHtml(f.filename)}</div>`).join("") : "<div class='small-muted'>No files uploaded</div>";
  } catch (err) {
    verificationStatus.innerHTML = `<div class="small-muted">Unable to load verification status</div>`;
  }
}

// --- Notifications (simple) ---
async function loadNotifications() {
  try {
    const data = await apiFetch(`${API_BASE}/providers/me/notifications`);
    const notes = data.notifications || [];
    notificationsList.innerHTML = notes.length ? notes.map(n=>`<div class="dashboard-card">${escapeHtml(n.text)}<div class="small-muted">${new Date(n.createdAt).toLocaleString()}</div></div>`).join("") : "<p class='small-muted'>No notifications</p>";
  } catch (err) {
    notificationsList.innerHTML = "<p class='small-muted'>Failed to load notifications</p>";
  }
}

// --- init header and default page ---
async function init() {
  await loadProviderHeader();
  showPage("overview");
}

init();
