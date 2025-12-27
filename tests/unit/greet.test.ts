import { greet } from '../../src/greet';

describe('greet', () => {
  it('should return greeting with provided name', () => {
    const result = greet('Alice');
    expect(result).toBe('Hello, Alice!');
  });

  it('should return greeting with World when given World', () => {
    const result = greet('World');
    expect(result).toBe('Hello, World!');
  });

  it('should handle empty string', () => {
    const result = greet('');
    expect(result).toBe('Hello, !');
  });

  it('should handle special characters', () => {
    const result = greet('John Doe');
    expect(result).toBe('Hello, John Doe!');
  });
});
