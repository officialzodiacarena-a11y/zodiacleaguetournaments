// Postgres error code for `lock_timeout` exceeded is 55P03.
const LOCK_TIMEOUT_PG_CODE = '55P03';

interface RpcErrorLike {
  code?: string;
  message?: string;
}

export function isLockTimeoutError(error: RpcErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code === LOCK_TIMEOUT_PG_CODE) return true;
  return typeof error.message === 'string' && error.message.toLowerCase().includes('lock timeout');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff retry for RPCs guarded by `SET LOCAL lock_timeout`.
 * Per spec: retry up to 2 times at 1s then 2s before surfacing LOCK_TIMEOUT.
 */
export async function callWithLockRetry<T>(
  attempt: () => Promise<{ data: T | null; error: RpcErrorLike | null }>
): Promise<{ data: T | null; error: RpcErrorLike | null; lockTimedOut: boolean }> {
  const delays = [1000, 2000];

  let result = await attempt();
  for (const delay of delays) {
    if (!isLockTimeoutError(result.error)) break;
    await sleep(delay);
    result = await attempt();
  }

  return { ...result, lockTimedOut: isLockTimeoutError(result.error) };
}
