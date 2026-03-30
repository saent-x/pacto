export type DailyVerseSource = "remote" | "fallback";

export type DailyVerse = {
  text: string;
  reference: string;
  translation: string;
  source: DailyVerseSource;
  dateKey: string;
};

type CuratedVerse = Omit<DailyVerse, "source" | "dateKey">;

const CURATED_VERSES: CuratedVerse[] = [
  {
    text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.",
    reference: "1 Corinthians 13:4",
    translation: "NIV",
  },
  {
    text: "Above all, love each other deeply, because love covers over a multitude of sins.",
    reference: "1 Peter 4:8",
    translation: "NIV",
  },
  {
    text: "And over all these virtues put on love, which binds them all together in perfect unity.",
    reference: "Colossians 3:14",
    translation: "NIV",
  },
  {
    text: "Trust in the Lord with all your heart and lean not on your own understanding.",
    reference: "Proverbs 3:5",
    translation: "NIV",
  },
  {
    text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.",
    reference: "Micah 6:8",
    translation: "NIV",
  },
  {
    text: "Be completely humble and gentle; be patient, bearing with one another in love.",
    reference: "Ephesians 4:2",
    translation: "NIV",
  },
  {
    text: "This is the day that the Lord has made; let us rejoice and be glad in it.",
    reference: "Psalm 118:24",
    translation: "NIV",
  },
  {
    text: "Above all else, guard your heart, for everything you do flows from it.",
    reference: "Proverbs 4:23",
    translation: "NIV",
  },
];

export function dateKeyForDate(date: Date | number | string): string {
  const value =
    typeof date === "string"
      ? new Date(date)
      : typeof date === "number"
        ? new Date(date)
        : date;
  return value.toISOString().slice(0, 10);
}

function hashDateKey(dateKey: string) {
  let hash = 0;
  for (let index = 0; index < dateKey.length; index += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getCuratedDailyVerse(dateKey: string): DailyVerse {
  const verse = CURATED_VERSES[hashDateKey(dateKey) % CURATED_VERSES.length];
  return {
    ...verse,
    source: "fallback",
    dateKey,
  };
}
