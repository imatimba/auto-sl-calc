let priceHistory = []; // Array of { price: number, timestamp: number }
let hasAutoEnabledSL = false;
let isAutoEnablingSL = false;
let currentUrl = window.location.href;

async function autoEnableSLStandardRoutine() {
  if (hasAutoEnabledSL || isAutoEnablingSL) return;
  isAutoEnablingSL = true;

  try {
    const slWrapper = Array.from(document.querySelectorAll('.futures-sl-switch-wrap'))
      .find(el => (el.textContent || '').includes('Stop Loss') || (el.textContent || '').includes('Stop'));

    if (!slWrapper) return;

    const switchEl = slWrapper.querySelector('.bx-switch');
    if (switchEl && !switchEl.classList.contains('bx-switch--checked')) {
      switchEl.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    const dropdownWrapper = document.querySelector('.ti-suffix-unit-wrap');
    if (dropdownWrapper) {
      const currentUnit = dropdownWrapper.querySelector('.r-text')?.textContent.trim();
      if (currentUnit !== 'USDT') {
        const usdtOption = Array.from(dropdownWrapper.querySelectorAll('li'))
          .find(li => (li.textContent || '').includes('USDT'));
        if (usdtOption) {
          usdtOption.click();
          hasAutoEnabledSL = true;
        }
      } else {
        hasAutoEnabledSL = true;
      }
    }
  } finally {
    isAutoEnablingSL = false;
  }
}


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
    // We target .btn .dynamic-text to avoid fetching the hidden fiat tooltip price which appears first in the DOM
    const el = document.querySelector('.price.din-pro.short .btn .dynamic-text') || 
               document.querySelector('.price.din-pro.long .btn .dynamic-text') || 
               document.querySelector('.price.din-pro .btn .dynamic-text'); // Fallbacks just in case
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

const injectBlofinSLCheckboxes = () => {
  if (document.getElementById('auto-sl-blofin-controls')) return;

  const buyBtn = document.querySelector('#futures_buy');
  if (!buyBtn || !buyBtn.parentElement) return;

  const container = document.createElement('div');
  container.id = 'auto-sl-blofin-controls';
  container.style.display = 'flex';
  container.style.justifyContent = 'space-between';
  container.style.marginBottom = '8px';
  container.style.fontSize = '12px';
  container.style.color = '#fff';

  const longSL = document.createElement('label');
  longSL.style.display = 'flex';
  longSL.style.alignItems = 'center';
  longSL.style.gap = '6px';
  longSL.style.cursor = 'pointer';
  longSL.innerHTML = `<input type="checkbox" id="auto-sl-blofin-long"><span style="color: #2ebd85; font-weight: 500;">Long Auto-SL</span>`;

  const shortSL = document.createElement('label');
  shortSL.style.display = 'flex';
  shortSL.style.alignItems = 'center';
  shortSL.style.gap = '6px';
  shortSL.style.cursor = 'pointer';
  shortSL.innerHTML = `<input type="checkbox" id="auto-sl-blofin-short"><span style="color: #f6465d; font-weight: 500;">Short Auto-SL</span>`;

  container.appendChild(longSL);
  container.appendChild(shortSL);

  buyBtn.parentElement.before(container);

  // Ensure mutual exclusivity
  document.getElementById('auto-sl-blofin-long').addEventListener('change', (e) => {
    if (e.target.checked) document.getElementById('auto-sl-blofin-short').checked = false;
  });
  document.getElementById('auto-sl-blofin-short').addEventListener('change', (e) => {
    if (e.target.checked) document.getElementById('auto-sl-blofin-long').checked = false;
  });
};

const Blofin = {
  getLastPrice: () => {
    const el = document.querySelector('[class*="Ticker_last-price"]');
    return el ? parseNumber(el.innerText) : null;
  },
  getLeverage: () => {
    const marginMode = document.querySelector('#margin-mode');
    if (marginMode && marginMode.nextElementSibling) {
      const span = marginMode.nextElementSibling.querySelector('span');
      if (span) {
        const match = (span.textContent || '').match(/(\d+)X/i);
        if (match) return parseInt(match[1], 10);
      }
    }
    return null;
  },
  getAvailBalance: () => {
    const transferIcon = document.querySelector('.icon-a-transferline');
    if (transferIcon && transferIcon.parentElement) {
      const balanceContainer = transferIcon.parentElement.querySelector('p');
      const valueElement = balanceContainer?.lastElementChild;
      if (valueElement) {
        const text = valueElement.textContent;
        const match = text.match(/[\d,.]+/);
        return match ? Math.floor(parseFloat(match[0].replace(/,/g, ''))) : null;
      }
    }
    return null;
  },
  getOperationMode: () => {
    injectBlofinSLCheckboxes();
    const longCb = document.getElementById('auto-sl-blofin-long');
    const shortCb = document.getElementById('auto-sl-blofin-short');
    if (longCb && longCb.checked) return 'long';
    if (shortCb && shortCb.checked) return 'short';
    return null;
  }
};

function getExchangeParser() {
  const url = window.location.href;
  if (url.includes('/perpetual/')) return BingXPerpetual;
  if (url.includes('/futures/forward/')) return BingXStandard;
  if (url.includes('blofin.com/futures')) return Blofin;
  return null;
}

function updatePriceHistory(currentPrice, secondsMemory) {
  const now = Date.now();
  const threshold = now - (secondsMemory * 1000);

  if (currentPrice !== null && !isNaN(currentPrice) && currentPrice > 0) {
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
  chrome.storage.local.get(['enabled', 'riskPercent', 'secondsMemory', 'autoEnableSLStandard'], (settings) => {
    if (!settings.enabled) return; // Only run if extension is toggled ON

    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      hasAutoEnabledSL = false; // Reset on navigation
    }

    const parser = getExchangeParser();
    if (!parser) return;

    // Use default value if undefined (10 minutes = 600 seconds)
    const secondsMemory = settings.secondsMemory !== undefined ? settings.secondsMemory : 600;

    // QoL Features
    const autoEnableSLStandard = settings.autoEnableSLStandard !== undefined ? settings.autoEnableSLStandard : true;
    if (autoEnableSLStandard && parser === BingXStandard) {
      autoEnableSLStandardRoutine(); // Non-blocking async call
    }

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
