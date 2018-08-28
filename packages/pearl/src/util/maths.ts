/**
 * Convert radians to degrees.
 */
export const radiansToDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Convert degrees to radians.
 */
export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Simple unclamped lerp.
 */
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/**
 * Get a random int between min and max, _inclusive_.
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max) + 1;
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Clamp number to ensure it's below `upper`.
 */
export function clamp(number: number, upper: number): number;
/**
 * Clamp number between `lower` and `upper`.
 */
export function clamp(number: number, lower: number, upper: number): number;
export function clamp(number: number, a: number, b?: number): number {
  let upper, lower;
  if (b !== undefined) {
    lower = a;
    upper = b;
  } else {
    upper = a;
  }

  number = number <= upper ? number : upper;
  if (lower !== undefined) {
    number = number >= lower ? number : lower;
  }
  return number;
}
