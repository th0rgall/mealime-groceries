import { addCookies, CookieJar } from "./deps.ts";
import { extendClient } from "./deps.ts";
import sectionMapper from "./section-mapper.ts";

const fileName = "cookiejar.json";

const baseURL = "https://app.mealime.com";

let cookieJar: CookieJar;

let client = fetch;

export class CsrfError extends Error {
  constructor() {
    super("No CSRF token found");
  }
}

export default class MealimeAPI {
  private readonly email: string;
  private readonly password: string;

  constructor(email?: string, password?: string) {
    if (!email) {
      throw new Error("Invalid email");
    }
    this.email = email;
    if (!password) {
      throw new Error("Invalid password");
    }
    this.password = password;
  }

  async saveCookieJar() {
    await Deno.writeTextFile(
      fileName,
      JSON.stringify(cookieJar),
    );
  }

  csrfToken: string | undefined;

  /**
   * Login: resets the client to a pure fetch instance, then logs in and/or fetches the
   * csrf-token, as required by the presence or non-presence of persisted cookies &
   * csrfToken variables. Wraps the client with these auth credentials.
   * @returns {boolean} true when logged in
   * @throws when auth failed
   */
  async login() {
    if (cookieJar == null) {
      try {
        // Try loading the cookie jar from disk
        cookieJar = new CookieJar(JSON.parse(
          await Deno.readTextFile(fileName),
        ));
        console.log("Cookie jar found on disk, loaded");
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.log("Creating a new cookie jar");
          cookieJar = new CookieJar();
        } else {
          throw "Unknown cookie jar loading error";
        }
      }
    }
    // Initialize/reset HTTP client
    client = extendClient({
      fetch: addCookies({
        fetch: fetch,
        cookieJar: cookieJar,
      }),
      headers: new Headers({
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
        "pragma": "no-cache",
      }),
      // TODO: save cookies here?
      // interceptors: {
      //   response
      // }
    });

    const getAuthCookie = () =>
      cookieJar.getCookie({
        domain: "mealime.com",
        path: "/",
        name: "auth_token",
      });

    // If no auth cookie yet
    if (getAuthCookie() == null) {
      // Visit the login page to get the CSRF token
      const loginPageText = await client(`${baseURL}/login`).then((r) =>
        r.text()
      );
      await this.saveCookieJar();
      const match = /name="authenticity_token" value="([^"]+)"/.exec(
        loginPageText,
      );
      // deno-lint-ignore prefer-const
      let authenticityToken;
      if (!match) {
        throw "no authenticity token found";
      }
      authenticityToken = match[1];
      try {
        // Log in
        // always produces "404 not found"
        await client(`${baseURL}/sessions`, {
          method: "post",
          body: new URLSearchParams({
            utf8: "✓",
            authenticity_token: authenticityToken,
            email: this.email ?? "",
            password: this.password ?? "",
            hp2: "",
            remember_me: "1",
            commit: "Log in",
          }),
          headers: {
            referer: "https://app.mealime.com/login",
            origin: "https://app.mealime.com",
            authority: "https://app.mealime.com",
            Connection: "keep-alive",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0",
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
          },
        });
      } catch (_) {
        console.log("cry");
        // OK the 404 was fake?? It DOES do the auth and adds an auth token... in reality should be a 302 towards '/'

        // 404 is a good/expected response?
        // 401 probably not
      } finally {
        await this.saveCookieJar();
      }
    }

    // Intermediary check for the auth cookie
    if (getAuthCookie() == null) {
      console.error("No auth possible, failed initial login");
      throw new Error("Auth failed");
    }

    // TODO: if things go wrong here we might not handle the error so well now
    // make sure the reset also clears the csrf token

    // The csrf-token is embedded on the page from which the XMLHTTPRequest happens (the homepage /#!, rendered by angular),
    // and should be included into the x-csrf-token custom header.
    // It seems unrelated to the XSRF-TOKEN cookie, which varies per request, and which is automatically handled by the cookie jar.
    //
    // The csrf-token seems to stay valid for several requests.
    if (this.csrfToken == null) {
      // Extract: from <meta name="csrf-token" content="..." />
      // "x-csrf-token": "......",
      const appText = await client(`${baseURL}/`).then((r) => r.text());
      await this.saveCookieJar();
      const csrfMatch = /name="csrf-token" content="([^"]+)"/.exec(appText);
      if (!csrfMatch) {
        console.warn("No csrf token found");
        throw new CsrfError();
      }
      console.log("csrf token found :)");
      this.csrfToken = csrfMatch[1];
    }

    // Add the csrf-token for the requests
    client = extendClient({
      fetch: client,
      headers: new Headers({
        "x-csrf-token": this.csrfToken,
        "x-requested-with": "XMLHttpRequest",
      }),
    });
    console.log("We have full auth!");
    return true;
  }

  async addItem(item: string) {
    const addResponse = await client(`${baseURL}/api/grocery_list_items`, {
      method: "post",
      body: new URLSearchParams({
        "grocery_list_item[is_complete]": "false",
        "grocery_list_item[section_id]": sectionMapper(item).toString(),
        "grocery_list_item[quantity]": "",
        "grocery_list_item[ingredient_name]": item,
      }),
      headers: {
        "accept": "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "pragma": "no-cache",
        "sec-ch-ua":
          '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "referer": "https://app.mealime.com/",
      },
    });
    await this.saveCookieJar();
    if (addResponse.status === 200) {
      return { result: `${item} added!` };
    } else {
      const responseText = await addResponse.text();
      console.error(
        `/api/grocery_list_items API call failed: (${addResponse.status}) ${responseText}`,
      );
      throw new Deno.errors.PermissionDenied();
    }
  }

  async reset() {
    await Deno.remove("./" + fileName);
    // clear cached headers etc.
    client = fetch;
    await this.login();
  }
}
