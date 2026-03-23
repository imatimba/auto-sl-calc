let hasAutoEnabledMarket = false;
let isAutoEnablingMarket = false;
let hasAutoEnabledTPSL = false;
let isAutoEnablingTPSL = false;

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
  name: 'Blofin',
  onNavigation: () => {
    hasAutoEnabledMarket = false;
    hasAutoEnabledTPSL = false;
  },
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
    const longCb = document.getElementById('auto-sl-blofin-long');
    const shortCb = document.getElementById('auto-sl-blofin-short');
    if (longCb && longCb.checked) return 'long';
    if (shortCb && shortCb.checked) return 'short';
    return null;
  },

  onQoL: async (context) => {
    const { settings } = context;
    injectBlofinSLCheckboxes();

    // 1. Auto Market Logic
    const autoMarketBlofin = settings.autoMarketBlofin !== undefined ? settings.autoMarketBlofin : true;
    let isMarketActive = false;

    const marketLi = document.querySelector('li#market');
    if (marketLi) {
      isMarketActive = marketLi.className.includes('after:bu-bg-dark-primary');
    }

    if (autoMarketBlofin && !hasAutoEnabledMarket && !isAutoEnablingMarket) {
      isAutoEnablingMarket = true;
      try {
        if (marketLi && !isMarketActive) {
          marketLi.click();
        } else if (marketLi && isMarketActive) {
          hasAutoEnabledMarket = true;
        }
      } finally {
        isAutoEnablingMarket = false;
      }
    }

    // 2. Auto TP/SL Logic
    // If autoMarket is enabled, wait until it's finished (tab is active) before doing TP/SL
    if (autoMarketBlofin && !isMarketActive) return;

    const autoTPSLBlofin = settings.autoTPSLBlofin !== undefined ? settings.autoTPSLBlofin : true;
    if (autoTPSLBlofin && !hasAutoEnabledTPSL && !isAutoEnablingTPSL) {
      isAutoEnablingTPSL = true;
      try {
        const tpSlCheckbox = document.getElementById('bui-checkbox-TP/SL');
        if (tpSlCheckbox) {
          if (!tpSlCheckbox.checked) {
            const label = tpSlCheckbox.closest('label');
            if (label) {
              label.click();
              hasAutoEnabledTPSL = true;
            } else {
              tpSlCheckbox.click();
              hasAutoEnabledTPSL = true;
            }
          } else {
            hasAutoEnabledTPSL = true;
          }
        }
      } finally {
        isAutoEnablingTPSL = false;
      }
    }
  },

  onSLPaste: (context) => {
    const { operationMode, minPrice, maxPrice } = context;
    if (!operationMode) return;

    const targetSlPrice = operationMode === 'long' ? minPrice : maxPrice;
    if (targetSlPrice === null || isNaN(targetSlPrice) || targetSlPrice <= 0) return;

    const slInput = document.getElementById('TPSLOrderWidget-slTriggerPrice');
    if (!slInput) return;

    const currentInputValue = parseFloat(slInput.value);
    if (slInput.value === '' || (currentInputValue !== targetSlPrice)) {
      setInputValue(slInput, targetSlPrice.toString(), ['input', 'change', 'blur']);
    }
  },

  onMarginPaste: (context) => {
    const { settings, marginFlatAmount } = context;
    const autoCalcMargin = settings.autoCalcMargin !== undefined ? settings.autoCalcMargin : true;
    if (!autoCalcMargin || marginFlatAmount <= 0) return;

    const marginInputs = [
      document.getElementById('future-market-amount'),
      document.getElementById('future-limit-amount')
    ].filter(i => i !== null);

    // Blofin shows "Cost (USDT)" or "Costo (USDT)" in this stable ID
    const unitTypeEl = document.getElementById('order-unit-type');
    const unitLabel = unitTypeEl ? (unitTypeEl.textContent || '') : '';

    marginInputs.forEach(marginInput => {
      if (unitLabel.includes('Costo') || unitLabel.includes('Cost')) {
        const currentMarginValue = parseFloat(marginInput.value);
        if (marginInput.value === '' || Math.abs(currentMarginValue - marginFlatAmount) > 0.01) {
          setInputValue(marginInput, marginFlatAmount.toFixed(2));
        }
      }
    });
  }
};
