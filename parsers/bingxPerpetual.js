const BingXPerpetual = {
  name: 'BingX Perpetual',
  getLastPrice: () => {
    const el = document.querySelector('.newest-price-wrapper .price');
    return el ? parseNumber(el.innerText) : null;
  },
  getLeverage: () => {
    // querySelectorAll is more robust if DOM structure changes slightly
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
    return el ? Math.floor(parseNumber(el.innerText)) : null; // Save as int
  },
  getOperationMode: () => {
    const items = document.querySelectorAll('.checkbox-group .checkbox-item input[type="checkbox"]');
    if (items.length >= 2) {
      if (items[0].checked) return "long";
      if (items[1].checked) return "short";
    }
    return null;
  },
  onTick: async (context) => {
    const { settings, operationMode, minPrice, maxPrice } = context;

    // We only Auto SL if we have a valid operation mode
    if (!operationMode) return;

    // Use minPrice for Long, maxPrice for Short
    const targetSlPrice = operationMode === 'long' ? minPrice : maxPrice;
    if (targetSlPrice === null || isNaN(targetSlPrice) || targetSlPrice <= 0) return;

    // The second row of sltp-wrapper contains the Stop Loss inputs
    const sltpWrappers = document.querySelectorAll('.sltp-wrapper');
    if (sltpWrappers.length < 2) return;
    
    // First input inside it is the Trigger Price
    const slInput = sltpWrappers[1].querySelector('input');
    if (!slInput) return;

    // Only update if it's empty OR out of sync with our calculated target
    const currentInputValue = parseFloat(slInput.value);
    
    // Formatting numbers to string just like the input would show them
    if (slInput.value === '' || (currentInputValue !== targetSlPrice)) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(slInput, targetSlPrice.toString());
        slInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`[Auto SL Calc] Updated BingX Perpetual SL to ${targetSlPrice}`);
      }
    }

    // 2. Auto Margin Paste Logic
    const autoCalcMargin = settings.autoCalcMargin !== undefined ? settings.autoCalcMargin : true;
    const { marginFlatAmount } = context;

    if (autoCalcMargin && marginFlatAmount > 0) {
      // Find the main Cost/Amount/Value input. 
      // It's usually a tl-input-inner inside a ti-outer-wrap, but NOT inside an sltp-wrapper (which are TP/SL).
      const allInputs = Array.from(document.querySelectorAll('.ti-outer-wrap input.tl-input-inner'));
      const marginInput = allInputs.find(i => 
        !i.closest('.sltp-wrapper') && // Exclude TP/SL inputs
        (i.placeholder === 'Cost' || (i.placeholder && i.placeholder.includes('Cost')))
      );

      if (marginInput) {
        const currentMarginValue = parseFloat(marginInput.value);
        // We use a small epsilon for float comparison just in case
        if (marginInput.value === '' || Math.abs(currentMarginValue - marginFlatAmount) > 0.01) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(marginInput, marginFlatAmount.toFixed(2));
            marginInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`[Auto SL Calc] Updated BingX Perpetual Margin to ${marginFlatAmount.toFixed(2)}`);
          }
        }
      }
    }
  }
};
