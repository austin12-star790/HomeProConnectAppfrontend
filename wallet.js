// USERS AND SERVICES DATA
let currentUser = null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let services = JSON.parse(localStorage.getItem('services')) || [];
const LOW_BALANCE_THRESHOLD = 50;

// Initialize service dropdown
function populateServiceDropdown() {
  const select = document.getElementById('serviceSelect');
  select.innerHTML = '';
  services.forEach(s => {
    const option = document.createElement('option');
    option.value = s.name;
    option.innerText = `${s.name} ($${s.price})`;
    select.appendChild(option);
  });
}

// SAVE DATA
function saveData() {
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('services', JSON.stringify(services));
}

// REGISTER
function register() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if(!username||!password){ alert('Enter username & password'); return; }
  if(users.find(u=>u.username===username)){ alert('Username exists'); return; }
  users.push({username,password,balance:0,transactions:[],isAdmin:false});
  saveData();
  alert('User registered');
}

// LOGIN
function login() {
  const username=document.getElementById('username').value.trim();
  const password=document.getElementById('password').value.trim();
  const user=users.find(u=>u.username===username);
  if(!user||user.password!==password){ alert('Invalid credentials'); return; }
  currentUser=username;
  document.getElementById('loginSection').style.display='none';
  document.getElementById('userSection').style.display='block';
  document.getElementById('currentUser').innerText=currentUser;
  populateServiceDropdown();
  updateBalance();
  updateTransactionHistory();
  if(user.isAdmin) document.getElementById('adminSection').style.display='block';
  updateAdminDashboard();
}

// LOGOUT
function logout() { location.reload(); }

// BALANCE & TRANSACTIONS
function updateBalance(){
  const user=users.find(u=>u.username===currentUser);
  const balEl=document.getElementById('balance');
  balEl.innerText=user.balance.toFixed(2);
  balEl.classList.toggle('low-balance', user.balance<LOW_BALANCE_THRESHOLD);
}

function updateTransactionHistory(){
  const user=users.find(u=>u.username===currentUser);
  const filter=document.getElementById('filter').value;
  const tbody=document.getElementById('transactionTable').querySelector('tbody');
  tbody.innerHTML='';
  let filtered=user.transactions;
  if(filter!=='all') filtered=filtered.filter(t=>t.type===filter);
  if(filtered.length===0){ tbody.innerHTML='<tr><td colspan=4 style="text-align:center;">No transactions</td></tr>'; return; }
  filtered.slice().reverse().forEach(t=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${t.date}</td><td>${t.type}</td><td>${t.service||'-'}</td><td>$${t.amount}</td>`;
    tbody.appendChild(tr);
  });
}

// ADD MONEY
function addMoney(){
  const amt=parseFloat(document.getElementById('addAmount').value);
  if(isNaN(amt)||amt<=0){ showMessage('Invalid amount','red'); return; }
  const user=users.find(u=>u.username===currentUser);
  user.balance+=amt;
  user.transactions.push({type:'Added',amount:amt,date:new Date().toLocaleString()});
  saveData(); updateBalance(); updateTransactionHistory(); showMessage(`Added $${amt}`);
  document.getElementById('addAmount').value='';
}

// BOOK SERVICE
function deductMoney(){
  const amt=parseFloat(document.getElementById('deductAmount').value);
  const service=document.getElementById('serviceSelect').value;
  const user=users.find(u=>u.username===currentUser);
  if(isNaN(amt)||amt<=0){ showMessage('Invalid amount','red'); return; }
  if(amt>user.balance){ showMessage('Insufficient balance','red'); return; }
  user.balance-=amt;
  user.transactions.push({type:'Booked Service',service,amount:amt,date:new Date().toLocaleString()});
  saveData(); updateBalance(); updateTransactionHistory(); showMessage(`Booked ${service} for $${amt}`);
  document.getElementById('deductAmount').value='';
}

// SHOW MESSAGE
function showMessage(msg,color='green'){ const msgEl=document.getElementById('message'); msgEl.style.color=color; msgEl.innerText=msg; }

// EXPORT CSV
function exportCSV(){
  const user=users.find(u=>u.username===currentUser);
  if(user.transactions.length===0){ alert('No transactions'); return; }
  let csv='data:text/csv;charset=utf-8,Date,Type,Service,Amount\n';
  user.transactions.forEach(t=>{ csv+=`${t.date},${t.type},${t.service||''},${t.amount}\n`; });
  const link=document.createElement('a');
  link.setAttribute('href',encodeURI(csv));
  link.setAttribute('download',`${currentUser}_transactions.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ADMIN FUNCTIONS
function addService(){
  const name=document.getElementById('newServiceName').value.trim();
  const price=parseFloat(document.getElementById('newServicePrice').value);
  if(!name||isNaN(price)||price<=0){ alert('Invalid service'); return; }
  services.push({name,price});
  saveData(); populateServiceDropdown(); updateAdminDashboard();
  document.getElementById('newServiceName').value=''; document.getElementById('newServicePrice').value='';
}

// ADMIN DASHBOARD
function updateAdminDashboard(){
  // Users Table
  const tbody=document.getElementById('usersTable').querySelector('tbody');
  tbody.innerHTML='';
  users.forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${u.username}</td><td>$${u.balance}</td><td>${u.transactions.length}</td>`;
    tbody.appendChild(tr);
  });

  // Balance Chart
  const ctx=document.getElementById('balanceChart').getContext('2d');
  const labels=users.map(u=>u.username);
  const data=users.map(u=>u.balance);
  if(window.balanceChart) window.balanceChart.destroy();
  window.balanceChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'User Balances',data,backgroundColor:'#007bff'}]}});
  
  // Service Chart
  const ctx2=document.getElementById('serviceChart').getContext('2d');
  const serviceCounts=services.map(s=>users.reduce((acc,u)=>acc+u.transactions.filter(t=>t.service===s.name).length,0));
  if(window.serviceChart) window.serviceChart.destroy();
  window.serviceChart=new Chart(ctx2,{type:'pie',data:{labels:services.map(s=>s.name),datasets:[{label:'Service Bookings',data:serviceCounts,backgroundColor:['#007bff','#28a745','#ffc107','#dc3545']}]}})
}

// INITIALIZATION
populateServiceDropdown();

