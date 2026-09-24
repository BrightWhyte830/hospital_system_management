(async function init() {
  const today = new Date().toISOString().split('T')[0];
  const apd = document.getElementById('ap-date'); if (apd) apd.min = today;
  const cpd = document.getElementById('cp-date'); if (cpd) cpd.max = today;

  renderSvcGrid();
  renderFAQs();
  loadContactSettings();

  // Load the hospital list once and populate every dropdown that needs it.
  try {
    const { hospitals } = await Api.get('/hospitals');
    S.hospitals = hospitals;
    fillHospitalSelects(['sv-hosp', 'ap-hosp', 'cp-hosp', 'ct-hosp']);
  } catch (err) {
    toast('Could not reach the GhanaHealth server. Some features may not work.', true);
  }

  // If a token is already stored (e.g. page refresh), try to resume the session.
  await restoreSession();
})();

function showAllHospitals() {
  const button = document.getElementById('all-hospitals-btn');
  const preview = document.querySelector('.hospital-preview');
  if (!button || !preview || !S.hospitals.length) {
    document.getElementById('hospitals-anchor')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const normalizeName = (name) => name.toLowerCase().replace(/,.*$/, '').replace(/\s+hospital$/, ' hospital').trim();
  const existing = new Set([...preview.querySelectorAll('strong')].map((el) => normalizeName(el.textContent)));
  const imagePool = ['korle-bu.jpg', 'komfo-anokye.jpg', 'military-hospital.jpg', 'cape-coast-hospital.jpg', 'tamale-hospital.jpg', 'fallback-clinic.jpg'];
  S.hospitals.filter((hospital) => !existing.has(normalizeName(hospital.name))).forEach((hospital, index) => {
    const image = imagePool[(index + 2) % imagePool.length];
    preview.insertAdjacentHTML('beforeend', `<div><img src="assets/portal/${image}" alt="${hospital.name}"><strong>${hospital.name}</strong><span>${hospital.region || 'Ghana'}</span><div class="hospital-tags"><b>Registered</b><b>GhanaHealth</b></div></div>`);
  });
  button.textContent = 'All registered hospitals shown';
  button.disabled = true;
  preview.classList.add('is-expanded');
}
