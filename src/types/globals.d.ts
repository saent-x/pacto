// Allow CSS / CSS-module imports used by the Expo template's example components.
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
