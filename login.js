import { api } from './api.js'; // adjust file path if needed

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    // Call backend using your API connector
    const res = await api.auth.login(email, password);

    // Save auth data
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));

    alert('Login successful!');
    window.location.href = 'dashboard.html';  // redirect user
  } catch (err) {
    errorMsg.textContent = err.message || 'Login failed';
  }
});

