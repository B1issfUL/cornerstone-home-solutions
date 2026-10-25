import { useEffect } from 'react';
import { pointer } from '../lib/pointer.js';

// One place for the page's interaction layer (ported from Magic UI's blur-fade and magic-card):
// - [data-reveal] sections fade in once when scrolled into view (IntersectionObserver, no loop);
// - .fx-card elements get a cursor-following light and a restrained tilt (mouse only);
// - the shared pointer state that drives the crystal scene's parallax.
// Everything is skipped under prefers-reduced-motion; touch devices get reveals but no hover effects.
const MAX_TILT_DEG = 3;

export default function useInteractiveEffects(route) {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      root.classList.remove('fx');
      return undefined;
    }
    root.classList.add('fx');
    root.classList.toggle('fx-lite', Boolean(navigator.connection?.saveData));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.dataset.revealed = '';
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => observer.observe(el));

    let frame = 0;
    let activeCard = null;
    let lastEvent = null;
    const resetCard = (card) => {
      if (!card) return;
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
      card.removeAttribute('data-lit');
    };
    const update = () => {
      frame = 0;
      const event = lastEvent;
      const card = event.target instanceof Element ? event.target.closest('.fx-card') : null;
      if (card !== activeCard) {
        resetCard(activeCard);
        activeCard = card;
      }
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      if (!card.classList.contains('fx-card--flat')) {
        card.style.setProperty('--rx', `${((0.5 - y) * MAX_TILT_DEG).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((x - 0.5) * MAX_TILT_DEG).toFixed(2)}deg`);
      }
      card.setAttribute('data-lit', '');
    };
    const onPointerMove = (event) => {
      if (!finePointer.matches || event.pointerType !== 'mouse') return;
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
      lastEvent = event;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onPointerLeave = () => {
      resetCard(activeCard);
      activeCard = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    return () => {
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
      resetCard(activeCard);
    };
  }, [route]);
}
