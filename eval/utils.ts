const RETRYABLE_STATUS = new Set([429, 529]);
const MAX_ATTEMPTS = 5;

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status =
        err instanceof Error && "status" in err ? (err as { status: number }).status : 0;
      const isLast = attempt === MAX_ATTEMPTS - 1;
      if (!RETRYABLE_STATUS.has(status) || isLast) throw err;
      const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
      process.stdout.write(` [retry in ${delay / 1000}s]`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}
