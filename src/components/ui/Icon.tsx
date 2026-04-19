import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

// Feather-style icon set ported from Coupl design tokens
// Each entry returns SVG children for a 24x24 viewBox

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
  | 'users' | 'dollarSign' | 'map' | 'cloudRain';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 20, color = '#fff', strokeWidth = 2 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const children = paths(name, common);
  if (!children) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {children}
    </Svg>
  );
}

function paths(name: IconName, p: any): React.ReactNode {
  switch (name) {
    case 'bell':
      return (<>
        <Path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <Path {...p} d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>);
    case 'home':
      return (<>
        <Path {...p} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <Polyline {...p} points="9 22 9 12 15 12 15 22" />
      </>);
    case 'check':
      return <Polyline {...p} points="20 6 9 17 4 12" />;
    case 'checkSquare':
      return (<>
        <Polyline {...p} points="9 11 12 14 22 4" />
        <Path {...p} d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>);
    case 'book':
      return (<>
        <Path {...p} d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <Path {...p} d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </>);
    case 'grid':
      return (<>
        <Rect {...p} x="3" y="3" width="7" height="7" />
        <Rect {...p} x="14" y="3" width="7" height="7" />
        <Rect {...p} x="14" y="14" width="7" height="7" />
        <Rect {...p} x="3" y="14" width="7" height="7" />
      </>);
    case 'plus':
      return (<>
        <Line {...p} x1="12" y1="5" x2="12" y2="19" />
        <Line {...p} x1="5" y1="12" x2="19" y2="12" />
      </>);
    case 'heart':
      return <Path {...p} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />;
    case 'star':
      return <Polygon {...p} points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />;
    case 'sun':
      return (<>
        <Circle {...p} cx="12" cy="12" r="5" />
        <Line {...p} x1="12" y1="1" x2="12" y2="3" />
        <Line {...p} x1="12" y1="21" x2="12" y2="23" />
        <Line {...p} x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <Line {...p} x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <Line {...p} x1="1" y1="12" x2="3" y2="12" />
        <Line {...p} x1="21" y1="12" x2="23" y2="12" />
        <Line {...p} x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <Line {...p} x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </>);
    case 'moon':
      return <Path {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
    case 'cloud':
      return <Path {...p} d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />;
    case 'drizzle':
    case 'cloudRain':
      return (<>
        <Line {...p} x1="8" y1="19" x2="8" y2="21" />
        <Line {...p} x1="8" y1="13" x2="8" y2="15" />
        <Line {...p} x1="16" y1="19" x2="16" y2="21" />
        <Line {...p} x1="16" y1="13" x2="16" y2="15" />
        <Line {...p} x1="12" y1="21" x2="12" y2="23" />
        <Line {...p} x1="12" y1="15" x2="12" y2="17" />
        <Path {...p} d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
      </>);
    case 'zap':
      return <Polygon {...p} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />;
    case 'compass':
      return (<>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Polygon {...p} points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </>);
    case 'gift':
      return (<>
        <Polyline {...p} points="20 12 20 22 4 22 4 12" />
        <Rect {...p} x="2" y="7" width="20" height="5" />
        <Line {...p} x1="12" y1="22" x2="12" y2="7" />
        <Path {...p} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <Path {...p} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </>);
    case 'flag':
      return (<>
        <Path {...p} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <Line {...p} x1="4" y1="22" x2="4" y2="15" />
      </>);
    case 'clipboard':
      return (<>
        <Path {...p} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <Rect {...p} x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </>);
    case 'creditCard':
      return (<>
        <Rect {...p} x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <Line {...p} x1="1" y1="10" x2="23" y2="10" />
      </>);
    case 'user':
      return (<>
        <Path {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle {...p} cx="12" cy="7" r="4" />
      </>);
    case 'settings':
      return (<>
        <Circle {...p} cx="12" cy="12" r="3" />
        <Path {...p} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>);
    case 'chevronRight':
      return <Polyline {...p} points="9 18 15 12 9 6" />;
    case 'chevronLeft':
      return <Polyline {...p} points="15 18 9 12 15 6" />;
    case 'chevronDown':
      return <Polyline {...p} points="6 9 12 15 18 9" />;
    case 'edit':
      return (<>
        <Path {...p} d="M12 20h9" />
        <Path {...p} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>);
    case 'lock':
      return (<>
        <Rect {...p} x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <Path {...p} d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>);
    case 'mic':
      return (<>
        <Path {...p} d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <Path {...p} d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <Line {...p} x1="12" y1="19" x2="12" y2="23" />
        <Line {...p} x1="8" y1="23" x2="16" y2="23" />
      </>);
    case 'camera':
      return (<>
        <Path {...p} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <Circle {...p} cx="12" cy="13" r="4" />
      </>);
    case 'coffee':
      return (<>
        <Path {...p} d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <Path {...p} d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" />
        <Line {...p} x1="6" y1="1" x2="6" y2="4" />
        <Line {...p} x1="10" y1="1" x2="10" y2="4" />
        <Line {...p} x1="14" y1="1" x2="14" y2="4" />
      </>);
    case 'mapPin':
      return (<>
        <Path {...p} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle {...p} cx="12" cy="10" r="3" />
      </>);
    case 'briefcase':
      return (<>
        <Rect {...p} x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <Path {...p} d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>);
    case 'shoppingBag':
      return (<>
        <Path {...p} d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <Line {...p} x1="3" y1="6" x2="21" y2="6" />
        <Path {...p} d="M16 10a4 4 0 0 1-8 0" />
      </>);
    case 'arrowUp':
      return (<>
        <Line {...p} x1="12" y1="19" x2="12" y2="5" />
        <Polyline {...p} points="5 12 12 5 19 12" />
      </>);
    case 'arrowDown':
      return (<>
        <Line {...p} x1="12" y1="5" x2="12" y2="19" />
        <Polyline {...p} points="19 12 12 19 5 12" />
      </>);
    case 'chevronsUp':
      return (<>
        <Polyline {...p} points="17 11 12 6 7 11" />
        <Polyline {...p} points="17 18 12 13 7 18" />
      </>);
    case 'arrowRight':
      return (<>
        <Line {...p} x1="5" y1="12" x2="19" y2="12" />
        <Polyline {...p} points="12 5 19 12 12 19" />
      </>);
    case 'send':
      return (<>
        <Line {...p} x1="22" y1="2" x2="11" y2="13" />
        <Polygon {...p} points="22 2 15 22 11 13 2 9 22 2" />
      </>);
    case 'x':
      return (<>
        <Line {...p} x1="18" y1="6" x2="6" y2="18" />
        <Line {...p} x1="6" y1="6" x2="18" y2="18" />
      </>);
    case 'mail':
      return (<>
        <Path {...p} d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <Polyline {...p} points="22 6 12 13 2 6" />
      </>);
    case 'moreH':
      return (<>
        <Circle {...p} fill={p.stroke} stroke="none" cx="5" cy="12" r="1.5" />
        <Circle {...p} fill={p.stroke} stroke="none" cx="12" cy="12" r="1.5" />
        <Circle {...p} fill={p.stroke} stroke="none" cx="19" cy="12" r="1.5" />
      </>);
    case 'filter':
      return <Polygon {...p} points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />;
    case 'calendar':
      return (<>
        <Rect {...p} x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <Line {...p} x1="16" y1="2" x2="16" y2="6" />
        <Line {...p} x1="8" y1="2" x2="8" y2="6" />
        <Line {...p} x1="3" y1="10" x2="21" y2="10" />
      </>);
    case 'trendingUp':
      return (<>
        <Polyline {...p} points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <Polyline {...p} points="17 6 23 6 23 12" />
      </>);
    case 'clock':
      return (<>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Polyline {...p} points="12 6 12 12 16 14" />
      </>);
    case 'music':
      return (<>
        <Path {...p} d="M9 18V5l12-2v13" />
        <Circle {...p} cx="6" cy="18" r="3" />
        <Circle {...p} cx="18" cy="16" r="3" />
      </>);
    case 'link':
      return (<>
        <Path {...p} d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <Path {...p} d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>);
    case 'feather':
      return (<>
        <Path {...p} d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
        <Line {...p} x1="16" y1="8" x2="2" y2="22" />
        <Line {...p} x1="17.5" y1="15" x2="9" y2="15" />
      </>);
    case 'copy':
      return (<>
        <Rect {...p} x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <Path {...p} d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>);
    case 'logOut':
      return (<>
        <Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <Polyline {...p} points="16 17 21 12 16 7" />
        <Line {...p} x1="21" y1="12" x2="9" y2="12" />
      </>);
    case 'helpCircle':
      return (<>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Path {...p} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <Line {...p} x1="12" y1="17" x2="12.01" y2="17" />
      </>);
    case 'messageCircle':
      return <Path {...p} d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />;
    case 'info':
      return (<>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Line {...p} x1="12" y1="16" x2="12" y2="12" />
        <Line {...p} x1="12" y1="8" x2="12.01" y2="8" />
      </>);
    case 'shield':
      return <Path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
    case 'eye':
      return (<>
        <Path {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle {...p} cx="12" cy="12" r="3" />
      </>);
    case 'bookmark':
      return <Path {...p} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />;
    case 'hash':
      return (<>
        <Line {...p} x1="4" y1="9" x2="20" y2="9" />
        <Line {...p} x1="4" y1="15" x2="20" y2="15" />
        <Line {...p} x1="10" y1="3" x2="8" y2="21" />
        <Line {...p} x1="16" y1="3" x2="14" y2="21" />
      </>);
    case 'minus':
      return <Line {...p} x1="5" y1="12" x2="19" y2="12" />;
    case 'trash':
      return (<>
        <Polyline {...p} points="3 6 5 6 21 6" />
        <Path {...p} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>);
    case 'repeat':
      return (<>
        <Polyline {...p} points="17 1 21 5 17 9" />
        <Path {...p} d="M3 11V9a4 4 0 0 1 4-4h14" />
        <Polyline {...p} points="7 23 3 19 7 15" />
        <Path {...p} d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>);
    case 'droplet':
      return <Path {...p} d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />;
    case 'activity':
      return <Polyline {...p} points="22 12 18 12 15 21 9 3 6 12 2 12" />;
    case 'pieChart':
      return (<>
        <Path {...p} d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <Path {...p} d="M22 12A10 10 0 0 0 12 2v10z" />
      </>);
    case 'users':
      return (<>
        <Path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <Circle {...p} cx="9" cy="7" r="4" />
        <Path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <Path {...p} d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>);
    case 'dollarSign':
      return (<>
        <Line {...p} x1="12" y1="1" x2="12" y2="23" />
        <Path {...p} d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>);
    case 'map':
      return (<>
        <Polygon {...p} points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <Line {...p} x1="8" y1="2" x2="8" y2="18" />
        <Line {...p} x1="16" y1="6" x2="16" y2="22" />
      </>);
    default:
      return null;
  }
}
