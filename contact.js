/** Pulls live contact numbers from admin-managed settings so a phone-number
 *  change in the console shows up here immediately, with no redeploy. */
async function loadContactSettings() {
  try {
    const { settings } = await Api.get('/contact/settings');
    const tel = (n) => (n || '').replace(/[^\d]/g, '');
    if (settings.emergency_number) {
      document.getElementById('em-line-1').textContent = settings.emergency_number;
      document.getElementById('em-line-1').href = 'tel:' + tel(settings.emergency_number);
      document.getElementById('hl-num-3').textContent = settings.emergency_number;
      document.getElementById('hl-row-3').href = 'tel:' + tel(settings.emergency_number);
    }
    if (settings.ambulance_number) {
      document.getElementById('em-line-2').textContent = settings.ambulance_number;
      document.getElementById('em-line-2').href = 'tel:' + tel(settings.ambulance_number);
    }
    if (settings.patient_helpline_1) {
      document.getElementById('hl-num-1').textContent = settings.patient_helpline_1;
      document.getElementById('hl-row-1').href = 'tel:' + tel(settings.patient_helpline_1);
    }
    if (settings.patient_helpline_2) {
      document.getElementById('hl-num-2').textContent = settings.patient_helpline_2;
      document.getElementById('hl-row-2').href = 'tel:' + tel(settings.patient_helpline_2);
    }
    if (settings.helpline_hours) {
      document.getElementById('hl-hours').textContent = '📅 ' + settings.helpline_hours;
    }
    document.getElementById('maint-banner').style.display = settings.maintenance_mode === 'on' ? 'block' : 'none';
  } catch (_) {
    // Non-critical — the hardcoded defaults in the HTML stay in place if this fails.
  }
}

async function submitContactMsg() {
  const hospitalId = document.getElementById('ct-hosp').value;
  const subject = document.getElementById('ct-subj').value;
  const message = document.getElementById('ct-msg').value.trim();
  if (!hospitalId || !subject || !message) { toast('Please fill in all required fields before sending.', true); return; }

  try {
    const { message: record } = await Api.post('/contact/messages', {
      hospitalId, subject, message,
      preferredResponse: document.getElementById('ct-resp').value || undefined,
    });
    const hospName = S.hospitals.find((h) => String(h.id) === String(hospitalId))?.name || 'the selected facility';
    showSucc('📨', 'Message Sent!',
      `Your message has been sent to <strong>${hospName}</strong> regarding "<strong>${subject}</strong>".`,
      record.reference,
      `The hospital communications team will respond within 2–3 working days via your preferred method.\n\nIf you have not heard back, call:\n📞 0544 260 591\n📞 0550 599 102`);
    ['ct-hosp', 'ct-subj', 'ct-msg'].forEach((id) => { document.getElementById(id).value = ''; });
  } catch (err) {
    toast(err.message, true);
  }
}

async function renderFAQs() {
  const w = document.getElementById('faq-wrap');
  if (!w) return;
  const { faqs } = await Api.get('/contact/faqs');
  w.innerHTML = faqs.map((f, i) => `
    <div class="faq-item">
      <button class="faq-q" onclick="togFaq(${i})">${f.q}<span class="faq-arr" id="fa${i}">▼</span></button>
      <div class="faq-a" id="fb${i}">${f.a}</div>
    </div>`).join('');
}

function togFaq(i) {
  const b = document.getElementById('fb' + i), a = document.getElementById('fa' + i);
  const open = b.style.display === 'block';
  b.style.display = open ? 'none' : 'block';
  a.style.transform = open ? 'rotate(0)' : 'rotate(180deg)';
}
