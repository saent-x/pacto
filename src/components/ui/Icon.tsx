import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';

export type IconName =
  | 'bell' | 'home' | 'check' | 'checkSquare' | 'book' | 'grid' | 'plus'
  | 'heart' | 'star' | 'sun' | 'moon' | 'cloud' | 'drizzle' | 'zap'
  | 'compass' | 'gift' | 'flag' | 'clipboard' | 'creditCard' | 'user'
  | 'settings' | 'chevronRight' | 'chevronLeft' | 'chevronDown' | 'edit'
  | 'lock' | 'mic' | 'camera' | 'coffee' | 'mapPin' | 'briefcase'
  | 'shoppingBag' | 'arrowUp' | 'arrowDown' | 'chevronsUp' | 'arrowRight'
  | 'send' | 'x' | 'mail' | 'moreH' | 'filter' | 'calendar' | 'trendingUp'
  | 'clock' | 'music' | 'link' | 'feather' | 'copy' | 'logOut' | 'helpCircle'
  | 'messageCircle' | 'info' | 'shield' | 'eye' | 'bookmark' | 'hash'
  | 'minus' | 'trash' | 'repeat' | 'droplet' | 'activity' | 'pieChart'
  | 'users' | 'dollarSign' | 'map' | 'cloudRain' | 'sparkle';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ImageStyle>;
};

const ICONS: Record<IconName, ImageSourcePropType> = {
  bell: require('../../../assets/images/icons/bell.png'),
  home: require('../../../assets/images/icons/home.png'),
  check: require('../../../assets/images/icons/check.png'),
  checkSquare: require('../../../assets/images/icons/checkSquare.png'),
  book: require('../../../assets/images/icons/book.png'),
  grid: require('../../../assets/images/icons/grid.png'),
  plus: require('../../../assets/images/icons/plus.png'),
  heart: require('../../../assets/images/icons/heart.png'),
  star: require('../../../assets/images/icons/star.png'),
  sun: require('../../../assets/images/icons/sun.png'),
  moon: require('../../../assets/images/icons/moon.png'),
  cloud: require('../../../assets/images/icons/cloud.png'),
  drizzle: require('../../../assets/images/icons/drizzle.png'),
  zap: require('../../../assets/images/icons/zap.png'),
  compass: require('../../../assets/images/icons/compass.png'),
  gift: require('../../../assets/images/icons/gift.png'),
  flag: require('../../../assets/images/icons/flag.png'),
  clipboard: require('../../../assets/images/icons/clipboard.png'),
  creditCard: require('../../../assets/images/icons/creditCard.png'),
  user: require('../../../assets/images/icons/user.png'),
  settings: require('../../../assets/images/icons/settings.png'),
  chevronRight: require('../../../assets/images/icons/chevronRight.png'),
  chevronLeft: require('../../../assets/images/icons/chevronLeft.png'),
  chevronDown: require('../../../assets/images/icons/chevronDown.png'),
  edit: require('../../../assets/images/icons/edit.png'),
  lock: require('../../../assets/images/icons/lock.png'),
  mic: require('../../../assets/images/icons/mic.png'),
  camera: require('../../../assets/images/icons/camera.png'),
  coffee: require('../../../assets/images/icons/coffee.png'),
  mapPin: require('../../../assets/images/icons/mapPin.png'),
  briefcase: require('../../../assets/images/icons/briefcase.png'),
  shoppingBag: require('../../../assets/images/icons/shoppingBag.png'),
  arrowUp: require('../../../assets/images/icons/arrowUp.png'),
  arrowDown: require('../../../assets/images/icons/arrowDown.png'),
  chevronsUp: require('../../../assets/images/icons/chevronsUp.png'),
  arrowRight: require('../../../assets/images/icons/arrowRight.png'),
  send: require('../../../assets/images/icons/send.png'),
  x: require('../../../assets/images/icons/x.png'),
  mail: require('../../../assets/images/icons/mail.png'),
  moreH: require('../../../assets/images/icons/moreH.png'),
  filter: require('../../../assets/images/icons/filter.png'),
  calendar: require('../../../assets/images/icons/calendar.png'),
  trendingUp: require('../../../assets/images/icons/trendingUp.png'),
  clock: require('../../../assets/images/icons/clock.png'),
  music: require('../../../assets/images/icons/music.png'),
  link: require('../../../assets/images/icons/link.png'),
  feather: require('../../../assets/images/icons/feather.png'),
  copy: require('../../../assets/images/icons/copy.png'),
  logOut: require('../../../assets/images/icons/logOut.png'),
  helpCircle: require('../../../assets/images/icons/helpCircle.png'),
  messageCircle: require('../../../assets/images/icons/messageCircle.png'),
  info: require('../../../assets/images/icons/info.png'),
  shield: require('../../../assets/images/icons/shield.png'),
  eye: require('../../../assets/images/icons/eye.png'),
  bookmark: require('../../../assets/images/icons/bookmark.png'),
  hash: require('../../../assets/images/icons/hash.png'),
  minus: require('../../../assets/images/icons/minus.png'),
  trash: require('../../../assets/images/icons/trash.png'),
  repeat: require('../../../assets/images/icons/repeat.png'),
  droplet: require('../../../assets/images/icons/droplet.png'),
  activity: require('../../../assets/images/icons/activity.png'),
  pieChart: require('../../../assets/images/icons/pieChart.png'),
  users: require('../../../assets/images/icons/users.png'),
  dollarSign: require('../../../assets/images/icons/dollarSign.png'),
  map: require('../../../assets/images/icons/map.png'),
  cloudRain: require('../../../assets/images/icons/cloudRain.png'),
  sparkle: require('../../../assets/images/icons/sparkle.png'),
};

export function Icon({ name, size = 20, color = '#fff', style }: Props) {
  const source = ICONS[name];
  if (!source) return null;

  return (
    <Image
      source={source}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
      tintColor={color}
      resizeMode="contain"
    />
  );
}
