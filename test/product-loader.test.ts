import { assert } from "std/testing/asserts.ts";
import productLoader from "../src/product-loader.ts";

Deno.test("Products load properly and have a valid format", async () => {
  const products = await productLoader();
  assert((products["Produce"]?.length || -1) > 1);
});
