const REQUEST_STATUSES = ['pending', 'triaged', 'in_progress', 'completed', 'cancelled'];

function statusSelect(id, current, options, onChange) {
  const opts = options.map((s) => `<option value="${s}" ${s === current ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('');
  return `<select class="mini-select" onchange="${onChange}(${id}, this.value)">${opts}</select>`;
}

async function loadRequestQueue() {
  const status = document.getElementById('rf-status').value;
  const tbody = document.getElementById('req-q-body');
  tbody.innerHTML = `<tr><td colspan="7" class="dt-empty">Loading…</td></tr>`;
  const { requests } = await Api.get('/admin/service-requests' + (status ? `?status=${status}` : ''));

  if (!requests.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="dt-empty">No service requests match this filter.</td></tr>`;
    return;
  }
  tbody.innerHTML = requests.map((r) => `
    <tr>
      <td>${r.first_name} ${r.last_name}<br><span style="color:var(--tmut);font-size:.72rem">${r.patient_id}</span></td>
      <td>${r.service}</td>
      <td>${r.urgency}</td>
      <td>${r.hospital_name}</td>
      <td>${new Date(r.created_at).toLocaleDateString('en-GB')}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${statusSelect(r.id, r.status, REQUEST_STATUSES, 'updateRequestStatus')}</td>
    </tr>`).join('');
}

async function updateRequestStatus(id, status) {
  try {
    await Api.patch(`/admin/service-requests/${id}`, { status });
    toast('Service request updated.');
    loadRequestQueue();
  } catch (err) {
    toast(err.message, true);
  }
}
