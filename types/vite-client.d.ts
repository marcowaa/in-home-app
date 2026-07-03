/// <reference types="node" />

// Minimal vite/client type stub (for environments where vite is not installed)
declare module "vite/client" {
  export interface ImportMetaEnv {
    readonly [key: string]: any;
  }
  export interface ImportMeta {
    readonly env: ImportMetaEnv;
    glob(pattern: string): Record<string, () => Promise<any>>;
  }
}
