import { degreesToRadians, radiansToDegrees, lerp, clamp } from '../maths';

describe('maths', () => {
  describe('degreesToRadians()', () => {
    it('works', () => {
      expect(degreesToRadians(0)).toBe(0);
      expect(degreesToRadians(1)).toBeCloseTo(0.01745329252, 5);
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 5);
    });
  });

  describe('radiansToDegrees()', () => {
    it('works', () => {
      expect(radiansToDegrees(0)).toBe(0);
      expect(radiansToDegrees(0.01745329252)).toBeCloseTo(1, 5);
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 5);
    });
  });

  describe('lerp', () => {
    it('works', () => {
      expect(lerp(2, 4, 0)).toBe(2);
      expect(lerp(2, 4, 0.5)).toBe(3);
      expect(lerp(2, 4, 1)).toBe(4);
      expect(lerp(8, 4, 0.25)).toBe(7);
      expect(lerp(8, -4, 0.25)).toBe(5);
      expect(lerp(-8, -4, 0.25)).toBe(-7);
    });
  });

  describe('clamp', () => {
    it('works', () => {
      expect(clamp(0, 1)).toBe(0);
      expect(clamp(1, 1)).toBe(1);
      expect(clamp(2, 1)).toBe(1);

      expect(clamp(1, 0, 2)).toBe(1);
      expect(clamp(0, 0, 2)).toBe(0);
      expect(clamp(2, 0, 2)).toBe(2);
      expect(clamp(3, 0, 2)).toBe(2);
      expect(clamp(-1, 0, 2)).toBe(0);
    });
  });
});
