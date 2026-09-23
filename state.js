/** In-memory client state — cleared on logout, rebuilt from the API on each load. */
const S = {
  user: null,          // current patient profile, from GET /auth/me
  hospitals: [],        // cached hospital list for dropdowns
  selSvc: '',            // service currently selected in the Request Service grid
  selSlot: '',            // time slot currently selected when booking
  ctype: '',               // complaint type currently selected
  rating: 0,                // complaint star rating
};

function showPage(pg) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + pg).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchAuthTab(t) {
  ['register', 'login'].forEach((k) => {
    document.getElementById('atab-' + k).classList.toggle('active', k === t);
    document.getElementById('apanel-' + k).classList.toggle('active', k === t);
  });
}

function showAlert(id, msg) {
  const el = document.getElementById(id);
  const ml = document.getElementById(id + '-msg');
  if (ml) ml.textContent = msg;
  el.classList.add('show');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => el.classList.remove('show'), 7000);
}
function hideAlert(id) { document.getElementById(id).classList.remove('show'); }

function toast(msg, isError) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.toggle('toast-err', !!isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4200);
}

function closeMod(id) { document.getElementById(id).classList.remove('active'); }
function openMod(id) { document.getElementById(id).classList.add('active'); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-ov').forEach((o) => {
    o.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('active'); });
  });
});

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    confirmed: ['sb-ok', 'Confirmed'], completed: ['sb-ok', 'Completed'],
    pending: ['sb-pend', 'Pending'], received: ['sb-pend', 'Received'],
    under_review: ['sb-rev', 'Under Review'], triaged: ['sb-rev', 'Triaged'], in_progress: ['sb-rev', 'In Progress'],
    cancelled: ['sb-pend', 'Cancelled'], resolved: ['sb-ok', 'Resolved'], dismissed: ['sb-pend', 'Dismissed'],
    open: ['sb-pend', 'Open'], answered: ['sb-ok', 'Answered'], closed: ['sb-pend', 'Closed'],
    no_show: ['sb-pend', 'No-show'],
  };
  const [cls, label] = map[status] || ['sb-pend', status];
  return `<span class="sbadge ${cls}">${label}</span>`;
}

/** Populate every <select id="..."> in `ids` with the cached hospital list. */
function fillHospitalSelects(ids) {
  const opts = ['<option value="">— Select facility —</option>']
    .concat(S.hospitals.map((h) => `<option value="${h.id}">${h.name}</option>`))
    .join('');
  ids.forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = opts; });
}
