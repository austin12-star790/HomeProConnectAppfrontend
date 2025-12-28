// ======================================================================
// IMPORT API CONNECTOR
// ======================================================================
import { api } from "./api.js"; // adjust path if needed

// ======================================================================
// DOM ELEMENTS
// ======================================================================
const profileNameDisplay = document.getElementById("profile-name");
const profileRoleDisplay = document.getElementById("profile-role");

const profileForm = document.getElementById("profileForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");

const passwordForm = document.getElementById("passwordForm");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeStylesheet = document.getElementById("themeStylesheet");

const logoutBtn = document.getElementById("logoutBtn");

// ======================================================================
// USER DATA
// ======================================================================
const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!token) {
    alert("You are not logged in.");
    window.location.href = "login.html";
}

// ======================================================================
// LOAD PROFILE DATA
// ======================================================================
async function loadProfile() {
    try {
        const profile = await api.user.getProfile();
        profileNameDisplay.textContent = profile.name;
        profileRoleDisplay.textContent = profile.role;

        // Prefill form
        nameInput.value = profile.name;
        emailInput.value = profile.email;
    } catch (err) {
        console.error("PROFILE ERROR:", err);
        alert("Failed to load profile.");
    }
}

// ======================================================================
// UPDATE PROFILE
// ======================================================================
profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !email) {
        return alert("Please fill in all fields.");
    }

    try {
        const res = await api.user.updateProfile({ name, email });
        if (res.success) {
            alert("Profile updated successfully!");
            loadProfile();
        } else {
            alert(res.error || "Failed to update profile.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error while updating profile.");
    }
});

// ======================================================================
// CHANGE PASSWORD
// ======================================================================
passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return alert("Please fill in all fields.");
    }

    if (newPassword !== confirmPassword) {
        return alert("New passwords do not match.");
    }

    try {
        const res = await api.user.changePassword({
            currentPassword,
            newPassword
        });

        if (res.success) {
            alert("Password changed successfully!");
            passwordForm.reset();
        } else {
            alert(res.error || "Failed to change password.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error while changing password.");
    }
});

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

// Toggle theme on button click
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
// LOGOUT FUNCTIONALITY
// ======================================================================
logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }
});

// ======================================================================
// INITIAL LOAD
// ======================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
});
