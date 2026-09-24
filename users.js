const UserPage = { current: 1, pageSize: 15, total: 0 };
let userSearchTimer = null;

function debouncedUserSearch() {
  clearTimeout(userSearchTimer);
  userSearchTimer = setTimeout(() => loadUsers(1), 350);
}

async function loadUsers(page) {
  if (page) UserPage.current = page;
  const search = document.getElementById('uf-search').value.trim();
  const role = document.getElementById('uf-role').value;
  const qs = new URLSearchParams({ page: UserPage.current, pageSize: UserPage.pageSize });
  if (search) qs.set('search', search);
  if (role) qs.set('role', role);

  const tbody = document.getElementById('user-body');
  tbody.innerHTML = `<tr><td colspan="9" class="dt-empty">Loading…</td></tr>`;
  const { users, total } = await Api.get('/admin/users?' + qs.toString());
  UserPage.total = total;

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="dt-empty">No accounts match this search.</td></tr>`;
  } else {
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${u.first_name} ${u.last_name}</td>
        <td><span class="sbadge ${u.role === 'admin' ? 'sb-rev' : u.role === 'staff' ? 'sb-pend' : 'sb-ok'}">${u.role}</span></td>
        <td>${u.email}</td>
        <td>${u.phone}<br><span style="color:var(--tmut);font-size:.72rem">Age: ${formatAge(null, u.dob)}</span></td>
        <td>${u.patient_id || '—'}</td>
        <td>${u.job_role ? u.job_role.replaceAll('_', ' ') : '—'}${u.department ? `<br><span style="color:var(--tmut);font-size:.72rem">${u.department}</span>` : ''}</td>
        <td>${u.is_active ? '<span class="sbadge sb-ok">Active</span>' : '<span class="sbadge sb-pend">Inactive</span>'}</td>
        <td>${new Date(u.created_at).toLocaleDateString('en-GB')}</td>
        <td><div class="dt-actions">
          <button class="mini-btn" onclick="openEditUser(${u.id})">Edit</button>
          <button class="mini-btn${u.is_active ? ' danger' : ''}" onclick="toggleUserActive(${u.id}, ${u.is_active ? 'false' : 'true'})">${u.is_active ? 'Deactivate' : 'Reactivate'}</button>
        </div></td>
      </tr>`).join('');
  }

  const totalPages = Math.max(Math.ceil(UserPage.total / UserPage.pageSize), 1);
  document.getElementById('user-pager-info').textContent = `Page ${UserPage.current} of ${totalPages} (${UserPage.total} accounts)`;
}

function changeUserPage(delta) {
  const totalPages = Math.max(Math.ceil(UserPage.total / UserPage.pageSize), 1);
  const next = Math.min(Math.max(UserPage.current + delta, 1), totalPages);
  if (next !== UserPage.current) loadUsers(next);
}

async function toggleUserActive(id, isActive) {
  if (!confirm(isActive ? 'Reactivate this account?' : 'Deactivate this account? The user will be unable to sign in.')) return;
  try {
    await Api.patch(`/admin/users/${id}/active`, { isActive });
    toast(isActive ? 'Account reactivated.' : 'Account deactivated.');
    loadUsers();
  } catch (err) {
    toast(err.message, true);
  }
}

async function createStaffAccount() {
  hideAlert('staff-alert');
  const firstName = document.getElementById('ns-fname').value.trim();
  const lastName = document.getElementById('ns-lname').value.trim();
  const email = document.getElementById('ns-email').value.trim();
  const phone = document.getElementById('ns-phone').value.trim();
  const password = document.getElementById('ns-pwd').value;
  const role = document.getElementById('ns-role').value;
  const jobRole = document.getElementById('ns-job-role').value;
  const department = document.getElementById('ns-department').value.trim();
  const homeHospitalId = document.getElementById('ns-hosp').value || undefined;

  if (!firstName || !lastName || !email || !phone || !password) {
    showAlert('staff-alert', 'Please complete every required field.'); return;
  }
  if (password.length < 8) { showAlert('staff-alert', 'Password must be at least 8 characters.'); return; }

  try {
    await Api.post('/admin/staff', { firstName, lastName, email, phone, password, role, jobRole, department, homeHospitalId });
    closeMod('staff-modal');
    toast('Staff account created.');
    ['ns-fname', 'ns-lname', 'ns-email', 'ns-phone', 'ns-pwd', 'ns-department'].forEach((id) => { document.getElementById(id).value = ''; });
    loadUsers();
    loadDashboard();
  } catch (err) {
    showAlert('staff-alert', err.message);
  }
}

async function openEditUser(id) {
  try {
    const { user } = await Api.get(`/admin/users/${id}`);
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-fname').value = user.first_name;
    document.getElementById('edit-lname').value = user.last_name;
    document.getElementById('edit-phone').value = user.phone;
    document.getElementById('edit-job-role').value = user.job_role || '';
    document.getElementById('edit-department').value = user.department || '';
    fillHospitalSelects(['edit-hosp']);
    document.getElementById('edit-hosp').value = user.home_hospital_id || '';
    openMod('edit-user-modal');
  } catch (err) { toast(err.message, true); }
}

async function saveUserProfile() {
  const id = document.getElementById('edit-user-id').value;
  try {
    await Api.patch(`/admin/users/${id}/profile`, {
      firstName: document.getElementById('edit-fname').value.trim(),
      lastName: document.getElementById('edit-lname').value.trim(),
      phone: document.getElementById('edit-phone').value.trim(),
      jobRole: document.getElementById('edit-job-role').value || null,
      department: document.getElementById('edit-department').value.trim() || null,
      homeHospitalId: document.getElementById('edit-hosp').value || null,
    });
    closeMod('edit-user-modal');
    toast('Account profile updated.');
    loadUsers();
  } catch (err) { toast(err.message, true); }
}
