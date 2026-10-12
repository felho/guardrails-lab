/*
 * Codex edits files with apply_patch: the hook input carries the whole patch in tool_input.command, not a file name.
 * This reads the file operations and the added / removed lines out of it, so the Codex hooks can apply the same
 * rules as the Claude Code hooks (which get file_path and new_string). Lines are trimmed of \r and matched loosely,
 * and anything that looks like a header but does not parse makes the patch unreadable, so the caller fails closed.
 */
const FILE_LINE = /^\s*\*\*\*\s*(Update|Add|Delete)\s+File:\s*(.+?)\s*$/i;
const MOVE_LINE = /^\s*\*\*\*\s*(Move)\s+to:\s*(.+?)\s*$/i;
const HEADER_LIKE = /\*\*\*.*\b(File|Move to)\s*:/i;

export function parsePatch(command = '') {
  const ops = [];
  const added = [];
  const removed = [];
  let unreadable = false;
  for (const raw of command.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const header = FILE_LINE.exec(line) ?? MOVE_LINE.exec(line);
    if (header) ops.push({ op: header[1].toLowerCase(), file: header[2] });
    else if (HEADER_LIKE.test(line)) unreadable = true;
    else if (line.startsWith('+')) added.push(line.slice(1));
    else if (line.startsWith('-')) removed.push(line.slice(1));
  }
  if (command.trim() && ops.length === 0) unreadable = true;
  return { ops, files: ops.map((o) => o.file), added: added.join('\n'), removed: removed.join('\n'), unreadable };
}
