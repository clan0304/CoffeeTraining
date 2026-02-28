/**
 * Common coffee flavor descriptors organized by category.
 * Based on the SCA Coffee Taster's Flavor Wheel.
 */
export const FLAVOR_CATEGORIES: Record<string, string[]> = {
  fruity: [
    'berry', 'blackberry', 'blueberry', 'raspberry', 'strawberry',
    'cherry', 'cranberry', 'pomegranate', 'grape', 'apple', 'pear',
    'peach', 'apricot', 'plum', 'prune', 'raisin', 'fig', 'date',
    'lemon', 'lime', 'grapefruit', 'orange', 'tangerine', 'citrus',
    'tropical', 'mango', 'pineapple', 'papaya', 'coconut', 'passion fruit',
    'melon', 'watermelon',
  ],
  sweet: [
    'caramel', 'brown sugar', 'honey', 'maple syrup', 'molasses',
    'vanilla', 'chocolate', 'dark chocolate', 'milk chocolate', 'cocoa',
    'butterscotch', 'toffee', 'candy', 'sugar cane', 'marshmallow',
  ],
  nutty: [
    'almond', 'hazelnut', 'peanut', 'walnut', 'pecan', 'cashew',
    'macadamia', 'pistachio', 'nutty', 'roasted nuts',
  ],
  floral: [
    'floral', 'jasmine', 'rose', 'lavender', 'chamomile', 'hibiscus',
    'orange blossom', 'elderflower', 'violet', 'honeysuckle',
  ],
  spicy: [
    'cinnamon', 'clove', 'nutmeg', 'cardamom', 'ginger', 'pepper',
    'black pepper', 'anise', 'allspice', 'spicy',
  ],
  roasted: [
    'roasted', 'smoky', 'ashy', 'burnt', 'toasted', 'tobacco',
    'pipe tobacco', 'charred', 'carbon', 'dark roast',
  ],
  earthy: [
    'earthy', 'musty', 'soil', 'woody', 'cedar', 'oak',
    'leather', 'mushroom', 'damp', 'mossy',
  ],
  herbal: [
    'herbal', 'tea-like', 'green tea', 'black tea', 'mint', 'basil',
    'sage', 'thyme', 'eucalyptus', 'grassy', 'vegetal', 'hay',
  ],
  grain: [
    'grain', 'wheat', 'oat', 'malt', 'barley', 'bread', 'toast',
    'cereal', 'graham cracker', 'biscuit',
  ],
  body: [
    'light', 'medium', 'heavy', 'full', 'thin', 'silky', 'creamy',
    'buttery', 'syrupy', 'watery', 'round', 'smooth', 'velvety',
  ],
  acidity: [
    'bright', 'crisp', 'tart', 'sharp', 'mellow', 'soft', 'vibrant',
    'juicy', 'sparkling', 'tangy', 'sour', 'malic', 'citric', 'wine-like',
  ],
  finish: [
    'clean', 'lingering', 'dry', 'astringent', 'short', 'long',
    'pleasant', 'complex', 'sweet finish', 'bitter finish',
  ],
  defect: [
    'bitter', 'salty', 'sour', 'fermented', 'rubbery', 'medicinal',
    'baggy', 'papery', 'chemical', 'stale', 'flat',
  ],
}

/** Flat, sorted, deduplicated array of all common flavor words. */
export const COMMON_FLAVOR_WORDS: string[] = Array.from(
  new Set(Object.values(FLAVOR_CATEGORIES).flat())
).sort((a, b) => a.localeCompare(b))
