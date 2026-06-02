/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INTAKE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
