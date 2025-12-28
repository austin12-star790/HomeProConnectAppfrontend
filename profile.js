// profile.js — HomePro Connect Profile + Avatar + Password + Google Sync + 2FA
import { apiFetch, storage, jwt } from './utils.js';

// =======================
// DOM ELEMENTS
// =======================
const profName = document.getElementById("profileName");
const profEmail = document.getElementById("profileEmail");
const profPhone = document.getElementById("profilePhone");
const profSaveBtn = document.getElementById("saveProfile");

const oldPassword = document.getElementById("oldPassword");
const newPassword = document.getElementById("newPassword");
const profPassBtn = document.getElementById("savePassword");

const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");

const logoutBtn = document.getElementById("logoutBtn");

const googleStatus = document.getElementById("googleStatus");
const googleConnectBtn = document.getElementById("googleSyncBtn");

// 2FA elements
const twoFAStatus = document.getElementById("twoFAStatus");
const send2FACodeBtn = document.getElementById("send2FACode");
const verify2FABtn = document.getElementById("verify2FA");
const twoFACodeInput = document.getElementById("twoFACode");

// =======================
// REDIRECT IF NOT LOGGED IN
// =======================
if (!jwt.isLoggedIn()) {
    window.location.href = "/login.html";
}

// =======================
// LOAD PROFILE
// =======================
async function loadProfile() {
    try {
        const res = await apiFetch("/api/auth/me");
        const user = res.user;

        profName.value = user.name;
        profEmail.value = user.email;
        profPhone.value = user.phone || "";

        // Avatar
        if (avatarPreview && user.avatarUrl) {
            avatarPreview.src = user.avatarUrl;
        }

        // Google Calendar status
        if (user.googleTokens || storage.get("googleTokens")) {
            googleStatus.textContent = "Connected to Google Calendar ✓";
            googleStatus.classList.add("connected");
        } else {
            googleStatus.textContent = "Not Connected";
        }

        // 2FA status
        if (user.twoFAEnabled) {
            twoFAStatus.textContent = "2FA is Enabled 🔒";
            twoFAStatus.classList.add("connected");
        } else {
            twoFAStatus.textContent = "2FA is Disabled";
        }

    } catch (err) {
        console.error(err);
        alert("Failed to load profile data.");
    }
}

// =======================
// SAVE PROFILE INFO
// =======================
profSaveBtn?.addEventListener("click", async () => {
    const body = {
        name: profName.value.trim(),
        email: profEmail.value.trim(),
        phone: profPhone.value.trim()
    };

    const res = await apiFetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(body)
    });

    if (res.error) return alert(res.error);

    storage.set("user", res.user);
    alert("✅ Profile updated successfully!");
    loadProfile();
});

// =======================
// CHANGE PASSWORD
// =======================
profPassBtn?.addEventListener("click", async () => {
    if (!oldPassword.value || !newPassword.value) return alert("Please fill in both password fields.");

    const body = {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value
    };

    const res = await apiFetch("/api/users/me/password", {
        method: "PUT",
        body: JSON.stringify(body)
    });

    if (res.error) return alert(res.error);

    alert("🔐 Password updated successfully!");
    oldPassword.value = "";
    newPassword.value = "";
});

// =======================
// UPLOAD AVATAR
// =======================
avatarInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
        const res = await fetch("/api/users/me/avatar", {
            method: "POST",
            headers: { "Authorization": "Bearer " + jwt.get() },
            body: formData
        });

        const data = await res.json();
        if (data.error) return alert(data.error);

        alert("🖼️ Profile picture updated!");
        if (avatarPreview) avatarPreview.src = data.avatarUrl;

    } catch (err) {
        alert("❌ Failed to upload avatar");
    }
});

// =======================
// LOGOUT
// =======================
logoutBtn?.addEventListener("click", () => {
    storage.clear();
    window.location.href = "/login.html";
});

// =======================
// GOOGLE CALENDAR CONNECT
// =======================
googleConnectBtn?.addEventListener("click", () => {
    window.location.href = "/api/google/auth";
});

// =======================
// TWO-FACTOR AUTHENTICATION (2FA)
// =======================
send2FACodeBtn?.addEventListener("click", async () => {
    const res = await apiFetch("/api/auth/2fa/send-code", { method: "POST" });
    if (res.error) return alert("Failed to send 2FA code: " + res.error);

    alert("OTP sent to your email. Please check your inbox.");
});

verify2FABtn?.addEventListener("click", async () => {
    const code = twoFACodeInput.value.trim();
    if (!code) return alert("Enter the OTP code.");

    const res = await apiFetch("/api/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code })
    });

    if (res.error) return alert("Verification failed: " + res.error);

    twoFAStatus.textContent = "2FA is Enabled 🔒";
    twoFAStatus.classList.add("connected");
    twoFACodeInput.value = "";
    alert("Two-Factor Authentication activated successfully!");
});

// =======================
// INITIALIZE
// =======================
window.addEventListener("DOMContentLoaded", loadProfile);

