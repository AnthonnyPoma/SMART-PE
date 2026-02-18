import React from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, CssBaseline
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

// Iconos
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; // ✅ Solo una vez aquí
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DescriptionIcon from '@mui/icons-material/Description';
import InputIcon from '@mui/icons-material/Input';
import BadgeIcon from '@mui/icons-material/Badge'; // 🆕 Icono Clientes
import StorefrontIcon from '@mui/icons-material/Storefront'; // 🆕 Icono para Tiendas
import AssessmentIcon from '@mui/icons-material/Assessment'; // 🆕 Icono Reportes

import { useColorMode } from '../context/ThemeContext';
import { useCash } from '../context/CashContext';
import CashModal from './cash/CashModal';
import { Chip, Tooltip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

import logoClaro from '../assets/logo_claro.png';
import logoOscuro from '../assets/logo_oscuro.png';

const drawerWidth = 240;

function Layout({ children, disablePadding }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { toggleColorMode, mode } = useColorMode();
  const { isCashOpen, openCashModal, modalOpen, modalMode, closeCashModal } = useCash();

  // Obtener rol guardado (convertimos a minúsculas para evitar errores Admin/admin)
  const userRole = localStorage.getItem('role')?.toLowerCase() || 'empleado';

  // DEFINICIÓN MAESTRA DE MENÚS Y PERMISOS
  const allMenuItems = [
    {
      text: 'Panel Principal',
      icon: <DashboardIcon />,
      path: '/dashboard',
      allowed: ['admin', 'administrador'] // Solo Admin
    },
    {
      text: 'Punto de Venta',
      icon: <ShoppingCartIcon />,
      path: '/pos',
      allowed: ['all'] // Todos pueden vender
    },
    {
      text: 'Historial Ventas',
      icon: <ReceiptLongIcon />,
      path: '/sales-history',
      allowed: ['admin', 'administrador', 'cajero', 'vendedor']
    },
    {
      text: 'Inventario',
      icon: <InventoryIcon />,
      path: '/products',
      allowed: ['admin', 'administrador', 'almacenero']
    },
    {
      text: 'Ingreso Mercadería',
      icon: <LocalShippingIcon />,
      path: '/stock-entry',
      allowed: ['admin', 'administrador', 'almacenero']
    },
    {
      text: 'Proveedores',
      icon: <LocalShippingIcon />,
      path: '/suppliers',
      allowed: ['admin', 'administrador', 'almacenero'] // ¿Quién puede ver proveedores?
    },
    {
      text: 'Clientes',
      icon: <BadgeIcon />,
      path: '/clients',
      allowed: ['all'] 
    },
    {
      text: 'Kardex / Reportes',
      icon: <DescriptionIcon />,
      path: '/kardex',
      allowed: ['admin', 'administrador', 'almacenero']
    },
    {
      text: 'Transferencias',
      icon: <InputIcon />, // Usamos InputIcon o similar
      path: '/transfers',
      allowed: ['admin', 'administrador', 'almacenero', 'jefe_tienda']
    },
    {
      text: 'Tiendas',
      icon: <StorefrontIcon />,
      path: '/stores',
      allowed: ['admin', 'administrador']
    },
    {
      text: 'Usuarios',
      icon: <PeopleIcon />,
      path: '/users',
      allowed: ['admin', 'administrador'] // Solo Admin
    },
    {
      text: 'Historial Cajas',
      icon: <ReceiptLongIcon />, // Reutilizamos icono o buscamos uno mejor como FactCheck
      path: '/cash-history',
      allowed: ['admin', 'administrador']
    },

  ];

  // FILTRO INTELIGENTE: Mostramos solo lo que el rol permite
  const menuItems = allMenuItems.filter(item =>
    item.allowed.includes('all') || item.allowed.includes(userRole)
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* --- BARRA SUPERIOR (APPBAR) --- */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 1
        }}
      >
        <Toolbar>
          <img
            src={mode === 'light' ? logoClaro : logoOscuro}
            alt="Smart PE"
            style={{ height: '40px', marginRight: '20px', cursor: 'pointer' }}
            onClick={() => userRole === 'admin' ? navigate('/dashboard') : navigate('/pos')}
          />

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'primary.main' }}>
             Bienvenido, {localStorage.getItem('full_name') || localStorage.getItem('username')} ({localStorage.getItem('role')}) | {localStorage.getItem('store_name') || 'SISTEMA'} 
          </Typography>

          {/* INDICADOR DE CAJA */}
          <Box sx={{ mr: 2, display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
             {isCashOpen ? (
               <Chip 
                 icon={<LockOpenIcon />} 
                 label="Caja Abierta" 
                 color="success" 
                 variant="outlined" 
                 onClick={() => openCashModal('CLOSE')} 
                 sx={{ cursor: 'pointer', fontWeight: 'bold' }}
               />
             ) : (
               <Chip 
                 icon={<LockIcon />} 
                 label="Caja Cerrada" 
                 color="error" 
                 variant="outlined" 
                 onClick={() => openCashModal('OPEN')} 
                 sx={{ cursor: 'pointer', fontWeight: 'bold' }}
               />
             )}
          </Box>

          <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* MODAL GLOBAL DE CAJA (invisible si no se activa) */}
      <CashModal 
        open={modalOpen} 
        mode={modalMode} 
        onClose={closeCashModal} 
      />

      {/* --- MENÚ LATERAL (DRAWER) --- */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {/* RENDERIZADO DINÁMICO */}
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon color="error" />
                </ListItemIcon>
                <ListItemText primary="Cerrar Sesión" sx={{ color: 'error.main' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* CONTENEDOR PRINCIPAL */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: disablePadding ? 0 : 3,
          width: '100%',
          height: disablePadding ? '100vh' : 'auto',
          overflow: disablePadding ? 'hidden' : 'auto'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;