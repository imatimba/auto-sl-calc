let hasAutoEnabledSL = false;
let isAutoEnablingSL = false;

const BingXStandard = {
  name: 'BingX Standard',
  onTick: async (context) => {
    const { settings } = context;
    // 1. Auto Enable SL Logic
    const autoEnableSLStandard = settings.autoEnableSLStandard !== undefined ? settings.autoEnableSLStandard : true;
    if (autoEnableSLStandard && !hasAutoEnabledSL && !isAutoEnablingSL) {
      isAutoEnablingSL = true;

      try {
        const slWrapper = Array.from(document.querySelectorAll('.futures-sl-switch-wrap'))
          .find(el => (el.textContent || '').includes('Stop Loss') || (el.textContent || '').includes('Stop'));

        if (slWrapper) {
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
        }
      } finally {
        isAutoEnablingSL = false;
      }
    }

    // 2. Auto SL Paste Logic
    const { operationMode, minPrice, maxPrice } = context;
    if (!operationMode) return;
    
    const targetSlPrice = operationMode === 'long' ? minPrice : maxPrice;
    if (targetSlPrice === null || isNaN(targetSlPrice) || targetSlPrice <= 0) return;

    const containers = Array.from(document.querySelectorAll('.futures-sl-wrap, .ti-outer-wrap'));
    const slRow = containers.find(el => (el.textContent || '').includes('Stop Loss') && el.querySelector('input.tl-input-inner'));
    
    if (!slRow) return;

    const unitEl = slRow.querySelector('.ti-suffix-unit-wrap .bx-select-item-active .r-text') || 
                   slRow.querySelector('.ti-single-unit-text');
    const unit = unitEl ? (unitEl.textContent || '').trim() : '';
    
    // We only paste if the unit is USDT
    if (unit !== 'USDT') return;

    const slInput = slRow.querySelector('input.tl-input-inner');
    if (!slInput) return;

    const currentInputValue = parseFloat(slInput.value);

    // Only update if it's empty OR out of sync with our calculated target
    if (slInput.value === '' || (currentInputValue !== targetSlPrice)) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(slInput, targetSlPrice.toString());
      } else {
        slInput.value = targetSlPrice.toString();
      }
      
      slInput.dispatchEvent(new Event('input', { bubbles: true }));
      slInput.dispatchEvent(new Event('change', { bubbles: true }));
      slInput.dispatchEvent(new Event('blur', { bubbles: true }));
      console.log(`[Auto SL Calc] Updated BingX Standard SL to ${targetSlPrice}`);
    }

    // 2. Auto Margin Paste Logic
    const autoCalcMargin = settings.autoCalcMargin !== undefined ? settings.autoCalcMargin : true;
    const { marginFlatAmount } = context;

    if (autoCalcMargin && marginFlatAmount > 0) {
      // Find the main Margin input by using the slider as a structural anchor.
      // Both the input and the slider are inside .futures-base-item-wrap.
      const slider = document.querySelector('.slider');
      const container = slider ? slider.closest('.futures-base-item-wrap') : null;
      // We specifically target .futures-base-item to avoid .futures-mb8 (which is TP/SL)
      // and .ti-outer-wrap (which might be used elsewhere).
      const inputs = container ? Array.from(container.querySelectorAll('.futures-base-item input.tl-input-inner')) : [];
      // Margin input is always the last one in this filtered list (after Trigger Price if present)
      const marginInput = inputs.length > 0 ? inputs[inputs.length - 1] : null;

      if (marginInput) {
        const currentMarginValue = parseFloat(marginInput.value);
        // Using same threshold for comparison
        if (marginInput.value === '' || Math.abs(currentMarginValue - marginFlatAmount) > 0.01) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(marginInput, marginFlatAmount.toFixed(2));
            marginInput.dispatchEvent(new Event('input', { bubbles: true }));
            marginInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`[Auto SL Calc] Updated BingX Standard Margin to ${marginFlatAmount.toFixed(2)}`);
          }
        }
      }
    }
  },
  onNavigation: () => {
    hasAutoEnabledSL = false; // Reset on tracking a new route
  },
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
      const text = el.textContent || el.innerText || '';
      const match = text.trim().match(/(\d+)x/i);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  },
  getAvailBalance: () => {
    const el = document.querySelector('.futures-balance-transfer-wrap .value.dynamic-text');
    if (el) {
      const text = el.innerText.replace('USDT', '').trim();
      return Math.floor(parseNumber(text));
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
