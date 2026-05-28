import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ImageMime, ResponsiveSizeKey } from '@/types/Pin';

export type StoredVariant = {
  width: number;
  height: number;
  type: ImageMime;
};

export type PinRecord = {
  id: string;
  description: string;
  descriptionLower: string;
  width: number;
  height: number;
  dominantColor: string;
  createdAt: number;
  variants: Record<ResponsiveSizeKey, StoredVariant>;
};

export type DescriptionRecord = {
  descriptionLower: string;
  description: string;
  pinIds: string[];
};

export type BlobRecord = {
  blob: Blob;
};

export interface PinsDB extends DBSchema {
  pins: {
    key: string;
    value: PinRecord;
    // Only the compound (createdAt, id) index is read today; it powers stable
    // newest-first feed pagination. Substring queries and suggestions both
    // scan all records (see IndexedDbPinRepository.listByQuery / suggest), so
    // a plain `byDescriptionLower` prefix index would not help.
    indexes: {
      byCreatedAtId: [number, string];
    };
  };
  descriptions: {
    key: string;
    value: DescriptionRecord;
  };
  blobs: {
    key: string;
    value: BlobRecord;
  };
}

export const DB_NAME = 'pin-search-create';
export const DB_VERSION = 1;

export function openPinDb(): Promise<IDBPDatabase<PinsDB>> {
  return openDB<PinsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const pins = db.createObjectStore('pins', { keyPath: 'id' });
      pins.createIndex('byCreatedAtId', ['createdAt', 'id']);
      db.createObjectStore('descriptions', { keyPath: 'descriptionLower' });
      db.createObjectStore('blobs');
    },
  });
}
