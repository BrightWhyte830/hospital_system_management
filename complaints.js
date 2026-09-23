function selCtype(el, type) {
  document.querySelectorAll('.ctype').forEach((c) => c.classList.remove('sel'));
  el.classList.add('sel'); S.ctype = type;
  document.getElementById('ctype-val').value = type;
}

function setRating(n) {
  S.rating = n;
  document.getElementById('cp-rating').value = n;
  document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('lit', i < n));
}

async function submitComplaint() {
  hideAlert('comp-alert');
  if (!S.ctype) { showAlert('comp-alert', 'Please select the nature of your complaint.'); return; }
  const hospitalId = document.getElementById('cp-hosp').value;
  const incidentDate = document.getElementById('cp-date').value;
  const description = document.getElementById('cp-desc').value.trim();
  if (!hospitalId) { showAlert('comp-alert', 'Please select the hospital involved.'); return; }
  if (!incidentDate) { showAlert('comp-alert', 'Please enter the date of the incident.'); return; }
  if (!description) { showAlert('comp-alert', 'Please provide a detailed description of the incident.'); return; }

  try {
    const { complaint } = await Api.post('/complaints', {
      hospitalId, complaintType: S.ctype, incidentDate, description,
      department: document.getElementById('cp-dept').value.trim() || undefined,
      staffInvolved: document.getElementById('cp-staff').value.trim() || undefined,
      desiredOutcome: document.getElementById('cp-res').value.trim() || undefined,
      rating: S.rating || undefined,
    });
    const hospName = S.hospitals.find((h) => String(h.id) === String(hospitalId))?.name || 'the selected facility';
    showSucc('📝', 'Complaint Submitted!',
      `Your complaint regarding <strong>"${S.ctype}"</strong> at ${hospName} has been received and logged.`,
      complaint.reference,
      `Our Patient Rights Unit will review your complaint within 48 working hours. You will be notified via SMS and email (${S.user.email}).\n\nFor urgent escalation, call:\n📞 0544 260 591\n📞 0550 599 102\n🚑 0800 100 999 (Emergency, Toll-Free)`);

    document.querySelectorAll('.ctype').forEach((c) => c.classList.remove('sel'));
    document.querySelectorAll('.star').forEach((s) => s.classList.remove('lit'));
    ['cp-desc', 'cp-res', 'cp-dept', 'cp-staff'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('cp-hosp').value = '';
    document.getElementById('cp-date').value = '';
    S.ctype = ''; S.rating = 0;
    loadSummary();
  } catch (err) {
    showAlert('comp-alert', err.message);
  }
}
