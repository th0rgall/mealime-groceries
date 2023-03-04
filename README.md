# Mealime Grocery List API

This is a small server application that can items to your
[Mealime](https://www.mealime.com/) grocery list.

It wraps the internal [Mealime web app](https://app.mealime.com/login) grocery
list API, and takes care of authentication with your Mealime account. It is
written in TypeScript and uses the [Deno](https://deno.land/) runtime.

## Getting started

This application can run anywhere where Deno runs, but in particular, it works
for free and out-of-the-box on [Deno Deploy](https://deno.com/deploy).

Here's how to set it up:

1. Fork this repository
2. Create an account on [Deno Deploy](https://deno.com/deploy)
3. Set up a new Deno Deploy project
4. Click "Add Env Variable" to add environment variables. We need three:
   `MEALIME_EMAIL`, `MEALIME_PASSWORD` and `TOKEN`. Add these to the left of
   each variable line respectively. On the right, add their values:

   - For the email and password, fill in your Mealime credentials.
   - For the `TOKEN`, come up with some random text that will act as the
     "password" to your server. If you know your way around a terminal, you can
     generate a random 64-character string using
     `openssl rand -base64 64 | tr -d '\n' ; echo`.

5. Link the project to the `main` branch of your forked GitHub repository, then
   select the `index.ts` file.
6. Deploy!
7. If all goes well, Deno Deploy will list two domains for your app, take note
   of the shorter domain, for example, `username-mealime-groceries.deno.dev`.

Now you have your own personal Mealime API running _in the cloud_.

Next, let's connect Siri to it.

### Connect it to a Shortcut (iOS/ipadOS/macOS)

Add your shortcut, which you can base off this example:
[https://www.icloud.com/shortcuts/1eee03959780481ea1db7672565b4778](https://www.icloud.com/shortcuts/1eee03959780481ea1db7672565b4778)

1. Replace "Get contents of" URL with
   `https://username-mealime-groceries.deno.dev/add`, using the domain name you
   took note of earlier. Make sure `https://` is in front, and `/add` is at the
   end.
2. In the details of the "Get contents of" action, in the Authorization header,
   replace YOUR_TOKEN with the `TOKEN` that you set up before.

Now the integration should fully work! 🥳

For an idea for an Android integration, see below.

## API reference

You need to use this API with an iOS Shortcut, you can also call it directly, or
integrate it into another project.

### The `/add` endpoint:

- Expects the `Authorization: Bearer YOUR_TOKEN` header
- Automatically logs you into the Mealime account of the provided credentials,
  before adding the products.
- Currently only accepts JSON bodies of the type:
  ```
  {
      item: 'apples and pears'
  }
  ```

  You can use `and`, `&` and `,` in your item query string to separate multiple
  products.

### The `/reset` endpoint:

- It expects the `Authorization: Bearer YOUR_TOKEN` header
- This clears the cached CSRF tokens, cookies etc. used to authenticate with
  Mealime. On the next request, the app will log in into Mealime again.

## Running with Docker

Run with Docker, referencing environment variables in a `.env` file:

```
docker container run --rm --name mealime-deno -p 3000:3000 --env-file=.env ghcr.io/th0rgall/mealime-groceries:main
```

Or set up a Docker Compose file:

```
version: '3'
services:
  mealime:
    image: ghcr.io/th0rgall/mealime-groceries:main
    env_file:
      - .env
    ports:
      - '3000:3000'
```

### Behavior notes

When _not_ running on Deno Deploy (e.g. Docker), the server caches cookies to a
`cookies.json` file in the application directory, so they are preserved in case
your container restarts.

## Adding more product mappings

The application automatically maps products to sections.

This mapping is based on a static database,
[src/products.yaml](./src/products.yaml), and it is not exhaustive (at all!). If
you are missing products that you want to categorize to sections, add them to
the file (also feel free submit a PR!)

The [mapping code](src/section-mapper.ts) tries to assign products that are not
exactly listed in the database to the right section using partial word matches,
singular/plural matches, ... for example, "pinto beans" maps to the section
"Rice, Grains & Beans" because "bean" is listed in that section (which is a
partial word match, and a singular noun version of the query). These strategies
are limited, and will lead to wrong categorizations. In those cases, adding more
exact product matches are the easiest fix!

All available product sections in Mealime are listed in
[src/constants.ts](./src/constants.ts). The app will not run if invalid sections
are used in the mapping database.

## Android "OK Google" Integration using IFTTT

Unfortunately Android does not have a proper equivalent to Shortcuts, or at
least nothing that is as powerful as needed for this use case.

However, I've found a sketchy workaround using email and
[IFTTT](https://ifttt.com/).

It works as follows:

1. Set up an IFTTT applet with the "Email trigger".
   - If... an email is sent to `trigger@applet.ifttt.com` by your email address.
     Check which email you used for your IFTT account, because it needs to be
     the same one as your primary Android phone email address.
   - Then ... "Make a web request" that sends a POST request to your /add
     endpoint with the `Authorization: Bearer YOUR_TOKEN` header,
     `application/json` as the Content Type and `{ item: '[Body]}'}` as the
     Body, where [Body] is the email body that you can find from "Insert
     ingredients"
   -
2. Add a contact to your phone, which you name "Groceries", and give the email
   address "trigger@applet.ifttt.com"
3. You can now say something like
   `OK Google, send email [bananas] to groceries`. Google Assistant will ask you
   to confirm sending the email. This looks weird, but it works most of the
   time.
