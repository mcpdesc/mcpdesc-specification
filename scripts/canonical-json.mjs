const ROOT_KEY_ORDER = [
  '$schema',
  '$id',
  'title',
  'description',
  'type',
  'required',
  'additionalProperties',
  'properties',
  'patternProperties',
  '$defs'
];
const ROOT_KEY_RANK = new Map(ROOT_KEY_ORDER.map((key, index) => [key, index]));

function compareRootKeys(left, right) {
  const leftRank = ROOT_KEY_RANK.get(left) ?? ROOT_KEY_ORDER.length;
  const rightRank = ROOT_KEY_RANK.get(right) ?? ROOT_KEY_ORDER.length;
  return leftRank - rightRank || left.localeCompare(right);
}

function canonicalizeObject(value, root = false) {
  if (Array.isArray(value)) return value.map((child) => canonicalizeObject(child));
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort(root ? compareRootKeys : undefined)
      .map((key) => [key, canonicalizeObject(value[key])])
  );
}

export function formatCanonicalJson(value) {
  return `${JSON.stringify(canonicalizeObject(value, true), null, 2)}\n`;
}

export function canonicalizeJsonSource(source) {
  return formatCanonicalJson(JSON.parse(source));
}
