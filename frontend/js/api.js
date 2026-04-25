/**
 * HogAI — js/api.js
 * All communication with the FastAPI backend.
 */

'use strict';

const API_BASE = 'http://localhost:8000'; // Change to Render URL in production

/**
 * Check if the backend is alive.
 * @returns {Promise<{ok: boolean, model: string}>}
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, model: '' };
    const data = await res.json();
    return { ok: data.groq_connected, model: data.model };
  } catch {
    return { ok: false, model: '' };
  }
}

/**
 * Stream a chat response via SSE.
 * @param {Array} messages  - [{role, content}]
 * @param {function} onDelta  - called with each text chunk
 * @param {function} onDone   - called with final usage stats
 * @param {function} onError  - called on error
 */
export async function streamChat(messages, onDelta, onDone, onError) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.delta) onDelta(data.delta);
          if (data.done)  onDone(data.usage ?? {});
        } catch (e) {
          if (!e.message?.includes('JSON')) throw e;
        }
      }
    }
  } catch (err) {
    onError(err.message || 'Connection failed');
  }
}
