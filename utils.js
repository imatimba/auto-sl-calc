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
