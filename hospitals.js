async function loadHospitalsList() {
  const tbody = document.getElementById('hosp-body');
  tbody.innerHTML = `<tr><td colspan="5" class="dt-empty">Loading…</td></tr>`;
  const { hospitals } = await Api.get('/admin/hospitals');

  tbody.innerHTML = hospitals.map((h) => `
    <tr>
      <td>${h.name}</td>
      <td>${h.region}</td>
      <td>${h.phone || '—'}</td>
      <td>${h.is_active ? '<span class="sbadge sb-ok">Active</span>' : '<span class="sbadge sb-pend">Inactive</span>'}</td>
      <td><div class="dt-actions">
        <button class="mini-btn${h.is_active ? ' danger' : ''}" onclick="toggleHospitalActive(${h.id}, ${h.is_active ? 'false' : 'true'})">${h.is_active ? 'Deactivate' : 'Reactivate'}</button>
      </div></td>
    </tr>`).join('');

  // Keep the create-staff modal's hospital dropdown and the appointment filter in sync
  const opts = hospitals.filter((h) => h.is_active).map((h) => `<option value="${h.id}">${h.name}</option>`).join('');
  const nsHosp = document.getElementById('ns-hosp');
  if (nsHosp) nsHosp.innerHTML = '<option value="">— No specific hospital —</option>' + opts;
}

async function createHospital() {
  const name = document.getElementById('h-name').value.trim();
  const region = document.getElementById('h-region').value.trim();
  const phone = document.getElementById('h-phone').value.trim();
  if (!name || !region) { toast('Please provide a hospital name and region.', true); return; }
  try {
    await Api.post('/admin/hospitals', { name, region, phone: phone || undefined });
    toast('Hospital added.');
    ['h-name', 'h-region', 'h-phone'].forEach((id) => { document.getElementById(id).value = ''; });
    loadHospitalsList();
  } catch (err) {
    toast(err.message, true);
  }
}

async function toggleHospitalActive(id, isActive) {
  try {
    await Api.patch(`/admin/hospitals/${id}`, { isActive });
    toast(isActive ? 'Hospital reactivated.' : 'Hospital deactivated — it will no longer appear as an option for patients.');
    loadHospitalsList();
  } catch (err) {
    toast(err.message, true);
  }
}
