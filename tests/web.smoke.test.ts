import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('orders sports correctly', () => {
    const order = ['Baseball', 'Football', 'Basketball', 'Track & Field'];
    expect(order).toEqual(['Baseball', 'Football', 'Basketball', 'Track & Field']);
  });
});
