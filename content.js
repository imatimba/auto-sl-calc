const DEBUG = false;
let priceHistory = []; // Array of { price: number, timestamp: number }
let currentUrl = window.location.href;

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
  chrome.storage.local.get(['autoCalcSL', 'useAvailBalance', 'fixedBalance', 'riskPercent', 'secondsMemory', 'autoSLBingXStd', 'autoMarketBlofin', 'autoTPSLBlofin', 'autoCalcMargin'], (settings) => {

    const parser = getExchangeParser();
    if (!parser) return;

    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      priceHistory = []; // Reset history when changing pair/exchange
      if (parser.onNavigation) {
        parser.onNavigation();
      }
    }

    // Use default value if undefined (15 minutes = 900 seconds)
    const secondsMemory = settings.secondsMemory !== undefined ? settings.secondsMemory : 900;
    const autoCalcSL = settings.autoCalcSL !== undefined ? settings.autoCalcSL : true;
    const autoCalcMargin = settings.autoCalcMargin !== undefined ? settings.autoCalcMargin : true;
    const useAvailBalance = settings.useAvailBalance !== undefined ? settings.useAvailBalance : true;

    const lastPrice = parser.getLastPrice();
    const leverage = parser.getLeverage();
    const availBalance = useAvailBalance ? parser.getAvailBalance() : (settings.fixedBalance || 0);
    const riskFlatAmount = settings.riskPercent !== undefined ? settings.riskPercent * availBalance : 0.005 * availBalance;
    const operationMode = parser.getOperationMode();


    const { minPrice, maxPrice } = updatePriceHistory(lastPrice, secondsMemory);
    
    // Calculate SL percentage distance
    // Prefer the current SL price from the exchange input (supports manual SL)
    // Fall back to price history (min/max) when autoCalcSL is active
    let slDistancePercent = 0;
    const currentSLPrice = parser.getSLPrice ? parser.getSLPrice() : null;

    if (currentSLPrice && lastPrice > 0) {
      // Use the SL price currently set in the exchange input
      if (operationMode === 'long') {
        slDistancePercent = lastPrice > currentSLPrice ? ((lastPrice - currentSLPrice) / lastPrice) * 100 : 0;
      } else if (operationMode === 'short') {
        slDistancePercent = currentSLPrice > lastPrice ? ((currentSLPrice - lastPrice) / lastPrice) * 100 : 0;
      }
    } else if (autoCalcSL) {
      // Fall back to price history for auto SL calculation
      if (operationMode === 'long') {
        slDistancePercent = lastPrice > minPrice ? ((lastPrice - minPrice) / lastPrice) * 100 : 0;
      } else if (operationMode === 'short') {
        slDistancePercent = maxPrice > lastPrice ? ((maxPrice - lastPrice) / lastPrice) * 100 : 0;
      }
    }

    // Calculate required margin to hit riskFlatAmount
    let marginFlatAmount = 0;

    if (autoCalcMargin && slDistancePercent > 0 && leverage > 0) {
      marginFlatAmount = riskFlatAmount / ((slDistancePercent / 100) * leverage);
      
      // Cap at available balance
      if (marginFlatAmount > availBalance) {
        marginFlatAmount = availBalance;
      }
    }

    const context = {
      settings,
      lastPrice,
      minPrice,
      maxPrice,
      leverage,
      availBalance,
      riskFlatAmount,
      slDistancePercent,
      marginFlatAmount,
      operationMode
    };

    // Dispatch lifecycle hooks independently
    if (parser.onQoL) {
      parser.onQoL(context);
    }
    if (autoCalcSL && parser.onSLPaste) {
      parser.onSLPaste(context);
    }
    if (autoCalcMargin && parser.onMarginPaste) {
      parser.onMarginPaste(context);
    }

    if (DEBUG) {
      console.log(`=== Auto SL Calc Data (${parser.name || 'Unknown'}) ===`);
      console.log('Last Price:', lastPrice);
      console.log(`Min Price (${Math.round(secondsMemory/60)}m):`, minPrice);
      console.log(`Max Price (${Math.round(secondsMemory/60)}m):`, maxPrice);
      console.log('Leverage:', leverage);
      console.log('Available Balance:', availBalance);
      console.log('Risk Amount ($):', riskFlatAmount.toFixed(2));
      console.log('SL distance (%):', slDistancePercent.toFixed(4));
      console.log('REQUIRED MARGIN ($):', marginFlatAmount.toFixed(2));
      console.log('Operation Mode:', operationMode);
    }
  });
}

// Start main loop every 100ms
setInterval(mainLoop, 100);
