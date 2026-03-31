import React, { useState, useEffect } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, CssBaseline,
  Select, MenuItem
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import api from '../api/axios';

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
import BadgeIcon from '@mui/icons-material/Badge';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import DiscountIcon from '@mui/icons-material/Discount';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import BuildIcon from '@mui/icons-material/Build';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WarningIcon from '@mui/icons-material/Warning';

import { useColorMode } from '../context/ThemeContext';
import { useCash } from '../context/CashContext';
import CashModal from './cash/CashModal';
import { Chip, Tooltip, Menu, Badge } from '@mui/material';
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

  // Settings del sistema global
  const [appSettings, setAppSettings] = useState({ company_name: "SMART PE" });
  useEffect(() => {
    // Evitar cargar si es login (aunque Layout asume app autheada)
    api.get('/settings/').then(res => setAppSettings(res.data)).catch(() => {});
  }, []);

  // Obtener rol guardado (convertimos a minúsculas para evitar errores Admin/admin)
  const userRole = localStorage.getItem('role')?.toLowerCase() || 'empleado';
  const isAdmin = ['admin', 'administrador'].includes(userRole);

  // --- SELECTOR DE TIENDA (multi-sucursal) ---
  const [stores, setStores] = useState([]);
  const [currentStoreId, setCurrentStoreId] = useState(
    parseInt(localStorage.getItem('store_id')) || 1
  );

  useEffect(() => {
    if (isAdmin) {
      const token = localStorage.getItem('token');
      if (token) {
        api.get('/stores/')
          .then(res => {
            if (Array.isArray(res.data)) setStores(res.data);
          })
          .catch(() => {});
      }
    }
  }, [isAdmin]);

  const handleStoreChange = (e) => {
    const newId = e.target.value;
    const selected = stores.find(s => s.store_id === newId);
    setCurrentStoreId(newId);
    localStorage.setItem('store_id', newId);
    if (selected) localStorage.setItem('store_name', selected.name);
    window.location.reload();
  };

  // --- ALERTAS DE STOCK CRÍTICO (TIER 3) ---
  const [lowStockWarnings, setLowStockWarnings] = useState([]);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);

  const fetchAlerts = () => {
    const token = localStorage.getItem('token');
    const storeId = localStorage.getItem('store_id') || 1;
    if (token && ['admin', 'administrador', 'jefe_tienda', 'almacenero'].includes(userRole)) {
      api.get(`/products/low-stock?store_id=${storeId}`)
         .then(res => setLowStockWarnings(res.data))
         .catch(err => console.error("Error fetching alerts", err));
    }
  };

  useEffect(() => {
    fetchAlerts();
    const intervalId = setInterval(fetchAlerts, 5 * 60 * 1000); // Poll cada 5 minutos
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId, userRole]);

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
      text: 'Órdenes de Compra',
      icon: <AssignmentIcon />,
      path: '/purchase-orders',
      allowed: ['admin', 'administrador', 'almacenero']
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
    {
      text: 'RRHH - Comisiones',
      icon: <MonetizationOnIcon />,
      path: '/commissions',
      allowed: ['admin', 'administrador', 'vendedor', 'cajero'] // Todos pueden ver sus propias metas
    },
    {
      text: 'Cupones y Promos',
      icon: <DiscountIcon />,
      path: '/promotions',
      allowed: ['admin', 'administrador', 'jefe_tienda'] 
    },
    {
      text: 'Auditoría Ciega',
      icon: <QrCodeScannerIcon />,
      path: '/audits',
      allowed: ['admin', 'administrador'] 
    },
    {
      text: 'Garantías (RMA)',
      icon: <BuildIcon />,
      path: '/rma',
      allowed: ['admin', 'administrador', 'jefe_tienda'] 
    },
    {
      text: 'Pedidos Online',
      icon: <ShoppingBagIcon />,
      path: '/web-orders',
      allowed: ['admin', 'administrador', 'jefe_tienda']
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
          boxShadow: 1,
          '@media print': { display: 'none' }
        }}
      >
        <Toolbar>
          <Box display="flex" alignItems="center" sx={{ cursor: 'pointer', mr: 2 }} onClick={() => userRole === 'admin' ? navigate('/dashboard') : navigate('/pos')}>
             <img
               src={mode === 'light' ? logoClaro : logoOscuro}
               alt={appSettings.company_name}
               style={{ height: '40px', marginRight: '10px' }}
             />
             <Typography variant="h6" fontWeight="bold" color="primary.main">
               {appSettings.company_name}
             </Typography>
          </Box>

          <Typography variant="body1" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'medium', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
             Bienvenido, {localStorage.getItem('full_name') || localStorage.getItem('username')} ({localStorage.getItem('role')})
             {isAdmin && stores.length > 1 ? (
               <>
                 | 
                 <Select
                   value={currentStoreId}
                   onChange={handleStoreChange}
                   variant="standard"
                   sx={{ 
                     fontWeight: 'bold', 
                     color: 'primary.main',
                     fontSize: 'inherit',
                     '&:before': { borderBottom: 'none' },
                     '&:after': { borderBottom: 'none' },
                     '& .MuiSelect-icon': { color: 'primary.main' },
                   }}
                 >
                   {stores.map(s => (
                     <MenuItem key={s.store_id} value={s.store_id}>{s.name}</MenuItem>
                   ))}
                 </Select>
               </>
             ) : (
               <> | {localStorage.getItem('store_name') || 'SISTEMA'}</>
             )}
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

          {/* CAMPANITA DE ALERTAS DE STOCK (TIER 3) */}
          {['admin', 'administrador', 'jefe_tienda', 'almacenero'].includes(userRole) && (
             <Box sx={{ mr: 2 }}>
               <Tooltip title="Alertas de Stock">
                 <IconButton color="inherit" onClick={(e) => setAnchorElNotifications(e.currentTarget)}>
                   <Badge badgeContent={lowStockWarnings.length} color="error">
                     <NotificationsIcon />
                   </Badge>
                 </IconButton>
               </Tooltip>
               <Menu
                 anchorEl={anchorElNotifications}
                 open={Boolean(anchorElNotifications)}
                 onClose={() => setAnchorElNotifications(null)}
                 PaperProps={{ style: { maxHeight: 400, width: '320px' } }}
               >
                 <MenuItem disabled>
                    <Typography variant="subtitle2" color="text.secondary">
                       Alertas de Stock ({lowStockWarnings.length})
                    </Typography>
                 </MenuItem>
                 <Divider />
                 {lowStockWarnings.length === 0 ? (
                   <MenuItem onClick={() => setAnchorElNotifications(null)}>
                     <Typography variant="body2">Sin alertas pendientes.</Typography>
                   </MenuItem>
                 ) : (
                   lowStockWarnings.map(item => (
                     <MenuItem key={item.product_id} onClick={() => { setAnchorElNotifications(null); navigate('/products'); }}>
                       <WarningIcon color="error" sx={{ mr: 1, fontSize: 20 }} />
                       <Box>
                         <Typography variant="caption" display="block" color="text.secondary">{item.sku}</Typography>
                         <Typography variant="body2" sx={{ width: 230, whiteSpace: 'normal', lineHeight: 1.2 }}>{item.name}</Typography>
                         <Typography variant="caption" color="error.main" fontWeight="bold">
                           Stock: {item.stock} (Mín: {item.min_stock})
                         </Typography>
                       </Box>
                     </MenuItem>
                   ))
                 )}
               </Menu>
             </Box>
          )}

          <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* BOTÓN CONFIGURACIÓN EN APPBAR (Solo Admins) */}
          {isAdmin && (
            <Tooltip title="Configuración del Sistema">
              <IconButton sx={{ ml: 1 }} onClick={() => navigate('/settings')} color="inherit">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* BOTÓN CERRAR SESIÓN EN APPBAR */}
          <Tooltip title="Cerrar Sesión">
            <IconButton sx={{ ml: 1 }} onClick={handleLogout} color="error">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
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
          '@media print': { display: 'none' },
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
          <List dense> {/* ✅ Make list items denser */}
            {/* RENDERIZADO DINÁMICO */}
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{ py: 0.5 }} // ✅ Reduced vertical padding
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontSize: '0.85rem' }} // ✅ Smaller font to fit more
                  />
                </ListItemButton>
              </ListItem>
            ))}
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
          overflow: disablePadding ? 'hidden' : 'auto',
          '@media print': {
            overflow: 'visible !important',
            height: 'auto !important',
            display: 'block'
          }
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;