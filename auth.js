// ======================================================================
// HomePro Connect — MERGED APP + AUTH (with Supabase)
// Features: Providers, Signup/Login, JWT, Google Calendar, Booking CRUD
// ======================================================================

// DOM Shortcut
const $ = id => document.getElementById;

// ========================
// DOM ELEMENTS
// ========================
const providersGrid = $('providersGrid');
const searchInput = $('searchInput');
const categorySelect = $('categorySelect');
const priceSelect = $('priceSelect');
const upcomingBookings = $('upcoming');

// Booking Modal
const bookModal = $('bookModal');
const bookingProviderName = $('bookingProviderName');
const bookingProviderId = $('bookingProviderId');
const bookDate = $('bookDate');
const bookNotes = $('bookNotes');
const cancelBooking = $('cancelBooking');
const submitBooking = $('submitBooking');

// Provider Signup Modal
const signupName = $('signupName');
const signupCategory = $('signupCategory');
const signupPrice = $('signupPrice');
const signupRating = $('signupRating');
const signupDescription = $('signupDescription');
const closeSignup = $('closeSignup');
const submitSignup = $('submitSignup');

// Login/Signup Modal
const loginModal = $('loginModal');
const signupModal = $('signupModal');
const openLoginBtn = $('openLoginModal');
const openSignupBtn = $('openSignupModal');
const closeLoginBtn = $('closeLoginModal');
const closeSignupBtn = $('closeSignupModal');
const switchToSignupLink = $('switchToSignup');
const switchToLoginLink = $('switchToLogin');
const loginForm = $('loginForm');
const signupForm = $('signupForm');
const loginMessage = $('loginMessage');
const signupMessage = $('signupMessage');
const userDisplayName = $('userName');

// Booking Filters + Search
const filterStatus = $('filterStatus');
const filterDate = $('filterDate');
const sortBookings = $('sortBookings');
const bookingSearch = $('bookingSearch');

// ========================
// STATE VARIABLES
// ========================
let providers = [];
let selectedProvider = null;
let bookingIdToEdit = null;
let allBookings = [];

// ========================
// ESCAPE HTML → prevent XSS
// ========================
function escapeHtml(text) {
  return text
    ?.replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]))
    || '';
}

// ========================
// AUTH HANDLING
// ========================
function handleAuthResponse(data) {
  localStorage.setItem('token', data.token || '');
  localStorage.setItem('user', JSON.stringify(data.user));
  if(data.googleTokens) localStorage.setItem('googleTokens', JSON.stringify(data.googleTokens));
  if(userDisplayName) userDisplayName.textContent = data.user.name;

  loginModal.style.display = 'none';
  signupModal.style.display = 'none';
  loginForm?.reset();
  signupForm?.reset();

  loadBookings(); // reload bookings after login
}

// ======= LOGIN FUNCTION =======
async function loginUser(email, password) {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(res.ok) handleAuthResponse(data);
    else loginMessage.textContent = data.error || "Login failed";
  } catch(err) {
    loginMessage.textContent = 'Network error';
    console.error(err);
  }
}

// ========================
// SUPABASE SIGNUP FUNCTION
// ========================
import { supabase } from './supabaseClient'

async function signUpUser(email, password, fullName, role='customer', phone='') {
  // 1️⃣ Sign up user
  const { data: userData, error: signUpError } = await supabase.auth.signUp({ email, password })

  if (signUpError) {
    console.error('Sign up error:', signUpError.message)
    signupMessage.textContent = signUpError.message
    return null
  }

  const user = userData.user

  // 2️⃣ Create profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      full_name: fullName,
      role: role, // 'customer' or 'provider'
      phone: phone,
    })

  if (profileError) {
    console.error('Profile creation error:', profileError.message)
  }

  handleAuthResponse({ token: userData.session?.access_token || '', user: { name: fullName, email }})
  return { user, profileData }
}

// ======= LOGIN/SIGNUP FORM SUBMISSIONS =======
loginForm?.addEventListener('submit', e => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;
  loginUser(email, password);
});

signupForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = signupForm.name.value || signupForm.signupName?.value;
  const email = signupForm.email.value || signupForm.signupEmail?.value;
  const password = signupForm.password.value || signupForm.signupPassword?.value;

  await signUpUser(email, password, name, 'customer', '');
});

// Auto-load user info
window.addEventListener('DOMContentLoaded', () => {
  const storedUser = localStorage.getItem('user');
  if(storedUser && userDisplayName) userDisplayName.textContent = JSON.parse(storedUser).name;
});

// ========================
// MODAL TOGGLE LOGIC
// ========================
openLoginBtn?.addEventListener('click', () => loginModal.style.display = 'block');
openSignupBtn?.addEventListener('click', () => signupModal.style.display = 'block');
closeLoginBtn?.addEventListener('click', () => loginModal.style.display = 'none');
closeSignupBtn?.addEventListener('click', () => signupModal.style.display = 'none');
switchToSignupLink?.addEventListener('click', e => { e.preventDefault(); loginModal.style.display='none'; signupModal.style.display='block'; });
switchToLoginLink?.addEventListener('click', e => { e.preventDefault(); signupModal.style.display='none'; loginModal.style.display='block'; });
loginModal?.addEventListener('click', e => { if(e.target===loginModal) loginModal.style.display='none'; });
signupModal?.addEventListener('click', e => { if(e.target===signupModal) signupModal.style.display='none'; });

// ========================
// LOAD PROVIDERS
// ========================
async function loadProviders() {
  try {
    const res = await fetch("http://localhost:5000/api/providers");
    if(!res.ok) throw new Error("Backend unavailable");
    providers = await res.json();
  } catch(err) {
    console.warn("Provider backend unavailable → fallback:", err);
    providers = [
      { id: 101, name: "John Doe", category: "Electrician", service: "Home Electrical Repair", rating: 4.9, email:"john.electrician@example.com", phone:"+1 555-1122", image:"/img/providers/electrician1.jpg", description:"Certified electrician with 10+ years experience.", price:"50/hour", calendarSync:true, serviceDuration:60 },
      { id: 102, name: "Maria Santos", category: "Plumber", service: "Pipe & Leak Fixing", rating: 4.7, email:"maria.plumbing@example.com", phone:"+1 555-2233", image:"/img/providers/plumber1.jpg", description:"Professional plumber specializing in leak repairs.", price:"45/hour", calendarSync:false, serviceDuration:60 },
      { id: 103, name: "Alex Tan", category: "Carpenter", service: "Furniture & Wood Repair", rating: 4.8, email:"alex.carpentry@example.com", phone:"+1 555-3344", image:"/img/providers/carpenter1.jpg", description:"Skilled carpenter offering furniture repair.", price:"60/hour", calendarSync:false, serviceDuration:90 },
      { id: 104, name: "Sarah Miller", category: "Cleaning", service: "Home Deep Cleaning", rating: 4.6, email:"sarah.cleaning@example.com", phone:"+1 555-4455", image:"/img/providers/cleaner1.jpg", description:"Expert in deep cleaning with eco-friendly materials.", price:"30/hour", calendarSync:false, serviceDuration:120 },
      { id: 105, name: "Michael Roberts", category: "HVAC", service: "Aircon Maintenance & Repair", rating: 4.9, email:"mike.hvac@example.com", phone:"+1 555-5566", image:"/img/providers/hvac1.jpg", description:"Licensed HVAC specialist offering AC repair.", price:"70/hour", calendarSync:true, serviceDuration:90 },
      { id: 106, name: "Grace Lee", category: "Painter", service: "Interior & Exterior Painting", rating: 4.5, email:"grace.painting@example.com", phone:"+1 555-6677", image:"/img/providers/painter1.jpg", description:"Professional painter with expertise in wall restoration.", price:"40/hour", calendarSync:false, serviceDuration:60 }
    ];
  }
  populateCategoryDropdown();
  renderProviders();
}

// ========================
// POPULATE CATEGORY DROPDOWN
// ========================
function populateCategoryDropdown() {
  if(!categorySelect) return;
  categorySelect.innerHTML = '<option value="all">All Categories</option>';
  const categories = [...new Set(providers.map(p => p.category))];
  categories.forEach(cat=>{
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    categorySelect.appendChild(opt);
  });
}

// ========================
// RENDER PROVIDERS
// ========================
function renderProviders() {
  const query = (searchInput?.value||'').toLowerCase();
  const selectedCategory = categorySelect?.value || 'all';
  const selectedPrice = priceSelect?.value || 'all';

  providersGrid.innerHTML = '';
  const filtered = providers.filter(p=>{
    const matchesQuery = p.name.toLowerCase().includes(query) || (p.description||'').toLowerCase().includes(query);
    const matchesCategory = selectedCategory==='all' || p.category===selectedCategory;
    const matchesPrice = selectedPrice==='all' || p.price===selectedPrice;
    return matchesQuery && matchesCategory && matchesPrice;
  });

  if(filtered.length===0){ providersGrid.innerHTML="<p>No providers found.</p>"; return; }

  filtered.forEach(p=>{
    const card = document.createElement('div');
    card.className='card provider-card';
    card.innerHTML=`
      <h3>${escapeHtml(p.name)}</h3>
      <div class="meta">${escapeHtml(p.category)} • ${escapeHtml(p.price||'')}</div>
      <div class="rating">⭐ ${escapeHtml(String(p.rating??'N/A'))}</div>
      <p>${escapeHtml(p.description||'')}</p>
      <button class="btn bookBtn">Book Now</button>
    `;
    card.querySelector(".bookBtn").addEventListener('click',()=>openBookingModal(p));
    providersGrid.appendChild(card);
  });
}

// ========================
// BOOKING MODAL + SUBMIT
// ========================
function openBookingModal(provider){
  selectedProvider = provider;
  bookingProviderName.textContent = provider.name;
  bookingProviderId.value = provider.id;
  bookModal.style.display='flex';
}

cancelBooking?.addEventListener('click',()=>bookModal.style.display='none');

submitBooking?.addEventListener('click', async ()=>{
  if(!selectedProvider) return alert("No provider selected");
  if(!bookDate.value) return alert("Please choose date/time");
  const token = localStorage.getItem('token');
  if(!token) return alert("Please login first");

  const payload = {
    providerId: selectedProvider.id,
    service: selectedProvider.service||selectedProvider.name,
    when: bookDate.value,
    notes: bookNotes.value.trim(),
    calendarSync: selectedProvider.calendarSync||false,
    duration: selectedProvider.serviceDuration||60
  };

  try{
    const res = await fetch("/api/bookings/google",{
      method:'POST',
      headers:{ "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.success){
      alert("✅ Booking confirmed! Check your email & Google Calendar.");
      bookModal.style.display='none';
      bookDate.value='';
      bookNotes.value='';
      selectedProvider=null;
      await loadBookings();
    } else alert("❌ Failed to book: "+(data.error||"Unknown error"));
  } catch(err){ console.error(err); alert("Network error"); }
});

// ========================
// LOAD BOOKINGS
// ========================
async function loadBookings(){
  const token = localStorage.getItem('token');
  if(!token){ upcomingBookings.innerHTML="<p>Please login to see bookings.</p>"; return; }
  try{
    const res = await fetch("/api/bookings", { headers:{ Authorization:`Bearer ${token}` }});
    const data = await res.json();
    allBookings = data.bookings || [];

    allBookings.forEach(b=>{
      const diffHours = (new Date(b.when)-new Date())/(1000*60*60);
      if(diffHours>0 && diffHours<=24) sendReminderEmail(b);
    });
  } catch(err){ upcomingBookings.innerHTML="<p>Failed to load bookings.</p>"; }
}

// ========================
// EMAIL REMINDERS
// ========================
function sendReminderEmail(booking){
  fetch('/api/bookings/remind',{
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      email: JSON.parse(localStorage.getItem('user')||'{}').email,
      service: booking.service,
      provider: booking.provider,
      when: booking.when
    })
  }).catch(err=>console.error("Failed to send reminder",err));
}

// ========================
// LIVE FILTERS
// ========================
searchInput?.addEventListener('input', renderProviders);
categorySelect?.addEventListener('change', renderProviders);
priceSelect?.addEventListener('change', renderProviders);

// ========================
// INITIAL LOAD
// ========================
window.addEventListener('DOMContentLoaded', ()=>{
  loadProviders();
  loadBookings();
});



