(function() {
  'use strict';

  // ===== Configuration =====
  var API_URL = 'https://qarp-candidate-portal.onrender.com/api/chatbot';
  var BRAND = {
    navy: '#0B1120',
    teal: '#00B4D8',
    tealDark: '#0096B4',
    tealLight: '#E0F7FA',
    white: '#FFFFFF',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1E293B',
    gray900: '#0F172A'
  };

  var sessionId = null;
  var isOpen = false;
  var isLoading = false;

  // ===== Create Styles =====
  var style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

    #qarp-chat-widget * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    #qarp-chat-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${BRAND.teal};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(0, 180, 216, 0.35), 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
      z-index: 999998;
      outline: none;
    }

    #qarp-chat-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(0, 180, 216, 0.45), 0 4px 12px rgba(0,0,0,0.15);
    }

    #qarp-chat-bubble:active {
      transform: scale(0.95);
    }

    #qarp-chat-bubble svg {
      width: 28px;
      height: 28px;
      fill: ${BRAND.white};
      transition: transform 0.3s ease;
    }

    #qarp-chat-bubble.open svg.chat-icon { display: none; }
    #qarp-chat-bubble.open svg.close-icon { display: block; }
    #qarp-chat-bubble:not(.open) svg.chat-icon { display: block; }
    #qarp-chat-bubble:not(.open) svg.close-icon { display: none; }

    #qarp-chat-popup {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 560px;
      max-height: calc(100vh - 140px);
      background: ${BRAND.white};
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(11, 17, 32, 0.18), 0 4px 16px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    #qarp-chat-popup.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    .qarp-chat-header {
      background: linear-gradient(135deg, ${BRAND.navy} 0%, #162032 100%);
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .qarp-chat-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: ${BRAND.teal};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .qarp-chat-header-avatar svg {
      width: 22px;
      height: 22px;
      fill: ${BRAND.white};
    }

    .qarp-chat-header-info h3 {
      color: ${BRAND.white};
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.3;
    }

    .qarp-chat-header-info p {
      color: ${BRAND.gray400};
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 400;
      margin-top: 2px;
    }

    .qarp-chat-header-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .qarp-chat-header-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34D399;
      animation: qarp-pulse 2s ease-in-out infinite;
    }

    @keyframes qarp-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .qarp-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
      background: ${BRAND.gray50};
    }

    .qarp-chat-messages::-webkit-scrollbar {
      width: 5px;
    }

    .qarp-chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .qarp-chat-messages::-webkit-scrollbar-thumb {
      background: ${BRAND.gray200};
      border-radius: 3px;
    }

    .qarp-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 13.5px;
      line-height: 1.55;
      word-wrap: break-word;
      animation: qarp-fadeIn 0.3s ease;
    }

    @keyframes qarp-fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .qarp-msg-bot {
      align-self: flex-start;
      background: ${BRAND.white};
      color: ${BRAND.gray800};
      border: 1px solid ${BRAND.gray200};
      border-bottom-left-radius: 4px;
    }

    .qarp-msg-user {
      align-self: flex-end;
      background: ${BRAND.teal};
      color: ${BRAND.white};
      border-bottom-right-radius: 4px;
    }

    .qarp-msg-bot a {
      color: ${BRAND.teal};
      text-decoration: underline;
    }

    .qarp-msg-bot strong {
      font-weight: 600;
    }

    .qarp-typing {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: ${BRAND.white};
      border: 1px solid ${BRAND.gray200};
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      animation: qarp-fadeIn 0.2s ease;
    }

    .qarp-typing-dot {
      width: 7px;
      height: 7px;
      background: ${BRAND.gray400};
      border-radius: 50%;
      animation: qarp-bounce 1.4s ease-in-out infinite;
    }

    .qarp-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .qarp-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes qarp-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    .qarp-chat-input-area {
      padding: 12px 16px;
      border-top: 1px solid ${BRAND.gray200};
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${BRAND.white};
      flex-shrink: 0;
    }

    .qarp-chat-input {
      flex: 1;
      border: 1px solid ${BRAND.gray200};
      border-radius: 10px;
      padding: 10px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 13.5px;
      color: ${BRAND.gray800};
      background: ${BRAND.gray50};
      outline: none;
      resize: none;
      max-height: 80px;
      overflow-y: auto;
      transition: border-color 0.2s ease;
    }

    .qarp-chat-input:focus {
      border-color: ${BRAND.teal};
    }

    .qarp-chat-input::placeholder {
      color: ${BRAND.gray400};
    }

    .qarp-chat-send {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: none;
      background: ${BRAND.teal};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease, transform 0.1s ease;
      flex-shrink: 0;
      outline: none;
    }

    .qarp-chat-send:hover {
      background: ${BRAND.tealDark};
    }

    .qarp-chat-send:active {
      transform: scale(0.93);
    }

    .qarp-chat-send:disabled {
      background: ${BRAND.gray200};
      cursor: not-allowed;
    }

    .qarp-chat-send svg {
      width: 18px;
      height: 18px;
      fill: ${BRAND.white};
    }

    .qarp-chat-footer {
      padding: 6px 16px 8px;
      text-align: center;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      color: ${BRAND.gray400};
      background: ${BRAND.white};
      flex-shrink: 0;
    }

    .qarp-chat-footer a {
      color: ${BRAND.gray400};
      text-decoration: none;
    }

    .qarp-chat-footer a:hover {
      color: ${BRAND.teal};
    }

    .qarp-quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .qarp-quick-btn {
      background: ${BRAND.tealLight};
      color: ${BRAND.tealDark};
      border: 1px solid rgba(0, 180, 216, 0.2);
      border-radius: 20px;
      padding: 6px 12px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }

    .qarp-quick-btn:hover {
      background: ${BRAND.teal};
      color: ${BRAND.white};
      border-color: ${BRAND.teal};
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      #qarp-chat-popup {
        bottom: 0;
        right: 0;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        max-width: 100vw;
        border-radius: 0;
        position: fixed;
      }

      #qarp-chat-bubble {
        bottom: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
      }

      #qarp-chat-bubble.open {
        z-index: 1000000;
        bottom: auto;
        top: 14px;
        right: 14px;
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.2);
        box-shadow: none;
      }

      #qarp-chat-bubble.open svg {
        width: 20px;
        height: 20px;
      }
    }
  `;
  document.head.appendChild(style);

  // ===== Create Widget HTML =====
  var container = document.createElement('div');
  container.id = 'qarp-chat-widget';
  container.innerHTML = `
    <button id="qarp-chat-bubble" aria-label="Open chat">
      <svg class="chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
      </svg>
      <svg class="close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>

    <div id="qarp-chat-popup">
      <div class="qarp-chat-header">
        <div class="qarp-chat-header-avatar">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div class="qarp-chat-header-info">
          <h3>QARP AI Assistant</h3>
          <p class="qarp-chat-header-status">
            <span class="qarp-chat-header-status-dot"></span>
            Online \u2014 Ready to help
          </p>
        </div>
      </div>

      <div class="qarp-chat-messages" id="qarp-messages">
        <div class="qarp-msg qarp-msg-bot">
          Hello! \ud83d\udc4b I'm QARP's AI assistant. I can help you with:
          <div class="qarp-quick-actions">
            <button class="qarp-quick-btn" data-msg="Tell me about your audit services">Audit Services</button>
            <button class="qarp-quick-btn" data-msg="What courses does QARP Academy offer?">Academy Courses</button>
            <button class="qarp-quick-btn" data-msg="I'm an auditor and want to join your network">Join as Auditor</button>
            <button class="qarp-quick-btn" data-msg="I'd like to book a consultation">Book a Call</button>
          </div>
        </div>
      </div>

      <div class="qarp-chat-input-area">
        <textarea
          class="qarp-chat-input"
          id="qarp-input"
          placeholder="Type your message..."
          rows="1"
        ></textarea>
        <button class="qarp-chat-send" id="qarp-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      <div class="qarp-chat-footer">
        Powered by <a href="https://theqarp.com" target="_blank" rel="noopener">The QARP Group</a>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // ===== References =====
  var bubble = document.getElementById('qarp-chat-bubble');
  var popup = document.getElementById('qarp-chat-popup');
  var messagesEl = document.getElementById('qarp-messages');
  var input = document.getElementById('qarp-input');
  var sendBtn = document.getElementById('qarp-send');

  // ===== Toggle Chat =====
  bubble.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      popup.classList.add('visible');
      bubble.classList.add('open');
      input.focus();
    } else {
      popup.classList.remove('visible');
      bubble.classList.remove('open');
    }
  });

  // ===== Quick action buttons =====
  messagesEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.qarp-quick-btn');
    if (btn) {
      var msg = btn.getAttribute('data-msg');
      if (msg) sendMessage(msg);
    }
  });

  // ===== Send Message =====
  sendBtn.addEventListener('click', function() {
    var text = input.value.trim();
    if (text && !isLoading) sendMessage(text);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var text = input.value.trim();
      if (text && !isLoading) sendMessage(text);
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

  // ===== Core Functions =====
  function addMessage(text, isUser) {
    var div = document.createElement('div');
    div.className = 'qarp-msg ' + (isUser ? 'qarp-msg-user' : 'qarp-msg-bot');
    div.innerHTML = isUser ? escapeHtml(text) : formatMarkdown(text);
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'qarp-typing';
    div.id = 'qarp-typing-indicator';
    div.innerHTML = '<div class="qarp-typing-dot"></div><div class="qarp-typing-dot"></div><div class="qarp-typing-dot"></div>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('qarp-typing-indicator');
    if (el) el.remove();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMarkdown(text) {
    // Simple markdown: bold, italic, links, lists, line breaks
    // First, process links BEFORE escaping (to preserve URLs)
    var segments = [];
    var linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    var lastIdx = 0;
    var match;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ type: 'text', content: text.slice(lastIdx, match.index) });
      }
      segments.push({ type: 'link', label: match[1], url: match[2] });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      segments.push({ type: 'text', content: text.slice(lastIdx) });
    }

    var html = segments.map(function(seg) {
      if (seg.type === 'link') {
        return '<a href="' + escapeHtml(seg.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(seg.label) + '</a>';
      }
      var t = escapeHtml(seg.content);
      // Bold: **text**
      t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic: *text*
      t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Bare URLs
      t = t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      return t;
    }).join('');

    // Lists: * item or - item
    html = html.replace(/(?:^|<br>)\s*[\*\-]\s+(.+?)(?=<br>|$)/g, '<br>\u2022 $1');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  async function sendMessage(text) {
    if (isLoading) return;
    isLoading = true;

    // Clear input
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    // Remove quick action buttons if they exist
    var quickActions = messagesEl.querySelectorAll('.qarp-quick-actions');
    quickActions.forEach(function(el) { el.remove(); });

    // Add user message
    addMessage(text, true);

    // Show typing indicator
    showTyping();

    try {
      var response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId
        })
      });

      hideTyping();

      if (response.ok) {
        var data = await response.json();
        sessionId = data.sessionId;
        addMessage(data.reply, false);
      } else {
        var errData = await response.json().catch(function() { return {}; });
        addMessage(errData.error || 'Sorry, something went wrong. Please try again or contact us at info@theqarp.com.', false);
      }
    } catch (err) {
      hideTyping();
      addMessage('I\u2019m having trouble connecting. Please check your internet connection or contact us at info@theqarp.com.', false);
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }
})();
