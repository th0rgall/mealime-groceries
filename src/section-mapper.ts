import { MEALIME_SECTIONS, MealimeSectionName } from "./constants.ts";
import loadProducts from "./product-loader.ts";

const productsBySectionId = Object.fromEntries(
  Object.entries(await loadProducts()).map((
    [sectionName, products],
  ) => // the casts should work, because due to the .strict() option, sectionName must be a valid section.
  [MEALIME_SECTIONS[sectionName as MealimeSectionName], products]),
) as { [key: number]: [string, ...string[]] };

const findSectionMatchesFor = (word: string) => {
  // The lower the index, the higher the priority
  const candidateSections: string[] = [];

  // .entries casts a number to a string
  Object.entries(productsBySectionId).forEach(([sectionId, products]) => {
    // simple exact check
    if (products.includes(word)) {
      candidateSections.push(sectionId);
    }

    // check for singular/plural match
    // e.g. 'apple' is the same as recorded 'apples'
    const singulars = products.filter((p) => p.endsWith("s")).map((p) =>
      p.substring(0, p.length - 1)
    );
    if (singulars.includes(word)) {
      candidateSections.push(sectionId);
    }

    // Check if the word matches one of the words in one of the multi-word products
    const allProductWords = products.filter((p) => p.includes(" ")).flatMap((
      p,
    ) => p.split(" "))
      // also include singulars
      .flatMap((w) =>
        w.endsWith("s") ? [w, w.substring(0, w.length - 1)] : [w]
      );
    if (allProductWords.includes(word)) {
      candidateSections.push(sectionId);
    }
  });

  return candidateSections;
};

/**
 * Takes in a query, and returns the Mealime section ID it should be assigned to.
 */
export default (query: string) => {
  // Clean query
  query = query.trim().toLowerCase();

  const queryWords = query.split(" ");

  const singularWord = (word: string) =>
    word.endsWith("s") ? word.substring(0, query.length - 1) : word;

  // Find exact matchess
  let candidateSections = findSectionMatchesFor(query);

  // Find singular query matches
  candidateSections = [
    ...candidateSections,
    ...findSectionMatchesFor(singularWord(query)),
  ];

  //  Find query word matches
  queryWords.forEach((word) => {
    candidateSections = [
      ...candidateSections,
      ...findSectionMatchesFor(word),
      ...findSectionMatchesFor(singularWord(word)),
    ];
  });

  return +(candidateSections[0] ?? MEALIME_SECTIONS.Other);
};
