import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Tienda from './pages/Tienda'
import Producto from './pages/Producto'
import Carrito from './pages/Carrito'
import Actividades from './pages/Actividades'
import Noticias from './pages/Noticias'
import Login from './pages/Login'
import PedidoConfirmado from './pages/PedidoConfirmado'
import MisPedidos from './pages/MisPedidos'
import Verificar from './pages/Verificar'
import AdminVerificaciones from './admin/AdminVerificaciones'
import AdminPedidos from './admin/AdminPedidos'
import AdminCalendario from './admin/AdminCalendario'
import AdminLayout from './admin/AdminLayout'
import AdminProductos from './admin/AdminProductos'
import ProductoForm from './admin/ProductoForm'
import AdminPresupuestos from './admin/AdminPresupuestos'
import Apariencia from './admin/Apariencia'
import Auditoria from './admin/Auditoria'
import AdminCategorias from './admin/AdminCategorias'
import AdminActividades from './admin/AdminActividades'
import AdminNoticias from './admin/AdminNoticias'
import AdminInsumos from './admin/AdminInsumos'
import AdminProveedores from './admin/AdminProveedores'
import AdminCompras from './admin/AdminCompras'
import AdminCostos from './admin/AdminCostos'
import AdminEstados from './admin/AdminEstados'
import SoloDuena from './admin/SoloDuena'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Tienda />} />
        <Route path="producto/:id" element={<Producto />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="pedido-confirmado" element={<PedidoConfirmado />} />
        <Route path="verificar" element={<Verificar />} />
        <Route path="mis-pedidos" element={<MisPedidos />} />
        <Route path="actividades" element={<Actividades />} />
        <Route path="noticias" element={<Noticias />} />
        <Route path="ingresar" element={<Login />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="pedidos" replace />} />
          <Route path="pedidos" element={<AdminPedidos />} />
          <Route path="verificaciones" element={<AdminVerificaciones />} />
          <Route path="estados" element={<AdminEstados />} />
          <Route path="calendario" element={<AdminCalendario />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="presupuestos" element={<AdminPresupuestos />} />
          <Route path="productos/nuevo" element={<ProductoForm />} />
          <Route path="productos/:id" element={<ProductoForm />} />
          <Route path="categorias" element={<AdminCategorias />} />
          <Route path="actividades" element={<AdminActividades />} />
          <Route path="noticias" element={<AdminNoticias />} />
          <Route path="apariencia" element={<Apariencia />} />
          <Route path="insumos" element={<SoloDuena><AdminInsumos /></SoloDuena>} />
        <Route path="proveedores" element={<SoloDuena><AdminProveedores /></SoloDuena>} />
        <Route path="compras" element={<SoloDuena><AdminCompras /></SoloDuena>} />
        <Route path="costos" element={<SoloDuena><AdminCostos /></SoloDuena>} />
        <Route path="auditoria" element={<Auditoria />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}