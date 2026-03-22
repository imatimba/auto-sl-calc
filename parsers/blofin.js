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
  onTick: () => {
    injectBlofinSLCheckboxes();
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
  }
};
