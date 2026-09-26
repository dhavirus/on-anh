// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(open));
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Flashcard demo
const words = [
  { en: 'consistent', ipa: '/kənˈsɪstənt/', vi: 'nhất quán, đều đặn', example: 'She reviews new words at a consistent time every day.' },
  { en: 'overwhelm', ipa: '/ˌoʊvərˈwɛlm/', vi: 'choáng ngợp, quá tải', example: "Don't let a long word list overwhelm you at once." },
  { en: 'retain', ipa: '/rɪˈteɪn/', vi: 'ghi nhớ, giữ lại', example: 'Spaced repetition helps you retain words for months, not days.' },
];

let wordIndex = 0;
const flashcard = document.getElementById('flashcard');
const flashcardBack = document.getElementById('flashcard-back');
const fcWord = document.getElementById('fc-word');
const fcIpa = document.getElementById('fc-ipa');
const fcVi = document.getElementById('fc-vi');
const fcExample = document.getElementById('fc-example');
const nextBtn = document.getElementById('flashcard-next');

function renderWord(index) {
  const w = words[index];
  fcWord.textContent = w.en;
  fcIpa.textContent = w.ipa;
  fcVi.textContent = w.vi;
  fcExample.textContent = w.example;
}

function toggleFlip() {
  const flipped = flashcard.classList.toggle('is-flipped');
  // Keep the face that's visually hidden out of the accessibility tree too.
  flashcardBack.setAttribute('aria-hidden', String(!flipped));
}

flashcard.addEventListener('click', toggleFlip);

nextBtn.addEventListener('click', () => {
  wordIndex = (wordIndex + 1) % words.length;
  flashcard.classList.remove('is-flipped');
  flashcardBack.setAttribute('aria-hidden', 'true');
  renderWord(wordIndex);
});

// Scroll reveal (progressive enhancement: elements are visible by
// default in CSS; only opt into the hidden/animate-in state here)
const revealEls = document.querySelectorAll('.reveal');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => {
    el.classList.add('reveal-pending');
    observer.observe(el);
  });
}
