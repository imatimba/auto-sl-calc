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
  chrome.storage.local.get(['enabled', 'riskPercent', 'secondsMemory', 'autoEnableSLStandard', 'autoMarketBlofin'], (settings) => {
    if (!settings.enabled) return; // Only run if extension is toggled ON

    const parser = getExchangeParser();
    if (!parser) return;

    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      if (parser.onNavigation) {
        parser.onNavigation();
      }
    }

    if (parser.onTick) {
      parser.onTick(settings);
    }

    // Use default value if undefined (10 minutes = 600 seconds)
    const secondsMemory = settings.secondsMemory !== undefined ? settings.secondsMemory : 600;

    const lastPrice = parser.getLastPrice();
    const leverage = parser.getLeverage();
    const availBalance = parser.getAvailBalance();
    const operationMode = parser.getOperationMode();

    const { minPrice, maxPrice } = updatePriceHistory(lastPrice, secondsMemory);

    console.log(`=== Auto SL Calc Data (${parser.name || 'Unknown'}) ===`);
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
