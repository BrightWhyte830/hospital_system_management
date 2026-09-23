const SETTINGS_DEFAULTS = {
  emergency_number: '0800-100-999',
  ambulance_number: '193',
  patient_helpline_1: '0544 260 591',
  patient_helpline_2: '0550 599 102',
  helpline_hours: 'Monday – Friday, 8:00 AM – 5:00 PM (Emergency line 24/7)',
  maintenance_mode: 'off',
};

async function loadSettings() {
  const { settings } = await Api.get('/admin/settings');
  const merged = { ...SETTINGS_DEFAULTS, ...settings };
  document.getElementById('st-emergency').value = merged.emergency_number;
  document.getElementById('st-ambulance').value = merged.ambulance_number;
  document.getElementById('st-phone1').value = merged.patient_helpline_1;
  document.getElementById('st-phone2').value = merged.patient_helpline_2;
  document.getElementById('st-hours').value = merged.helpline_hours;
  document.getElementById(merged.maintenance_mode === 'on' ? 'maint-on' : 'maint-off').checked = true;
}

async function saveSettings() {
  hideAlert('settings-alert'); hideAlert('settings-err');
  const payload = {
    emergency_number: document.getElementById('st-emergency').value.trim(),
    ambulance_number: document.getElementById('st-ambulance').value.trim(),
    patient_helpline_1: document.getElementById('st-phone1').value.trim(),
    patient_helpline_2: document.getElementById('st-phone2').value.trim(),
    helpline_hours: document.getElementById('st-hours').value.trim(),
    maintenance_mode: document.querySelector('input[name="maint"]:checked')?.value || 'off',
  };
  try {
    await Api.patch('/admin/settings', payload);
    showAlert('settings-alert', 'Settings saved. Patients will see the updated numbers immediately.');
  } catch (err) {
    showAlert('settings-err', err.message);
  }
}
