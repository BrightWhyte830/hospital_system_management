async function loadSlots(date) {
  const g = document.getElementById('ts-wrap');
  S.selSlot = '';
  const hospitalId = document.getElementById('ap-hosp').value;
  if (!date || !hospitalId) {
    g.innerHTML = '<span style="color:var(--tmut);font-size:.82rem">Select a hospital and date above to see available time slots.</span>';
    return;
  }
  g.innerHTML = '<span style="color:var(--tmut);font-size:.82rem">Loading available slots…</span>';
  try {
    const { slots } = await Api.get(`/appointments/slots?hospitalId=${encodeURIComponent(hospitalId)}&date=${encodeURIComponent(date)}`);
    g.innerHTML = slots.map((s) => (
      s.available
        ? `<div class="ts" onclick="selSlot(this,'${s.time}')">${s.time}</div>`
        : `<div class="ts taken">${s.time} (Taken)</div>`
    )).join('');
  } catch (err) {
    g.innerHTML = `<span style="color:var(--red);font-size:.82rem">${err.message}</span>`;
  }
}

function selSlot(el, time) {
  document.querySelectorAll('.ts:not(.taken)').forEach((s) => s.classList.remove('sel'));
  el.classList.add('sel'); S.selSlot = time;
}

async function submitAppt() {
  hideAlert('appt-alert');
  const svc = document.getElementById('ap-svc').value;
  const hospitalId = document.getElementById('ap-hosp').value;
  const date = document.getElementById('ap-date').value;
  const mode = document.getElementById('ap-mode').value;
  const reason = document.getElementById('ap-reason').value.trim();

  if (!svc) { showAlert('appt-alert', 'Please select a service / department.'); return; }
  if (!hospitalId) { showAlert('appt-alert', 'Please select a hospital.'); return; }
  if (!date) { showAlert('appt-alert', 'Please select a preferred date.'); return; }
  if (!mode) { showAlert('appt-alert', 'Please select an appointment mode.'); return; }
  if (!S.selSlot) { showAlert('appt-alert', 'Please select a time slot.'); return; }
  if (!reason) { showAlert('appt-alert', 'Please provide a reason for the appointment.'); return; }

  try {
    const { appointment } = await Api.post('/appointments', {
      hospitalId, service: svc, date, time: S.selSlot, mode, reason,
      doctorPref: document.getElementById('ap-doc').value.trim() || undefined,
      languagePref: document.getElementById('ap-lang').value || undefined,
    });
    const hospName = S.hospitals.find((h) => String(h.id) === String(hospitalId))?.name || 'the selected facility';
    showSucc('📅', 'Appointment Confirmed!',
      `Your <strong>${svc}</strong> appointment at ${hospName} on <strong>${fmtDate(date)}</strong> at <strong>${S.selSlot}</strong> has been booked.`,
      appointment.reference,
      `Mode: ${mode}\n\nPlease arrive 15 minutes before your slot and bring your Ghana Card and this confirmation reference.\n\nTo reschedule or cancel, use the Appointments tab, or call 0544 260 591 / 0550 599 102 at least 24 hours in advance.`);

    ['ap-svc', 'ap-hosp', 'ap-date', 'ap-mode', 'ap-reason', 'ap-doc', 'ap-lang'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('ts-wrap').innerHTML = '<span style="color:var(--tmut);font-size:.82rem">Select a hospital and date above to see available time slots.</span>';
    S.selSlot = '';
    renderAppts();
    loadSummary();
  } catch (err) {
    // 409 = someone else took the slot between load and submit; refresh the slot list
    showAlert('appt-alert', err.message);
    if (err.status === 409) loadSlots(date);
  }
}

async function renderAppts() {
  const list = document.getElementById('appt-list');
  list.innerHTML = '<p style="color:var(--tmut);font-size:.85rem">Loading your appointments…</p>';
  const { appointments } = await Api.get('/appointments');
  const upcoming = appointments.filter((a) => a.status === 'confirmed');
  if (!upcoming.length) {
    list.innerHTML = '<p style="color:var(--tmut);font-size:.85rem">You have no upcoming appointments. Book one below.</p>';
    return;
  }
  list.innerHTML = upcoming.map((a) => `
    <div class="appt-row">
      <div class="ar-ico">${SVCS.find((s) => s.n === a.service)?.i || '🏥'}</div>
      <div class="ar-info">
        <div class="ar-svc">${a.service}</div>
        <div class="ar-det">${a.hospital_name} &nbsp;·&nbsp; ${fmtDate(a.appt_date)} at ${a.appt_time} &nbsp;·&nbsp; ${a.mode}</div>
      </div>
      <span class="sbadge sb-ok" style="margin-right:8px">✓ Confirmed</span>
      <button class="ar-cancel" onclick="cancelAppt(${a.id})">Cancel</button>
    </div>`).join('');
}

async function cancelAppt(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    await Api.del(`/appointments/${id}`);
    renderAppts();
    loadSummary();
    toast('Appointment cancelled. Call 0544 260 591 if you need help rescheduling.');
  } catch (err) {
    toast(err.message, true);
  }
}
