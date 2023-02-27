import { assertEquals } from "std/testing/asserts.ts";
import { splitItems } from "../src/mealime-api.ts";

Deno.test('The splitter works with three words, and varied use of "and" and ","', () => {
  assertEquals(splitItems("apples, peanut butter and bananas"), [
    "apples",
    "peanut butter",
    "bananas",
  ]);
});

Deno.test('The splitter does not get confused with "and" inside words', () => {
  assertEquals(splitItems("sour candy and peanut butter"), [
    "sour candy",
    "peanut butter",
  ]);
});

Deno.test('The splitter supports "&" as well', () => {
  assertEquals(splitItems("sour candy & peanut butter"), [
    "sour candy",
    "peanut butter",
  ]);
});
