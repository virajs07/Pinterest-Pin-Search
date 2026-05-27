import { describe, it, expect, expectTypeOf } from 'vitest';
import { RESPONSIVE_SIZES } from './Pin';
import type { NewPin, Pin, ResponsiveSizeKey } from './Pin';
import type { PinRepository } from '@/data/PinRepository';

describe('Pin types', () => {
  it('exposes the five responsive size keys in increasing order', () => {
    expect(RESPONSIVE_SIZES).toEqual(['170', '236', '474', '736', 'orig']);
  });

  it('allows a valid Pin literal', () => {
    const sample: Pin = {
      id: 'abc',
      description: 'cat photos',
      descriptionLower: 'cat photos',
      width: 800,
      height: 600,
      dominantColor: '#aa3bff',
      createdAt: 1700000000000,
      responsive: {
        '170': { url: 'u', width: 170, height: 128, type: 'image/webp' },
        '236': { url: 'u', width: 236, height: 177, type: 'image/webp' },
        '474': { url: 'u', width: 474, height: 356, type: 'image/webp' },
        '736': { url: 'u', width: 736, height: 552, type: 'image/webp' },
        orig: { url: 'u', width: 800, height: 600, type: 'image/webp' },
      },
    };
    expect(sample.id).toBe('abc');
  });

  it('NewPin omits id, createdAt, descriptionLower', () => {
    expectTypeOf<NewPin>().not.toHaveProperty('id');
    expectTypeOf<NewPin>().not.toHaveProperty('createdAt');
    expectTypeOf<NewPin>().not.toHaveProperty('descriptionLower');
  });

  it('NewPin variants carry a Blob, not a URL', () => {
    expectTypeOf<NewPin['responsive']['orig']>().toHaveProperty('blob');
    expectTypeOf<NewPin['responsive']['orig']>().not.toHaveProperty('url');
  });

  it('ResponsiveSizeKey is the keys-of RESPONSIVE_SIZES', () => {
    const key: ResponsiveSizeKey = '170';
    expect(RESPONSIVE_SIZES).toContain(key);
  });

  it('PinRepository interface shape compiles', () => {
    expectTypeOf<PinRepository>().toHaveProperty('list');
    expectTypeOf<PinRepository>().toHaveProperty('suggest');
    expectTypeOf<PinRepository>().toHaveProperty('create');
    expectTypeOf<PinRepository>().toHaveProperty('getById');
  });
});
