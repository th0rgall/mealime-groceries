import { MEALIME_SECTIONS } from "./constants.ts";
import { parseYAML, z } from "./deps.ts";

type ProductsBySectionNameZodSchema = {
  -readonly [key in keyof typeof MEALIME_SECTIONS]: z.ZodOptional<
    z.ZodArray<
      z.ZodString,
      "atleastone"
    >
  >;
};

const productsBySectionNameZodSchema = z.object(
  Object.fromEntries(
    Object.entries(MEALIME_SECTIONS).map((
      [k, _],
    ) => [k, z.string().array().nonempty().optional()]),
  ) as ProductsBySectionNameZodSchema,
).strict();
// Strict mode does not allow unrecognized keys

export default async () => {
  // Parse if unparsed yet
  const yamlDatabaseObject = parseYAML(
    await Deno.readTextFile("./src/products.yaml"),
  );
  return productsBySectionNameZodSchema.parse(yamlDatabaseObject);
};
