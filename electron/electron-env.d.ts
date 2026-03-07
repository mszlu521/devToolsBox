/// <reference types="vite-plugin-electron/electron-env" />
/// <reference types="electron" />

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
