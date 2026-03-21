let priceHistory = []; // Array of { price: number, timestamp: number }

function parseNumber(str) {
  if (!str) return null;
  return parseFloat(str.replace(/,/g, ''));
}

const BingXPerpetual = {
  getLastPrice: () => {
    const el = document.querySelector('.newest-price-wrapper .price');
    return el ? parseNumber(el.innerText) : null;
  },
  getLeverage: () => {
    // querySelectorAll is more robust if DOM structure changes slightly
    const els = document.querySelectorAll('.leverage');
    for (const el of els) {
      const text = el.textContent || el.innerText || '';
      const match = text.match(/(\d+)x/i);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  },
  getAvailBalance: () => {
    const el = document.querySelector('.op-asset-content .asset-value .text-tip');
    return el ? Math.floor(parseNumber(el.innerText)) : null; // Save as int
  },
  getOperationMode: () => {
    const items = document.querySelectorAll('.checkbox-group .checkbox-item input[type="checkbox"]');
    if (items.length >= 2) {
      if (items[0].checked) return "long";
      if (items[1].checked) return "short";
    }
    return null;
  }
};

const BingXStandard = {
  getLastPrice: () => {
    const el = document.querySelector('.price.din-pro.short .dynamic-text') || 
               document.querySelector('.price.din-pro.long .dynamic-text') || 
               document.querySelector('.price.din-pro .dynamic-text'); // Fallbacks just in case
    return el ? parseNumber(el.innerText) : null;
  },
  getLeverage: () => {
    const el = document.querySelector('.futures-order-lever-list .lever_item.active');
    if (el) {
      const match = el.innerText.trim().match(/(\d+)x/);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  },
  getAvailBalance: () => {
    const el = document.querySelector('.futures-balance-transfer-wrap .value.dynamic-text');
    if (el) {
      const text = el.innerText.replace('USDT', '').trim();
      return Math.floor(parseNumber(text)); // Save as int
    }
    return null;
  },
  getOperationMode: () => {
    const wraps = document.querySelectorAll('.futures-sl-switch-wrap');
    let slSwitchWrap = wraps.length > 1 ? wraps[1] : wraps[0]; // Fallback to 2nd if multiple
    
    for (const wrap of wraps) {
      if ((wrap.textContent || '').includes('Stop Loss') || (wrap.textContent || '').includes('Stop')) {
        slSwitchWrap = wrap;
        break;
      }
    }

    if (!slSwitchWrap) return null;

    const switchEl = slSwitchWrap.querySelector('.bx-switch');
    if (!switchEl || !switchEl.classList.contains('bx-switch--checked')) {
      return null;
    }

    if (document.querySelector('.futures-trade-tab .active-item-left')) return "long";
    if (document.querySelector('.futures-trade-tab .active-item-right')) return "short";
    
    return null;
  }
};

function getExchangeParser() {
  const url = window.location.href;
  if (url.includes('/perpetual/')) return BingXPerpetual;
  if (url.includes('/futures/forward/')) return BingXStandard;
  return null;
}

function updatePriceHistory(currentPrice, secondsMemory) {
  const now = Date.now();
  const threshold = now - (secondsMemory * 1000);

  if (currentPrice !== null && !isNaN(currentPrice)) {
    priceHistory.push({ price: currentPrice, timestamp: now });
  }

  // Filter out prices older than the configured memory window
  priceHistory = priceHistory.filter(item => item.timestamp >= threshold);

  if (priceHistory.length === 0) return { minPrice: null, maxPrice: null };

  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const item of priceHistory) {
    if (item.price < minPrice) minPrice = item.price;
    if (item.price > maxPrice) maxPrice = item.price;
  }

  return { minPrice, maxPrice };
}

function mainLoop() {
  chrome.storage.local.get(['enabled', 'riskPercent', 'secondsMemory'], (settings) => {
    if (!settings.enabled) return; // Only run if extension is toggled ON

    const parser = getExchangeParser();
    if (!parser) return;

    // Use default value if undefined (10 minutes = 600 seconds)
    const secondsMemory = settings.secondsMemory !== undefined ? settings.secondsMemory : 600;

    const lastPrice = parser.getLastPrice();
    const leverage = parser.getLeverage();
    const availBalance = parser.getAvailBalance();
    const operationMode = parser.getOperationMode();

    const { minPrice, maxPrice } = updatePriceHistory(lastPrice, secondsMemory);

    console.log('=== Auto SL Calc Data ===');
    console.log('Last Price:', lastPrice);
    console.log(`Min Price (${Math.round(secondsMemory/60)}m):`, minPrice);
    console.log(`Max Price (${Math.round(secondsMemory/60)}m):`, maxPrice);
    console.log('Leverage:', leverage);
    console.log('Available Balance (Int):', availBalance);
    console.log('Operation Mode:', operationMode);
  });
}

// Start main loop every 1000ms
setInterval(mainLoop, 1000);
