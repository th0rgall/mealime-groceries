// Auto-loads .env and exports it to Deno.env
// see https://deno.land/std@0.177.0/dotenv/mod.ts
// Seems to require process env access to all.
// deno-lint-ignore no-unused-vars
import * as load from "std/dotenv/load.ts";
export { parse as parseYAML } from "std/encoding/yaml.ts";
export { serve } from "std/http/server.ts";
export {
  CookieJar,
  wrapFetch as addCookies,
} from "https://deno.land/x/another_cookiejar@v5.0.2/mod.ts";
export { wrapFetch as extendClient } from "https://deno.land/x/fetch_goody@v6.1.0/mod.ts";
export { z } from "https://deno.land/x/zod@v3.20.5/mod.ts";
