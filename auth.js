function fmtGhana(el) {
  let v = el.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
  if (v.length > 13) v = v.slice(0, 13) + '-' + v.slice(13, 14);
  el.value = v.slice(0, 17);
}

function chkPwd(p) {
  const el = document.getElementById('pwd-str');
  if (!p) { el.textContent = ''; return; }
  let s = 0;
  if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  const lv = ['', 'Weak', 'Fair', 'Good', 'Strong'][s] || 'Very Weak';
  const cl = ['', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60'][s] || '#e74c3c';
  el.textContent = 'Strength: ' + lv; el.style.color = cl;
}

function updProg() {
  const ids = ['r-ghana', 'r-fname', 'r-lname', 'r-dob', 'r-phone', 'r-email', 'r-pwd', 'r-cpwd'];
  const f = ids.filter((i) => document.getElementById(i).value.trim() !== '');
  document.getElementById('prog').style.width = Math.round((f.length / ids.length) * 100) + '%';
}

async function submitReg() {
  hideAlert('reg-alert');
  const req = {
    'r-ghana': 'Ghana Card Number', 'r-fname': 'First Name', 'r-lname': 'Last Name',
    'r-dob': 'Date of Birth', 'r-phone': 'Phone Number', 'r-email': 'Email Address',
    'r-pwd': 'Password', 'r-cpwd': 'Confirm Password',
  };
  for (const [id, nm] of Object.entries(req)) {
    if (!document.getElementById(id).value.trim()) {
      showAlert('reg-alert', 'Please complete: ' + nm);
      document.getElementById(id).focus(); return;
    }
  }
  if (!document.querySelector('input[name="gender"]:checked')) {
    showAlert('reg-alert', 'Please select your gender.'); return;
  }
  const pwd = document.getElementById('r-pwd').value;
  if (pwd.length < 8) { showAlert('reg-alert', 'Password must be at least 8 characters long.'); return; }
  if (pwd !== document.getElementById('r-cpwd').value) { showAlert('reg-alert', 'Passwords do not match.'); return; }
  if (!document.getElementById('consent').checked) { showAlert('reg-alert', 'Please accept the consent agreement to continue.'); return; }

  const btn = document.querySelector('#apanel-register .sbtn');
  btn.disabled = true; btn.textContent = '⏳ Processing your registration…';

  try {
    const { token, user } = await Api.post('/auth/register', {
      email: document.getElementById('r-email').value.trim(),
      password: pwd,
      firstName: document.getElementById('r-fname').value.trim(),
      lastName: document.getElementById('r-lname').value.trim(),
      phone: document.getElementById('r-phone').value.trim(),
      ghanaCard: document.getElementById('r-ghana').value.trim(),
      birthCert: document.getElementById('r-bcert').value.trim() || undefined,
      nationalId: document.getElementById('r-nid').value.trim() || undefined,
      nhis: document.getElementById('r-nhis').value.trim() || undefined,
      dob: document.getElementById('r-dob').value,
      gender: document.querySelector('input[name="gender"]:checked').value,
      address: document.getElementById('r-address').value.trim() || undefined,
    });
    Api.setToken(token);
    S.user = user;
    await openQrModal();
    toast('Welcome, ' + user.first_name + '! Registration complete.');
  } catch (err) {
    showAlert('reg-alert', err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = '✅ Complete Registration &amp; Generate QR Code';
  }
}

async function openQrModal() {
  const { qrCode, patientId } = await Api.get('/patients/me/qr');
  document.getElementById('m-pid').textContent = patientId;
  document.getElementById('m-name').textContent = S.user.first_name + ' ' + S.user.last_name;
  document.getElementById('m-info').innerHTML =
    `Ghana Card: ${S.user.ghana_card}<br>Phone: ${S.user.phone}<br>Email: ${S.user.email}<br>` +
    `Registered: ${new Date(S.user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  document.getElementById('qrcode').innerHTML = `<img src="${qrCode}" alt="Patient QR code">`;
  openMod('qr-modal');
}

async function submitLogin() {
  hideAlert('log-alert'); hideAlert('log-ok');
  const email = document.getElementById('l-email').value.trim();
  const pwd = document.getElementById('l-pwd').value;
  if (!email) { showAlert('log-alert', 'Please enter your registered email address.'); return; }
  if (!pwd) { showAlert('log-alert', 'Please enter your password.'); return; }

  const btn = document.querySelector('#apanel-login .sbtn');
  btn.disabled = true; btn.textContent = '⏳ Verifying credentials…';

  try {
    const { token, user } = await Api.post('/auth/login', { email, password: pwd });
    Api.setToken(token);
    S.user = user;
    document.getElementById('log-ok-msg').textContent = 'Sign in successful! Loading your dashboard…';
    document.getElementById('log-ok').classList.add('show');
    toast('Signed in as ' + email);
    setTimeout(async () => { await populateDash(); showPage('dashboard'); }, 500);
  } catch (err) {
    showAlert('log-alert', err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = '🔐 Sign In to Patient Portal';
  }
}

function ssoLogin(m) { toast(m + ' single sign-on is not enabled in this environment.'); }
function forgotPwd(e) { e.preventDefault(); toast('If that email is registered, a reset link has been sent.'); }

function logout() {
  Api.clearToken();
  S.user = null;
  document.getElementById('nav-pub').style.display = 'flex';
  document.getElementById('nav-user').style.display = 'none';
  showPage('landing');
  toast('You have been signed out.');
}

/** Called on page load if a token is already stored, to restore the session. */
async function restoreSession() {
  if (!Api.getToken()) return false;
  try {
    const { user } = await Api.get('/auth/me');
    S.user = user;
    await populateDash();
    showPage('dashboard');
    return true;
  } catch (_) {
    Api.clearToken();
    return false;
  }
}
