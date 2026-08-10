declare module "cloudflare:workers" {
  export const env: {
    // The starter keeps this optional binding for future server persistence.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DB?: any;
  };
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

type D1Database = unknown;
