export function renderMarkdown(md: string): string {
  return md
    // headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-gray-800 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-gray-900 mt-4 mb-1.5">$1</h2>')
    // checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-start gap-1.5"><span class="text-green-500 mt-0.5">&#9745;</span><span class="line-through text-gray-400">$1</span></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start gap-1.5"><span class="text-gray-300 mt-0.5">&#9744;</span><span>$1</span></li>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
    // indented list items (2 spaces or more)
    .replace(/^  - (.+)$/gm, '<li class="ml-4 text-sm text-gray-600">$1</li>')
    // unordered list items
    .replace(/^- (.+)$/gm, '<li class="text-sm">$1</li>')
    // wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-0.5 my-1">$1</ul>')
    // line breaks for remaining lines
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export function renderContent(text: string): string {
  // If it already contains HTML tags, decode and return as-is
  const decoded = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  if (/<[a-z][\s\S]*>/i.test(decoded)) {
    return decoded;
  }
  // Otherwise render as markdown
  return renderMarkdown(text);
}
