const fs = require('fs');
const path = require('path');

const dir = __dirname;
const fremdPath = path.join(dir, 'f4.fremdwörter.txt');
const f4Path = path.join(dir, 'f4.txt');

// Parse "word: „definition"" lines
function parseFremdwoerter(content) {
  const entries = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(': ');
    if (colonIdx === -1) continue;
    let word = trimmed.slice(0, colonIdx).trim();
    let definition = trimmed.slice(colonIdx + 2).trim();
    // Remove opening „ (U+201E) / " (U+201C) and closing " (U+201D) / " from word and definition
    const openQuote = /^[\u201E\u201C"]/;
    const closeQuote = /[\u201C\u201D"]$/;
    word = word.replace(openQuote, '').replace(closeQuote, '').trim();
    definition = definition.replace(openQuote, '').replace(closeQuote, '').trim();
    if (word && definition) entries.push({ word, definition });
  }
  // Longest words first to avoid partial matches
  entries.sort((a, b) => b.word.length - a.word.length);
  return entries;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fix existing wrong form: **word [definition]** → **word** [definition]
function fixBoldBracketInContext(context, entries) {
  let result = context;
  for (const { word, definition } of entries) {
    const wrong = '**' + word + ' [' + definition + ']**';
    const right = '**' + word + '** [' + definition + ']';
    result = result.split(wrong).join(right);
  }
  return result;
}

function addDefinitionsToContext(context, entries) {
  let result = context;
  for (const { word, definition } of entries) {
    const escaped = escapeRegex(word);
    const bracket = ' [' + definition + ']';
    // 1) word** → ** stays after word: "**word**" → "**word** [definition]"
    const reBold = new RegExp(escaped + '\\*\\*(?!\\s*\\[)', 'g');
    result = result.replace(reBold, word + '**' + bracket);
    // 2) word (without **) → "word [definition]", skip if already " [" or "**"
    const rePlain = new RegExp(escaped + '(?!\\s*\\[)(?!\\s*\\*\\*)', 'g');
    result = result.replace(rePlain, word + bracket);
  }
  return result;
}

const fremdContent = fs.readFileSync(fremdPath, 'utf8');
const entries = parseFremdwoerter(fremdContent);
console.log('Fremdwörter geladen:', entries.length);

const f4Content = fs.readFileSync(f4Path, 'utf8');
const lines = f4Content.split(/\r?\n/);
let changed = 0;

const newLines = lines.map((line) => {
  if (!line.startsWith('b. ')) return line;
  const pipeIdx = line.indexOf(' | ');
  if (pipeIdx === -1) return line;
  const title = line.slice(2, pipeIdx);
  let context = line.slice(pipeIdx + 3);
  context = fixBoldBracketInContext(context, entries);
  const newContext = addDefinitionsToContext(context, entries);
  if (newContext !== context) changed++;
  return 'b. ' + title + ' | ' + newContext;
});

fs.writeFileSync(f4Path, newLines.join('\n'), 'utf8');
console.log('b.context-Zeilen angepasst:', changed);
console.log('Fertig. f4.txt wurde aktualisiert.');
