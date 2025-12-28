/* chat.js — frontend logic for HomePro Chat
   - expects /socket.io/socket.io.js to be available
   - expects REST endpoints described in the HTML comment
*/

(() => {
  // DOM elements
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const contactsList = document.getElementById('contactsList');
  const presence = document.getElementById('presence');
  const messagesEl = document.getElementById('messages');
  const filePicker = document.getElementById('filePicker');
  const recordBtn = document.getElementById('recordBtn');
  const emojiBtn = document.getElementById('emojiBtn');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  // state
  let socket = null;
  let token = localStorage.getItem('token') || null;
  let currentUser = localStorage.getItem('user') || null;
  let mediaRecorder = null;
  let chunks = [];

  // attach handlers
  btnLogin.addEventListener('click', login);
  btnRegister.addEventListener('click', register);
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('input', () => {
    if (!socket) return;
    socket.emit('typing', { roomId: 'global', isTyping: messageInput.value.length > 0 });
  });

  // if token exists, connect automatically
  if (token && currentUser) connectSocket();

  // ----- AUTH -----
  async function login() {
    const username = loginUser.value.trim();
    const password = loginPass.value;
    if (!username || !password) { alert('Enter username and password'); return; }
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || 'Login failed');
      token = data.token;
      currentUser = username;
      localStorage.setItem('token', token);
      localStorage.setItem('user', currentUser);
      connectSocket();
    } catch (err) {
      console.error(err);
      alert('Login error');
    }
  }

  async function register() {
    const username = loginUser.value.trim();
    const password = loginPass.value;
    if (!username || !password) { alert('Enter username and password'); return; }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || 'Register failed');
      token = data.token;
      currentUser = username;
      localStorage.setItem('token', token);
      localStorage.setItem('user', currentUser);
      connectSocket();
    } catch (err) {
      console.error(err);
      alert('Register error');
    }
  }

  // ----- SOCKET.IO -----
  function connectSocket() {
    try {
      socket = io({ auth: { token } });
    } catch (e) {
      console.error('Socket.io not available', e);
      alert('Realtime unavailable');
      return;
    }

    socket.on('connect_error', (err) => {
      console.error('Socket error', err);
      alert('Realtime authentication failed');
    });

    socket.on('presence', (list) => {
      presence.innerText = `Online: ${list.length}`;
      populateContacts(list);
    });

    socket.on('message', (msg) => {
      appendMessage(msg);
      // acknowledge delivery
      socket.emit('delivered', { messageId: msg.id });
    });

    socket.on('typing', ({ username, isTyping }) => {
      presence.innerText = isTyping ? `${username} is typing...` : 'Online';
      // reset presence after a short delay if needed
      if (isTyping) setTimeout(() => { presence.innerText = 'Online'; }, 2500);
    });

    socket.on('status', ({ id, status }) => {
      // update status text in message bubble if present
      const el = document.querySelector(`[data-id="${id}"] .status`);
      if (el) el.innerText = status;
    });

    // fetch and render message history
    fetch('/api/messages')
      .then(r => r.json())
      .then(list => {
        if (!Array.isArray(list)) return;
        list.forEach(appendMessage);
      })
      .catch(err => console.error('history load error', err));
  }

  // ----- UI helpers -----
  function populateContacts(list) {
    contactsList.innerHTML = '';
    list.forEach(name => {
      const li = document.createElement('li');
      li.innerText = name;
      contactsList.appendChild(li);
    });
  }

  function appendMessage(m) {
    const div = document.createElement('div');
    div.className = 'msg ' + (m.from === currentUser ? 'me' : 'them');
    div.dataset.id = m.id || '';

    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = m.text || '';
    div.appendChild(body);

    if (m.attachments && Array.isArray(m.attachments) && m.attachments.length) {
      const atts = document.createElement('div');
      atts.className = 'attachments';
      m.attachments.forEach(a => {
        const aEl = document.createElement('a');
        aEl.href = a.url;
        aEl.target = '_blank';
        aEl.rel = 'noopener';
        aEl.innerText = a.name || 'attachment';
        atts.appendChild(aEl);
      });
      div.appendChild(atts);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const time = document.createElement('span');
    time.innerText = new Date(m.createdAt || Date.now()).toLocaleString();
    meta.appendChild(time);

    const status = document.createElement('span');
    status.className = 'status';
    status.innerText = m.status || '';
    meta.appendChild(status);

    div.appendChild(meta);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ----- send message (with optional files) -----
  async function sendMessage() {
    if (!socket) return alert('Not connected');

    const text = messageInput.value.trim();
    const files = filePicker.files;
    const attachments = [];

    // upload files first
    if (files && files.length) {
      for (let f of files) {
        try {
          const form = new FormData();
          form.append('file', f);
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          const data = await res.json();
          if (data && data.success) attachments.push({ url: data.url, name: data.originalName, mime: data.mime });
        } catch (err) {
          console.error('upload error', err);
        }
      }
      filePicker.value = ''; // reset
    }

    // build message object
    const message = {
      roomId: 'global',
      text: text || (attachments.length ? '[attachment]' : ''),
      attachments
    };

    // local optimistic UI (optional): append with temp id
    // emit to server and wait for ack
    socket.emit('sendMessage', message, (ack) => {
      // ack may contain server id — nothing required here, messages arrive back from server and will be appended
      // you could map tempId -> ack.id if you want optimistic UI
      console.log('message ack', ack);
    });

    // clear input
    messageInput.value = '';
  }

  // ----- voice recording -----
  recordBtn.addEventListener('click', async () => {
    try {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.innerText = '🎙';
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const form = new FormData();
        form.append('file', blob, `${Date.now()}.webm`);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          const data = await res.json();
          if (data && data.success) {
            socket.emit('sendMessage', {
              roomId: 'global',
              text: '[voice message]',
              attachments: [{ url: data.url, name: data.originalName, mime: data.mime }]
            });
          }
        } catch (err) {
          console.error('voice upload error', err);
        }
      };

      mediaRecorder.start();
      recordBtn.innerText = '⏹';
    } catch (err) {
      console.error('microphone error', err);
      alert('Microphone access required to record voice messages.');
    }
  });

  // ----- small emoji picker -----
  emojiBtn.addEventListener('click', () => {
    const picker = document.createElement('div');
    picker.style.position = 'fixed';
    picker.style.bottom = '80px';
    picker.style.right = '30px';
    picker.style.background = '#fff';
    picker.style.padding = '8px';
    picker.style.borderRadius = '10px';
    picker.style.boxShadow = '0 8px 24px rgba(2,6,23,0.12)';
    const emojis = ['😀','😂','😊','😍','😎','😢','👍','🙏','🎉','🔥','🤝','💬'];
    emojis.forEach(e => {
      const b = document.createElement('button');
      b.innerText = e;
      b.style.fontSize = '20px';
      b.style.margin = '6px';
      b.style.padding = '6px';
      b.style.border = 'none';
      b.style.background = 'transparent';
      b.style.cursor = 'pointer';
      b.onclick = () => { messageInput.value += e; document.body.removeChild(picker); };
      picker.appendChild(b);
    });
    document.body.appendChild(picker);

    // remove picker when clicking elsewhere
    setTimeout(() => {
      const remove = () => { if (picker.parentElement) document.body.removeChild(picker); window.removeEventListener('click', remove); };
      window.addEventListener('click', remove, { once: true });
    }, 100);
  });

})();
