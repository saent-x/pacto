export const DAILY_VERSES = [
  { text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.', ref: '1 Corinthians 13:4' },
  { text: 'Above all, love each other deeply, because love covers over a multitude of sins.', ref: '1 Peter 4:8' },
  { text: 'Two are better than one, because they have a good return for their labor.', ref: 'Ecclesiastes 4:9' },
  { text: 'Be completely humble and gentle; be patient, bearing with one another in love.', ref: 'Ephesians 4:2' },
  { text: 'Let all that you do be done in love.', ref: '1 Corinthians 16:14' },
  { text: 'And over all these virtues put on love, which binds them all together in perfect unity.', ref: 'Colossians 3:14' },
  { text: 'Dear friends, let us love one another, for love comes from God.', ref: '1 John 4:7' },
  { text: 'Be devoted to one another in love. Honor one another above yourselves.', ref: 'Romans 12:10' },
  { text: 'Though one may be overpowered, two can defend themselves. A cord of three strands is not quickly broken.', ref: 'Ecclesiastes 4:12' },
  { text: 'Hatred stirs up conflict, but love covers over all wrongs.', ref: 'Proverbs 10:12' },
  { text: 'Place me like a seal over your heart, like a seal on your arm; for love is as strong as death.', ref: 'Song of Solomon 8:6' },
  { text: 'And now these three remain: faith, hope and love. But the greatest of these is love.', ref: '1 Corinthians 13:13' },
  { text: 'The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.', ref: 'Numbers 6:24-25' },
  { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' },
  { text: 'He who finds a wife finds what is good and receives favor from the Lord.', ref: 'Proverbs 18:22' },
  { text: 'Love does not delight in evil but rejoices with the truth. It always protects, always trusts, always hopes.', ref: '1 Corinthians 13:6-7' },
  { text: 'For where your treasure is, there your heart will be also.', ref: 'Matthew 6:21' },
  { text: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.', ref: 'Ephesians 4:32' },
  { text: 'May the God of hope fill you with all joy and peace as you trust in him.', ref: 'Romans 15:13' },
  { text: 'I have told you this so that my joy may be in you and your joy may be complete.', ref: 'John 15:11' },
  { text: 'Commit to the Lord whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' },
  { text: 'Do everything in love.', ref: '1 Corinthians 16:14' },
  { text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.', ref: 'Jeremiah 29:11' },
  { text: 'The Lord is my shepherd, I lack nothing.', ref: 'Psalm 23:1' },
  { text: 'Rejoice always, pray continually, give thanks in all circumstances.', ref: '1 Thessalonians 5:16-18' },
  { text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.', ref: 'Joshua 1:9' },
  { text: 'Delight yourself in the Lord, and he will give you the desires of your heart.', ref: 'Psalm 37:4' },
  { text: 'I can do all this through him who gives me strength.', ref: 'Philippians 4:13' },
  { text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.', ref: 'Psalm 34:18' },
  { text: 'His banner over me is love.', ref: 'Song of Solomon 2:4' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
];

export function getDailyVerse(): typeof DAILY_VERSES[number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}
