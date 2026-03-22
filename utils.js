// Shared utilities for exchange parsers

function parseNumber(str) {
  if (!str) return null;
  return parseFloat(str.replace(/,/g, ''));
}
