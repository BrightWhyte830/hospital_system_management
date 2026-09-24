const MESSAGE_STATUSES = ['open', 'answered', 'closed'];

async function loadMessageQueue() {
  const status = document.getElementById('mf-status').value;
  const tbody = document.getElementById('msg-q-body');
  tbody.innerHTML = `<tr><td colspan="6" class="dt-empty">Loading…</td></tr>`;
  const { messages } = await Api.get('/admin/messages' + (status ? `?status=${status}` : ''));

  if (!messages.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="dt-empty">No messages match this filter.</td></tr>`;
    return;
  }
  tbody.innerHTML = messages.map((m) => `
    <tr>
      <td>${m.first_name} ${m.last_name}<br><span style="color:var(--tmut);font-size:.72rem">${m.patient_id} · Age: ${formatAge(null, m.patient_dob)}</span></td>
      <td>${m.subject}<br><span style="color:var(--tmut);font-size:.74rem">${(m.message || '').slice(0, 60)}${m.message.length > 60 ? '…' : ''}</span></td>
      <td>${m.hospital_name}</td>
      <td>${new Date(m.created_at).toLocaleDateString('en-GB')}</td>
      <td>${statusBadge(m.status)}</td>
      <td>${statusSelect(m.id, m.status, MESSAGE_STATUSES, 'updateMessageStatus')}</td>
    </tr>`).join('');
}

async function updateMessageStatus(id, status) {
  try {
    await Api.patch(`/admin/messages/${id}`, { status });
    toast('Message updated.');
    loadMessageQueue();
  } catch (err) {
    toast(err.message, true);
  }
}
