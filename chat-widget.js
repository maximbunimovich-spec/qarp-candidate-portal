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
  var isExpanded = false;
  var leadCaptured = false;
  var messageCount = 0;

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

    /* ---------- POPUP (normal) ---------- */
    '#qarp-chat-popup {',
    '  position:fixed; bottom:96px; right:24px; z-index:999999;',
    '  width:420px; max-width:calc(100vw - 32px);',
    '  height:600px; max-height:calc(100vh - 130px);',
    '  background:' + BRAND.white + '; border-radius:20px;',
    '  box-shadow:0 16px 60px rgba(11,17,32,0.2),0 4px 20px rgba(0,0,0,0.08);',
    '  display:flex; flex-direction:column; overflow:hidden;',
    '  opacity:0; transform:translateY(16px) scale(0.96); pointer-events:none;',
    '  transition:all .3s cubic-bezier(.34,1.56,.64,1);',
    '}',
    '#qarp-chat-popup.qvisible { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }',

    /* ---------- POPUP (expanded) ---------- */
    '#qarp-chat-popup.qexpanded {',
    '  width:700px; max-width:calc(100vw - 48px);',
    '  height:85vh; max-height:calc(100vh - 60px);',
    '  bottom:30px; right:30px;',
    '  border-radius:16px;',
    '}',

    /* ---------- HEADER ---------- */
    '.qc-header {',
    '  background:linear-gradient(135deg,' + BRAND.navy + ' 0%,' + BRAND.navyLight + ' 100%);',
    '  padding:14px 16px; display:flex; align-items:center; gap:10px; flex-shrink:0;',
    '}',
    '.qc-header-icon { width:38px; height:38px; border-radius:10px; background:' + BRAND.teal + '; display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
    '.qc-header-icon svg { width:20px; height:20px; fill:' + BRAND.white + '; }',
    '.qc-header-text { flex:1; }',
    '.qc-header-text h3 { color:' + BRAND.white + '; font-family:"DM Sans",sans-serif; font-size:14px; font-weight:600; line-height:1.3; }',
    '.qc-header-text p { color:' + BRAND.gray400 + '; font-family:Inter,sans-serif; font-size:11px; margin-top:1px; display:flex; align-items:center; gap:5px; }',
    '.qc-dot { width:6px; height:6px; border-radius:50%; background:#34D399; animation:qpulse 2s ease-in-out infinite; }',
    '@keyframes qpulse { 0%,100%{opacity:1} 50%{opacity:.5} }',

    '.qc-header-btns { display:flex; gap:4px; }',
    '.qc-hbtn { background:rgba(255,255,255,.1); border:none; border-radius:8px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .2s; }',
    '.qc-hbtn:hover { background:rgba(255,255,255,.2); }',
    '.qc-hbtn svg { width:15px; height:15px; fill:' + BRAND.gray400 + '; }',

    /* ---------- MESSAGES ---------- */
    '.qc-messages {',
    '  flex:1; overflow-y:auto; padding:14px 14px 8px; display:flex; flex-direction:column; gap:8px; scroll-behavior:smooth; background:' + BRAND.gray50 + ';',
    '}',
    '.qc-messages::-webkit-scrollbar { width:4px; }',
    '.qc-messages::-webkit-scrollbar-thumb { background:' + BRAND.gray300 + '; border-radius:2px; }',

    '.qc-msg { max-width:85%; padding:11px 15px; border-radius:16px; font-family:Inter,sans-serif; font-size:14px; line-height:1.6; word-wrap:break-word; white-space:pre-wrap; animation:qfade .25s ease; text-align:left; }',
    '@keyframes qfade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }',
    '.qc-msg-bot { align-self:flex-start; background:' + BRAND.white + '; color:' + BRAND.gray800 + '; border:1px solid ' + BRAND.gray200 + '; border-bottom-left-radius:4px; }',
    '.qc-msg-user { align-self:flex-end; background:linear-gradient(135deg,' + BRAND.teal + ',' + BRAND.tealDark + '); color:' + BRAND.white + '; border-bottom-right-radius:4px; text-align:left; }',
    '.qc-msg-bot a { color:' + BRAND.teal + '; text-decoration:underline; }',
    '.qc-msg-bot strong { font-weight:600; }',
    '.qc-msg-bot ul, .qc-msg-bot ol { padding-left:18px; margin:4px 0; }',
    '.qc-msg-bot li { margin:2px 0; }',

    /* ---------- WELCOME ---------- */
    '.qc-welcome { font-family:Inter,sans-serif; font-size:14px; line-height:1.6; color:' + BRAND.gray700 + '; text-align:left; }',
    '.qc-welcome-title { font-family:"DM Sans",sans-serif; font-weight:600; font-size:15px; color:' + BRAND.navy + '; margin-bottom:4px; text-align:left; }',

    /* ---------- QUICK ACTIONS ---------- */
    '.qc-actions { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }',
    '.qc-action {',
    '  background:' + BRAND.white + '; color:' + BRAND.tealDark + ';',
    '  border:1.5px solid ' + BRAND.teal + '; border-radius:20px;',
    '  padding:7px 13px; font-family:Inter,sans-serif; font-size:12.5px; font-weight:500;',
    '  cursor:pointer; transition:all .2s; outline:none; white-space:nowrap; text-align:center;',
    '}',
    '.qc-action:hover { background:' + BRAND.teal + '; color:' + BRAND.white + '; }',

    /* ---------- LEAD CAPTURE FORM ---------- */
    '.qc-lead-form { background:linear-gradient(135deg,' + BRAND.navy + ',' + BRAND.navyLight + '); border-radius:14px; padding:16px; margin:4px 0; animation:qfade .3s ease; }',
    '.qc-lead-title { color:' + BRAND.white + '; font-family:"DM Sans",sans-serif; font-size:14px; font-weight:600; margin-bottom:4px; }',
    '.qc-lead-sub { color:' + BRAND.gray400 + '; font-family:Inter,sans-serif; font-size:12px; margin-bottom:12px; line-height:1.4; }',
    '.qc-lead-input { width:100%; border:1.5px solid rgba(255,255,255,.15); border-radius:10px; padding:10px 12px; font-family:Inter,sans-serif; font-size:14px; color:' + BRAND.white + '; background:rgba(255,255,255,.08); outline:none; margin-bottom:8px; transition:border-color .2s; }',
    '.qc-lead-input:focus { border-color:' + BRAND.teal + '; }',
    '.qc-lead-input::placeholder { color:' + BRAND.gray500 + '; }',
    '.qc-lead-btn { width:100%; border:none; border-radius:10px; padding:10px; font-family:Inter,sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:all .2s; }',
    '.qc-lead-submit { background:linear-gradient(135deg,' + BRAND.teal + ',' + BRAND.tealDark + '); color:' + BRAND.white + '; }',
    '.qc-lead-submit:hover { transform:scale(1.02); }',
    '.qc-lead-skip { background:transparent; color:' + BRAND.gray400 + '; font-size:12px; font-weight:400; margin-top:4px; }',
    '.qc-lead-skip:hover { color:' + BRAND.gray300 + '; }',

    /* ---------- TYPING ---------- */
    '.qc-typing { align-self:flex-start; display:flex; gap:5px; padding:12px 16px; background:' + BRAND.white + '; border:1px solid ' + BRAND.gray200 + '; border-radius:16px; border-bottom-left-radius:4px; animation:qfade .2s; }',
    '.qc-typing i { width:7px; height:7px; background:' + BRAND.gray400 + '; border-radius:50%; display:block; animation:qbounce 1.4s ease-in-out infinite; }',
    '.qc-typing i:nth-child(2){animation-delay:.2s} .qc-typing i:nth-child(3){animation-delay:.4s}',
    '@keyframes qbounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }',

    /* ---------- INPUT AREA ---------- */
    '.qc-input-area {',
    '  padding:12px 14px 14px; border-top:1px solid ' + BRAND.gray200 + '; display:flex; align-items:flex-end; gap:8px; background:' + BRAND.white + '; flex-shrink:0;',
    '}',
    '.qc-textarea {',
    '  flex:1; border:1.5px solid ' + BRAND.gray200 + '; border-radius:14px;',
    '  padding:12px 14px; font-family:Inter,sans-serif; font-size:15px; color:' + BRAND.gray800 + ';',
    '  background:' + BRAND.gray50 + '; outline:none; resize:none; min-height:50px; max-height:130px;',
    '  overflow-y:auto; transition:border-color .2s,background .2s; line-height:1.5;',
    '}',
    '.qc-textarea:focus { border-color:' + BRAND.teal + '; background:' + BRAND.white + '; }',
    '.qc-textarea::placeholder { color:' + BRAND.gray400 + '; font-size:14px; }',
    '.qc-send {',
    '  width:46px; height:46px; border-radius:12px; border:none;',
    '  background:linear-gradient(135deg,' + BRAND.teal + ',' + BRAND.tealDark + ');',
    '  cursor:pointer; display:flex; align-items:center; justify-content:center;',
    '  transition:transform .15s,opacity .2s; flex-shrink:0; outline:none;',
    '}',
    '.qc-send:hover { transform:scale(1.05); }',
    '.qc-send:active { transform:scale(0.93); }',
    '.qc-send:disabled { opacity:.4; cursor:not-allowed; transform:none; }',
    '.qc-send svg { width:20px; height:20px; fill:' + BRAND.white + '; }',

    /* ---------- EXPANDED INPUT ---------- */
    '.qexpanded .qc-textarea { min-height:60px; max-height:160px; font-size:15px; }',

    /* ---------- MOBILE ---------- */
    '@media(max-width:480px){',
    '  #qarp-chat-popup, #qarp-chat-popup.qexpanded { bottom:0; right:0; left:0; top:0; width:100vw; height:100vh; max-height:100vh; max-width:100vw; border-radius:0; position:fixed; }',
    '  #qarp-chat-popup .qc-messages { padding:10px; }',
    '  #qarp-chat-popup .qc-input-area { padding:10px 12px 16px; padding-bottom:max(16px,env(safe-area-inset-bottom)); }',
    '  #qarp-chat-popup .qc-textarea { font-size:16px; min-height:52px; padding:12px 14px; }',
    '  #qarp-chat-popup .qc-send { width:48px; height:48px; }',
    '  #qarp-chat-popup .qc-action { padding:9px 14px; font-size:13px; }',
    '  #qarp-chat-popup .qc-msg { font-size:15px; padding:12px 14px; max-width:90%; }',
    '  #qarp-chat-bubble { bottom:16px; right:16px; width:56px; height:56px; }',
    '  #qarp-chat-bubble.qopen { display:none; }',
    '  .qc-expand-btn { display:none; }',
    '}',
    '@media(max-width:480px) and (max-height:700px){',
    '  #qarp-chat-popup .qc-header { padding:10px 14px; }',
    '  #qarp-chat-popup .qc-header-icon { width:32px; height:32px; border-radius:8px; }',
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
    '      <h3>QARP AI Consultant</h3>',
    '      <p><span class="qc-dot"></span> GxP Expert Online</p>',
    '    </div>',
    '    <div class="qc-header-btns">',
    '      <button class="qc-hbtn qc-expand-btn" id="qarp-expand-btn" aria-label="Expand" title="Expand"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>',
    '      <button class="qc-hbtn" id="qarp-close-btn" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>',
    '    </div>',
    '  </div>',

    '  <div class="qc-messages" id="qarp-messages">',
    '    <div class="qc-msg qc-msg-bot">',
    '      <div class="qc-welcome">',
    '        <div class="qc-welcome-title">Hi! I\'m your GxP compliance expert.</div>',
    '        I can help with audits, ICH GCP E6(R3), training, and AI solutions. What brings you here today?',
    '      </div>',
    '      <div class="qc-actions" id="qarp-quick-actions">',
    '        <button class="qc-action" data-msg="I need help with a GxP audit">Audits</button>',
    '        <button class="qc-action" data-msg="Tell me about ICH GCP E6(R3) changes">ICH GCP R3</button>',
    '        <button class="qc-action" data-msg="What training courses do you offer?">Training</button>',
    '        <button class="qc-action" data-msg="I\'m interested in Enterprise AI for compliance">Enterprise AI</button>',
    '        <button class="qc-action" data-msg="I need GxP consulting support">Consulting</button>',
    '        <button class="qc-action" data-msg="I\'d like to book a consultation">Book a Call</button>',
    '      </div>',
    '    </div>',
    '  </div>',

    '  <div class="qc-input-area">',
    '    <textarea class="qc-textarea" id="qarp-input" placeholder="Ask about GxP, ICH GCP R3, audits..." rows="1"></textarea>',
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
  var expandBtn = document.getElementById('qarp-expand-btn');

  function toggleChat() {
    isOpen = !isOpen;
    popup.classList.toggle('qvisible', isOpen);
    bubble.classList.toggle('qopen', isOpen);
    if (isOpen) input.focus();
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
    popup.classList.toggle('qexpanded', isExpanded);
    // Change icon
    expandBtn.innerHTML = isExpanded
      ? '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    expandBtn.title = isExpanded ? 'Shrink' : 'Expand';
    input.focus();
  }

  bubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  expandBtn.addEventListener('click', toggleExpand);

  // Quick action buttons
  messagesEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.qc-action');
    if (btn) {
      var msg = btn.getAttribute('data-msg');
      if (msg) sendMessage(msg);
    }
    // Lead form submit
    var submitBtn = e.target.closest('#qarp-lead-submit');
    if (submitBtn) handleLeadSubmit();
    var skipBtn = e.target.closest('#qarp-lead-skip');
    if (skipBtn) handleLeadSkip();
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
    this.style.height = Math.min(this.scrollHeight, isExpanded ? 160 : 130) + 'px';
  });

  // ===== Lead Capture =====
  function showLeadForm() {
    if (leadCaptured) return;
    var formHtml = [
      '<div class="qc-lead-form" id="qarp-lead-form">',
      '  <div class="qc-lead-title">Get personalized recommendations</div>',
      '  <div class="qc-lead-sub">Share your details and we\'ll tailor our advice to your needs. Our team will follow up with a customized proposal.</div>',
      '  <input class="qc-lead-input" id="qarp-lead-name" type="text" placeholder="Your name">',
      '  <input class="qc-lead-input" id="qarp-lead-email" type="email" placeholder="Work email">',
      '  <button class="qc-lead-btn qc-lead-submit" id="qarp-lead-submit">Send & Get Expert Follow-up</button>',
      '  <button class="qc-lead-btn qc-lead-skip" id="qarp-lead-skip">Continue without sharing</button>',
      '</div>'
    ].join('');
    var div = document.createElement('div');
    div.innerHTML = formHtml;
    messagesEl.appendChild(div.firstChild);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function handleLeadSubmit() {
    var nameEl = document.getElementById('qarp-lead-name');
    var emailEl = document.getElementById('qarp-lead-email');
    var name = nameEl ? nameEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim() : '';

    if (!name || !email) {
      if (!name && nameEl) { nameEl.style.borderColor = '#EF4444'; }
      if (!email && emailEl) { emailEl.style.borderColor = '#EF4444'; }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailEl.style.borderColor = '#EF4444';
      return;
    }

    leadCaptured = true;
    var form = document.getElementById('qarp-lead-form');
    if (form) form.remove();

    // Send lead + conversation to backend
    sendLead(name, email);

    addMessage('Thank you, ' + name + '! Our team will review our conversation and reach out with a personalized proposal. Meanwhile, feel free to keep asking questions!', false);
  }

  function handleLeadSkip() {
    leadCaptured = true;
    var form = document.getElementById('qarp-lead-form');
    if (form) form.remove();
    addMessage('No problem! Feel free to continue exploring. You can always book a call at any time.', false);
  }

  function sendLead(name, email) {
    // Collect conversation history
    var msgs = messagesEl.querySelectorAll('.qc-msg');
    var history = [];
    msgs.forEach(function(el) {
      var isUser = el.classList.contains('qc-msg-user');
      history.push({ role: isUser ? 'User' : 'QARP Bot', text: el.textContent.trim() });
    });

    fetch(API_URL.replace('/chatbot', '/chatbot-lead'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name: name, email: email, sessionId: sessionId, conversation: history })
    }).catch(function() { /* silent fail */ });
  }

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
      h = h.replace(/^[\-•]\s+(.+)$/gm, '<li>$1</li>');
      h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      return h;
    }).join('');

    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<ul><br>/g, '<ul>');
    html = html.replace(/<br><\/ul>/g, '</ul>');
    return html;
  }

  async function sendMessage(text) {
    if (isLoading) return;
    isLoading = true;
    input.value = ''; input.style.height = 'auto';
    sendBtn.disabled = true;
    messageCount++;

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
        messageCount++;

        // Show lead capture form after 3 exchanges (6 messages) if not captured
        if (!leadCaptured && messageCount >= 6) {
          setTimeout(showLeadForm, 1500);
        }
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
