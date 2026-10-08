import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/* The web client in public/ is served as plain files; nothing is generated. */

const PUBLIC_DIR = new URL('../public/', import.meta.url).pathname;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export type StaticFile = { type: string; content: Buffer };

export async function staticFile(pathname: string): Promise<StaticFile | undefined> {
  const relative = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  const type = TYPES[extname(relative)];
  if (!type) return undefined;
  try {
    return { type, content: await readFile(join(PUBLIC_DIR, relative)) };
  } catch {
    return undefined;
  }
}
