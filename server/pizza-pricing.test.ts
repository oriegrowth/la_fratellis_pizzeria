import { describe, it, expect } from 'vitest';

/**
 * Pizza Pricing Logic Tests
 * 
 * Rule: For half-half pizzas (meio a meio), the price charged should always be
 * the price of the more expensive flavor between the two chosen.
 */

interface Pizza {
  id: number;
  name: string;
  priceSmall: number;
  priceLarge: number;
}

interface CartItem {
  pizzaId1: number;
  pizzaId2?: number;
  size: 'small' | 'large';
  quantity: number;
  price: number;
}

/**
 * Calculate the price for a pizza item
 * For half-half pizzas, use the higher price between the two flavors
 */
function calculatePizzaPrice(
  pizza1: Pizza,
  pizza2: Pizza | undefined,
  size: 'small' | 'large'
): number {
  const basePrice = size === 'small' ? pizza1.priceSmall : pizza1.priceLarge;
  
  if (!pizza2) {
    return basePrice;
  }

  // For half-half, use the higher price
  const pizza2Price = size === 'small' ? pizza2.priceSmall : pizza2.priceLarge;
  return Math.max(basePrice, pizza2Price);
}

describe('Pizza Pricing - Meio a Meio Logic', () => {
  const mockPizzas: Record<number, Pizza> = {
    1: { id: 1, name: 'Mussarela', priceSmall: 45.99, priceLarge: 68.99 },
    2: { id: 2, name: 'Calabresa', priceSmall: 45.99, priceLarge: 69.99 },
    3: { id: 3, name: 'Rúcula', priceSmall: 55.99, priceLarge: 78.99 },
    4: { id: 4, name: 'Peito de Peru', priceSmall: 53.99, priceLarge: 76.99 },
  };

  it('should calculate price for single flavor pizza (small)', () => {
    const price = calculatePizzaPrice(mockPizzas[1], undefined, 'small');
    expect(price).toBe(45.99);
  });

  it('should calculate price for single flavor pizza (large)', () => {
    const price = calculatePizzaPrice(mockPizzas[1], undefined, 'large');
    expect(price).toBe(68.99);
  });

  it('should use higher price for half-half when first pizza is cheaper (small)', () => {
    // Mussarela (45.99) + Rúcula (55.99) = should charge 55.99
    const price = calculatePizzaPrice(mockPizzas[1], mockPizzas[3], 'small');
    expect(price).toBe(55.99);
  });

  it('should use higher price for half-half when first pizza is more expensive (small)', () => {
    // Rúcula (55.99) + Mussarela (45.99) = should charge 55.99
    const price = calculatePizzaPrice(mockPizzas[3], mockPizzas[1], 'small');
    expect(price).toBe(55.99);
  });

  it('should use higher price for half-half when first pizza is cheaper (large)', () => {
    // Mussarela (68.99) + Rúcula (78.99) = should charge 78.99
    const price = calculatePizzaPrice(mockPizzas[1], mockPizzas[3], 'large');
    expect(price).toBe(78.99);
  });

  it('should use higher price for half-half when first pizza is more expensive (large)', () => {
    // Rúcula (78.99) + Mussarela (68.99) = should charge 78.99
    const price = calculatePizzaPrice(mockPizzas[3], mockPizzas[1], 'large');
    expect(price).toBe(78.99);
  });

  it('should use higher price for half-half with similar prices (small)', () => {
    // Calabresa (45.99) + Mussarela (45.99) = should charge 45.99
    const price = calculatePizzaPrice(mockPizzas[2], mockPizzas[1], 'small');
    expect(price).toBe(45.99);
  });

  it('should use higher price for half-half with different prices (large)', () => {
    // Calabresa (69.99) + Peito de Peru (76.99) = should charge 76.99
    const price = calculatePizzaPrice(mockPizzas[2], mockPizzas[4], 'large');
    expect(price).toBe(76.99);
  });

  it('should calculate total cart price correctly with multiple items', () => {
    const cartItems: CartItem[] = [
      {
        pizzaId1: 1,
        pizzaId2: 3,
        size: 'small',
        quantity: 2,
        price: 55.99, // Mussarela + Rúcula = 55.99
      },
      {
        pizzaId1: 2,
        size: 'large',
        quantity: 1,
        price: 69.99, // Calabresa large
      },
    ];

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const expected = (55.99 * 2) + (69.99 * 1);
    
    expect(total).toBe(expected);
    expect(total).toBeCloseTo(181.97, 2);
  });
});
