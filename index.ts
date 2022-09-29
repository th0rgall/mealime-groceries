import { promisify } from 'util';
import fs from 'fs/promises'
import { fastify, FastifyInstance, preHandlerHookHandler, RouteShorthandOptions } from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import got, { Got, HTTPError } from 'got';
import { Cookie, CookieJar, MemoryCookieStore } from 'tough-cookie';
import * as dotenv from 'dotenv'
dotenv.config()

const server: FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse> = fastify()


const fileName = 'cookiejar.json';

const baseURL = 'https://app.mealime.com'

let cookieStore = new MemoryCookieStore();

let cookieJar: CookieJar;

let client: Got = got.extend({});

async function saveCookieJar() {
  await fs.writeFile(fileName, JSON.stringify(await cookieJar.serialize()), 'utf-8')
}

const xcsrfError = "no xcsrf token found";

let xcsrfToken: string | undefined;

async function login() {
  try {
    await fs.stat(fileName);
    cookieJar = await CookieJar.deserialize(await fs.readFile(fileName, "utf-8"), cookieStore);
  }
  catch (e: any) {
    if (e.code === 'ENOENT') {
      cookieJar = new CookieJar(cookieStore);
    }
    else {
      throw "another cookie file error";
    }
  }
  client = client.extend({
    cookieJar: cookieJar,
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
      "pragma": "no-cache",
    }
  });
  // If no auth cookie yet
  if (await cookieStore.findCookie("mealime.com", "/", "auth_token") == null) {
    // Visit login page
    const loginPageText = await client(`${baseURL}/login`).text();
    await saveCookieJar();
    const match = /name="authenticity_token" value="([^"]+)"/.exec(loginPageText);
    let authenticityToken;
    if (!match) {
      throw "no authenticity token found";
    }
    authenticityToken = match[1];
    try {
      // Log in
      // always produes "404 not found"
      await client.post(`${baseURL}/sessions`, {
        form: {
          utf8: '✓',
          authenticity_token: authenticityToken,
          email: process.env.MEALIME_EMAIL,
          password: process.env.MEALIME_PASSWORD,
          hp2: '',
          remember_me: '1',
          commit: 'Log in'
        },
        headers: {
          referer: "https://app.mealime.com/login",
          origin: "https://app.mealime.com",
          authority: "https://app.mealime.com",
          Connection: "keep-alive",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/x-www-form-urlencoded",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1"
        }
      });
    }
    catch (e) {
      console.log('cry');
      // OK the 404 was fake?? It DOES do the auth and adds an auth token... in reality should be a 302 towards '/'

      // 404 is a good/expected response?
      // 401 probably not
    } finally {
      await saveCookieJar();
    }
  }

  // 2nd check

  if (await cookieStore.findCookie("mealime.com", "/", "auth_token") == null) {
    console.error("super fail, no auth possible")
    throw "fail";
  }

  // there was a second hoop...
  // TODO: if things go wrong here we might not handle the error so well now
  // make sure the reset also clears the xcsrf token

  if (xcsrfToken == null) {
    // from <meta name="csrf-token" content="..." />
    // "x-csrf-token": "......",
    // after authentication, '<ng-view></ng-view>\n\n\n' will be returned by this!
    let appText = await client(`${baseURL}/`).text();
    await saveCookieJar();
    const xcsrfMatch = /name="csrf-token" content="([^"]+)"/.exec(appText);
    if (!xcsrfMatch) {
      console.warn(xcsrfError);
      throw xcsrfError;
    }
    console.log("xsrf token found :)")
    xcsrfToken = xcsrfMatch[1];

    // for further API requests
    client = client.extend({
      headers: {
        "x-csrf-token": xcsrfToken,
        "x-requested-with": "XMLHttpRequest",
      }
    })
  }
  console.log("we have auth!");
  return true;
}

async function addItem(item: string, quantity?: string) {
  console.log(await client.post(`${baseURL}/api/grocery_list_items`, {
    "form": {
      "grocery_list_item[is_complete]": false,
      "grocery_list_item[section_id]": 17,
      "grocery_list_item[quantity]": '',
      "grocery_list_item[ingredient_name]": item
    },
    "headers": {
      "accept": "*/*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "pragma": "no-cache",
      "sec-ch-ua": "\"Google Chrome\";v=\"105\", \"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"105\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "referer": "https://app.mealime.com/",
    },
  }).text())
  await saveCookieJar();
  return { result: `${item} added!` }
}



const authHandler: preHandlerHookHandler = (request, reply, done) => {
  if (request.headers.authorization == null) {
    console.log("request does not include auth header");
    reply.code(403).send();
    done();
    return;
  }

  let match = /Bearer ([a-zA-Z0-9]+)/.exec(request.headers.authorization);
  if (match && match[1] !== process.env.TOKEN) {
    console.log("request does not include right auth header");
    reply.code(403).send();
    done();
    return;
  }
  done();
};
const addOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        item: {
          type: 'string'
        }
      }
    },
    headers: {
      type: 'object',
      properties: {
        'Authorization': {
          type: 'string'
        }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          pong: {
            type: 'string'
          }
        }
      }
    }
  },
  preHandler: authHandler
}

server.post('/add', addOpts, async (request, reply) => {
  let item: string = '';
  try {
    let loggedIn = await login();
    item = (request.body as { item: string; }).item;
    return await addItem(item);
  } catch (error) {
    if (error == xcsrfError) {
      // retry once
      try {
        await reset();
        if (item != '') { return await addItem(item) } else {
          reply.code(500).send({ "result": "weird parsing error" })
          return;
        }
      } catch (e2) {
        console.log("didn't work", e2)
        reply.code(500).send({ "result": "didn't work" })
        return;
      }
    } else if (error instanceof HTTPError) {
      console.error(await error.response.body)
      return;
    }
    reply.code(500).send({ "result": "unexpected error" })
  }
})


const resetOpts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          pong: {
            type: 'string'
          }
        }
      }
    }
  },
  preHandler: authHandler
}

async function reset() {
  await fs.rm('./' + fileName)
  // clear cached headers etc. 
  client = got.extend({});
  await login();
}

server.post('/reset', resetOpts, async (_, reply) => {
  try {
    await reset();
    return "OK"
  } catch (e) {
    return reply.code(500)
  }
})

const start = async () => {
  try {
    await server.listen({ host: '0.0.0.0', port: 3000 })

    const address = server.server.address()
    const port = typeof address === 'string' ? address : address?.port

  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()