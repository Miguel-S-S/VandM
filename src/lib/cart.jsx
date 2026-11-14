import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { coverOf } from './images'
import { useAuth } from './auth'
import { onPromo } from './pricing'

const CartCtx = createContext(null)
export const useCart = () => useContext(CartCtx)

export function CartProvider({ children }) {
  const { user, role, demo, loading } = useAuth()
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vm_cart')) ?? [] } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('vm_cart', JSON.stringify(items)) }, [items])

  // El carrito pertenece a quien lo armó: al salir o cambiar de usuario se vacía
  const ownerKey = demo ? (role === 'visitante' ? '' : role) : (user?.id ?? '')
  useEffect(() => {
    if (loading) return
    const prev = localStorage.getItem('vm_cart_owner') ?? ''
    if (prev !== ownerKey) setItems([])
    localStorage.setItem('vm_cart_owner', ownerKey)
  }, [ownerKey, loading])

  const add = (product, variant, qty = 1) =>
    setItems((cur) => {
      const found = cur.find((i) => i.variantId === variant.id)
      if (found) {
        return cur.map((i) => (i.variantId === variant.id ? { ...i, qty: Math.min(i.qty + qty, variant.stock) } : i))
      }
      return [...cur, {
        variantId: variant.id, productId: product.id, name: product.name, label: variant.label,
        price: variant.price, listPrice: onPromo(variant) ? variant.listPrice : null, stock: variant.stock, qty: Math.min(qty, variant.stock), image: coverOf(product.images)
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
