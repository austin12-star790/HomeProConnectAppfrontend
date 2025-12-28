// HomePro Connect — app.js

// Elements
const providersGrid = document.getElementById("providersGrid");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const priceSelect = document.getElementById("priceSelect");
const bookModal = document.getElementById("bookModal");

const bookingProviderName = document.getElementById("bookingProviderName");
const bookingProviderId = document.getElementById("bookingProviderId");

const bookDate = document.getElementById("bookDate");
const bookNotes = document.getElementById("bookNotes");
const cancelBooking = document.getElementById("cancelBooking");
const submitBooking = document.getElementById("submitBooking");

const signupMODAL = document.getElementById("signupModal");
const signupName = document.getElementById("signupName");
const signupCategory = document.getElementById("signupCategory");
const signupPrice = document.getElementById("signupPrice");
const signupRating = document.getElementById("signupRating");
const signupDescription = document.getElementById("signupDescription");

const closeSignup = document.getElementById("closeSignup");
const submitSignup = document.getElementById("submitSignup");

//--------------------------------------------------------------------
// Load providers from JSON file
//--------------------------------------------------------------------
let providers = [];

fetch("../../src/providers.json")
  .then(res => res.json())
  .then(data => {
    providers = data;
    renderProviders();
  })
  .catch(err => console.error("Error loading providers.json", err));

//--------------------------------------------------------------------
// Render provider cards
//--------------------------------------------------------------------
function renderProviders() {
  const query = searchInput.value.toLowerCase();
  const category = categorySelect.value;
  const price = priceSelect.value;

  providersGrid.innerHTML = "";

  const filtered = providers.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query);
    const matchesCategory = category === "all" || p.category === category;
    const matchesPrice = price === "all" || p.price === price;
    return matchesQuery && matchesCategory && matchesPrice;
  });

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${p.name}</h3>
      <div class="meta">${p.category} • ${p.price}</div>
      <div class="rating">⭐ ${p.rating}</div>
      <p>${p.description}</p>
      <button class="btn" onclick="openBooking(${p.id})">Book Now</button>
    `;

    providersGrid.appendChild(card);
  });
}

//--------------------------------------------------------------------
// Booking Modal
//--------------------------------------------------------------------
function openBooking(id) {
  const provider = providers.find(p => p.id === id);
  bookingProviderName.textContent = provider.name;
  bookingProviderId.value = id;

  bookModal.style.display = "flex";
}
window.openBooking = openBooking;

cancelBooking.onclick = () => {
  bookModal.style.display = "none";
};

submitBooking.onclick = () => {
  const id = bookingProviderId.value;
  const date = bookDate.value;
  const notes = bookNotes.value;

  if (!date) {
    alert("Please choose a date.");
    return;
  }

  const booking = { id, date, notes };

  const existing = JSON.parse(localStorage.getItem("bookings") || "[]");
  existing.push(booking);

  localStorage.setItem("bookings", JSON.stringify(existing));

  alert("Booking confirmed!");
  bookModal.style.display = "none";
  bookDate.value = "";
  bookNotes.value = "";
};

//--------------------------------------------------------------------
// Provider Signup Modal
//--------------------------------------------------------------------
document.getElementById("openSignupBtn").onclick = () => {
  signupMODAL.style.display = "flex";
};

closeSignup.onclick = () => {
  signupMODAL.style.display = "none";
};

submitSignup.onclick = () => {
  const newProvider = {
    id: Date.now(),
    name: signupName.value,
    category: signupCategory.value,
    price: signupPrice.value,
    rating: signupRating.value || 4.9,
    description: signupDescription.value
  };

  providers.push(newProvider);
  renderProviders();

  signupMODAL.style.display = "none";

  signupName.value = "";
  signupCategory.value = "";
  signupPrice.value = "";
  signupRating.value = "";
  signupDescription.value = "";

  alert("Provider added successfully!");
};

//--------------------------------------------------------------------
// Live filters
//--------------------------------------------------------------------
searchInput.addEventListener("input", renderProviders);
categorySelect.addEventListener("change", renderProviders);
priceSelect.addEventListener("change", renderProviders);
