import { serve } from "./deps.ts";
import { z } from "./deps.ts";
import MealimeAPI, { CsrfError } from "./mealime-api.ts";

const mealime = new MealimeAPI(
  Deno.env.get("MEALIME_EMAIL"),
  Deno.env.get("MEALIME_PASSWORD"),
);

const handlePostItem = async (request: Request): Promise<Response> => {
  try {
    await mealime.login();
  } catch (_) {
    return new Response("Login failed", { status: 500 });
  }

  let item = "";

  try {
    // Validate input
    const itemResult = z.object({
      item: z.string().min(1),
    }).safeParse(await request.json());
    if (itemResult.success) {
      item = itemResult.data.item;
      const addResult = await mealime.addItem(item);
      return new Response(addResult.result, { status: 200 });
    } else {
      return new Response(itemResult.error.toString(), { status: 400 });
    }
  } catch (error) {
    if (
      error instanceof CsrfError ||
      error instanceof Deno.errors.PermissionDenied
    ) {
      // retry once
      try {
        console.log("Error while adding item, trying reset");
        await mealime.reset();
        // We know that the validation did not return an error,
        // so item is valid
        const addResult = await mealime.addItem(item);
        return new Response(addResult.result, { status: 200 });
      } catch (resetError) {
        console.error("Reset didn't work", resetError);
        return new Response("Reset didn't work", { status: 500 });
      }
    }
    console.error("Unexpected error");
    return new Response("Unexpected error", { status: 500 });
  }
};

const handler = async (request: Request): Promise<Response> => {
  const path = new URL(request.url).pathname;

  const authHeader = request.headers.get("authorization");

  // Authorize
  if (authHeader == null) {
    console.log("Request does not include auth header");
    return new Response("Not Authorized", { status: 403 });
  }

  const match = /Bearer ([a-zA-Z0-9]+)/.exec(authHeader);
  if (match && match[1] !== Deno.env.get("TOKEN")) {
    console.log("Request does not include the right auth header");
    return new Response("Not Authorized", { status: 403 });
  }

  // Route to endpoint
  if (request.method === "POST" && path === "/add") {
    return await handlePostItem(request);
  }

  if (request.method === "POST" && path === "/reset") {
    try {
      await mealime.reset();
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Error while resetting ", error);
      return new Response("NOK", { status: 500 });
    }
  }
  return new Response("Not Found", { status: 404 });
};

const port = 3000;
console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });
