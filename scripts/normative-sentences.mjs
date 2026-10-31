// Find normative obligation sentences in specification Markdown and whether each
// starts with a requirement anchor (Proposal 0033). Fenced code, headings, and
// code spans are ignored; each paragraph, list item, and table row is a block.

const obligation = /\b(?:MUST|SHALL|SHOULD|REQUIRED|RECOMMENDED)\b/;
const anchor = /<a id="(req-[a-z0-9-]+)"><\/a>/;
const abbreviations = /\b(?:e\.g|i\.e|etc|vs)\.$/;

function blocks(text) {
  const result = [];
  let current = [];
  let start = 0;
  let fenced = false;
  const flush = () => {
    if (current.length) result.push({ line: start, text: current.join(' ') });
    current = [];
  };
  text.split('\n').forEach((raw, index) => {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      flush();
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (!line.trim() || /^#{1,6} /.test(line)) {
      flush();
      return;
    }
    const isTableRow = /^\s*\|/.test(line);
    const isItem = /^\s*(?:[-*+]|\d+\.)\s/.test(line);
    if (isTableRow || isItem) flush();
    if (!current.length) start = index + 1;
    current.push(line.trim());
    if (isTableRow) flush();
  });
  flush();
  return result;
}

function sentences(block) {
  // Code spans and quoted key words, as in the RFC 2119 boilerplate, state no obligation.
  const text = block.replace(/`[^`]*`/g, '`code`').replace(/"(?:NOT )?[A-Z]+(?: NOT)?"/g, '"keyword"');
  const parts = [];
  let begin = 0;
  for (const match of text.matchAll(/[.!?](?=\s+(?:[A-Z<*[(`"]|\d))/g)) {
    const candidate = text.slice(begin, match.index + 1);
    if (abbreviations.test(candidate)) continue;
    parts.push(candidate);
    begin = match.index + 1;
  }
  parts.push(text.slice(begin));
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Returns { line, sentence, anchor } for every sentence that states an obligation. A requirement
// anchor covers the sentence it starts and the following sentences of its block, up to the next
// anchor, so one requirement may span several sentences.
export function obligationSentences(markdown) {
  const found = [];
  for (const block of blocks(markdown)) {
    let current;
    for (const sentence of sentences(block.text)) {
      const keyword = sentence.search(obligation);
      const anchors = [...sentence.matchAll(new RegExp(anchor.source, 'g'))];
      if (keyword >= 0) {
        const leading = anchors.filter((match) => match.index < keyword).at(-1);
        found.push({ line: block.line, sentence, anchor: leading?.[1] ?? current });
      }
      if (anchors.length) current = anchors.at(-1)[1];
    }
  }
  return found;
}
