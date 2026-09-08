import { describe, expect, it } from 'vitest';
import { getPhysicalPageSegments } from './exportPdf';

describe('getPhysicalPageSegments', () => {
  it('splits a 58 × 58 standard-bead pattern across A4 pages without scaling', () => {
    expect(getPhysicalPageSegments(58, 58, '5.0mm')).toEqual([
      { startX: 0, startY: 0, width: 38, height: 55 },
      { startX: 38, startY: 0, width: 20, height: 55 },
      { startX: 0, startY: 55, width: 38, height: 3 },
      { startX: 38, startY: 55, width: 20, height: 3 },
    ]);
  });

  it('keeps a 29 × 29 standard-bead pattern on one A4 page', () => {
    expect(getPhysicalPageSegments(29, 29, '5.0mm')).toEqual([
      { startX: 0, startY: 0, width: 29, height: 29 },
    ]);
  });
});
