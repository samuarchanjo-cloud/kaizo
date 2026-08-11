# KAIZO project rules

- The official runtime is React + Vite + TypeScript.
- Production builds must be static and written to `dist/`.
- Deployment target is Vercel without custom runtime adapters.
- Do not install or reintroduce Vinext, Wrangler, Cloudflare Workers, OpenNext, Cloudflare adapters, or Cloudflare-specific configuration.
- Do not add a backend, authentication, Supabase, or remote persistence unless the user explicitly changes the product scope.
- Preserve the local repository/service abstraction and browser persistence.
- Preserve the existing visual design and business rules unless the user explicitly requests a product change.
