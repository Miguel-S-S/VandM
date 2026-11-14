import { useAuth } from '../lib/auth'

// Solo la dueña ve costos, proveedores, insumos y compras
export default function SoloDuena({ children }) {
  const { role } = useAuth()
  if (role === 'duena') return children
  return (
    <div className="center empty">
      <h2>Sección reservada</h2>
      <p className="muted">Los costos, insumos, proveedores y compras son solo para la dueña.</p>
    </div>
  )
}
