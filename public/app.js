/* ─────────────────────────────────────────────────────────────────────────── */
/* App initialization and utility functions */
/* ─────────────────────────────────────────────────────────────────────────── */

/* Copyright year auto-update */
document.getElementById('copyright-year').textContent = new Date().getFullYear();

/* CSRF token generation and session storage */
(function () {
  function makeToken() {
    const a = new Uint8Array(32);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }
  let t = sessionStorage.getItem('csrf_token');
  if (!t) {
    t = makeToken();
    sessionStorage.setItem('csrf_token', t);
  }
  const f = document.getElementById('csrf_token');
  if (f) f.value = t;
})();

/* Cookie banner management */
function acceptCookies() {
  localStorage.setItem('cookie_consent', '1');
  document.getElementById('cookie-banner').style.display = 'none';
}

(function () {
  if (!localStorage.getItem('cookie_consent')) {
    document.getElementById('cookie-banner').style.display = 'flex';
  }
  const btn = document.getElementById('cookie-accept');
  if (btn) btn.addEventListener('click', acceptCookies);
})();

/* Contact form validation (honeypot + consent) */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    const honeypot = form.querySelector('#website_url');
    if (honeypot && honeypot.value !== '') {
      e.preventDefault();
      return;
    }
    const consent = document.getElementById('privacy_consent');
    if (consent && !consent.checked) {
      e.preventDefault();
      consent.focus();
    }
  });
})();
