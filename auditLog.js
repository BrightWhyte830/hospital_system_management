const AuditPage = { current: 1, pageSize: 25, total: 0 };

async function loadAuditLog(page) {
  if (page) AuditPage.current = page;
  const tbody = document.getElementById('audit-body');
  tbody.innerHTML = `<tr><td colspan="5" class="dt-empty">Loading…</td></tr>`;
  const { entries, total } = await Api.get(`/admin/audit-log?page=${AuditPage.current}&pageSize=${AuditPage.pageSize}`);
  AuditPage.total = total;

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="dt-empty">No audit entries yet.</td></tr>`;
  } else {
    tbody.innerHTML = entries.map((e) => `
      <tr>
        <td style="white-space:nowrap">${new Date(e.created_at).toLocaleString('en-GB')}</td>
        <td>${e.user_email || 'system'}${e.user_role ? ` <span style="color:var(--tmut);font-size:.72rem">(${e.user_role})</span>` : ''}</td>
        <td><span class="sbadge sb-rev">${e.action}</span></td>
        <td>${e.entity_type ? `${e.entity_type} #${e.entity_id}` : '—'}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.details || ''}">${e.details || '—'}</td>
      </tr>`).join('');
  }

  const totalPages = Math.max(Math.ceil(AuditPage.total / AuditPage.pageSize), 1);
  document.getElementById('audit-pager-info').textContent = `Page ${AuditPage.current} of ${totalPages} (${AuditPage.total} entries)`;
}

function changeAuditPage(delta) {
  const totalPages = Math.max(Math.ceil(AuditPage.total / AuditPage.pageSize), 1);
  const next = Math.min(Math.max(AuditPage.current + delta, 1), totalPages);
  if (next !== AuditPage.current) loadAuditLog(next);
}
