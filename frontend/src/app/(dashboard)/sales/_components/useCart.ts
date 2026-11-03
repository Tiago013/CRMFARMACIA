import { useState } from 'react';
import { CartItem } from './types';

// Carrito del POS: agregar, cantidades, descuento por línea y anular
export function useCart(onAdded?: () => void) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.brand_name, price: product.unit_price, qty: 1, discount: 0 }];
    });
    onAdded?.();
  };

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));

  const applyDiscount = (id: string, discount: number) =>
    setCart(prev => prev.map(item => item.id === id ? { ...item, discount } : item));

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  return { cart, setCart, addToCart, updateQty, applyDiscount, removeFromCart };
}
