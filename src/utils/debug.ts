/// <reference types="vite/client" />

const isDev = import.meta.env.DEV;

export const debug = {
  log: isDev ? console.log.bind(console) : () => {},
  warn: isDev ? console.warn.bind(console) : () => {},
  error: console.error.bind(console), // always log errors
};
