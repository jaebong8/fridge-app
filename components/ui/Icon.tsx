import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
}

export function Icon({ name, size = 22, color = 'currentColor', stroke = 1.7 }: IconProps) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'home':
      return <Svg {...p}><Path d="M3.5 11.5 12 4l8.5 7.5"/><Path d="M5.5 10.5V19a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1v-8.5"/></Svg>;
    case 'box':
      return <Svg {...p}><Path d="M3.5 7.5 12 4l8.5 3.5v9L12 20l-8.5-3.5v-9z"/><Path d="M3.5 7.5 12 11l8.5-3.5"/><Path d="M12 11v9"/></Svg>;
    case 'plus':
      return <Svg {...p}><Path d="M12 5v14M5 12h14"/></Svg>;
    case 'bell':
      return <Svg {...p}><Path d="M6 9a6 6 0 1 1 12 0c0 3 1 4.5 2 6H4c1-1.5 2-3 2-6z"/><Path d="M10 19a2 2 0 0 0 4 0"/></Svg>;
    case 'chef':
      return <Svg {...p}><Path d="M7 11a4 4 0 1 1 2-7.5A4 4 0 0 1 15 3.5 4 4 0 1 1 17 11v3H7v-3z"/><Path d="M7 14h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3z"/></Svg>;
    case 'cart':
      return <Svg {...p}><Path d="M3 4h2l2 12h11l2-8H6.5"/><Circle cx="9" cy="20" r="1.4"/><Circle cx="17" cy="20" r="1.4"/></Svg>;
    case 'chart':
      return <Svg {...p}><Path d="M4 20V8M10 20V4M16 20v-8M22 20H2"/></Svg>;
    case 'search':
      return <Svg {...p}><Circle cx="11" cy="11" r="6.5"/><Path d="m20 20-4.2-4.2"/></Svg>;
    case 'scan':
      return <Svg {...p}><Path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3"/><Path d="M4 12h16"/></Svg>;
    case 'camera':
      return <Svg {...p}><Path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><Circle cx="12" cy="13" r="3.5"/></Svg>;
    case 'mic':
      return <Svg {...p}><Path d="M9 3h6a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 0-3 3v2"/><Path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></Svg>;
    case 'edit':
      return <Svg {...p}><Path d="M4 20h4l10-10-4-4L4 16v4z"/><Path d="m13.5 6.5 4 4"/></Svg>;
    case 'check':
      return <Svg {...p}><Path d="m5 12 5 5L20 7"/></Svg>;
    case 'x':
      return <Svg {...p}><Path d="M6 6l12 12M18 6 6 18"/></Svg>;
    case 'arrow-r':
      return <Svg {...p}><Path d="M5 12h14M13 6l6 6-6 6"/></Svg>;
    case 'arrow-l':
      return <Svg {...p}><Path d="M19 12H5M11 6l-6 6 6 6"/></Svg>;
    case 'chevron-r':
      return <Svg {...p}><Path d="m9 6 6 6-6 6"/></Svg>;
    case 'chevron-d':
      return <Svg {...p}><Path d="m6 9 6 6 6-6"/></Svg>;
    case 'chevron-u':
      return <Svg {...p}><Path d="m6 15 6-6 6 6"/></Svg>;
    case 'flame':
      return <Svg {...p}><Path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 9 9 7 8 6c2 .5 3 1 4-3z"/></Svg>;
    case 'leaf':
      return <Svg {...p}><Path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><Path d="M5 19 14 10"/></Svg>;
    case 'snow':
      return <Svg {...p}><Path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13"/></Svg>;
    case 'sun':
      return <Svg {...p}><Circle cx="12" cy="12" r="4"/><Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></Svg>;
    case 'clock':
      return <Svg {...p}><Circle cx="12" cy="12" r="8.5"/><Path d="M12 7v5l3 2"/></Svg>;
    case 'people':
      return <Svg {...p}><Circle cx="9" cy="9" r="3.5"/><Path d="M2.5 19c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><Circle cx="17" cy="8" r="2.8"/><Path d="M16 13.7c3 .3 5 2.4 5 5.3"/></Svg>;
    case 'fridge':
      return <Svg {...p}><Path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><Path d="M4 10h16"/><Path d="M9 6.5v1.5M9 12.5V14"/></Svg>;
    case 'tag':
      return <Svg {...p}><Path d="M3 12V4h8l10 10-8 8L3 12z"/><Circle cx="8" cy="8" r="1.4"/></Svg>;
    case 'sparkle':
      return <Svg {...p}><Path d="M12 3v6M12 15v6M3 12h6M15 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/></Svg>;
    case 'trash':
      return <Svg {...p}><Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></Svg>;
    case 'filter':
      return <Svg {...p}><Path d="M4 5h16l-6 8v6l-4-2v-4z"/></Svg>;
    case 'sort':
      return <Svg {...p}><Path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/></Svg>;
    case 'more':
      return <Svg {...p}><Circle cx="6" cy="12" r="1.4"/><Circle cx="12" cy="12" r="1.4"/><Circle cx="18" cy="12" r="1.4"/></Svg>;
    case 'settings':
      return <Svg {...p}><Circle cx="12" cy="12" r="3"/><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Svg>;
    default:
      return null;
  }
}
