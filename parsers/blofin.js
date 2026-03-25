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

let isMonetaryBEInProgress = false;

const injectMonetaryBEButtons = () => {
  const tbody = document.querySelector('tbody[class*="UnionPositions_tbody"]');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr[id^="future-position-"]');
  rows.forEach(row => {
    if (row.querySelector('.monetary-be-btn')) return;

    const tds = row.querySelectorAll('td');
    if (tds.length < 2) return;
    const usdtTd = tds[1]; // Second td = total USDT position

    const btn = document.createElement('button');
    btn.className = 'monetary-be-btn';
    btn.textContent = 'monetary BE';
    btn.title = 'Monetary Breakeven - Set partial TP to recover SL loss';
    btn.style.cssText = 'margin-left:4px;padding:2px 6px;font-size:10px;font-weight:600;border-radius:4px;border:1px solid #10b981;color:#10b981;background:transparent;cursor:pointer;vertical-align:middle;line-height:14px;transition:all .15s ease;';

    btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = '#10b98120'; });
    btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = 'transparent'; });

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (isMonetaryBEInProgress) return;
      isMonetaryBEInProgress = true;
      btn.textContent = '...';
      try { await handleMonetaryBE(row); }
      finally { btn.textContent = 'monetary BE'; isMonetaryBEInProgress = false; }
    });

    usdtTd.appendChild(btn);
  });
};

const handleMonetaryBE = async (row) => {
  // 0. Calculate fees from the total USDT position (second td in the row)
  const tds = row.querySelectorAll('td');
  let fees = 0;
  if (tds.length >= 2) {
    const usdtText = tds[1].textContent.trim();
    const match = usdtText.match(/([\d,.]+)\s*USDT/);
    if (match) fees = parseFloat(match[1].replace(/,/g, '')) * 0.001;
  }

  // 1. Click the TP/SL icon for this position row
  const tpslIcon = row.querySelector('i[id^="future-position-tpsl-add-"]');
  if (!tpslIcon) return;
  tpslIcon.click();

  // 2. Wait for dialog
  const dialog = await waitForElement('[class*="tpsl-wrapper"]', 2000);
  if (!dialog) return;

  // 3. Detect dialog variation — wait for grid list to appear (variation 1)
  //    If it doesn't appear within 1.5s, assume variation 2 (no existing orders).
  const existingOrderItem = await waitForElement(
    '[class*="tpsl-wrapper"] li[class*="grid"]', 1500
  );

  if (existingOrderItem) {
    // --- VARIATION 1: Existing TP/SL orders ---
    // 3a. Click "Modify" — it's the LAST button inside the grid li (localization-agnostic)
    const buttons = existingOrderItem.querySelectorAll('button');
    const modifyBtn = buttons.length > 0 ? buttons[buttons.length - 1] : null;
    if (!modifyBtn) return;
    modifyBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // 3b. Read estimatedPnL from Screen 2 (Modify view)
    const estimatedPnL = readEstimatedPnL(dialog);
    if (estimatedPnL === null || isNaN(estimatedPnL)) {
      showToast('Monetary BE aborted: SL trigger price is not set for this position.', 'warning');
      const closeIcon = dialog.querySelector('svg[class*="bu-absolute"][class*="bu-cursor-pointer"]');
      if (closeIcon) closeIcon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }

    // 3c. Click the back arrow to return to Screen 1
    const backArrow = dialog.querySelector('i[class*="icon-arrow-left-s-line"]');
    if (backArrow) {
      backArrow.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // 3d. Click the "Add" button — it's the LAST button in the toolbar row
    //     The toolbar is a flex container with "Cancel all" first and "Add" last.
    const contentArea = dialog.querySelector('[class*="_content"]');
    if (contentArea) {
      const toolbar = contentArea.querySelector('.flex.items-center');
      if (toolbar) {
        const toolbarBtns = toolbar.querySelectorAll('button');
        const addBtn = toolbarBtns.length > 0 ? toolbarBtns[toolbarBtns.length - 1] : null;
        if (addBtn) {
          addBtn.click();
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    // 3e. Now on Screen 3 (Add form) — fill slider, PnL type, and paste value
    await fillTPForm(dialog, estimatedPnL, fees);

  } else {
    // --- VARIATION 2: No existing orders ---
    const estimatedPnL = readEstimatedPnL(dialog);
    if (estimatedPnL === null || isNaN(estimatedPnL)) {
      showToast('Monetary BE aborted: SL trigger price is not set for this position.', 'warning');
      const closeIcon = dialog.querySelector('svg[class*="bu-absolute"][class*="bu-cursor-pointer"]');
      if (closeIcon) closeIcon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }

    // Click "Partial Position" tab (second <li> in the tab <ul>)
    const tabList = dialog.querySelector('ul');
    if (tabList) {
      const tabs = tabList.querySelectorAll('li');
      if (tabs.length >= 2 && !tabs[1].className.includes('active')) {
        tabs[1].click();
        await new Promise(r => setTimeout(r, 500));
      }
    }

    await fillTPForm(dialog, estimatedPnL, fees);
  }
};

/**
 * Reads the SL estimated PnL from the currently visible dialog screen.
 * Returns a float (negative) or null if not found.
 */
const readEstimatedPnL = (dialog) => {
  const descParagraphs = dialog.querySelectorAll('p[class*="text-dark-label-40"]');
  if (descParagraphs.length < 2) return null;

  const slDesc = descParagraphs[descParagraphs.length - 1];
  const spans = slDesc.querySelectorAll('span');
  const pnlSpan = spans.length > 0 ? spans[spans.length - 1] : null;
  if (!pnlSpan) return null;

  const match = pnlSpan.textContent.trim().match(/([-\d,.]+)\s*USDT/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
};

/**
 * Fills the TP form: sets 50% slider, ensures PnL type, pastes abs(estimatedPnL- fees).
 */
const fillTPForm = async (dialog, estimatedPnL, fees) => {
  // 1. Set slider to 50%
  const markContainer = dialog.querySelector('#positions-amount-slider-mark-container');
  if (markContainer) {
    const marks = markContainer.querySelectorAll('[class*="mark"]');
    if (marks.length >= 3) {
      marks[2].click();
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 2. Ensure TP trigger price type is "PnL"
  const tpTypeEl = dialog.querySelector('#tpTriggerPriceType');
  if (tpTypeEl) {
    const hiddenInput = tpTypeEl.parentElement.querySelector('input[type="hidden"]');
    if (hiddenInput && hiddenInput.value !== 'pnl') {
      tpTypeEl.click();
      await new Promise(r => setTimeout(r, 300));
      const visibleDropdown = document.querySelector('div[class*="_select-container"][class*="bu-visible"]');
      if (visibleDropdown) {
        const options = visibleDropdown.querySelectorAll('li');
        for (const opt of options) {
          if ((opt.textContent || '').trim() === 'PnL (USDT)') {
            opt.click();
            await new Promise(r => setTimeout(r, 300));
            break;
          }
        }
      }
    }
  }

  // 3. Paste abs(estimatedPnL - fees) into TP PnL input
  const tpInput = dialog.querySelector('input[name="tpTriggerPriceType"][placeholder="PnL"]');
  if (tpInput) {
    const tpValue = Math.abs(estimatedPnL - fees);
    setInputValue(tpInput, tpValue.toFixed(2));
  }
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
  getSLPrice: () => {
    const slInput = document.getElementById('TPSLOrderWidget-slTriggerPrice');
    if (!slInput || slInput.value === '') return null;
    const val = parseFloat(slInput.value);
    return isNaN(val) || val <= 0 ? null : val;
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
    injectMonetaryBEButtons();

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
    const { marginFlatAmount } = context;
    if (marginFlatAmount <= 0) return;

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
