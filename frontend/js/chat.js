/**
 * HogAI — js/chat.js
 * Chat state management and localStorage history.
 */

'use strict';

const STORAGE_KEY   = 'hogai_history';
const MAX_HISTORY   = 20;

// ── In-memory state ──────────────────────────────────
let _messages   = [];   // Current conversation
let _history    = [];   // Saved past conversations
let _streaming  = false;

// ── Getters ──────────────────────────────────────────
export const getMessages  = ()  => _messages;
export const getHistory   = ()  => _history;
export const isStreaming  = ()  => _streaming;
export const setStreaming = (v) => { _streaming = v; };

// ── Messages ──────────────────────────────────────────
export function pushMessage(role, content) {
  _messages.push({ role, content });
}

export function popLastMessage() {
  return _messages.pop();
}

export function clearMessages() {
  _messages = [];
}

// ── Persistence ──────────────────────────────────────
export function loadHistory() {
  try {
    _history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    _history = [];
  }
  return _history;
}

export function saveCurrentChat(title) {
  if (_messages.length === 0) return;

  const entry = {
    id:       Date.now().toString(),
    title:    title.slice(0, 60),
    messages: [..._messages],
    ts:       Date.now(),
  };

  _history.unshift(entry);
  _history = _history.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_history));
  return entry;
}

export function loadChatById(id) {
  const chat = _history.find(c => c.id === id);
  if (!chat) return null;
  _messages = [...chat.messages];
  return chat;
}

// ── Helpers ──────────────────────────────────────────
export function getLastAssistantMessage() {
  return [..._messages].reverse().find(m => m.role === 'assistant') ?? null;
}
