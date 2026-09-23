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
