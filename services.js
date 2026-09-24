const SVCS = [
  { n: 'Emergency Care', i: '🚑' }, { n: 'Surgery', i: '🩺' },
  { n: 'Maternal & Child Health', i: '👶' }, { n: 'Diagnostic Imaging', i: '📷' },
  { n: 'Laboratory Services', i: '🧫' }, { n: 'Pharmacy', i: '💊' },
  { n: 'Renal Dialysis', i: '🩸' }, { n: 'Cardiothoracic Surgery', i: '❤️‍🩺' },
  { n: 'ENT Services', i: '👂' }, { n: 'Dental & Oral Surgery', i: '🦷' },
  { n: 'Psychiatry', i: '🧠' }, { n: 'Physiotherapy', i: '🦵' },
  { n: 'Nutrition & Dietetics', i: '🥗' },
];

function renderSvcGrid() {
  const g = document.getElementById('svc-grid');
  if (!g) return;
  g.innerHTML = SVCS.map((s) => `
    <div class="ssc" onclick="selSvc(this,'${s.n}')">
      <div class="ssc-ico">${s.i}</div><div class="ssc-name">${s.n}</div>
    </div>`).join('');
}

function selSvc(el, name) {
  document.querySelectorAll('.ssc').forEach((c) => c.classList.remove('sel'));
  el.classList.add('sel');
  S.selSvc = name;
  const f = document.getElementById('svc-form');
  f.style.display = 'block';
  setTimeout(() => f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

async function submitSvcReq() {
  hideAlert('svc-alert');
  if (!S.selSvc) { showAlert('svc-alert', 'Please select a service from the grid above.'); return; }
  const hospitalId = document.getElementById('sv-hosp').value;
  const urgency = (document.getElementById('sv-urgency').value.match(/—\s*(.+)/) || [])[0]
    ? document.getElementById('sv-urgency').value.replace(/^[^\w]*\s*/, '').split(' —')[0]
    : document.getElementById('sv-urgency').value;
  const urgencyLevel = ['Routine', 'Semi-Urgent', 'Urgent', 'Emergency'].find((u) => document.getElementById('sv-urgency').value.includes(u));
  const symptoms = document.getElementById('sv-symptoms').value.trim();
  const emergencyContactName = document.getElementById('sv-ec-name').value.trim();
  const emergencyContactPhone = document.getElementById('sv-ec-phone').value.trim();

  if (!hospitalId) { showAlert('svc-alert', 'Please select a preferred hospital.'); return; }
  if (!urgencyLevel) { showAlert('svc-alert', 'Please select an urgency level.'); return; }
  if (!symptoms) { showAlert('svc-alert', 'Please describe your symptoms or reason for this request.'); return; }
  if (!emergencyContactName || !emergencyContactPhone) { showAlert('svc-alert', 'Please provide emergency contact details.'); return; }

  try {
    const { request } = await Api.post('/service-requests', {
      hospitalId, service: S.selSvc, urgency: urgencyLevel, symptoms,
      duration: document.getElementById('sv-duration').value.trim() || undefined,
      medications: document.getElementById('sv-meds').value.trim() || undefined,
      allergies: document.getElementById('sv-allergy').value.trim() || undefined,
      previousHosp: document.getElementById('sv-prev').value.trim() || undefined,
      emergencyContactName, emergencyContactPhone,
      emergencyContactRel: document.getElementById('sv-ec-rel').value || undefined,
      notes: document.getElementById('sv-notes').value.trim() || undefined,
    });
    const hospName = S.hospitals.find((h) => String(h.id) === String(hospitalId))?.name || 'the selected facility';
    showSucc('🏥', 'Service Request Submitted!',
      `Your request for <strong>${S.selSvc}</strong> at ${hospName} has been received.`, request.reference,
      `Priority: ${urgencyLevel}\n\nOur medical coordination team will contact you on ${S.user.phone} within the expected timeframe to confirm your appointment slot or request any additional information.\n\nFor urgent follow-up, call: 0544 260 591 or 0550 599 102.`);

    document.querySelectorAll('.ssc').forEach((c) => c.classList.remove('sel'));
    document.getElementById('svc-form').style.display = 'none';
    S.selSvc = '';
    ['sv-hosp', 'sv-urgency', 'sv-symptoms', 'sv-duration', 'sv-meds', 'sv-allergy', 'sv-prev', 'sv-ec-name', 'sv-ec-phone', 'sv-notes'].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    loadSummary();
  } catch (err) {
    showAlert('svc-alert', err.message);
  }
}
