import { useAuth } from '../lib/auth'

// Costos, proveedores, insumos y compras: los ven la dueña y el administrador (el administrador ve todo siempre)
export default function SoloDuena({ children }) {
  const { role } = useAuth()
  if (role === 'duena' || role === 'admin') return children
  return (
    <div className="center empty">
      <h2>Sección reservada</h2>
      <p className="muted">Los costos, insumos, proveedores y compras son solo para la dueña y el administrador.</p>
    </div>
  )
}
