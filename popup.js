document.addEventListener('DOMContentLoaded', () => {
  const enabledToggle = document.getElementById('enabledToggle');
  const riskPercentInput = document.getElementById('riskPercent');
  const memoryInput = document.getElementById('minutesMemory');
  const autoEnableSLStandardInput = document.getElementById('autoSLToggle');
  const autoMarketBlofinInput = document.getElementById('autoMarketBlofin');
  const saveBtn = document.getElementById('saveBtn');
  const statusMsg = document.getElementById('statusMsg');

  // Load existing settings
  chrome.storage.local.get([
    'enabled',
    'riskPercent',
    'secondsMemory',
    'autoEnableSLStandard',
    'autoMarketBlofin'
  ], (result) => {
    enabledToggle.checked = result.enabled || false;
    
    // Default to true for the auto-enable QoL feature if unset!
    autoEnableSLStandardInput.checked = result.autoEnableSLStandard !== undefined ? result.autoEnableSLStandard : true;
    // Default to true for autoMarketBlofin if unset
    autoMarketBlofinInput.checked = result.autoMarketBlofin !== undefined ? result.autoMarketBlofin : true;
    
    // Convert stored float (e.g. 0.005) to display percentage (0.5)
    if (result.riskPercent !== undefined) {
      // Use parseFloat to remove trailing zeros after toFixed if any
      riskPercentInput.value = parseFloat((result.riskPercent * 100).toFixed(4));
    }
    
    // Convert stored seconds to display minutes
    if (result.secondsMemory !== undefined) {
      memoryInput.value = Math.round(result.secondsMemory / 60);
    }
  });

  saveBtn.addEventListener('click', () => {
    const enabled = enabledToggle.checked;
    const autoEnableSLStandard = autoEnableSLStandardInput.checked;
    const autoMarketBlofin = autoMarketBlofinInput.checked;
    const riskPercentRaw = parseFloat(riskPercentInput.value);
    const minutesMemoryRaw = parseFloat(memoryInput.value);

    if (isNaN(riskPercentRaw) || isNaN(minutesMemoryRaw) || riskPercentRaw <= 0 || minutesMemoryRaw <= 0) {
      showStatus('Invalid input values', false);
      return;
    }

    const _riskPercent = riskPercentRaw / 100;
    const _secondsMemory = Math.round(minutesMemoryRaw * 60);

    chrome.storage.local.set({
      enabled: enabled,
      riskPercent: _riskPercent,
      secondsMemory: _secondsMemory,
      autoEnableSLStandard: autoEnableSLStandard,
      autoMarketBlofin: autoMarketBlofin
    }, () => {
      showStatus('Settings saved successfully', true);
    });
  });

  function showStatus(message, isSuccess) {
    statusMsg.textContent = message;
    statusMsg.className = 'status-msg show ' + (isSuccess ? 'success' : 'error');
    
    setTimeout(() => {
      statusMsg.className = 'status-msg';
    }, 2000);
  }
});
