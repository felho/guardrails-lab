/* Runtime configuration. Secrets come from the environment, never from the code. */

export const PORT = Number(process.env.PORT ?? 3000);

/* The packing team's token, read when it is needed. Without it the warehouse endpoints refuse every request. */
export function staffToken(): string {
  return process.env.STAFF_TOKEN ?? '';
}
