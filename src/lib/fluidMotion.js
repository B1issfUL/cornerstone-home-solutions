import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { pointer } from './pointer.js';
import { flow } from './flow.js';

gsap.registerPlugin(ScrollTrigger);

export function mountFluidMotion({ intro = true } = {}) {
  const root = document.documentElement;
  const site = document.querySelector('.public-site');
  if (!site) return () => {};
  const mobile = window.matchMedia('(max-width: 860px)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let disposed = false;
  let frame = 0;
  let activeCard;
  let lastEvent;
  const poses = new Map();
  const context = gsap.context(() => {
    const hero = site.querySelector('.hero');
    // Interactive form controls are never hidden or translated by the opening cadence.
    if (intro && window.scrollY < innerHeight * 0.6) {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.hero-headline .reveal-word', { yPercent: 105, rotationX: -16, opacity: 0 },
          { yPercent: 0, rotationX: 0, opacity: 1, duration: 0.85, stagger: 0.045, clearProps: 'transform,opacity' })
        .fromTo('.hero .eyebrow, .hero-paragraph', { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, clearProps: 'transform,opacity' }, 0.25);
    }

    const master = gsap.timeline({ scrollTrigger: {
      trigger: site, start: 'top top', end: 'bottom bottom', scrub: 0.8,
      onUpdate: (self) => { flow.progress = self.progress; flow.velocity = Math.max(-1, Math.min(1, self.getVelocity() / 3500)); flow.updatedAt = performance.now(); },
    } });
    master.fromTo('.flow-light', { yPercent: -20, rotation: -14 }, { yPercent: 25, rotation: 14, ease: 'none' });
    gsap.fromTo('.flow-screen', { opacity: 0 }, { opacity: 0.95, ease: 'none', scrollTrigger: {
      trigger: hero, start: 'top top', end: 'bottom 15%', scrub: 0.7,
    } });
    gsap.to('.hero-headline', { y: mobile ? -12 : -58, ease: 'none', scrollTrigger: {
      trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8,
    } });
    gsap.to('.hero .stats-panel', { '--stats-y': mobile ? -12 : -70, ease: 'none', scrollTrigger: {
      trigger: hero, start: 'top top', end: 'bottom top', scrub: 1,
    } });

    site.querySelectorAll('.section').forEach((section) => {
      gsap.fromTo(section.querySelectorAll('.section-title .reveal-word'), { yPercent: 80, opacity: 0.2, rotation: 2 }, {
        yPercent: 0, opacity: 1, rotation: 0, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 90%', end: 'top 46%', scrub: 0.55 },
      });
      gsap.fromTo(section.querySelectorAll('.section-subtitle, .contact-statement'), { y: mobile ? 16 : 32, opacity: 0.35 }, {
        y: 0, opacity: 1, ease: 'power2.out', scrollTrigger: {
          trigger: section, start: 'top 90%', end: 'top 48%', scrub: 0.65,
        },
      });
    });

    site.querySelectorAll('.step-card').forEach((card, index) => {
      const tl = gsap.timeline({ scrollTrigger: {
        trigger: card, start: 'top 88%', end: 'center 52%', scrub: 0.65,
      } });
      tl.fromTo(card, { '--entry-y': mobile ? 28 : 55, '--entry-x': mobile ? 0 : 32, '--entry-rotate': mobile ? 0 : 2, opacity: 0.3 },
        { '--entry-y': 0, '--entry-x': 0, '--entry-rotate': 0, opacity: 1, ease: 'power2.out' }, 0)
        .fromTo(card, { '--step-progress': 0 }, { '--step-progress': 1, ease: 'none' }, 0);
      card.dataset.step = String(index + 1);
    });
    site.querySelectorAll('.benefit-card').forEach((card, index) => {
      gsap.fromTo(card, { '--entry-y': mobile ? 28 : 90 + (index % 2) * 45, '--entry-x': mobile ? 0 : (index % 2 ? 30 : -30), '--entry-rotate': mobile ? 0 : (index % 2 ? 2 : -2), opacity: 0.3 }, {
        '--entry-y': 0, '--entry-x': 0, '--entry-rotate': 0, opacity: 1, ease: 'power2.out',
        scrollTrigger: { trigger: card, start: 'top 94%', end: 'top 48%', scrub: 0.85 },
      });
    });
    gsap.fromTo('.contact-card', { '--contact-y': mobile ? 18 : 65 }, { '--contact-y': 0, ease: 'power2.out', scrollTrigger: {
      trigger: '.contact', start: 'top 90%', end: 'top 42%', scrub: 0.9,
    } });
  }, site);

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) { target.dataset.revealed = ''; revealObserver.unobserve(target); }
    });
  }, { threshold: 0.08 });
  site.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

  const resetCard = (card) => {
    if (!card) return;
    const pose = poses.get(card);
    pose?.x(0); pose?.y(0);
    card.removeAttribute('data-lit');
  };
  const updatePointer = () => {
    frame = 0;
    const event = lastEvent;
    const card = event.target instanceof Element ? event.target.closest('.fx-card') : null;
    if (card !== activeCard) { resetCard(activeCard); activeCard = card; }
    if (!card || !site.contains(card)) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    if (!card.classList.contains('fx-card--flat')) {
      if (!poses.has(card)) {
        const state = { rx: 0, ry: 0 };
        const draw = () => { card.style.setProperty('--rx', `${state.rx}deg`); card.style.setProperty('--ry', `${state.ry}deg`); };
        const options = { duration: 0.8, ease: 'elastic.out(1,0.8)', onUpdate: draw };
        poses.set(card, { x: gsap.quickTo(state, 'rx', options), y: gsap.quickTo(state, 'ry', options) });
      }
      const pose = poses.get(card);
      pose.x((0.5 - y) * 3); pose.y((x - 0.5) * 3);
    }
    card.setAttribute('data-lit', '');
  };
  const onPointer = (event) => {
    if (!fine.matches || event.pointerType !== 'mouse') return;
    pointer.x = event.clientX / innerWidth - 0.5;
    pointer.y = event.clientY / innerHeight - 0.5;
    lastEvent = event;
    if (!frame) frame = requestAnimationFrame(updatePointer);
  };
  const leave = () => { cancelAnimationFrame(frame); frame = 0; resetCard(activeCard); activeCard = null; pointer.x = pointer.y = 0; };
  const revealFocus = (event) => {
    const card = event.target.closest?.('.fx-card');
    if (card) gsap.set(card, { '--entry-y': 0, '--entry-x': 0, '--entry-rotate': 0, opacity: 1 });
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', leave);
  site.addEventListener('focusin', revealFocus);
  root.classList.add('fx', 'flow-ready');
  const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
  document.fonts?.ready.then(refresh);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('pointerleave', leave);
    site.removeEventListener('focusin', revealFocus);
    revealObserver.disconnect();
    poses.forEach(({ x, y }) => { x.tween.kill(); y.tween.kill(); });
    context.revert();
    site.querySelectorAll('.fx-card').forEach((card) => { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); card.removeAttribute('data-lit'); });
    pointer.x = pointer.y = 0;
    flow.progress = flow.velocity = 0;
    root.classList.remove('fx', 'flow-ready');
  };
}
