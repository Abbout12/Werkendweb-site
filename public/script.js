'use strict';

// ── Respecteer gebruikersvoorkeur voor minder animatie ────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Scroll reveal ─────────────────────────────────────────────────────────────
if (prefersReducedMotion) {
  // Toon alle elementen direct — geen animaties voor gebruikers die dat verkiezen
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target); // stop observing na activatie
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -28px 0px' }
  );
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
}

// ── Nav accent bij scrollen ───────────────────────────────────────────────────
const navCta = document.querySelector('.nav-cta');
if (navCta) {
  window.addEventListener(
    'scroll',
    () => {
      navCta.style.background = window.scrollY > 80 ? 'var(--accent)' : 'var(--ink)';
    },
    { passive: true }
  );
}

// ── Hamburger / mobile menu ───────────────────────────────────────────────────
const hamburger   = document.querySelector('.nav-hamburger');
const mobileMenu  = document.getElementById('mobile-menu');
const overlay     = document.querySelector('.mobile-overlay');

function openMenu() {
  mobileMenu.classList.add('open');
  overlay.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
  hamburger.setAttribute('aria-label', 'Menu sluiten');
  mobileMenu.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  mobileMenu.classList.remove('open');
  overlay.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Menu openen');
  mobileMenu.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (hamburger) {
  hamburger.addEventListener('click', () => {
    hamburger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
}

if (overlay) {
  overlay.addEventListener('click', closeMenu);
}

// Sluit menu bij klik op een link
document.querySelectorAll('.mobile-link, .mobile-cta').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

// Sluit menu bij Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});
