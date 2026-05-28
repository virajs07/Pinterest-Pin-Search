import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbPinRepository } from './IndexedDbPinRepository';
import type { NewPin } from '@/types/Pin';

function resetDb(): void {
  globalThis.indexedDB = new IDBFactory();
}

function makeNewPin(description: string): NewPin {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
  const v = { blob, width: 100, height: 100, type: 'image/webp' as const };
  return {
    description,
    width: 100,
    height: 100,
    dominantColor: '#abcdef',
    responsive: { '170': v, '236': v, '474': v, '736': v, orig: v },
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('IndexedDbPinRepository', () => {
  let repo: IndexedDbPinRepository;

  beforeEach(() => {
    resetDb();
    repo = new IndexedDbPinRepository();
  });

  it('round-trips a created pin via getById', async () => {
    const created = await repo.create(makeNewPin('Cat photos'));
    expect(created.id).toMatch(/.+/);
    expect(created.description).toBe('Cat photos');
    expect(created.descriptionLower).toBe('cat photos');
    expect(created.dominantColor).toBe('#abcdef');
    expect(created.responsive.orig.width).toBe(100);
    expect(created.responsive.orig.type).toBe('image/webp');

    const fetched = await repo.getById(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.description).toBe('Cat photos');
  });

  it('list returns pins newest-first', async () => {
    const a = await repo.create(makeNewPin('a'));
    await wait(3);
    const b = await repo.create(makeNewPin('b'));
    await wait(3);
    const c = await repo.create(makeNewPin('c'));

    const { pins } = await repo.list({ limit: 10 });
    expect(pins.map((p) => p.id)).toEqual([c.id, b.id, a.id]);
  });

  it('list paginates stably via cursor', async () => {
    const created: string[] = [];
    for (let i = 0; i < 5; i++) {
      const p = await repo.create(makeNewPin(`p${i}`));
      created.push(p.id);
      await wait(3);
    }

    const page1 = await repo.list({ limit: 2 });
    expect(page1.pins.length).toBe(2);
    expect(page1.nextCursor).toBeDefined();

    const page2 = await repo.list({ limit: 2, cursor: page1.nextCursor });
    expect(page2.pins.length).toBe(2);

    const page3 = await repo.list({ limit: 2, cursor: page2.nextCursor });
    expect(page3.pins.length).toBe(1);
    expect(page3.nextCursor).toBeUndefined();

    const seen = [...page1.pins, ...page2.pins, ...page3.pins].map((p) => p.id);
    expect(seen).toEqual([...created].reverse());
  });

  it('list filters by query (description substring, case-insensitive)', async () => {
    await repo.create(makeNewPin('Cat photos'));
    await repo.create(makeNewPin('A happy cat'));
    await repo.create(makeNewPin('Dog photos'));
    const { pins } = await repo.list({ limit: 10, query: 'cat' });
    const descriptions = pins.map((p) => p.description).sort();
    expect(descriptions).toEqual(['A happy cat', 'Cat photos']);
  });

  it('suggest matches anywhere in the description, case-insensitive', async () => {
    await repo.create(makeNewPin('Cat photos'));
    await repo.create(makeNewPin('My favorite cat'));
    await repo.create(makeNewPin('Category'));
    await repo.create(makeNewPin('Dog'));
    const matches = await repo.suggest('cat', 5);
    expect(matches.sort()).toEqual(['Cat photos', 'Category', 'My favorite cat']);
  });

  it('suggest returns at most `limit` entries', async () => {
    await repo.create(makeNewPin('Cat photos'));
    await repo.create(makeNewPin('Category'));
    await repo.create(makeNewPin('Catalog'));
    const matches = await repo.suggest('cat', 2);
    expect(matches.length).toBe(2);
  });

  it('suggest with empty prefix returns empty', async () => {
    await repo.create(makeNewPin('Cat photos'));
    const matches = await repo.suggest('', 5);
    expect(matches).toEqual([]);
  });

  it('getById returns undefined for an unknown id', async () => {
    const result = await repo.getById('nope');
    expect(result).toBeUndefined();
  });
});
