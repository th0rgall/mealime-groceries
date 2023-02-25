// Generated from the web-adding modal with this code:
// console.log("{\n" + Array.from(document.querySelectorAll('select[ng-model="newItem.section_id"] option'))
//   .map(el => `"${el.label}": ${el.value.split(':')[1]}`).join(',\n') + "}")
export const MEALIME_SECTIONS = {
  //   "Your Items": -1,
  "Produce": 4,
  "Deli & Specialty Cheese": 7,
  "Bakery": 6,
  "Meat & Seafood": 1,
  "Dairy, Cheese & Eggs": 2,
  "Breakfast": 22,
  "Coffee & Tea": 33,
  "Nut Butters, Honey & Jams": 11,
  "Baking & Spices": 8,
  "Rice, Grains & Beans": 3,
  "Canned & Jarred Goods": 9,
  "Pasta & Sauces": 15,
  "Oils, Sauces & Condiments": 14,
  "International": 5,
  "Frozen": 13,
  "Snacks": 19,
  "Nuts, Seeds & Dried Fruit": 12,
  "Candy": 27,
  "Beverages": 18,
  "Wine, Beer & Spirits": 23,
  "Personal Care": 21,
  "Health": 28,
  "Baby": 25,
  "Household": 32,
  "Kitchen": 26,
  "Cleaning Products": 20,
  "Pet Care": 24,
  "Party": 29,
  "Floral": 30,
  "Customer Service": 31,
  "Other": 17,
} as const;

export type MealimeSectionName = keyof typeof MEALIME_SECTIONS;

export const MEALIME_SECTION_NAMES = Object.keys(
  MEALIME_SECTIONS,
) as MealimeSectionName[];
