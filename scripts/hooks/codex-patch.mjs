/*
 * Codex edits files with apply_patch: the hook input carries the whole patch in tool_input.command, not a file name.
 * This reads the file names and the added / removed lines out of it, so the Codex hooks can apply the same rules
 * as the Claude Code hooks (which get file_path and new_string).
 */
const FILE_LINE = /^\*\*\* (?:Update|Add|Delete) File: (.+)$/;
const MOVE_LINE = /^\*\*\* Move to: (.+)$/;

export function parsePatch(command = '') {
  const files = [];
  const added = [];
  const removed = [];
  for (const line of command.split('\n')) {
    const file = FILE_LINE.exec(line) ?? MOVE_LINE.exec(line);
    if (file) files.push(file[1].trim());
    else if (line.startsWith('+')) added.push(line.slice(1));
    else if (line.startsWith('-')) removed.push(line.slice(1));
  }
  return { files, added: added.join('\n'), removed: removed.join('\n') };
}
