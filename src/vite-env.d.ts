/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NHOST_SUBDOMAIN?: string
  readonly VITE_NHOST_REGION?: string
  readonly VITE_DEEPGRAM_API_KEY?: string
  readonly VITE_DEEPGRAM_MODEL?: string
  readonly VITE_DEEPGRAM_LANGUAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
