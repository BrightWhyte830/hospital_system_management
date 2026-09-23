async function populateDash() {
  const p = S.user;
  const ini = (p.first_name[0] + p.last_name[0]).toUpperCase();

  document.getElementById('nav-pub').style.display = 'none';
  document.getElementById('nav-user').style.display = 'flex';
  document.getElementById('nav-ini').textContent = ini;
  document.getElementById('nav-uname').textContent = p.first_name + ' ' + p.last_name;

  document.getElementById('db-ava').textContent = ini;
  document.getElementById('db-name').textContent = p.first_name + ' ' + p.last_name;
  document.getElementById('db-details').textContent = `Email: ${p.email} · Ghana Card: ${p.ghana_card} · DOB: ${p.dob} · ${p.gender}`;
  document.getElementById('db-pid').textContent = p.patient_id;

  await Promise.all([loadSummary(), loadDbQr()]);
}

async function loadSummary() {
  const { counts, activity } = await Api.get('/patients/me/summary');
  document.getElementById('stat-a').textContent = counts.appointments;
  document.getElementById('stat-r').textContent = counts.serviceRequests;
  document.getElementById('stat-c').textContent = counts.complaints;

  const tbody = document.getElementById('hist-body');
  if (!activity.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tmut);padding:18px;font-size:.84rem">No activity yet. Start by requesting a service or booking an appointment.</td></tr>';
    return;
  }
  tbody.innerHTML = activity.map((e) => `
    <tr><td>${new Date(e.created_at).toLocaleDateString('en-GB')}</td><td>${e.type}</td>
    <td>${e.description}</td><td>${e.hospital || '—'}</td><td>${statusBadge(e.status)}</td></tr>
  `).join('');
}

async function loadDbQr() {
  const { qrCode, patientId } = await Api.get('/patients/me/qr');
  document.getElementById('db-qr-pid').textContent = patientId;
  document.getElementById('db-qr-name').textContent = S.user.first_name + ' ' + S.user.last_name;
  document.getElementById('db-qr-info').innerHTML = `Ghana Card: ${S.user.ghana_card}<br>Email: ${S.user.email}<br>Phone: ${S.user.phone} &nbsp;|&nbsp; NHIS: ${S.user.nhis || 'N/A'}`;
  document.getElementById('db-qrcode').innerHTML = `<img src="${qrCode}" alt="Patient QR code" id="db-qr-img">`;
}

function dlDbQr() {
  const img = document.getElementById('db-qr-img');
  if (!img) { toast('QR code not ready.', true); return; }
  const a = document.createElement('a');
  a.download = S.user.patient_id + '-QRCode.png'; a.href = img.src; a.click();
  toast('QR Code downloaded!');
}

function dlQr() {
  const img = document.querySelector('#qrcode img');
  if (!img) { toast('QR code not ready.', true); return; }
  const a = document.createElement('a');
  a.download = S.user.patient_id + '-QRCode.png'; a.href = img.src; a.click();
  toast('QR Code downloaded!');
}

function goToDash() { closeMod('qr-modal'); showPage('dashboard'); }

function switchDb(sec) {
  document.querySelectorAll('.db-sec').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.db-si').forEach((s) => s.classList.remove('active'));
  document.getElementById('db-' + sec).classList.add('active');
  document.getElementById('dbnav-' + sec).classList.add('active');
  if (sec === 'appointments') renderAppts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSucc(icon, title, sub, ref, detail) {
  document.getElementById('succ-ico').textContent = icon;
  document.getElementById('succ-title').textContent = title;
  document.getElementById('succ-sub').innerHTML = sub;
  document.getElementById('succ-ref').textContent = 'Reference: ' + ref;
  document.getElementById('succ-detail').textContent = detail;
  openMod('succ-modal');
}
