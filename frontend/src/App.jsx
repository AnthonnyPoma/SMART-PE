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
import Clients from './pages/Clients'; // 🆕 Clientes
import Suppliers from './pages/Suppliers';
import TransferList from './pages/TransferList';
import TransferRequest from './pages/TransferRequest';
import Stores from './pages/Stores'; // 🆕 Tiendas
import CashHistory from './pages/CashHistory'; // 🆕 Historial Cajas


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
          <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />

          <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />

          {/* 🆕 RUTAS TRANSFERENCIAS */}
          <Route path="/transfers" element={<ProtectedRoute><TransferList /></ProtectedRoute>} />
          <Route path="/transfers/new" element={<ProtectedRoute><TransferRequest /></ProtectedRoute>} />

          {/* 🆕 RUTA TIENDAS */}
          <Route path="/stores" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
          
          {/* 🆕 HISTORIAL CAJAS */}
          <Route path="/cash-history" element={<ProtectedRoute><CashHistory /></ProtectedRoute>} />



          {/* Ruta por defecto (404) o redirección */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;