/* ====== Minimal Markdown renderer for analysis/<id>.md ======
 * Supports what the analysis files use: # headings, paragraphs, **bold**, `code`,
 * ``` fenced blocks, | tables |, - / 1. lists (nested by indent), > quotes, ---.
 * All text is HTML-escaped first, so the output never contains raw HTML from the file.
 */
function renderMarkdown(src) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const isTableRow = l => /^\s*\|.*\|\s*$/.test(l);
  const isListItem = l => /^(\s*)([-*]|\d+\.)\s+/.test(l);
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const startsBlock = l => /^(#{1,6}\s|```|>\s?|---\s*$)/.test(l) || isTableRow(l) || isListItem(l);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Fenced code block
    if (line.startsWith('```')) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;  // closing fence
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // Table: header row, separator row, body rows
    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      out.push('<div class="md-table-wrap"><table><thead><tr>' +
        head.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(body.join(' '))}</blockquote>`);
      continue;
    }

    // List (nesting by indentation)
    if (isListItem(line)) {
      const html = [];
      const stack = [];  // [{ indent, tag }]
      while (i < lines.length && isListItem(lines[i])) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        const indent = m[1].length;
        const tag = /\d/.test(m[2]) ? 'ol' : 'ul';
        while (stack.length && indent < stack[stack.length - 1].indent) html.push(`</li></${stack.pop().tag}>`);
        const top = stack[stack.length - 1];
        if (!top || indent > top.indent) {
          html.push(`<${tag}>`);
          stack.push({ indent, tag });
        } else {
          html.push('</li>');
        }
        html.push(`<li>${inline(m[3])}`);
        i++;
      }
      while (stack.length) html.push(`</li></${stack.pop().tag}>`);
      out.push(html.join(''));
      continue;
    }

    // Paragraph: consecutive plain lines
    const body = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) body.push(lines[i++]);
    out.push(`<p>${inline(body.join(' '))}</p>`);
  }
  return out.join('\n');
}
