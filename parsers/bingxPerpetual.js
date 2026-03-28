const injectBingXSLCheckboxes = () => {
  injectAutoSLCheckboxes('bingx-perp', () => {
    const buyBtn = document.querySelector('button.btn-order-blue, .btn-order-blue');
    if (!buyBtn) return null;
    
    // Safely target the main button wrapper to avoid splitting the flex layout.
    // BingX DOM structure: button -> span.btn -> span.tooltip-flex -> div.direction-btns
    const directionBtns = buyBtn.closest('.direction-btns, .op-order-btn-wrapper');
    if (directionBtns) return directionBtns;

    let parent = buyBtn.parentElement;
    // Fallback: go up 3 levels to escape the individual button tooltips
    if (parent) parent = parent.parentElement;
    if (parent) parent = parent.parentElement;
    
    return parent || buyBtn.parentElement;
  });
};

const BingXPerpetual = {
  name: 'BingX Perpetual',
  getLastPrice: () => {
    const el = document.querySelector('.newest-price-wrapper .price');
    return el ? parseNumber(el.innerText) : null;
  },
  getLeverage: () => {
    const els = document.querySelectorAll('.leverage');
    for (const el of els) {
      if (!el) continue;
      const text = el.textContent || el.innerText || '';
      const match = text.match(/(\d+)x/i);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  },
  getAvailBalance: () => {
    const el = document.querySelector('.op-asset-content .asset-value .text-tip');
    return el ? Math.floor(parseNumber(el.innerText)) : null;
  },
  getSLPrice: () => {
    let slInput = document.querySelector('input[placeholder="SL Trigger"]');
    if (!slInput) {
      const sltpWrappers = document.querySelectorAll('.sltp-wrapper');
      if (sltpWrappers.length >= 2) slInput = sltpWrappers[1].querySelector('input');
    }
    if (!slInput || slInput.value === '') return null;
    const val = parseFloat(slInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  },
  getOperationMode: () => {
    const longCb = document.getElementById('auto-sl-bingx-perp-long');
    const shortCb = document.getElementById('auto-sl-bingx-perp-short');
    if (longCb && longCb.checked) return 'long';
    if (shortCb && shortCb.checked) return 'short';
    return null;
  },

  onQoL: (context) => {
    injectBingXSLCheckboxes();
  },

  onSLPaste: (context) => {
    const { operationMode, minPrice, maxPrice } = context;
    if (!operationMode) return;

    const targetSlPrice = operationMode === 'long' ? minPrice : maxPrice;
    if (targetSlPrice === null || isNaN(targetSlPrice) || targetSlPrice <= 0) return;

    let slInput = document.querySelector('input[placeholder="SL Trigger"]');
    if (!slInput) {
      const sltpWrappers = document.querySelectorAll('.sltp-wrapper');
      if (sltpWrappers.length >= 2) slInput = sltpWrappers[1].querySelector('input');
    }
    if (!slInput) return;

    const currentInputValue = parseFloat(slInput.value);
    if (slInput.value === '' || (currentInputValue !== targetSlPrice)) {
      setInputValue(slInput, targetSlPrice.toString());
    }
  },

  onMarginPaste: (context) => {
    const { marginFlatAmount } = context;
    if (marginFlatAmount <= 0) return;

    const allInputs = Array.from(document.querySelectorAll('.ti-outer-wrap input.tl-input-inner'));
    const marginInput = allInputs.find(i =>
      !i.closest('.sltp-wrapper') &&
      (i.placeholder === 'Cost' || (i.placeholder && i.placeholder.includes('Cost')))
    );

    if (marginInput) {
      const currentMarginValue = parseFloat(marginInput.value);
      if (marginInput.value === '' || Math.abs(currentMarginValue - marginFlatAmount) > 0.01) {
        setInputValue(marginInput, marginFlatAmount.toFixed(2));
      }
    }
  }
};
