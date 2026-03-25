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
  getOperationMode: () => {
    const items = document.querySelectorAll('.checkbox-group .checkbox-item input[type="checkbox"]');
    if (items.length >= 2) {
      if (items[0].checked) return "long";
      if (items[1].checked) return "short";
    }
    return null;
  },

  onSLPaste: (context) => {
    const { operationMode, minPrice, maxPrice } = context;
    if (!operationMode) return;

    const targetSlPrice = operationMode === 'long' ? minPrice : maxPrice;
    if (targetSlPrice === null || isNaN(targetSlPrice) || targetSlPrice <= 0) return;

    const sltpWrappers = document.querySelectorAll('.sltp-wrapper');
    if (sltpWrappers.length < 2) return;

    const slInput = sltpWrappers[1].querySelector('input');
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
