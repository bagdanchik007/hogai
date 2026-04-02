/* ═══════════════════════════════════════════════
   HogAI — app.js
   All application logic: API calls, chat state,
   DOM manipulation, streaming, history
════════════════════════════════════════════════ */

'use strict';

/* ── Config ─────────────────────────────────── */
const API_BASE = 'http://localhost:8000'; // Change to your deployed URL

const SYSTEM_PROMPT =
  'You are HogAI, a helpful and smart AI assistant. ' +
  'Format code with triple backtick markdown code blocks. ' +
  'Be concise, clear, and friendly.';

const SUGGESTION_CHIPS = [
  '⚡ Explain async/await in Python',
  '🎨 Review my frontend code',
  '📝 Write a README for my project',
  '🔍 Debug this JavaScript error',
  '🚀 Best practices for FastAPI',
  '💡 Portfolio project ideas',
];

/* ── State ───────────────────────────────────── */
let messages    = [];
let totalTokens = 0;
let isStreaming  = false;
let chatHistory  = JSON.parse(localStorage.getItem('hogai_history') || '[]');

/* ── DOM refs ────────────────────────────────── */
const messagesEl  = document.getElementById('messages');
const userInput   = document.getElementById('userInput');
const sendBtn     = document.getElementById('sendBtn');
const chatTitleEl = document.getElementById('chatTitle');
const msgCountEl  = document.getElementById('msgCount');
const tokenCountEl= document.getElementById('tokenCount');
const historyEl   = document.getElementById('chatHistory');
const apiStatusEl = document.getElementById('apiStatus');
const toastEl     = document.getElementById('toast');

/* ═══════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  checkApiHealth();
  bindEvents();
  userInput.focus();
});

function bindEvents() {
  sendBtn.addEventListener('click', sendMessage);
  document.getElementById('newChatBtn').addEventListener('click', newChat);
  document.getElementById('clearBtn').addEventListener('click', clearChat);
  document.getElementById('copyBtn').addEventListener('click', copyLast);

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  userInput.addEventListener('input', () => autoResize(userInput));

  // Suggestion chips
  document.getElementById('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const text = chip.textContent.replace(/^[^\w]+/, '').trim();
    userInput.value = text;
    userInput.focus();
  });
}

/* ═══════════════════════════════════════════════
   API HEALTH CHECK
════════════════════════════════════════════════ */
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      apiStatusEl.className = 'api-tag ok';
      apiStatusEl.innerHTML = `
        <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>API connected</span>`;
    } else {
      throw new Error('not ok');
    }
  } catch {
    apiStatusEl.className = 'api-tag err';
    apiStatusEl.innerHTML = `
      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>API offline</span>`;
  }
}

/* ═══════════════════════════════════════════════
   SEND MESSAGE
════════════════════════════════════════════════ */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isStreaming) return;

  // Remove welcome screen on first message
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  // Add user message to state & DOM
  messages.push({ role: 'user', content: text });
  appendMessage('user', text);
  userInput.value = '';
  autoResize(userInput);

  // Update chat title on first message
  if (messages.length === 1) {
    chatTitleEl.textContent = text.slice(0, 42) + (text.length > 42 ? '…' : '');
  }
  updateMsgCount();

  // Show AI typing bubble
  const aiRow   = appendMessage('assistant', '', true);
  const bubble  = aiRow.querySelector('.msg-bubble');

  isStreaming = true;
  sendBtn.disabled = true;

  let fullResponse = '';

  try {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        system: SYSTEM_PROMPT,
      }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    bubble.innerHTML = '';

    // Read SSE stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));

          if (data.error) throw new Error(data.error);

          if (data.delta) {
            fullResponse += data.delta;
            bubble.innerHTML = formatMessage(fullResponse);
            scrollBottom();
          }

          if (data.done && data.usage) {
            totalTokens += data.usage.input_tokens + data.usage.output_tokens;
            tokenCountEl.textContent = `${totalTokens.toLocaleString()} tokens`;

            const meta = aiRow.querySelector('.msg-meta');
            if (meta) {
              meta.textContent =
                `${data.usage.output_tokens} tokens · ${new Date().toLocaleTimeString()}`;
            }
          }
        } catch (e) {
          // Ignore JSON parse errors from partial chunks
          if (!e.message?.includes('JSON')) throw e;
        }
      }
    }

    messages.push({ role: 'assistant', content: fullResponse });
    saveChatHistory();
    updateMsgCount();

  } catch (err) {
    bubble.innerHTML =
      `<span style="color:#ff6060">⚠ ${err.message || 'Failed to connect. Is the backend running?'}</span>`;
    showToast(err.message || 'API error', 'err');
    messages.pop(); // Remove failed user message from state
  } finally {
    isStreaming       = false;
    sendBtn.disabled  = false;
    userInput.focus();
  }
}

/* ═══════════════════════════════════════════════
   DOM — APPEND MESSAGE
════════════════════════════════════════════════ */
function appendMessage(role, content, loading = false) {
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${role === 'assistant' ? 'ai-av' : 'user-av'}`;

  if (role === 'assistant') {
    // Mini pig SVG avatar
    avatar.innerHTML = `
      <svg viewBox="0 0 48 48" width="18" height="18" fill="none">
        <ellipse cx="24" cy="20" rx="14" ry="12" fill="rgba(255,255,255,0.25)"/>
        <circle cx="19" cy="19" r="3"   fill="white" opacity="0.9"/>
        <circle cx="29" cy="19" r="3"   fill="white" opacity="0.9"/>
        <circle cx="19" cy="19" r="1.7" fill="#00aaff"/>
        <circle cx="29" cy="19" r="1.7" fill="#00aaff"/>
        <ellipse cx="24" cy="25" rx="4.5" ry="3" fill="rgba(255,255,255,0.18)"/>
      </svg>`;
  } else {
    avatar.textContent = '👤';
  }

  // Message body
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

  messagesEl.appendChild(row);
  scrollBottom();
  return row;
}

/* ═══════════════════════════════════════════════
   MESSAGE FORMATTING (basic markdown)
════════════════════════════════════════════════ */
function formatMessage(text) {
  // Fenced code blocks  ```lang\n...\n```
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ═══════════════════════════════════════════════
   CHAT HISTORY (localStorage)
════════════════════════════════════════════════ */
function saveChatHistory() {
  const entry = {
    id:       Date.now().toString(),
    title:    chatTitleEl.textContent,
    messages: [...messages],
    ts:       Date.now(),
  };
  chatHistory.unshift(entry);
  chatHistory = chatHistory.slice(0, 20); // Keep last 20 chats
  localStorage.setItem('hogai_history', JSON.stringify(chatHistory));
  renderHistory();
}

function renderHistory() {
  historyEl.innerHTML = chatHistory.slice(0, 12).map((chat) => `
    <div class="sb-item" data-id="${chat.id}">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      ${escapeHtml(chat.title)}
    </div>
  `).join('');

  // Bind click events for history items
  historyEl.querySelectorAll('.sb-item').forEach((el) => {
    el.addEventListener('click', () => loadChat(el.dataset.id));
  });
}

function loadChat(id) {
  const chat = chatHistory.find((c) => c.id === id);
  if (!chat) return;

  messages = [...chat.messages];

  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  messagesEl.innerHTML = '';
  messages.forEach((m) => appendMessage(m.role, m.content));

  chatTitleEl.textContent = chat.title;
  updateMsgCount();

  // Mark active
  historyEl.querySelectorAll('.sb-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

/* ═══════════════════════════════════════════════
   CHAT ACTIONS
════════════════════════════════════════════════ */
function newChat() {
  if (messages.length > 0) saveChatHistory();

  messages     = [];
  totalTokens  = 0;

  // Re-render welcome screen
  messagesEl.innerHTML = buildWelcomeHTML();

  // Re-bind chips inside new welcome
  messagesEl.querySelector('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const text = chip.textContent.replace(/^[^\w]+/, '').trim();
    userInput.value = text;
    userInput.focus();
  });

  chatTitleEl.textContent  = 'New Chat';
  tokenCountEl.textContent = '0 tokens';
  updateMsgCount();
  userInput.focus();

  // Clear active state in history
  historyEl.querySelectorAll('.sb-item').forEach((el) => el.classList.remove('active'));
}

function clearChat() {
  newChat();
  showToast('Chat cleared', 'ok');
}

function copyLast() {
  const last = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!last) return showToast('Nothing to copy', 'err');
  navigator.clipboard.writeText(last.content);
  showToast('Copied!', 'ok');
}

function updateMsgCount() {
  const n = messages.length;
  msgCountEl.textContent = `${n} message${n !== 1 ? 's' : ''}`;
}

/* ═══════════════════════════════════════════════
   WELCOME HTML builder
════════════════════════════════════════════════ */
function buildWelcomeHTML() {
  const chipsHtml = SUGGESTION_CHIPS
    .map((c) => `<button class="chip">${c}</button>`)
    .join('');

  return `
    <div class="welcome" id="welcome">
      <div class="hog-mascot">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="24" cy="27" rx="16" ry="14" fill="rgba(255,255,255,0.12)"/>
          <ellipse cx="24" cy="20" rx="14" ry="12" fill="rgba(255,255,255,0.18)"/>
          <ellipse cx="13" cy="12" rx="5" ry="6" fill="rgba(255,255,255,0.18)" transform="rotate(-15 13 12)"/>
          <ellipse cx="35" cy="12" rx="5" ry="6" fill="rgba(255,255,255,0.18)" transform="rotate(15 35 12)"/>
          <ellipse cx="13" cy="12" rx="3" ry="4" fill="rgba(0,200,255,0.5)" transform="rotate(-15 13 12)"/>
          <ellipse cx="35" cy="12" rx="3" ry="4" fill="rgba(0,200,255,0.5)" transform="rotate(15 35 12)"/>
          <circle cx="19" cy="19" r="3.5" fill="white" opacity="0.95"/>
          <circle cx="29" cy="19" r="3.5" fill="white" opacity="0.95"/>
          <circle cx="19" cy="19" r="2.2" fill="#00aaff"/>
          <circle cx="29" cy="19" r="2.2" fill="#00aaff"/>
          <circle cx="19.9" cy="18.1" r="0.8" fill="white"/>
          <circle cx="29.9" cy="18.1" r="0.8" fill="white"/>
          <ellipse cx="24" cy="25" rx="5.5" ry="4" fill="rgba(255,255,255,0.15)"/>
          <circle cx="22" cy="25.5" r="1.3" fill="rgba(0,0,0,0.45)"/>
          <circle cx="26" cy="25.5" r="1.3" fill="rgba(0,0,0,0.45)"/>
          <line x1="33" y1="19" x2="39" y2="15" stroke="rgba(0,220,255,0.8)" stroke-width="1"/>
          <circle cx="39.5" cy="14.5" r="1.5" fill="rgba(0,220,255,0.9)"/>
          <line x1="15" y1="19" x2="9" y2="15" stroke="rgba(0,220,255,0.8)" stroke-width="1"/>
          <circle cx="8.5" cy="14.5" r="1.5" fill="rgba(0,220,255,0.9)"/>
          <line x1="24" y1="8" x2="24" y2="4" stroke="rgba(0,220,255,0.6)" stroke-width="1"/>
          <circle cx="24" cy="3.5" r="1.2" fill="rgba(0,220,255,0.8)"/>
          <path d="M20 28 Q24 31.5 28 28" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <h1>YOUR AI-ASSISTANT.<span>Powered by HogAI Platform</span></h1>
      <div class="chips" id="chips">${chipsHtml}</div>
    </div>`;
}

/* ═══════════════════════════════════════════════
   UTILS
════════════════════════════════════════════════ */
function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function showToast(msg, type = '') {
  toastEl.textContent = msg;
  toastEl.className   = `toast ${type} show`;
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

