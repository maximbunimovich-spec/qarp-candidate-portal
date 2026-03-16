(function() {
  'use strict';
  /* V6F_MARKER_2026_03_16 */

  var API_URL = 'https://qarp-candidate-portal.onrender.com/api/chatbot';
  var LEAD_URL = 'https://qarp-candidate-portal.onrender.com/api/chatbot-lead';
  var BRAND = {
    navy: '#0B1120',
    navyLight: '#162032',
    teal: '#00B4D8',
    tealDark: '#0096B4',
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
  var leadName = '';
  var leadEmail = '';

  var style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
    #qarp-chat-widget * { box-sizing:border-box; margin:0; padding:0; }

    /* === BUBBLE === */
    #qarp-chat-bubble {
      position:fixed; bottom:24px; right:24px; z-index:999998;
      width:64px; height:64px; border-radius:50%;
      background:linear-gradient(135deg,${BRAND.navy},${BRAND.navyLight});
      border:2px solid ${BRAND.teal}; cursor:pointer; outline:none;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 20px rgba(11,17,32,0.5),0 2px 8px rgba(0,0,0,0.15);
      transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;
    }
    #qarp-chat-bubble:hover { transform:scale(1.07); }
    #qarp-chat-bubble:active { transform:scale(0.94); }
    #qarp-chat-bubble svg { width:30px; height:30px; fill:${BRAND.white}; }
    #qarp-chat-bubble.qopen .qchat-ico { display:none }
    #qarp-chat-bubble.qopen .qclose-ico { display:block }
    #qarp-chat-bubble:not(.qopen) .qchat-ico { display:block }
    #qarp-chat-bubble:not(.qopen) .qclose-ico { display:none }

    /* === POPUP === */
    #qarp-chat-popup {
      position:fixed; bottom:100px; right:24px; z-index:999999;
      width:440px; max-width:calc(100vw - 32px);
      height:620px; max-height:calc(100vh - 130px);
      background:${BRAND.white}; border-radius:20px;
      box-shadow:0 16px 60px rgba(11,17,32,0.22),0 4px 20px rgba(0,0,0,0.08);
      display:flex; flex-direction:column; overflow:hidden;
      opacity:0; transform:translateY(16px) scale(0.96); pointer-events:none;
      transition:all .3s cubic-bezier(.34,1.56,.64,1);
    }
    #qarp-chat-popup.qvisible { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }
    #qarp-chat-popup.qexpanded {
      width:720px; max-width:calc(100vw - 48px);
      height:88vh; max-height:calc(100vh - 48px);
      bottom:24px; right:24px;
    }

    /* === HEADER === */
    .qc-header {
      background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyLight} 100%);
      padding:14px 18px; display:flex; align-items:center; gap:12px; flex-shrink:0;
    }
    .qc-header-icon { width:40px; height:40px; border-radius:10px; background:${BRAND.teal}; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .qc-header-icon svg { width:22px; height:22px; fill:${BRAND.white}; }
    .qc-header-text { flex:1; }
    .qc-header-text h3 { color:${BRAND.white}; font-family:"DM Sans",sans-serif; font-size:15px; font-weight:600; }
    .qc-header-text p { color:${BRAND.gray400}; font-family:Inter,sans-serif; font-size:12px; margin-top:1px; display:flex; align-items:center; gap:5px; }
    .qc-dot { width:7px; height:7px; border-radius:50%; background:#34D399; animation:qpulse 2s infinite; }
    @keyframes qpulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .qc-header-btns { display:flex; gap:4px; }
    .qc-hbtn { background:rgba(255,255,255,.1); border:none; border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .2s; }
    .qc-hbtn:hover { background:rgba(255,255,255,.2); }
    .qc-hbtn svg { width:16px; height:16px; fill:${BRAND.gray400}; }

    /* === LEAD GATE === */
    .qc-gate {
      flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
      padding:24px 28px; text-align:center; background:${BRAND.white};
    }
    .qc-gate-icon { font-size:44px; margin-bottom:12px; opacity:0.75; }
    .qc-gate-logo { font-family:"DM Sans",sans-serif; font-size:24px; font-weight:700; color:${BRAND.navy}; margin-bottom:6px; }
    .qc-gate-sub { font-family:Inter,sans-serif; font-size:15px; color:${BRAND.gray500}; margin-bottom:24px; line-height:1.55; max-width:340px; }
    .qc-gate-input {
      width:100%; border:1.5px solid ${BRAND.gray200}; border-radius:12px;
      padding:14px 16px; font-family:Inter,sans-serif; font-size:15px; color:${BRAND.gray800};
      background:${BRAND.white}; outline:none; margin-bottom:10px; transition:border-color .2s,box-shadow .2s;
    }
    .qc-gate-input:focus { border-color:${BRAND.teal}; box-shadow:0 0 0 3px rgba(0,180,216,0.1); }
    .qc-gate-input::placeholder { color:${BRAND.gray400}; }
    .qc-gate-input.qerr { border-color:#EF4444; }
    .qc-gate-privacy {
      display:flex; align-items:flex-start; gap:10px; margin:10px 0 16px; text-align:left; width:100%;
    }
    .qc-gate-privacy input[type=checkbox] {
      width:20px; height:20px; margin-top:2px; accent-color:${BRAND.teal}; flex-shrink:0; cursor:pointer;
    }
    .qc-gate-privacy label {
      font-family:Inter,sans-serif; font-size:13px; color:${BRAND.gray500}; line-height:1.4; cursor:pointer;
    }
    .qc-gate-privacy a { color:${BRAND.teal}; text-decoration:underline; }
    .qc-gate-btn {
      width:100%; border:none; border-radius:12px; padding:14px;
      background:linear-gradient(135deg,${BRAND.navy},${BRAND.navyLight}); color:${BRAND.white};
      font-family:"DM Sans",sans-serif; font-size:16px; font-weight:600;
      cursor:pointer; transition:transform .15s,opacity .2s;
    }
    .qc-gate-btn:hover { transform:scale(1.02); }
    .qc-gate-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
    .qc-gate-err { color:#EF4444; font-family:Inter,sans-serif; font-size:12px; margin-top:8px; }

    /* === MESSAGES === */
    .qc-messages {
      flex:1; overflow-y:auto; overflow-x:hidden; padding:20px 20px; display:flex; flex-direction:column; gap:12px;
      scroll-behavior:smooth; background:${BRAND.white};
    }
    .qc-messages::-webkit-scrollbar { width:4px; }
    .qc-messages::-webkit-scrollbar-thumb { background:${BRAND.gray300}; border-radius:2px; }

    /* Welcome-only state: center content vertically */
    .qc-messages.qc-welcome-state {
      justify-content:center; align-items:center;
    }

    .qc-msg {
      max-width:85%; padding:14px 18px; border-radius:18px;
      font-family:Inter,sans-serif; font-size:15px; line-height:1.6;
      word-wrap:break-word; overflow-wrap:break-word; animation:qfade .25s ease;
    }
    @keyframes qfade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .qc-msg-bot {
      align-self:center; background:${BRAND.white}; color:${BRAND.gray800};
      border:1.5px solid ${BRAND.gray200}; border-radius:18px;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      white-space:normal; max-width:92%; text-align:left;
    }
    .qc-msg-bot.qc-welcome-msg {
      align-self:center; text-align:center; max-width:100%;
      border:none; box-shadow:none; padding:0; background:transparent;
    }
    .qc-msg-bot:not(.qc-welcome-msg) {
    }
    .qc-msg-user {
      align-self:flex-end; background:linear-gradient(135deg,${BRAND.navy},${BRAND.navyLight});
      color:${BRAND.white}; border-bottom-right-radius:4px;
      box-shadow:0 2px 8px rgba(11,17,32,0.25);
      max-width:78%; white-space:pre-wrap;
    }
    .qc-msg-bot a { color:${BRAND.teal}; text-decoration:underline; }
    .qc-msg-bot strong { font-weight:600; }
    .qc-msg-bot ul, .qc-msg-bot ol { padding-left:20px; margin:6px 0; }
    .qc-msg-bot li { margin:3px 0; }

    /* === WELCOME === */
    .qc-welcome-icon { font-size:48px; margin-bottom:16px; display:block; opacity:0.8; }
    .qc-welcome { font-family:Inter,sans-serif; font-size:16px; line-height:1.55; color:${BRAND.gray500}; }
    .qc-welcome-title { font-family:"DM Sans",sans-serif; font-weight:700; font-size:24px; color:${BRAND.navy}; margin-bottom:6px; display:block; letter-spacing:-0.3px; }
    .qc-welcome-sub { display:block; font-size:15px; color:${BRAND.gray400}; margin-bottom:0; }
    .qc-welcome-body { display:block; margin-bottom:4px; }

    /* === QUICK ACTIONS (pill buttons matching reference) === */
    .qc-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; justify-content:center; }
    .qc-action {
      background:${BRAND.white}; color:${BRAND.gray800};
      border:1.5px solid ${BRAND.gray200}; border-radius:28px;
      padding:10px 20px; font-family:Inter,sans-serif; font-size:15px; font-weight:500;
      cursor:pointer; transition:all .2s ease; outline:none;
      display:inline-flex; align-items:center; gap:8px;
      box-shadow:0 1px 3px rgba(0,0,0,0.04);
    }
    .qc-action:hover {
      border-color:${BRAND.navy}; background:${BRAND.navy}; color:${BRAND.white};
      box-shadow:0 3px 12px rgba(11,17,32,0.18); transform:translateY(-1px);
    }
    .qc-action-icon { font-size:16px; flex-shrink:0; }

    /* === TYPING === */
    .qc-typing {
      align-self:flex-start; display:flex; gap:5px; padding:14px 18px;
      background:${BRAND.white}; border:1.5px solid ${BRAND.gray200};
      border-radius:18px; border-bottom-left-radius:4px; animation:qfade .2s;
    }
    .qc-typing i { width:8px; height:8px; background:${BRAND.gray400}; border-radius:50%; display:block; animation:qbounce 1.4s infinite; }
    .qc-typing i:nth-child(2){animation-delay:.2s} .qc-typing i:nth-child(3){animation-delay:.4s}
    @keyframes qbounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

    /* === INPUT === */
    .qc-input-area {
      padding:16px 16px 18px; border-top:1px solid ${BRAND.gray200};
      display:flex; align-items:flex-end; gap:10px; background:${BRAND.white}; flex-shrink:0;
    }
    .qc-textarea {
      flex:1; border:1.5px solid ${BRAND.gray200}; border-radius:16px;
      padding:14px 18px; font-family:Inter,sans-serif; font-size:15px; color:${BRAND.gray800};
      background:${BRAND.gray50}; outline:none; resize:none;
      min-height:100px; max-height:180px;
      overflow-y:auto; transition:border-color .2s,background .2s; line-height:1.5;
    }
    .qc-textarea:focus { border-color:${BRAND.teal}; background:${BRAND.white}; }
    .qc-textarea::placeholder { color:${BRAND.gray400}; font-size:15px; }
    .qc-send {
      width:50px; height:50px; border-radius:14px; border:none;
      background:linear-gradient(135deg,${BRAND.teal},${BRAND.tealDark});
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      transition:transform .15s,opacity .2s; flex-shrink:0; outline:none;
    }
    .qc-send:hover { transform:scale(1.05); }
    .qc-send:active { transform:scale(0.93); }
    .qc-send:disabled { opacity:.4; cursor:not-allowed; transform:none; }
    .qc-send svg { width:22px; height:22px; fill:${BRAND.white}; }

    /* === EXPANDED === */
    .qexpanded .qc-textarea { min-height:64px; max-height:180px; }
    .qexpanded .qc-msg { font-size:15.5px; max-width:75%; }

    /* === MOBILE === */
    @media(max-width:480px){
      #qarp-chat-popup, #qarp-chat-popup.qexpanded {
        bottom:0; right:0; left:0; top:0;
        width:100vw; height:100vh; max-height:100vh; max-width:100vw;
        border-radius:0; position:fixed;
      }
      #qarp-chat-popup .qc-messages { padding:14px 14px; gap:10px; }
      #qarp-chat-popup .qc-input-area {
        padding:12px 14px 16px;
        padding-bottom:max(16px,env(safe-area-inset-bottom));
        gap:10px; border-top:2px solid ${BRAND.gray200};
      }
      #qarp-chat-popup .qc-textarea {
        font-size:17px; min-height:52px; max-height:120px;
        padding:14px 16px; border-radius:14px;
        border:2px solid ${BRAND.gray300};
        background:${BRAND.white};
      }
      #qarp-chat-popup .qc-textarea:focus { border-color:${BRAND.teal}; }
      #qarp-chat-popup .qc-send { width:52px; height:52px; border-radius:14px; }
      #qarp-chat-popup .qc-action { padding:8px 16px; font-size:13px; font-weight:600; border-radius:20px; border:2px solid ${BRAND.gray300}; background:${BRAND.white}; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
      #qarp-chat-popup .qc-msg { font-size:15px; padding:12px 16px; max-width:85%; line-height:1.55; }
      #qarp-chat-popup .qc-msg-bot { border-width:1.5px; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
      #qarp-chat-popup .qc-msg-user { max-width:80%; }
      #qarp-chat-popup .qc-welcome { font-size:15px; line-height:1.55; }
      #qarp-chat-popup .qc-welcome-title { font-size:17px; font-weight:700; margin-bottom:8px; }
      #qarp-chat-bubble { bottom:16px; right:16px; width:58px; height:58px; }
      #qarp-chat-bubble.qopen { display:none; }
      .qc-expand-btn { display:none !important; }

      /* Lead gate on mobile */
      .qc-gate {
        justify-content:flex-start; padding:36px 24px 24px;
      }
      .qc-gate-logo { font-size:24px; margin-bottom:8px; }
      .qc-gate-sub { font-size:15px; margin-bottom:28px; line-height:1.55; }
      .qc-gate-input {
        font-size:17px; padding:16px 18px;
        border:2px solid ${BRAND.gray300}; border-radius:14px;
        margin-bottom:12px;
      }
      .qc-gate-input:focus { border-color:${BRAND.teal}; box-shadow:0 0 0 3px rgba(0,180,216,0.12); }
      .qc-gate-privacy { margin:14px 0 20px; }
      .qc-gate-privacy input[type=checkbox] { width:22px; height:22px; }
      .qc-gate-privacy label { font-size:14px; line-height:1.45; }
      .qc-gate-btn { padding:16px; font-size:17px; border-radius:14px; }
    }
  `;
  document.head.appendChild(style);

  // ===== HTML =====
  var container = document.createElement('div');
  container.id = 'qarp-chat-widget';
  container.innerHTML = `
    <button id="qarp-chat-bubble" aria-label="Open chat">
      <svg class="qchat-ico" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
      <svg class="qclose-ico" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>

    <div id="qarp-chat-popup">
      <div class="qc-header">
        <div class="qc-header-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></div>
        <div class="qc-header-text">
          <h3>QARP Assistant</h3>
          <p><span class="qc-dot"></span> Online</p>
        </div>
        <div class="qc-header-btns">
          <button class="qc-hbtn qc-expand-btn" id="qarp-expand-btn" aria-label="Expand" title="Expand"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
          <button class="qc-hbtn" id="qarp-close-btn" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
        </div>
      </div>

      <!-- LEAD GATE -->
      <div class="qc-gate" id="qarp-gate">
        <div class="qc-gate-icon">\u{1F916}</div>
        <div class="qc-gate-logo">QARP Assistant</div>
        <div class="qc-gate-sub">Your smart assistant for The QARP services, courses, and more.</div>
        <input class="qc-gate-input" id="qarp-gate-name" type="text" placeholder="Your name" autocomplete="name">
        <input class="qc-gate-input" id="qarp-gate-email" type="email" placeholder="Work email" autocomplete="email">
        <div class="qc-gate-privacy">
          <input type="checkbox" id="qarp-gate-privacy">
          <label for="qarp-gate-privacy">I agree to the <a href="https://theqarp.com/privacy" target="_blank">Privacy Policy</a> and consent to receive follow-up communications from The QARP.</label>
        </div>
        <button class="qc-gate-btn" id="qarp-gate-submit">Start Chat</button>
        <div class="qc-gate-err" id="qarp-gate-err" style="display:none"></div>
      </div>

      <!-- CHAT (hidden until lead captured) -->
      <div class="qc-messages qc-welcome-state" id="qarp-messages" style="display:none"><div class="qc-msg qc-msg-bot qc-welcome-msg"><div class="qc-welcome"><span class="qc-welcome-icon">\u{1F916}</span><span class="qc-welcome-title">QARP Assistant</span><span class="qc-welcome-body"><span id="qarp-welcome-name"></span>Ask about The QARP and our services</span><span class="qc-welcome-sub">Courses, audits, consulting, AI solutions</span></div><div class="qc-actions" id="qarp-quick-actions"><button class="qc-action" data-msg="I need help with a GxP audit"><span class="qc-action-icon">\u{1F50D}</span> Audits</button><button class="qc-action" data-msg="Tell me about ICH GCP E6(R3) key changes"><span class="qc-action-icon">\u{1F4CB}</span> ICH GCP R3</button><button class="qc-action" data-msg="What training courses do you offer?"><span class="qc-action-icon">\u{1F393}</span> Training</button><button class="qc-action" data-msg="Tell me about your GxP AI Assistant"><span class="qc-action-icon">\u{1F4AC}</span> AI Assistant</button><button class="qc-action" data-msg="We want to implement Enterprise AI for our organization"><span class="qc-action-icon">\u{1F3E2}</span> Enterprise AI</button><button class="qc-action" data-msg="I need GxP consulting support"><span class="qc-action-icon">\u{1F4BC}</span> Consulting</button></div></div></div>

      <div class="qc-input-area" id="qarp-input-area" style="display:none">
        <textarea class="qc-textarea" id="qarp-input" placeholder="Ask about The QARP..." rows="1"></textarea>
        <button class="qc-send" id="qarp-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // ===== Refs =====
  var bubble = document.getElementById('qarp-chat-bubble');
  var popup = document.getElementById('qarp-chat-popup');
  var gate = document.getElementById('qarp-gate');
  var messagesEl = document.getElementById('qarp-messages');
  var inputArea = document.getElementById('qarp-input-area');
  var input = document.getElementById('qarp-input');
  var sendBtn = document.getElementById('qarp-send');
  var closeBtn = document.getElementById('qarp-close-btn');
  var expandBtn = document.getElementById('qarp-expand-btn');
  var gateSubmit = document.getElementById('qarp-gate-submit');
  var gateErr = document.getElementById('qarp-gate-err');

  function toggleChat() {
    isOpen = !isOpen;
    popup.classList.toggle('qvisible', isOpen);
    bubble.classList.toggle('qopen', isOpen);
    if (isOpen && gate.style.display === 'none') input.focus();
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
    popup.classList.toggle('qexpanded', isExpanded);
    expandBtn.innerHTML = isExpanded
      ? '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    input.focus();
  }

  bubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  expandBtn.addEventListener('click', toggleExpand);

  // ===== Lead Gate =====
  gateSubmit.addEventListener('click', function() {
    var nameEl = document.getElementById('qarp-gate-name');
    var emailEl = document.getElementById('qarp-gate-email');
    var privacyEl = document.getElementById('qarp-gate-privacy');
    var name = nameEl.value.trim();
    var email = emailEl.value.trim();

    nameEl.classList.remove('qerr');
    emailEl.classList.remove('qerr');
    gateErr.style.display = 'none';

    if (!name) { nameEl.classList.add('qerr'); }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailEl.classList.add('qerr'); }
    if (!privacyEl.checked) {
      gateErr.textContent = 'Please agree to the Privacy Policy to continue.';
      gateErr.style.display = 'block';
      return;
    }
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      gateErr.textContent = 'Please enter your name and a valid email.';
      gateErr.style.display = 'block';
      return;
    }

    leadName = name;
    leadEmail = email;

    // Hide gate, show chat
    gate.style.display = 'none';
    messagesEl.style.display = 'flex';
    inputArea.style.display = 'flex';

    // Personalize welcome
    document.getElementById('qarp-welcome-name').textContent = 'Hi ' + name.split(' ')[0] + '! ';

    // Send lead info to backend immediately
    fetch(LEAD_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name: name, email: email, sessionId: sessionId, conversation: [], privacyAgreed: true })
    }).catch(function() {});

    input.focus();
  });

  // Allow Enter on gate inputs
  ['qarp-gate-name', 'qarp-gate-email'].forEach(function(id) {
    document.getElementById(id).addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); gateSubmit.click(); }
    });
  });

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
    this.style.height = Math.min(this.scrollHeight, isExpanded ? 180 : 140) + 'px';
  });

  // ===== Helpers =====
  function addMessage(text, isUser) {
    // Remove welcome-state centering once conversation starts
    messagesEl.classList.remove('qc-welcome-state');

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
      h = h.replace(/^[\-\u2022]\s+(.+)$/gm, '<li>$1</li>');
      h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      return h;
    }).join('');

    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<ul><br>/g, '<ul>');
    html = html.replace(/<br><\/ul>/g, '</ul>');
    return html;
  }

  // Send conversation snapshot to lead endpoint (periodic)
  function syncLead() {
    if (!leadEmail) return;
    var msgs = messagesEl.querySelectorAll('.qc-msg');
    var history = [];
    msgs.forEach(function(el) {
      var isUser = el.classList.contains('qc-msg-user');
      history.push({ role: isUser ? 'User' : 'QARP Assistant', text: el.textContent.trim().substring(0, 500) });
    });
    fetch(LEAD_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name: leadName, email: leadEmail, sessionId: sessionId, conversation: history, privacyAgreed: true })
    }).catch(function() {});
  }

  var msgCount = 0;

  async function sendMessage(text) {
    if (isLoading) return;
    isLoading = true;
    input.value = ''; input.style.height = 'auto';
    sendBtn.disabled = true;
    msgCount++;

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

        // Sync lead data every 3 exchanges
        if (msgCount % 3 === 0) syncLead();
      } else {
        var err = await r.json().catch(function(){return {};});
        addMessage(err.error || 'Sorry, something went wrong. Please try again or email info@theqarp.com.', false);
      }
    } catch(e) {
      hideTyping();
      addMessage('Connection error. Please check your internet or email info@theqarp.com.', false);
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Sync lead on page unload
  window.addEventListener('beforeunload', syncLead);
})();
