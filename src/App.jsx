import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Tienda from './pages/Tienda'
import Producto from './pages/Producto'
import Carrito from './pages/Carrito'
import Actividades from './pages/Actividades'
import Noticias from './pages/Noticias'
import Login from './pages/Login'
import AdminLayout from './admin/AdminLayout'
import AdminProductos from './admin/AdminProductos'
import ProductoForm from './admin/ProductoForm'
import Apariencia from './admin/Apariencia'
import Auditoria from './admin/Auditoria'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Tienda />} />
        <Route path="producto/:id" element={<Producto />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="actividades" element={<Actividades />} />
        <Route path="noticias" element={<Noticias />} />
        <Route path="ingresar" element={<Login />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="productos" replace />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="productos/nuevo" element={<ProductoForm />} />
          <Route path="productos/:id" element={<ProductoForm />} />
          <Route path="apariencia" element={<Apariencia />} />
          <Route path="auditoria" element={<Auditoria />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
