(function() {
  'use strict';

  var API_URL = 'https://qarp-candidate-portal.onrender.com/api/chatbot';
  var BRAND = {
    navy: '#0B1120',
    navyLight: '#162032',
    teal: '#00B4D8',
    tealDark: '#0096B4',
    tealLight: '#E0F7FA',
    white: '#FFFFFF',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray700: '#334155',
    gray800: '#1E293B'
  };

  var sessionId = null;
  var isOpen = false;
  var isLoading = false;

  // ===== Styles =====
  var style = document.createElement('style');
  style.textContent = [
    "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');",

    '#qarp-chat-widget * { box-sizing:border-box; margin:0; padding:0; }',

    /* ---------- BUBBLE ---------- */
    '#qarp-chat-bubble {',
    '  position:fixed; bottom:24px; right:24px; z-index:999998;',
    '  width:62px; height:62px; border-radius:50%;',
    '  background:linear-gradient(135deg,' + BRAND.teal + ',' + BRAND.tealDark + ');',
    '  border:none; cursor:pointer; outline:none;',
    '  display:flex; align-items:center; justify-content:center;',
    '  box-shadow:0 4px 20px rgba(0,180,216,0.4),0 2px 8px rgba(0,0,0,0.12);',
    '  transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;',
    '}',
    '#qarp-chat-bubble:hover { transform:scale(1.07); box-shadow:0 6px 28px rgba(0,180,216,0.5),0 4px 12px rgba(0,0,0,0.15); }',
    '#qarp-chat-bubble:active { transform:scale(0.94); }',
    '#qarp-chat-bubble svg { width:28px; height:28px; fill:' + BRAND.white + '; }',
    '#qarp-chat-bubble.qopen .qchat-ico { display:none }',
    '#qarp-chat-bubble.qopen .qclose-ico { display:block }',
    '#qarp-chat-bubble:not(.qopen) .qchat-ico { display:block }',
    '#qarp-chat-bubble:not(.qopen) .qclose-ico { display:none }',

    /* ---------- POPUP ---------- */
    '#qarp-chat-popup {',
    '  position:fixed; bottom:96px; right:24px; z-index:999999;',
    '  width:400px; max-width:calc(100vw - 32px);',
    '  height:580px; max-height:calc(100vh - 130px);',
    '  background:' + BRAND.white + '; border-radius:20px;',
    '  box-shadow:0 16px 60px rgba(11,17,32,0.2),0 4px 20px rgba(0,0,0,0.08);',
    '  display:flex; flex-direction:column; overflow:hidden;',
    '  opacity:0; transform:translateY(16px) scale(0.96); pointer-events:none;',
    '  transition:opacity .25s ease,transform .3s cubic-bezier(.34,1.56,.64,1);',
    '}',
    '#qarp-chat-popup.qvisible { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }',

    /* ---------- HEADER ---------- */
    '.qc-header {',
    '  background:linear-gradient(135deg,' + BRAND.navy + ' 0%,' + BRAND.navyLight + ' 100%);',
    '  padding:16px 20px; display:flex; align-items:center; gap:12px; flex-shrink:0;',
    '}',
    '.qc-header-icon { width:42px; height:42px; border-radius:12px; background:' + BRAND.teal + '; display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
    '.qc-header-icon svg { width:22px; height:22px; fill:' + BRAND.white + '; }',
    '.qc-header-text h3 { color:' + BRAND.white + '; font-family:"DM Sans",sans-serif; font-size:15px; font-weight:600; line-height:1.3; }',
    '.qc-header-text p { color:' + BRAND.gray400 + '; font-family:Inter,sans-serif; font-size:12px; margin-top:2px; display:flex; align-items:center; gap:5px; }',
    '.qc-dot { width:7px; height:7px; border-radius:50%; background:#34D399; animation:qpulse 2s ease-in-out infinite; }',
    '@keyframes qpulse { 0%,100%{opacity:1} 50%{opacity:.5} }',
    '.qc-close { margin-left:auto; background:rgba(255,255,255,.1); border:none; border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .2s; }',
    '.qc-close:hover { background:rgba(255,255,255,.2); }',
    '.qc-close svg { width:16px; height:16px; fill:' + BRAND.gray400 + '; }',

    /* ---------- MESSAGES ---------- */
    '.qc-messages {',
    '  flex:1; overflow-y:auto; padding:16px 16px 8px; display:flex; flex-direction:column; gap:10px; scroll-behavior:smooth; background:' + BRAND.gray50 + ';',
    '}',
    '.qc-messages::-webkit-scrollbar { width:4px; }',
    '.qc-messages::-webkit-scrollbar-thumb { background:' + BRAND.gray300 + '; border-radius:2px; }',

    '.qc-msg { max-width:88%; padding:11px 15px; border-radius:16px; font-family:Inter,sans-serif; font-size:14px; line-height:1.55; word-wrap:break-word; animation:qfade .25s ease; }',
    '@keyframes qfade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }',
    '.qc-msg-bot { align-self:flex-start; background:' + BRAND.white + '; color:' + BRAND.gray800 + '; border:1px solid ' + BRAND.gray200 + '; border-bottom-left-radius:4px; }',
    '.qc-msg-user { align-self:flex-end; background:linear-gradient(135deg,' + BRAND.teal + ',' + BRAND.tealDark + '); color:' + BRAND.white + '; border-bottom-right-radius:4px; }',
    '.qc-msg-bot a { color:' + BRAND.teal + '; text-decoration:underline; }',
    '.qc-msg-bot strong { font-weight:600; }',

    /* ---------- WELCOME ---------- */
    '.qc-welcome { font-family:Inter,sans-serif; font-size:14px; line-height:1.55; color:' + BRAND.gray700 + '; }',
    '.qc-welcome-title { font-family:"DM Sans",sans-serif; font-weight:600; font-size:15px; color:' + BRAND.navy + '; margin-bottom:6px; }',

    /* ---------- QUICK ACTIONS ---------- */
    '.qc-actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }',
    '.qc-action {',
    '  background:' + BRAND.white + '; color:' + BRAND.tealDark + ';',
    '  border:1.5px solid ' + BRAND.teal + '; border-radius:22px;',
    '  padding:7px 14px; font-family:Inter,sans-serif; font-size:13px; font-weight:500;',
    '  cursor:pointer; transition:all .2s; outline:none; white-space:nowrap;',
    '}',
    '.qc-action:hover { background:' + BRAND.teal + '; color:' + BRAND.white + '; }',

    /* ---------- TYPING ---------- */
    '.qc-typing { align-self:flex-start; display:flex; gap:5px; padding:12px 16px; background:' + BRAND.white + '; border:1px solid ' + BRAND.gray200 + '; border-radius:16px; border-bottom-left-radius:4px; animation:qfade .2s; }',
    '.qc-typing i { width:7px; height:7px; background:' + BRAND.gray400 + '; border-radius:50%; display:block; animation:qbounce 1.4s ease-in-out infinite; }',
    '.qc-typing i:nth-child(2){animation-delay:.2s} .qc-typing i:nth-child(3){animation-delay:.4s}',
    '@keyframes qbounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }',

    /* ---------- INPUT AREA ---------- */
    '.qc-input-area {',
    '  padding:14px 16px; border-top:1px solid ' + BRAND.gray200 + '; display:flex; align-items:flex-end; gap:10px; background:' + BRAND.white + '; flex-shrink:0;',
    '}',
    '.qc-textarea {',
    '  flex:1; border:1.5px solid ' + BRAND.gray200 + '; border-radius:12px;',
    '  padding:11px 14px; font-family:Inter,sans-serif; font-size:14px; color:' + BRAND.gray800 + ';',
    '  background:' + BRAND.gray50 + '; outline:none; resize:none; min-height:44px; max-height:100px;',
    '  overflow-y:auto; transition:border-color .2s; line-height:1.45;',
    '}',
    '.qc-textarea:focus { border-color:' + BRAND.teal + '; }',
    '.qc-textarea::placeholder { color:' + BRAND.gray400 + '; }',
    '.qc-send {',
    '  width:44px; height:44px; border-radius:12px; border:none;',
    '  background:linear-gradient(135deg,' + BRAND.teal + ',' + BRAND.tealDark + ');',
    '  cursor:pointer; display:flex; align-items:center; justify-content:center;',
    '  transition:transform .15s,opacity .2s; flex-shrink:0; outline:none;',
    '}',
    '.qc-send:hover { transform:scale(1.05); }',
    '.qc-send:active { transform:scale(0.93); }',
    '.qc-send:disabled { opacity:.4; cursor:not-allowed; transform:none; }',
    '.qc-send svg { width:20px; height:20px; fill:' + BRAND.white + '; }',

    /* ---------- MOBILE ---------- */
    '@media(max-width:480px){',
    '  #qarp-chat-popup { bottom:0; right:0; left:0; top:0; width:100vw; height:100vh; max-height:100vh; max-width:100vw; border-radius:0; position:fixed; }',
    '  #qarp-chat-bubble { bottom:16px; right:16px; width:56px; height:56px; }',
    '  #qarp-chat-bubble.qopen { display:none; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ===== HTML =====
  var container = document.createElement('div');
  container.id = 'qarp-chat-widget';
  container.innerHTML = [
    '<button id="qarp-chat-bubble" aria-label="Open chat">',
    '  <svg class="qchat-ico" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>',
    '  <svg class="qclose-ico" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    '</button>',

    '<div id="qarp-chat-popup">',

    '  <div class="qc-header">',
    '    <div class="qc-header-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></div>',
    '    <div class="qc-header-text">',
    '      <h3>QARP AI Assistant</h3>',
    '      <p><span class="qc-dot"></span> Online</p>',
    '    </div>',
    '    <button class="qc-close" id="qarp-close-btn" aria-label="Close chat"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>',
    '  </div>',

    '  <div class="qc-messages" id="qarp-messages">',
    '    <div class="qc-msg qc-msg-bot">',
    '      <div class="qc-welcome">',
    '        <div class="qc-welcome-title">Welcome to The QARP Group!</div>',
    '        I\'m your AI assistant. How can I help you today?',
    '      </div>',
    '      <div class="qc-actions">',
    '        <button class="qc-action" data-msg="Tell me about your quality audit services">Audits & Compliance</button>',
    '        <button class="qc-action" data-msg="What consulting services do you offer?">Consulting</button>',
    '        <button class="qc-action" data-msg="What courses does The QARP Academy offer?">Academy & Training</button>',
    '        <button class="qc-action" data-msg="Tell me about your Enterprise AI solutions">Enterprise AI</button>',
    '        <button class="qc-action" data-msg="I\'m an auditor and want to join your network">Join as Auditor</button>',
    '        <button class="qc-action" data-msg="I\'d like to book a consultation call">Book a Call</button>',
    '      </div>',
    '    </div>',
    '  </div>',

    '  <div class="qc-input-area">',
    '    <textarea class="qc-textarea" id="qarp-input" placeholder="Ask me anything about QARP..." rows="1"></textarea>',
    '    <button class="qc-send" id="qarp-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>',
    '  </div>',

    '</div>'
  ].join('\n');
  document.body.appendChild(container);

  // ===== Refs =====
  var bubble = document.getElementById('qarp-chat-bubble');
  var popup = document.getElementById('qarp-chat-popup');
  var messagesEl = document.getElementById('qarp-messages');
  var input = document.getElementById('qarp-input');
  var sendBtn = document.getElementById('qarp-send');
  var closeBtn = document.getElementById('qarp-close-btn');

  function toggleChat() {
    isOpen = !isOpen;
    popup.classList.toggle('qvisible', isOpen);
    bubble.classList.toggle('qopen', isOpen);
    if (isOpen) input.focus();
  }

  bubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // Quick action buttons
  messagesEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.qc-action');
    if (btn) {
      var msg = btn.getAttribute('data-msg');
      if (msg) sendMessage(msg);
    }
  });

  sendBtn.addEventListener('click', function() {
    var t = input.value.trim();
    if (t && !isLoading) sendMessage(t);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var t = input.value.trim();
      if (t && !isLoading) sendMessage(t);
    }
  });

  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  // ===== Helpers =====
  function addMessage(text, isUser) {
    var div = document.createElement('div');
    div.className = 'qc-msg ' + (isUser ? 'qc-msg-user' : 'qc-msg-bot');
    div.innerHTML = isUser ? esc(text) : fmt(text);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var d = document.createElement('div');
    d.className = 'qc-typing'; d.id = 'qarp-typing';
    d.innerHTML = '<i></i><i></i><i></i>';
    messagesEl.appendChild(d);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() { var e = document.getElementById('qarp-typing'); if (e) e.remove(); }

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function fmt(text) {
    var segs = [], rx = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, last = 0, m;
    while ((m = rx.exec(text)) !== null) {
      if (m.index > last) segs.push({t:'t', c:text.slice(last, m.index)});
      segs.push({t:'a', l:m[1], u:m[2]});
      last = m.index + m[0].length;
    }
    if (last < text.length) segs.push({t:'t', c:text.slice(last)});

    var html = segs.map(function(s) {
      if (s.t === 'a') return '<a href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.l) + '</a>';
      var h = esc(s.c);
      h = h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      h = h.replace(/\*(.*?)\*/g, '<em>$1</em>');
      h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      return h;
    }).join('');

    html = html.replace(/\n/g, '<br>');
    return html;
  }

  async function sendMessage(text) {
    if (isLoading) return;
    isLoading = true;
    input.value = ''; input.style.height = 'auto';
    sendBtn.disabled = true;

    // Remove quick actions once user engages
    var actions = messagesEl.querySelectorAll('.qc-actions');
    actions.forEach(function(el) { el.remove(); });

    addMessage(text, true);
    showTyping();

    try {
      var r = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: text, sessionId: sessionId })
      });
      hideTyping();
      if (r.ok) {
        var d = await r.json();
        sessionId = d.sessionId;
        addMessage(d.reply, false);
      } else {
        var err = await r.json().catch(function(){return {};});
        addMessage(err.error || 'Sorry, something went wrong. Please try again or contact us at info@theqarp.com.', false);
      }
    } catch(e) {
      hideTyping();
      addMessage('Connection error. Please check your internet or contact us at info@theqarp.com.', false);
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }
})();
