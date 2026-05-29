export type OnboardingVisual = 'pact' | 'crew' | 'home' | 'memories';

export type OnboardingPage = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  accentKey: 'accent' | 'accent2' | 'accent3';
  visual: OnboardingVisual;
};

export const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    key: 'pacts',
    eyebrow: 'MAKE IT STICK',
    title: 'small pacts.',
    body: 'Turn quiet promises into something you and your people actually keep.',
    accentKey: 'accent',
    visual: 'pact',
  },
  {
    key: 'together',
    eyebrow: 'YOUR PEOPLE',
    title: 'in sync.',
    body: 'Bring a partner, a roommate, or a small crew into one shared rhythm.',
    accentKey: 'accent2',
    visual: 'crew',
  },
  {
    key: 'home',
    eyebrow: 'EVERY DAY',
    title: 'your rhythm.',
    body: 'Tasks, reminders, plans and check-ins — the day you share, in one place.',
    accentKey: 'accent3',
    visual: 'home',
  },
  {
    key: 'memories',
    eyebrow: 'REMEMBER WHY',
    title: 'moments.',
    body: 'Capture wins, routines, and the small things that made it worth it.',
    accentKey: 'accent',
    visual: 'memories',
  },
  {
    key: 'start',
    eyebrow: 'READY',
    title: "let's begin.",
    body: 'Set up your space in under a minute. You can bring someone in anytime.',
    accentKey: 'accent2',
    visual: 'crew',
  },
];
