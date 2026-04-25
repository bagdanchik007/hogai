/**
 * HogAI — js/main.js
 * App entry point. Wires together api.js + chat.js + ui.js
 */

'use strict';

import { checkHealth, streamChat } from './api.js';
import * as Chat from './chat.js';
import * as UI   from './ui.js';

const CHIPS = [
  '⚡ Explain async/await in Python',
  '🎨 Review my frontend code',
  '📝 Write a README for my project',
  '🔍 Debug this JavaScript error',
  '🚀 Best practices for FastAPI',
  '💡 Portfolio project ideas',
];

// ── Bootstrap ─────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Pass logo src from HTML to UI module
  const logoSrc = document.getElementById('logoData')?.src ?? '';
  UI.setLogoSrc(logoSrc);

  // Set logo in sidebar too
  const logoImg = document.querySelector('.logo-img');
  if (logoImg) logoImg.src = logoSrc;

  // Load history & show welcome
  Chat.loadHistory();
  UI.renderHistory(Chat.getHistory(), handleLoadChat);
  UI.showWelcome(CHIPS, handleChip);

  // Bind all events
  bindEvents();

  // Health check (non-blocking)
  checkHealth().then(({ ok, model }) => UI.setApiStatus(ok, model));
});

// ── Events ────────────────────────────────────
function bindEvents() {
  document.getElementById('sendBtn')
    .addEventListener('click', handleSend);

  document.getElementById('userInput')
    .addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

  document.getElementById('userInput')
    .addEventListener('input', e => UI.autoResize(e.target));

  document.getElementById('newChatBtn')
    .addEventListener('click', handleNewChat);

  document.getElementById('clearBtn')
    .addEventListener('click', () => { handleNewChat(); UI.showToast('Chat cleared', 'ok'); });

  document.getElementById('copyBtn')
    .addEventListener('click', handleCopy);
}

// ── Send ──────────────────────────────────────
async function handleSend() {
  if (Chat.isStreaming()) return;

  const input = document.getElementById('userInput');
  const text  = input.value.trim();
  if (!text) return;

  Chat.pushMessage('user', text);
  UI.appendMessage('user', text);
  input.value = '';
  UI.autoResize(input);

  if (Chat.getMessages().length === 1) {
    UI.setChatTitle(text.slice(0, 42) + (text.length > 42 ? '…' : ''));
  }
  UI.setMsgCount(Chat.getMessages().length);

  const { bubble, meta } = UI.appendMessage('assistant', '', true);
  Chat.setStreaming(true);
  UI.setSendLoading(true);

  let fullText = '';

  await streamChat(
    Chat.getMessages(),

    // onDelta
    delta => {
      fullText += delta;
      UI.updateBubble(bubble, fullText);
    },

    // onDone
    usage => {
      const total = (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
      UI.addTokens(total);
      meta.textContent = `${usage.output_tokens ?? 0} tokens · ${new Date().toLocaleTimeString()}`;
      Chat.pushMessage('assistant', fullText);
      Chat.saveCurrentChat(document.getElementById('chatTitle').textContent);
      UI.setMsgCount(Chat.getMessages().length);
      UI.renderHistory(Chat.getHistory(), handleLoadChat);
    },

    // onError
    errMsg => {
      bubble.innerHTML = `<span class="msg-error">⚠ ${errMsg}</span>`;
      UI.showToast(errMsg, 'err');
      Chat.popLastMessage();
    },
  );

  Chat.setStreaming(false);
  UI.setSendLoading(false);
  document.getElementById('userInput').focus();
}

// ── New chat ──────────────────────────────────
function handleNewChat() {
  if (Chat.getMessages().length > 0) {
    Chat.saveCurrentChat(document.getElementById('chatTitle').textContent);
    UI.renderHistory(Chat.getHistory(), handleLoadChat);
  }
  Chat.clearMessages();
  UI.resetTokens();
  UI.setChatTitle('New Chat');
  UI.setMsgCount(0);
  UI.showWelcome(CHIPS, handleChip);
}

// ── Load past chat ────────────────────────────
function handleLoadChat(id) {
  if (Chat.getMessages().length > 0) {
    Chat.saveCurrentChat(document.getElementById('chatTitle').textContent);
  }
  const chat = Chat.loadChatById(id);
  if (!chat) return;

  const container = document.getElementById('messages');
  const welcome   = document.getElementById('welcome');
  if (welcome) welcome.remove();
  container.innerHTML = '';

  chat.messages.forEach(m => UI.appendMessage(m.role, m.content));
  UI.setChatTitle(chat.title);
  UI.setMsgCount(chat.messages.length);

  document.querySelectorAll('.sb-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id)
  );
}

// ── Chip ──────────────────────────────────────
function handleChip(text) {
  const input = document.getElementById('userInput');
  input.value = text;
  input.focus();
  UI.autoResize(input);
}

// ── Copy ──────────────────────────────────────
function handleCopy() {
  const last = Chat.getLastAssistantMessage();
  if (!last) return UI.showToast('Nothing to copy', 'err');
  navigator.clipboard.writeText(last.content);
  UI.showToast('Copied!', 'ok');
}
