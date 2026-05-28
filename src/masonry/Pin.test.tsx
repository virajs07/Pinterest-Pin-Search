import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pin } from './Pin';
import type { Pin as PinModel } from '@/types/Pin';

function makePin(overrides: Partial<PinModel> = {}): PinModel {
  const v = (size: number) => ({
    url: `https://example.test/${size}.jpg`,
    width: size,
    height: size,
    type: 'image/jpeg' as const,
  });
  return {
    id: 'p1',
    description: 'A pin',
    descriptionLower: 'a pin',
    width: 800,
    height: 600,
    dominantColor: '#aabbcc',
    createdAt: 1,
    responsive: { '170': v(170), '236': v(236), '474': v(474), '736': v(736), orig: v(800) },
    ...overrides,
  };
}

describe('Pin', () => {
  it('mounts <img> with opacity 0 when not paint-ready (browser still fetches once)', () => {
    const pin = makePin();
    const { container } = render(<Pin pin={pin} columnWidth={236} paintReady={false} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.style.opacity).toBe('0');
    const box = container.firstChild as HTMLElement;
    expect(box.style.backgroundColor).toBe('rgb(170, 187, 204)');
    expect(box.style.aspectRatio).toBe('800 / 600');
  });

  it('mounts <img> with full opacity, srcset, and sizes when paint-ready', () => {
    const pin = makePin();
    render(<Pin pin={pin} columnWidth={236} paintReady={true} />);
    const img = screen.getByRole('img', { name: 'A pin' });
    expect(img.style.opacity).toBe('1');
    expect(img.getAttribute('srcset')?.split(',').map((s) => s.trim()).length).toBe(5);
    expect(img.getAttribute('sizes')).toBe('236px');
    expect(img.getAttribute('alt')).toBe('A pin');
  });

  it('skips variants with empty url in srcset', () => {
    const pin = makePin({
      responsive: {
        '170': { url: '', width: 170, height: 170, type: 'image/jpeg' },
        '236': { url: 'https://example.test/236.jpg', width: 236, height: 236, type: 'image/jpeg' },
        '474': { url: '', width: 474, height: 474, type: 'image/jpeg' },
        '736': { url: 'https://example.test/736.jpg', width: 736, height: 736, type: 'image/jpeg' },
        orig: { url: 'https://example.test/orig.jpg', width: 800, height: 800, type: 'image/jpeg' },
      },
    });
    render(<Pin pin={pin} columnWidth={236} paintReady={true} />);
    const img = screen.getByRole('img');
    const set = img.getAttribute('srcset') ?? '';
    expect(set.split(',').length).toBe(3);
    expect(set).not.toContain('170w');
    expect(set).not.toContain('474w');
  });

  it('hides <img> when paint-ready but orig.url is empty (optimistic pin)', () => {
    const pin = makePin({
      responsive: {
        '170': { url: '', width: 170, height: 170, type: 'image/jpeg' },
        '236': { url: '', width: 236, height: 236, type: 'image/jpeg' },
        '474': { url: '', width: 474, height: 474, type: 'image/jpeg' },
        '736': { url: '', width: 736, height: 736, type: 'image/jpeg' },
        orig: { url: '', width: 800, height: 800, type: 'image/jpeg' },
      },
    });
    const { container } = render(<Pin pin={pin} columnWidth={236} paintReady={true} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
