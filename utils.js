// Shared utilities for exchange parsers

function parseNumber(str) {
  if (!str) return null;
  return parseFloat(str.replace(/,/g, ''));
}

/**
 * Sets an input's value using the native HTMLInputElement setter
 * to bypass framework state and dispatches events for UI sync.
 * @param {HTMLInputElement} input - The target input element.
 * @param {string} value - The value to set.
 * @param {string[]} events - Event names to dispatch (default: input, change).
 */
function setInputValue(input, value, events = ['input', 'change']) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }
  events.forEach(e => input.dispatchEvent(new Event(e, { bubbles: true })));
}

/**
 * Waits for a DOM element matching the selector to appear.
 * @param {string} selector - CSS selector to match.
 * @param {number} timeout - Max ms to wait (default: 3000).
 * @returns {Promise<Element|null>}
 */
function waitForElement(selector, timeout = 3000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

/**
 * Shows a temporary toast notification on the page.
 * @param {string} message - The message to display.
 * @param {'info'|'warning'|'error'} type - Toast type for color styling.
 * @param {number} duration - How long to show in ms (default: 3000).
 */
function showToast(message, type = 'info', duration = 3000) {
  const colors = {
    info: { bg: '#1e293b', border: '#3b82f6', text: '#93c5fd' },
    warning: { bg: '#1e293b', border: '#f59e0b', text: '#fcd34d' },
    error: { bg: '#1e293b', border: '#ef4444', text: '#fca5a5' }
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;
    font-family:'Inter',sans-serif;z-index:999999;pointer-events:none;
    background:${c.bg};border:1px solid ${c.border};color:${c.text};
    box-shadow:0 4px 12px rgba(0,0,0,0.4);
    opacity:0;transition:opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
