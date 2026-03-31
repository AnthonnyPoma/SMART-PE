import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Contexto de Tema
import { ColorModeProvider, useColorMode } from './context/ThemeContext';
import { themeSettings } from './theme';

// Importar Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Products from './pages/Products';
import StockEntry from './pages/StockEntry';
import Kardex from './pages/Kardex';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import TransferList from './pages/TransferList';
import TransferRequest from './pages/TransferRequest';
import Stores from './pages/Stores';
import CashHistory from './pages/CashHistory';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderCreate from './pages/PurchaseOrderCreate';
import PurchaseOrderReceive from './pages/PurchaseOrderReceive';
import Commissions from './pages/Commissions';
import Promotions from './pages/Promotions';
import BlindAudit from './pages/BlindAudit';
import RMA from './pages/RMA';
import Settings from './pages/Settings';
import WebOrders from './pages/WebOrders';


import { AuthProvider } from './context/AuthContext';
import { CashProvider } from './context/CashContext';

function App() {
  return (
    <ColorModeProvider>
      <AuthProvider>
        <CashProvider>
          <AppContent />
        </CashProvider>
      </AuthProvider>
    </ColorModeProvider>
  );
}

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppContent() {
  const { mode } = useColorMode();
  const theme = React.useMemo(() => themeSettings(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Ruta Pública */}
          <Route path="/" element={<Login />} />

          {/* Rutas Privadas */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/sales-history" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/stock-entry" element={<ProtectedRoute><StockEntry /></ProtectedRoute>} />
          <Route path="/kardex" element={<ProtectedRoute><Kardex /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />

          <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />

          {/* Rutas de transferencias */}
          <Route path="/transfers" element={<ProtectedRoute><TransferList /></ProtectedRoute>} />
          <Route path="/transfers/new" element={<ProtectedRoute><TransferRequest /></ProtectedRoute>} />

          <Route path="/promotions" element={<ProtectedRoute><Promotions /></ProtectedRoute>} />
          <Route path="/audits" element={<ProtectedRoute><BlindAudit /></ProtectedRoute>} />
          <Route path="/rma" element={<ProtectedRoute><RMA /></ProtectedRoute>} />

          {/* Ruta tiendas */}
          <Route path="/stores" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
          
          {/* Historial de cajas */}
          <Route path="/cash-history" element={<ProtectedRoute><CashHistory /></ProtectedRoute>} />

          {/* Órdenes de compra */}
          <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/purchase-orders/new" element={<ProtectedRoute><PurchaseOrderCreate /></ProtectedRoute>} />
          <Route path="/purchase-orders/:id/receive" element={<ProtectedRoute><PurchaseOrderReceive /></ProtectedRoute>} />



          {/* Pedidos Online (E-Commerce) */}
          <Route path="/web-orders" element={<ProtectedRoute><WebOrders /></ProtectedRoute>} />

          {/* Configuración general */}
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Ruta por defecto (404) o redirección */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;