/**
 * HogAI — js/ui.js
 * All DOM manipulation, rendering, and UI state.
 */

'use strict';

// ── Logo (base64 injected at build time by main.js) ──
export let LOGO_SRC = '';
export function setLogoSrc(src) { LOGO_SRC = src; }

// ── Escape HTML ──────────────────────────────────────
export function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Markdown → HTML (minimal) ────────────────────────
export function formatMessage(text) {
  // Fenced code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g,
    (_, lang, code) => `<pre><code class="lang-${lang}">${escHtml(code.trim())}</code></pre>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold / italic
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}

// ── API status badge ─────────────────────────────────
export function setApiStatus(ok, model = '') {
  const el = document.getElementById('apiStatus');
  if (!el) return;

  if (ok) {
    el.className = 'api-tag ok';
    el.innerHTML = `
      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>${model || 'Connected'}</span>`;
  } else {
    el.className = 'api-tag err';
    el.innerHTML = `
      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>API offline</span>`;
  }
}

// ── Token counter ────────────────────────────────────
let _totalTokens = 0;
export function addTokens(n) {
  _totalTokens += n;
  const el = document.getElementById('tokenCount');
  if (el) el.textContent = `${_totalTokens.toLocaleString()} tokens`;
}
export function resetTokens() {
  _totalTokens = 0;
  const el = document.getElementById('tokenCount');
  if (el) el.textContent = '0 tokens';
}

// ── Message count ────────────────────────────────────
export function setMsgCount(n) {
  const el = document.getElementById('msgCount');
  if (el) el.textContent = `${n} message${n !== 1 ? 's' : ''}`;
}

// ── Chat title ───────────────────────────────────────
export function setChatTitle(title) {
  const el = document.getElementById('chatTitle');
  if (el) el.textContent = title;
}

// ── Scroll to bottom ─────────────────────────────────
export function scrollBottom() {
  const el = document.getElementById('messages');
  if (el) el.scrollTop = el.scrollHeight;
}

// ── Append a message row ─────────────────────────────
export function appendMessage(role, content, loading = false) {
  const container = document.getElementById('messages');

  // Remove welcome screen on first message
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${role === 'assistant' ? 'ai-av' : 'user-av'}`;

  if (role === 'assistant') {
    const img = document.createElement('img');
    img.src = LOGO_SRC;
    img.alt = 'HogAI';
    img.style.cssText = 'width:24px;height:24px;object-fit:contain;border-radius:4px;';
    avatar.appendChild(img);
  } else {
    avatar.textContent = '👤';
  }

  // Body
  const body   = document.createElement('div');
  body.className = 'msg-body';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = loading
    ? `<div class="typing-dots"><span></span><span></span><span></span></div>`
    : formatMessage(content);

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = new Date().toLocaleTimeString();

  body.appendChild(bubble);
  body.appendChild(meta);

  if (role === 'assistant') {
    row.appendChild(avatar);
    row.appendChild(body);
  } else {
    row.appendChild(body);
    row.appendChild(avatar);
  }

  container.appendChild(row);
  scrollBottom();
  return { row, bubble, meta };
}

// ── Update bubble content (streaming) ───────────────
export function updateBubble(bubble, text) {
  bubble.innerHTML = formatMessage(text);
  scrollBottom();
}

// ── Show toast notification ──────────────────────────
let _toastTimer = null;
export function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Auto-resize textarea ─────────────────────────────
export function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

// ── Render sidebar history ───────────────────────────
export function renderHistory(items, onClickItem) {
  const el = document.getElementById('chatHistory');
  if (!el) return;

  el.innerHTML = items.slice(0, 12).map(chat => `
    <div class="sb-item" data-id="${chat.id}">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      ${escHtml(chat.title)}
    </div>
  `).join('');

  el.querySelectorAll('.sb-item').forEach(item => {
    item.addEventListener('click', () => onClickItem(item.dataset.id));
  });
}

// ── Show welcome screen ──────────────────────────────
export function showWelcome(chips, onChipClick) {
  const container = document.getElementById('messages');
  container.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="hog-mascot">
        <img src="${LOGO_SRC}" alt="HogAI" style="width:100px;height:100px;object-fit:contain;" />
      </div>
      <h1>YOUR AI-ASSISTANT.<span>Powered by HogAI Platform</span></h1>
      <div class="chips" id="chips">
        ${chips.map(c => `<button class="chip">${c}</button>`).join('')}
      </div>
    </div>`;

  document.getElementById('chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) onChipClick(chip.textContent.replace(/^[^\w]+/, '').trim());
  });
}

// ── Set send button loading state ────────────────────
export function setSendLoading(loading) {
  const btn   = document.getElementById('sendBtn');
  const input = document.getElementById('userInput');
  if (btn)   btn.disabled   = loading;
  if (input) input.disabled = loading;
}
