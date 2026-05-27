import type { NewPin, Pin } from '@/types/Pin';

export type ListOpts = {
  cursor?: string;
  limit: number;
  query?: string;
};

export type ListResult = {
  pins: Pin[];
  nextCursor?: string;
};

/**
 * The swap-point. UI and Redux code only depend on this interface;
 * `IndexedDbPinRepository` is today's implementation, `HttpPinRepository`
 * is tomorrow's. See SPEC §4.1 / DR-1.
 *
 * All read methods take an optional AbortSignal so HTTP impls can cancel
 * in-flight requests when the caller moves on (DR-15). IDB impls are free
 * to ignore the signal — IDB has no native cancellation.
 */
export interface PinRepository {
  list(opts: ListOpts, signal?: AbortSignal): Promise<ListResult>;
  suggest(prefix: string, limit: number, signal?: AbortSignal): Promise<string[]>;
  create(pin: NewPin, signal?: AbortSignal): Promise<Pin>;
  getById(id: string, signal?: AbortSignal): Promise<Pin | undefined>;
  /**
   * Release any object URLs the repository created on behalf of the given pin.
   * Callers should invoke this when a pin is removed from in-memory state so
   * the URL cache doesn't leak. Optional — no-op impls are valid.
   */
  revoke?(pinId: string): void;
}

export class RepositoryError extends Error {
  readonly cause: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RepositoryError';
    this.cause = cause;
  }
}
