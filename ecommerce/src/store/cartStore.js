import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  cart: [],
  
  addToCart: (product, quantity = 1) => {
    set((state) => {
      const existing = state.cart.find(i => i.product_id === product.product_id);
      if (existing) {
        return {
          cart: state.cart.map(i => 
            i.product_id === product.product_id 
              ? { ...i, quantity: i.quantity + quantity }
              : i
          )
        };
      }
      return { cart: [...state.cart, { ...product, quantity }] };
    });
  },

  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter(i => i.product_id !== productId)
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
        cart: state.cart.map(i => 
            i.product_id === productId 
            ? { ...i, quantity: Math.max(1, quantity) }
            : i
        )
    }));
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce((total, item) => total + (item.base_price * item.quantity), 0);
  },
  
  getCartCount: () => {
    return get().cart.reduce((count, item) => count + item.quantity, 0);
  }
}));
