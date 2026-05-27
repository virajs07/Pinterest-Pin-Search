import { v4 as uuid } from 'uuid';
import type { IDBPDatabase } from 'idb';
import type { NewPin, Pin, ResponsiveImages, ResponsiveSizeKey } from '@/types/Pin';
import { RESPONSIVE_SIZES } from '@/types/Pin';
import { openPinDb, type PinRecord, type PinsDB, type StoredVariant } from './db';
import {
  RepositoryError,
  type ListOpts,
  type ListResult,
  type PinRepository,
} from './PinRepository';

export class IndexedDbPinRepository implements PinRepository {
  private dbPromise: Promise<IDBPDatabase<PinsDB>>;
  private urlCache = new Map<string, string>();

  constructor(dbPromise?: Promise<IDBPDatabase<PinsDB>>) {
    this.dbPromise = dbPromise ?? openPinDb();
  }

  /** Drop cached object URLs for a pin. Call when removing the pin from state. */
  revoke(pinId: string): void {
    for (const size of RESPONSIVE_SIZES) {
      const key = blobKey(pinId, size);
      const url = this.urlCache.get(key);
      if (url) {
        URL.revokeObjectURL(url);
        this.urlCache.delete(key);
      }
    }
  }

  async create(newPin: NewPin, signal?: AbortSignal): Promise<Pin> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const id = uuid();
    const createdAt = Date.now();
    const descriptionLower = newPin.description.toLowerCase();
    const variants = {} as Record<ResponsiveSizeKey, StoredVariant>;
    for (const size of RESPONSIVE_SIZES) {
      const v = newPin.responsive[size];
      variants[size] = { width: v.width, height: v.height, type: v.type };
    }

    const record: PinRecord = {
      id,
      description: newPin.description,
      descriptionLower,
      width: newPin.width,
      height: newPin.height,
      dominantColor: newPin.dominantColor,
      createdAt,
      variants,
    };

    const db = await this.dbPromise;
    try {
      const tx = db.transaction(['pins', 'descriptions', 'blobs'], 'readwrite');
      await tx.objectStore('pins').put(record);

      const descStore = tx.objectStore('descriptions');
      const existing = await descStore.get(descriptionLower);
      if (existing) {
        existing.pinIds.push(id);
        await descStore.put(existing);
      } else {
        await descStore.put({ descriptionLower, description: newPin.description, pinIds: [id] });
      }

      const blobStore = tx.objectStore('blobs');
      for (const size of RESPONSIVE_SIZES) {
        const v = newPin.responsive[size];
        await blobStore.put({ blob: v.blob }, blobKey(id, size));
      }

      await tx.done;
    } catch (err) {
      throw new RepositoryError('Failed to create pin', err);
    }

    const [pin] = await this.materializeMany([record]);
    if (!pin) throw new RepositoryError('Failed to materialize created pin');
    return pin;
  }

  async getById(id: string, signal?: AbortSignal): Promise<Pin | undefined> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const db = await this.dbPromise;
    const record = await db.get('pins', id);
    if (!record) return undefined;
    const [pin] = await this.materializeMany([record]);
    return pin;
  }

  async list(opts: ListOpts, signal?: AbortSignal): Promise<ListResult> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const { limit } = opts;
    if (opts.query) {
      return this.listByQuery(opts.query, opts.cursor, limit);
    }
    return this.listByFeedOrder(opts.cursor, limit);
  }

  async suggest(prefix: string, limit: number, signal?: AbortSignal): Promise<string[]> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (prefix.length === 0) return [];
    const db = await this.dbPromise;
    const lower = prefix.toLowerCase();
    const range = IDBKeyRange.bound(lower, lower + '￿');
    const results: string[] = [];
    let cursor = await db.transaction('descriptions').objectStore('descriptions').openCursor(range);
    while (cursor && results.length < limit) {
      results.push(cursor.value.description);
      cursor = await cursor.continue();
    }
    return results;
  }

  // ---------- helpers ----------

  private async listByFeedOrder(rawCursor: string | undefined, limit: number): Promise<ListResult> {
    const db = await this.dbPromise;
    const tx = db.transaction('pins', 'readonly');
    const index = tx.objectStore('pins').index('byCreatedAtId');
    const decoded = decodeCursor(rawCursor);
    const range = decoded
      ? IDBKeyRange.upperBound([decoded.createdAt, decoded.id], true)
      : null;

    const records: PinRecord[] = [];
    let cursor = await index.openCursor(range, 'prev');
    while (cursor && records.length < limit) {
      records.push(cursor.value);
      cursor = await cursor.continue();
    }
    await tx.done;

    return this.assemblePage(records, limit);
  }

  private async listByQuery(
    query: string,
    rawCursor: string | undefined,
    limit: number,
  ): Promise<ListResult> {
    const db = await this.dbPromise;
    const lower = query.toLowerCase();
    const range = IDBKeyRange.bound(lower, lower + '￿');

    const tx = db.transaction('pins', 'readonly');
    const index = tx.objectStore('pins').index('byDescriptionLower');
    const all: PinRecord[] = [];
    let cursor = await index.openCursor(range);
    while (cursor) {
      all.push(cursor.value);
      cursor = await cursor.continue();
    }
    await tx.done;

    all.sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));

    const offset = rawCursor
      ? Math.max(0, all.findIndex((r) => encodeCursor(r.createdAt, r.id) === rawCursor) + 1)
      : 0;
    const page = all.slice(offset, offset + limit);
    return this.assemblePage(page, limit, offset + page.length < all.length);
  }

  private async assemblePage(
    records: PinRecord[],
    limit: number,
    forceHasMore?: boolean,
  ): Promise<ListResult> {
    const pins = await this.materializeMany(records);
    const last = records[records.length - 1];
    const hasMore = forceHasMore ?? records.length === limit;
    const nextCursor = last && hasMore ? encodeCursor(last.createdAt, last.id) : undefined;
    return { pins, nextCursor };
  }

  /**
   * Materialize a batch of pin records, fetching all needed blobs in a single
   * read-only transaction. The url cache is consulted first so already-seen
   * blobs incur zero IDB cost. (I3 from the code review.)
   */
  private async materializeMany(records: PinRecord[]): Promise<Pin[]> {
    if (records.length === 0) return [];

    const missing: string[] = [];
    for (const record of records) {
      for (const size of RESPONSIVE_SIZES) {
        const key = blobKey(record.id, size);
        if (!this.urlCache.has(key)) missing.push(key);
      }
    }

    if (missing.length > 0) {
      const db = await this.dbPromise;
      const tx = db.transaction('blobs', 'readonly');
      const store = tx.objectStore('blobs');
      const fetched = await Promise.all(missing.map((key) => store.get(key)));
      await tx.done;
      missing.forEach((key, i) => {
        const blobRec = fetched[i];
        if (blobRec && blobRec.blob instanceof Blob) {
          this.urlCache.set(key, URL.createObjectURL(blobRec.blob));
        }
      });
    }

    return records.map((record) => {
      const responsive = {} as ResponsiveImages;
      for (const size of RESPONSIVE_SIZES) {
        const v = record.variants[size];
        responsive[size] = {
          url: this.urlCache.get(blobKey(record.id, size)) ?? '',
          width: v.width,
          height: v.height,
          type: v.type,
        };
      }
      return {
        id: record.id,
        description: record.description,
        descriptionLower: record.descriptionLower,
        width: record.width,
        height: record.height,
        dominantColor: record.dominantColor,
        createdAt: record.createdAt,
        responsive,
      };
    });
  }
}

function blobKey(pinId: string, size: ResponsiveSizeKey): string {
  return `${pinId}:${size}`;
}

function encodeCursor(createdAt: number, id: string): string {
  return `${createdAt}:${id}`;
}

function decodeCursor(s: string | undefined): { createdAt: number; id: string } | undefined {
  if (!s) return undefined;
  const colon = s.indexOf(':');
  if (colon < 0) return undefined;
  return {
    createdAt: Number(s.slice(0, colon)),
    id: s.slice(colon + 1),
  };
}
