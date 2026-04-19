import type { IconName } from '../components/ui/Icon';

export type TaskList = {
  id: number;
  name: string;
  icon: IconName;
  colorKey: 'peach' | 'mint' | 'butter' | 'rose' | 'sky' | 'lavender';
  done: number;
  total: number;
  cat: 'Travel' | 'Home' | 'Date' | 'Work' | 'Solo';
  who: 'Mine' | 'Both' | "Sofia's";
};

export const TASK_LISTS: TaskList[] = [
  { id: 1, name: 'Venice Trip', icon: 'mapPin', colorKey: 'peach', done: 8, total: 14, cat: 'Travel', who: 'Both' },
  { id: 2, name: 'Apartment', icon: 'home', colorKey: 'mint', done: 3, total: 7, cat: 'Home', who: 'Both' },
  { id: 3, name: 'Groceries', icon: 'shoppingBag', colorKey: 'butter', done: 5, total: 9, cat: 'Home', who: 'Mine' },
  { id: 4, name: 'Anniversary', icon: 'heart', colorKey: 'rose', done: 2, total: 6, cat: 'Date', who: 'Both' },
  { id: 5, name: 'Work', icon: 'briefcase', colorKey: 'sky', done: 12, total: 18, cat: 'Work', who: 'Mine' },
  { id: 6, name: 'Reading', icon: 'book', colorKey: 'lavender', done: 1, total: 4, cat: 'Solo', who: "Sofia's" },
];
