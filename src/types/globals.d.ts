// react-native-web ships no TS types; only the DOM escape hatch is used (web-only files).
declare module 'react-native-web' {
  export function unstable_createElement(
    type: string,
    props?: Record<string, unknown>,
  ): import('react').ReactElement;
}

// Allow CSS / CSS-module imports used by the Expo template's example components.
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
