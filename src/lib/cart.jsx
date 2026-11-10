import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)
export const useCart = () => useContext(CartCtx)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vm_cart')) ?? [] } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('vm_cart', JSON.stringify(items)) }, [items])

  const add = (product, variant, qty = 1) =>
    setItems((cur) => {
      const found = cur.find((i) => i.variantId === variant.id)
      if (found) {
        return cur.map((i) => (i.variantId === variant.id ? { ...i, qty: Math.min(i.qty + qty, variant.stock) } : i))
      }
      return [...cur, {
        variantId: variant.id, productId: product.id, name: product.name, label: variant.label,
        price: variant.price, stock: variant.stock, qty: Math.min(qty, variant.stock), image: product.images?.[0] ?? null
      }]
    })
  const setQty = (variantId, qty) =>
    setItems((cur) => cur.map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i)))
  const remove = (variantId) => setItems((cur) => cur.filter((i) => i.variantId !== variantId))
  const clear = () => setItems([])

  const value = useMemo(() => ({
    items, add, setQty, remove, clear,
    count: items.reduce((n, i) => n + i.qty, 0),
    total: items.reduce((n, i) => n + i.qty * i.price, 0)
  }), [items])
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}
