// Diretiva v-reveal: anima o elemento quando ele entra na tela.
// Uso: v-reveal, v-reveal="200" (atraso em ms), v-reveal:left, v-reveal:scale, v-reveal:clip
export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const observer =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              observer.unobserve(e.target);
            }
          }),
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      )
    : null;

export const vReveal = {
  mounted(el, { arg, value }) {
    el.classList.add('reveal', `reveal-${arg || 'up'}`);
    if (value) el.style.setProperty('--delay', `${value}ms`);
    if (observer && !reducedMotion) observer.observe(el);
    else el.classList.add('visible');
  },
  unmounted(el) {
    observer?.unobserve(el);
  },
};
