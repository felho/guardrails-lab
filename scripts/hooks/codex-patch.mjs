/*
 * Codex edits files with apply_patch: the hook input carries the whole patch in tool_input.command, not a file name.
 * This reads the file names and the added / removed lines out of it, so the Codex hooks can apply the same rules
 * as the Claude Code hooks (which get file_path and new_string). Lines are trimmed of \r and matched loosely, and a
 * patch that names no file at all is reported, so the caller can fail closed.
 */
const FILE_LINE = /^\*\*\*\s*(?:Update|Add|Delete)\s+File:\s*(.+?)\s*$/i;
const MOVE_LINE = /^\*\*\*\s*Move\s+to:\s*(.+?)\s*$/i;
const HEADER_LIKE = /^\*\*\*.*\bFile:|^\*\*\*.*\bMove to:/i;

export function parsePatch(command = '') {
  const files = [];
  const added = [];
  const removed = [];
  let unreadable = false;
  for (const raw of command.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const file = FILE_LINE.exec(line) ?? MOVE_LINE.exec(line);
    if (file) files.push(file[1]);
    else if (HEADER_LIKE.test(line)) unreadable = true;
    else if (line.startsWith('+')) added.push(line.slice(1));
    else if (line.startsWith('-')) removed.push(line.slice(1));
  }
  if (command.trim() && files.length === 0) unreadable = true;
  return { files, added: added.join('\n'), removed: removed.join('\n'), unreadable };
}
