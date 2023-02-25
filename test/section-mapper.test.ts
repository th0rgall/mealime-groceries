import { assertEquals } from "std/testing/asserts.ts";
import { MEALIME_SECTIONS } from "../src/constants.ts";
import sectionMapper from "../src/section-mapper.ts";

// Compact form: name and function
Deno.test("sunflower oil maps to oil", () => {
  assertEquals(
    sectionMapper("sunflower oil"),
    MEALIME_SECTIONS["Oils, Sauces & Condiments"],
  );
});

Deno.test("apple maps to produce", () => {
  assertEquals(sectionMapper("apple"), MEALIME_SECTIONS.Produce);
});

// failed because: black also appears in "black beans"
Deno.test({
  name: "black pepper maps to baking & spices (recorded: pepper)",
  fn() {
    assertEquals(
      sectionMapper("black pepper"),
      MEALIME_SECTIONS["Baking & Spices"],
    );
  },
});

Deno.test("vinegar maps to oils (recorded: apple cider vinegar)", () => {
  assertEquals(
    sectionMapper("vinegar"),
    MEALIME_SECTIONS["Oils, Sauces & Condiments"],
  );
});

Deno.test({
  name: "'kfdsja bean' maps to beans",
  fn: () => {
    assertEquals(
      sectionMapper("kfdsja bean"),
      MEALIME_SECTIONS["Rice, Grains & Beans"],
    );
  },
});
Deno.test("smoked tofu to Deli", () => {
  assertEquals(
    sectionMapper("smoked tofu"),
    MEALIME_SECTIONS["Deli & Specialty Cheese"],
  );
});

Deno.test("paprika powder to spices", () => {
  assertEquals(
    sectionMapper("paprika powder"),
    MEALIME_SECTIONS["Baking & Spices"],
  );
});

// Unsupported case: black appears in 'black pepper' too
// Deno.test("'black bnzea' maps to other", () => {
//   assertEquals(
//     sectionMapper("black bnzea"),
//     MEALIME_SECTIONS["Other"],
//   );
// });

// Cleaning

Deno.test("query can include extra strings", () => {
  assertEquals(sectionMapper("   apple \n"), MEALIME_SECTIONS.Produce);
});
