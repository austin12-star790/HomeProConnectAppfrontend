// frontend/js/google.js
// HomePro Connect — Google OAuth & Calendar integration (Frontend)

// Open Google OAuth login
export function initGoogleLogin(buttonId = 'googleLoginBtn') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.addEventListener('click', () => {
        // Redirect to backend Google OAuth endpoint
        window.location.href = '/api/google/auth';
    });
}

// Save Google tokens returned from backend (callback)
export function handleGoogleCallback() {
    // Example: your backend redirects to /google-callback?tokens=...
    const params = new URLSearchParams(window.location.search);
    const tokenStr = params.get('tokens');
    if (!tokenStr) return;

    try {
        const googleTokens = JSON.parse(atob(tokenStr)); // decode base64 if sent like that
        localStorage.setItem('googleTokens', JSON.stringify(googleTokens));
        alert('✅ Google Calendar connected successfully!');
        // Optionally redirect to dashboard
        window.location.href = '/dashboard.html';
    } catch (err) {
        console.error('Failed to parse Google tokens', err);
        alert('❌ Failed to connect Google Calendar.');
    }
}

// Optional: Fetch upcoming events from Google Calendar
export async function fetchGoogleEvents() {
    const tokenStr = localStorage.getItem('googleTokens');
    if (!tokenStr) return [];

    try {
        const googleTokens = JSON.parse(tokenStr);

        // Use your backend proxy to get events securely
        const res = await fetch('/api/google/events', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });

        if (!res.ok) throw new Error('Failed to fetch Google events');
        const data = await res.json();
        return data.events || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

// Optional: Render Google Calendar events on dashboard
export function renderGoogleEvents(containerId = 'googleEventsContainer', events = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!events.length) {
        container.innerHTML = '<p>No upcoming Google Calendar events.</p>';
        return;
    }

    container.innerHTML = '';
    events.forEach(ev => {
        const div = document.createElement('div');
        div.className = 'google-event-card';
        div.innerHTML = `
            <strong>${ev.summary || 'No Title'}</strong>
            <br>
            ${new Date(ev.start.dateTime || ev.start.date).toLocaleString()} - ${new Date(ev.end.dateTime || ev.end.date).toLocaleString()}
            <p>${ev.description || ''}</p>
        `;
        container.appendChild(div);
    });
}
