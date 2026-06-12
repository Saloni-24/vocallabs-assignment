# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # VoiceDesk

  React + TypeScript + Vite app with Nhost email/password auth and a Deepgram live speech-to-text dashboard.

  ## Local Development

  ```bash
  npm install
  npm run dev
  ```

  Create a `.env.local` file with:

  ```dotenv
  VITE_NHOST_SUBDOMAIN=your-nhost-subdomain
  VITE_NHOST_REGION=your-nhost-region
  VITE_DEEPGRAM_API_KEY=your-deepgram-api-key
  VITE_DEEPGRAM_MODEL=nova-3
  VITE_DEEPGRAM_LANGUAGE=en
  ```

  ## Build

  ```bash
  npm run build
  ```

  ## Deploy to Vercel

  This repo is ready for Vercel deployment.

  1. Push the latest code to GitHub.
  2. Go to the Vercel dashboard and import the GitHub repository.
  3. Set the build command to `npm run build` and the output directory to `dist`.
  4. Add these environment variables in Vercel:
     - `VITE_NHOST_SUBDOMAIN`
     - `VITE_NHOST_REGION`
     - `VITE_DEEPGRAM_API_KEY`
     - `VITE_DEEPGRAM_MODEL`
     - `VITE_DEEPGRAM_LANGUAGE`
  5. Deploy.

  The included [vercel.json](vercel.json) rewrites all routes to `index.html` so the React Router dashboard and login pages work after refresh.
    ],
