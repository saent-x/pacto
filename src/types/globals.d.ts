// react-native-web ships no TS types; only the DOM escape hatch is used (web-only files).
declare module 'react-native-web' {
  export function unstable_createElement(
    type: string,
    props?: Record<string, unknown>,
  ): import('react').ReactElement;
}
