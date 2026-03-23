document.addEventListener('DOMContentLoaded', () => {
  const enabledToggle = document.getElementById('enabledToggle');
  const riskPercentInput = document.getElementById('riskPercent');
  const memoryInput = document.getElementById('minutesMemory');
  const autoEnableSLStandardInput = document.getElementById('autoSLToggle');
  const autoMarketBlofinInput = document.getElementById('autoMarketBlofin');
  const autoTPSLBlofinInput = document.getElementById('autoTPSLBlofin');
  const autoCalcMarginInput = document.getElementById('autoCalcMargin');
  const saveBtn = document.getElementById('saveBtn');
  const statusMsg = document.getElementById('statusMsg');

  let initialSettings = {};

  function updateInitialSettings() {
    initialSettings = {
      enabled: enabledToggle.checked,
      autoCalcMargin: autoCalcMarginInput.checked,
      autoEnableSLStandard: autoEnableSLStandardInput.checked,
      autoMarketBlofin: autoMarketBlofinInput.checked,
      autoTPSLBlofin: autoTPSLBlofinInput.checked,
      riskPercent: parseFloat(riskPercentInput.value) || 0,
      minutesMemory: parseFloat(memoryInput.value) || 0
    };
  }

  function checkForChanges() {
    const currentSettings = {
      enabled: enabledToggle.checked,
      autoCalcMargin: autoCalcMarginInput.checked,
      autoEnableSLStandard: autoEnableSLStandardInput.checked,
      autoMarketBlofin: autoMarketBlofinInput.checked,
      autoTPSLBlofin: autoTPSLBlofinInput.checked,
      riskPercent: parseFloat(riskPercentInput.value) || 0,
      minutesMemory: parseFloat(memoryInput.value) || 0
    };

    let hasChanges = false;
    for (const key in currentSettings) {
      if (currentSettings[key] !== initialSettings[key]) {
        hasChanges = true;
        break;
      }
    }

    if (hasChanges) {
      saveBtn.classList.add('has-changes');
    } else {
      saveBtn.classList.remove('has-changes');
    }
  }

  // Accordion Logic
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      parent.classList.toggle('active');
    });
  });

  // Custom Stepper Logic
  document.querySelectorAll('.input-wrapper').forEach(wrapper => {
    const input = wrapper.querySelector('input[type="number"]');
    const upBtn = wrapper.querySelector('.spin-up');
    const downBtn = wrapper.querySelector('.spin-down');

    if (input && upBtn && downBtn) {
      const step = parseFloat(input.getAttribute('step')) || 1;

      upBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const val = parseFloat(input.value) || 0;
        input.value = (val + step).toFixed(step < 1 ? 1 : 0);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
      });

      downBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const val = parseFloat(input.value) || 0;
        const minAttr = input.getAttribute('min');
        const min = minAttr !== null ? parseFloat(minAttr) : -Infinity;
        let newVal = val - step;
        if (newVal < min) newVal = min;
        input.value = newVal.toFixed(step < 1 ? 1 : 0);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
      });
    }
  });

  // Attach listeners to all inputs
  const inputs = [enabledToggle, riskPercentInput, memoryInput, autoEnableSLStandardInput, autoMarketBlofinInput, autoTPSLBlofinInput, autoCalcMarginInput];
  inputs.forEach(input => {
    input.addEventListener('change', checkForChanges);
    input.addEventListener('input', checkForChanges);
  });

  // Load existing settings
  chrome.storage.local.get([
    'enabled',
    'riskPercent',
    'secondsMemory',
    'autoEnableSLStandard',
    'autoMarketBlofin',
    'autoTPSLBlofin',
    'autoCalcMargin'
  ], (result) => {
    enabledToggle.checked = result.enabled || false;
    autoCalcMarginInput.checked = result.autoCalcMargin !== undefined ? result.autoCalcMargin : true;
    
    // Default to true for the auto-enable QoL feature if unset!
    autoEnableSLStandardInput.checked = result.autoEnableSLStandard !== undefined ? result.autoEnableSLStandard : true;
    // Default to true for autoMarketBlofin if unset
    autoMarketBlofinInput.checked = result.autoMarketBlofin !== undefined ? result.autoMarketBlofin : true;
    autoTPSLBlofinInput.checked = result.autoTPSLBlofin !== undefined ? result.autoTPSLBlofin : true;
    
    // Convert stored float (e.g. 0.005) to display percentage (0.5)
    if (result.riskPercent !== undefined) {
      riskPercentInput.value = parseFloat((result.riskPercent * 100).toFixed(4));
    }
    
    // Convert stored seconds to display minutes
    if (result.secondsMemory !== undefined) {
      memoryInput.value = Math.round(result.secondsMemory / 60);
    }

    // Capture initial state for comparison
    updateInitialSettings();
  });

  saveBtn.addEventListener('click', () => {
    const enabled = enabledToggle.checked;
    const autoCalcMargin = autoCalcMarginInput.checked;
    const autoEnableSLStandard = autoEnableSLStandardInput.checked;
    const autoMarketBlofin = autoMarketBlofinInput.checked;
    const autoTPSLBlofin = autoTPSLBlofinInput.checked;
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
      autoMarketBlofin: autoMarketBlofin,
      autoTPSLBlofin: autoTPSLBlofin,
      autoCalcMargin: autoCalcMargin
    }, () => {
      showStatus('Settings saved successfully', true);
      // Update initial state so icon light turns off
      updateInitialSettings();
      checkForChanges();
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
