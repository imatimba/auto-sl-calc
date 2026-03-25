let hasAutoEnabledSL = false;
let isAutoEnablingSL = false;

const BingXStandard = {
  name: 'BingX Standard',
  onNavigation: () => {
    hasAutoEnabledSL = false;
  },
  getLastPrice: () => {
    const el = document.querySelector('.price.din-pro.short .btn .dynamic-text') ||
               document.querySelector('.price.din-pro.long .btn .dynamic-text') ||
               document.querySelector('.price.din-pro .btn .dynamic-text');
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
    let slSwitchWrap = wraps.length > 1 ? wraps[1] : wraps[0];

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
  },

  onQoL: async (context) => {
    const { settings } = context;
    const autoSLBingXStd = settings.autoSLBingXStd !== undefined ? settings.autoSLBingXStd : true;

    if (autoSLBingXStd && !hasAutoEnabledSL && !isAutoEnablingSL) {
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
  },

  onSLPaste: (context) => {
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
    if (unit !== 'USDT') return;

    const slInput = slRow.querySelector('input.tl-input-inner');
    if (!slInput) return;

    const currentInputValue = parseFloat(slInput.value);
    if (slInput.value === '' || (currentInputValue !== targetSlPrice)) {
      setInputValue(slInput, targetSlPrice.toString(), ['input', 'change', 'blur']);
    }
  },

  onMarginPaste: (context) => {
    const { marginFlatAmount } = context;
    if (marginFlatAmount <= 0) return;

    const slider = document.querySelector('.slider');
    const container = slider ? slider.closest('.futures-base-item-wrap') : null;
    const inputs = container ? Array.from(container.querySelectorAll('.futures-base-item input.tl-input-inner')) : [];
    const marginInput = inputs.length > 0 ? inputs[inputs.length - 1] : null;

    if (marginInput) {
      const currentMarginValue = parseFloat(marginInput.value);
      if (marginInput.value === '' || Math.abs(currentMarginValue - marginFlatAmount) > 0.01) {
        setInputValue(marginInput, marginFlatAmount.toFixed(2));
      }
    }
  }
};
