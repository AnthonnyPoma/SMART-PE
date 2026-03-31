import React, { useState, useEffect, useRef } from 'react';
import {
  Paper, Typography, TextField, Button, Box,
  List, ListItem, ListItemButton, ListItemText, IconButton, Divider,
  Card, CardActionArea, CardContent, Chip, InputAdornment, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, useTheme, Checkbox, FormControlLabel
} from '@mui/material';

// Iconos
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import QrCodeIcon from '@mui/icons-material/QrCode';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import StarIcon from '@mui/icons-material/Star';
import DiscountIcon from '@mui/icons-material/Discount';  // Icono para descuentos
import LockIcon from '@mui/icons-material/Lock';  // Icono para PIN
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Icono Trofeo
import PauseIcon from '@mui/icons-material/Pause'; // Suspender Venta
import ListAltIcon from '@mui/icons-material/ListAlt'; // Listar suspendidas

import Layout from '../components/Layout';
import CashGuard from '../components/cash/CashGuard';
import { formatCurrency } from '../utils/format';
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function POS() {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const searchInputRef = useRef(null);
  const clientInputRef = useRef(null);

  // --- ESTADOS DE CLIENTE Y PUNTOS ---
  const [clientDni, setClientDni] = useState('');
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState(null);
  const [clientPoints, setClientPoints] = useState(0);
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [isManualClient, setIsManualClient] = useState(false);

  // Estados de redención de puntos de fidelización
  const [pointsUsed, setPointsUsed] = useState(0);
  const [pointsMoney, setPointsMoney] = useState(0);

  // Estados Modal IMEI
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [availableImeis, setAvailableImeis] = useState([]);
  const [loadingImeis, setLoadingImeis] = useState(false);

  // Estados de carga de venta
  const [loadingSale, setLoadingSale] = useState(false);

  // --- ESTADOS DE DESCUENTO ---
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountType, setDiscountType] = useState('PERCENTAGE'); // PERCENTAGE | FIXED_AMOUNT
  const [discountValue, setDiscountValue] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [supervisorPin, setSupervisorPin] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [netTotal, setNetTotal] = useState(0);

  // --- Estados de Cupones Promocionales ---
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponId, setAppliedCouponId] = useState(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

  // Estados de pago, vuelto y ventas suspendidas
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  
  const [suspendedSales, setSuspendedSales] = useState(() => {
    const saved = localStorage.getItem('suspended_sales_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [suspendedDialogOpen, setSuspendedDialogOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('suspended_sales_v1', JSON.stringify(suspendedSales));
  }, [suspendedSales]);

  useEffect(() => {
    fetchProducts();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
    
    let currentNet = newTotal;
    
    // 1. Restar Descuento Normal
    if (discountAmount > 0) {
      currentNet -= discountAmount;
    }
    
    // 2. Restar puntos canjeados
    if (pointsMoney > 0) {
      currentNet -= pointsMoney;
    }
    
    setNetTotal(currentNet > 0 ? currentNet : 0);
  }, [cart, discountAmount, pointsMoney]);

  useEffect(() => {
    // Resetear descuentos y puntos si el total del carrito cambia a 0
    if (total === 0) {
      setDiscountType('PERCENTAGE');
      setDiscountValue('');
      setDiscountAmount(0);
      setSupervisorPin('');
      setNeedsApproval(false);
      setPointsUsed(0);
      setPointsMoney(0);
      setCouponCode('');
      setAppliedCouponId(null);
    }
  }, [total]);

  // --- ATAJOS DE TECLADO ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // No interceptar si hay un Dialog/Modal abierto
      const isModalOpen = imeiDialogOpen || discountDialogOpen || paymentDialogOpen || suspendedDialogOpen;
      if (isModalOpen) return;

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          if (cart.length > 0 && !loadingSale) handleCheckoutAttempt('Efectivo');
          break;
        case 'F2':
          e.preventDefault();
          if (searchInputRef.current) searchInputRef.current.focus();
          break;
        case 'F3':
          e.preventDefault();
          if (clientInputRef.current) clientInputRef.current.focus();
          break;
        case 'Escape':
          e.preventDefault();
          clearCart();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // --- LIMPIAR CARRITO ---
  const clearCart = () => {
    setCart([]);
    setClientDni('');
    setClientName('');
    setClientId(null);
    setClientPoints(0);
    setPointsUsed(0);
    setPointsMoney(0);
    setDiscountAmount(0);
    setDiscountValue('');
    setCouponCode('');
    setAppliedCouponId(null);
    setSearchTerm('');
    setAcceptsMarketing(false);
    setIsManualClient(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/products/`, config);
      setProducts(response.data);
    } catch (error) {
      console.error("Error cargando productos", error);
      if (error.response?.status === 401) {
          alert("Sesión expirada. Por favor vuelva a entrar.");
      }
    }
  };

  // 🔍 BUSCADOR INTELIGENTE DE CLIENTES
  const handleSearchClient = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (clientDni.length < 8) return alert("DNI inválido");
      
      setLoadingClient(true);
      setClientName("");
      setClientId(null);
      setClientPoints(0);
      setPointsUsed(0);
      setPointsMoney(0);
      setIsManualClient(false);

      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const res = await axios.get(`${API_URL}/clients/search/${clientDni}`, config);
        const data = res.data;

        setClientName(data.full_name);
        
        if (data.source === 'LOCAL') {
            setClientId(data.client_id);
            setClientPoints(data.points);
        }
        // Si es RENIEC, clientId queda null y se registrará al cobrar
      } catch (error) {
        console.error("Error buscando cliente:", error);
        setIsManualClient(true);
      } finally {
        setLoadingClient(false);
      }
    }
  };

  // 🔄 LÓGICA DE CANJE DE PUNTOS (NUEVO)
  const togglePointsRedemption = () => {
    if (pointsUsed > 0) {
        // Cancelar canje
        setPointsUsed(0);
        setPointsMoney(0);
    } else {
        // Aplicar canje
        if (clientPoints <= 0) return alert("El cliente no tiene puntos.");
        
        // Valor: 10 puntos = 1 Sol
        const conversationRate = 10;
        const totalPointsValue = clientPoints / conversationRate;
        
        // Calcular cuánto falta por pagar después del descuento normal
        const pendingToPay = total - discountAmount;
        
        if (pendingToPay <= 0) return alert("El monto a pagar ya está cubierto.");
        
        // Determinar cuánto dinero en puntos podemos usar (máximo el total de puntos o el total a pagar)
        let moneyToRedeem = totalPointsValue;
        if (moneyToRedeem > pendingToPay) {
            moneyToRedeem = pendingToPay;
        }
        
        // Calcular cuántos puntos exactos se necesitan
        // moneyToRedeem = points / 10  => points = money * 10
        const pointsNeeded = Math.ceil(moneyToRedeem * conversationRate);
        
        // Recalcular el dinero exacto basado en puntos enteros (para evitar decimales raros)
        const finalMoney = pointsNeeded / conversationRate;

        setPointsUsed(pointsNeeded);
        setPointsMoney(finalMoney);
    }
  };

  // --- LÓGICA DE CUPONES ---
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsVerifyingCoupon(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/promotions/validate_code`, {
        code: couponCode,
        cart_total: total
      }, config);
      
      if (res.data.valid) {
        setDiscountType(res.data.discount_type);
        setDiscountValue(res.data.value.toString());
        setDiscountAmount(res.data.discount_amount);
        setAppliedCouponId(res.data.promotion_id);
      } else {
        alert(res.data.message);
        setAppliedCouponId(null);
        setDiscountAmount(0);
      }
    } catch (error) {
      console.error(error);
      alert("Error al validar cupón");
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCouponId(null);
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setDiscountAmount(0);
  };


  // --- LÓGICA DEL CARRITO ---
  const handleProductClick = async (product) => {
    if (product.stock <= 0) {
      alert(`⚠️ No hay stock disponible de ${product.name}`);
      return;
    }
    if (product.is_serializable) {
      setCurrentProduct(product);
      setLoadingImeis(true);
      setImeiDialogOpen(true);
      setAvailableImeis([]);
      try {
        const token = localStorage.getItem('token');
        const storeId = localStorage.getItem('store_id') || 1;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const res = await axios.get(
            `${API_URL}/products/${product.product_id}/series?store_id=${storeId}`, 
            config
        );
        setAvailableImeis(res.data);
      } catch (err) {
        console.error(err);
        alert("Error al consultar IMEIs disponibles\n" + (err.response?.data?.detail || ""));
        setImeiDialogOpen(false);
      } finally {
        setLoadingImeis(false);
      }
      return;
    }
    addToCartSimple(product);
  };

  const addToCartSimple = (product) => {
    const existingItem = cart.find(item => item.id === product.product_id && !item.is_serializable);
    const currentQty = existingItem ? existingItem.quantity : 0;
    if (currentQty >= product.stock) {
      alert(`⚠️ Stock máximo alcanzado`);
      return;
    }
    if (existingItem) {
      setCart(cart.map(item => item.id === product.product_id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, {
        uniqueId: `${product.product_id}-simple`,
        id: product.product_id,
        name: product.name,
        price: parseFloat(product.base_price),
        quantity: 1,
        is_serializable: false,
        serial_number: null
      }]);
    }
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const addToCartWithImei = (imei) => {
    const alreadyInCart = cart.find(item => item.serial_number === imei);
    if (alreadyInCart) {
      alert("⚠️ Este IMEI ya está en el carrito");
      return;
    }
    setCart([...cart, {
      uniqueId: `${currentProduct.product_id}-${imei}`,
      id: currentProduct.product_id,
      name: currentProduct.name,
      price: parseFloat(currentProduct.base_price),
      quantity: 1,
      is_serializable: true,
      serial_number: imei
    }]);
    setImeiDialogOpen(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const removeFromCart = (uniqueId) => {
    setCart(cart.filter(item => item.uniqueId !== uniqueId));
  };

  // 📌 LÓGICA DE SUSPENDER VENTA (TIER 3)
  const suspendCurrentSale = () => {
    if (cart.length === 0) return;
    const suspendedSale = {
      id: Date.now(),
      date: new Date().toLocaleTimeString(),
      cart,
      clientDni,
      clientName,
      clientId,
      clientPoints,
      total,
      netTotal,
      discountType,
      discountValue,
      discountAmount,
      pointsUsed,
      pointsMoney,
      couponCode,
      appliedCouponId
    };
    setSuspendedSales([...suspendedSales, suspendedSale]);
    clearCart();
  };

  const resumeSuspendedSale = (sale) => {
    if (cart.length > 0) {
      if (!window.confirm("Hay una venta actual cursando. ¿Deseas reemplazarla?")) return;
    }
    setCart(sale.cart || []);
    setClientDni(sale.clientDni || '');
    setClientName(sale.clientName || '');
    setClientId(sale.clientId || null);
    setClientPoints(sale.clientPoints || 0);
    setDiscountType(sale.discountType || 'PERCENTAGE');
    setDiscountValue(sale.discountValue || '');
    setDiscountAmount(sale.discountAmount || 0);
    setPointsUsed(sale.pointsUsed || 0);
    setPointsMoney(sale.pointsMoney || 0);
    setCouponCode(sale.couponCode || '');
    setAppliedCouponId(sale.appliedCouponId || null);
    
    setSuspendedSales(suspendedSales.filter(s => s.id !== sale.id));
    setSuspendedDialogOpen(false);
  };

  const openPaymentDialog = (method = 'Efectivo') => {
    if (cart.length === 0) return alert("Carrito vacío");
    setPaymentMethod(method);
    setAmountReceived('');
    setPaymentReference('');
    setPaymentDialogOpen(true);
  };

  // 🛡️ VALIDACIÓN PREVENTIVA SUNAT (Antes de abrir el Modal)
  const handleCheckoutAttempt = (method = 'Efectivo') => {
    if (cart.length === 0) return alert("Carrito vacío");
    if (netTotal > 700 && (!clientDni || clientDni.trim() === '')) {
      alert("⚠️ RECHAZO SUNAT PREVENTIVO:\nPor normativa, toda boleta mayor a S/ 700.00 requiere identificar obligatoriamente al comprador con DNI o RUC. Por favor, asigne un cliente antes de cobrar.");
      if (clientInputRef.current) clientInputRef.current.focus();
      return;
    }
    openPaymentDialog(method);
  };

  // 💰 PROCESO DE PAGO HÍBRIDO
  const handlePay = async () => {
    if (cart.length === 0) return alert("Carrito vacío");
    
    // 🛡️ VALIDACIONES TIER 3: Vuelto y Referencia
    if (paymentMethod === 'Efectivo' && amountReceived && parseFloat(amountReceived) < netTotal) {
         return alert("El monto recibido no puede ser menor al total a pagar.");
    }
    if (paymentMethod !== 'Efectivo' && !paymentReference.trim()) {
         return alert(`Debe ingresar un N° de Operación o Referencia para pago con ${paymentMethod}.`);
    }

    const token = localStorage.getItem('token'); 
    if (!token) { alert("❌ No autenticado"); return; }

    setLoadingSale(true);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let finalClientId = clientId;

      // 1. Auto-registro si viene de RENIEC
      if (!finalClientId && clientDni && clientName) {
         try {
             const resClient = await axios.post(`${API_URL}/clients/`, {
                 document_number: clientDni,
                 first_name: clientName,
                 last_name: "",
                 address: "Dirección POS",
                 accepts_marketing: acceptsMarketing
             }, config);
             finalClientId = resClient.data.client_id;
         } catch (err) {
             console.error("Error auto-registrando cliente:", err);
         }
      }

      // 2. Payload de Venta
      const storeId = localStorage.getItem('store_id') || 1;

      const salePayload = {
        store_id: parseInt(storeId), 
        payment_method: paymentMethod,
        payment_reference: paymentMethod !== 'Efectivo' ? paymentReference : null,
        amount_received: paymentMethod === 'Efectivo' ? parseFloat(amountReceived || netTotal) : netTotal,
        client_dni: clientDni || null,
        client_id: finalClientId, 
        
        // Campos de Descuento
        discount_type: discountAmount > 0 ? discountType : null,
        discount_value: discountAmount > 0 ? parseFloat(discountValue) : 0,
        discount_amount: discountAmount,
        
        // Fidelización
        points_used: pointsUsed,
        points_discount_amount: pointsMoney,

        // Promoción
        promotion_id: appliedCouponId,
        
        items: cart.map(item => ({
          product_id: item.id, 
          quantity: item.quantity, 
          serial_number: item.serial_number
        }))
      };
      
      const response = await axios.post(`${API_URL}/sales/checkout`, salePayload, config);

      alert(`✅ VENTA EXITOSA`);
      window.open(`${API_URL}/sales/${response.data.sale_id}/ticket`, '_blank');
      
      // Reset
      setCart([]); 
      setTotal(0); 
      setNetTotal(0);
      setClientDni(''); 
      setClientName('');
      setClientId(null);
      setClientPoints(0);
      
      // Reset Descuento y Puntos
      setDiscountType('PERCENTAGE');
      setDiscountValue('');
      setDiscountAmount(0);
      setSupervisorPin('');
      setNeedsApproval(false);
      setPointsUsed(0);
      setPointsMoney(0);
      setCouponCode('');
      setAppliedCouponId(null);
      
      setPaymentDialogOpen(false);
      setPaymentReference('');
      setAmountReceived('');
      
      fetchProducts(); 

    } catch (error) {
      console.error(error);
      alert("❌ Error al procesar venta: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoadingSale(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    // Productos agotados al final
    if (a.stock <= 0 && b.stock > 0) return 1;
    if (a.stock > 0 && b.stock <= 0) return -1;
    return 0;
  });

  // --- SOPORTE PARA LECTOR DE CÓDIGO DE BARRAS ---
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      e.preventDefault();
      // Buscamos coincidencia exacta de SKU primero
      const exactMatch = filteredProducts.find(p => p.sku && p.sku.toLowerCase() === searchTerm.trim().toLowerCase());
      if (exactMatch) {
         handleProductClick(exactMatch);
         setSearchTerm('');
      } else if (filteredProducts.length === 1) {
         handleProductClick(filteredProducts[0]);
         setSearchTerm('');
      }
    }
  };

  return (
    <Layout disablePadding>
      <CashGuard>
        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: 'background.default' }}>

          {/* --- COLUMNA IZQUIERDA (CATÁLOGO) --- */}
          <Box sx={{ width: { xs: '60%', md: '70%' }, p: 2, display: 'flex', flexDirection: 'column' }}>
            
            <Paper elevation={0} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', borderRadius: 2, bgcolor: 'background.paper', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                <TextField
                  inputRef={searchInputRef}
                  fullWidth variant="standard" placeholder="Buscar por Nombre / Lector de Lcódigo de barras..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  InputProps={{ disableUnderline: true }}
                  autoFocus
                />
              </Box>
              <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, ml: 2 }}>
                <Chip label="F1 Cobrar" size="small" variant="outlined" />
                <Chip label="F2 Buscar" size="small" variant="outlined" />
                <Chip label="F3 Cliente" size="small" variant="outlined" />
                <Chip label="ESC Limpiar" size="small" variant="outlined" />
              </Box>
            </Paper>

            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Grid container spacing={2}>
                {filteredProducts.map((prod) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={prod.product_id}>
                    <Card 
                      sx={{ 
                        height: '100%', display: 'flex', flexDirection: 'column', 
                        cursor: 'pointer', transition: '0.2s',
                        bgcolor: 'background.paper',
                        opacity: prod.stock > 0 ? 1 : 0.6,
                        '&:hover': { transform: prod.stock > 0 ? 'scale(1.02)' : 'none', boxShadow: 6 }
                      }}
                      onClick={() => handleProductClick(prod)}
                    >
                      <Box sx={{ height: 140, bgcolor: theme.palette.mode === 'dark' ? '#333' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
                        {prod.image_url ? (
                          <img 
                            src={prod.image_url} 
                            alt={prod.name} 
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
                            onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} 
                          />
                        ) : null}
                        <Box sx={{ display: prod.image_url ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center' }}>
                           <BrokenImageIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                        </Box>
                      </Box>

                      <CardContent sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" noWrap color="text.primary">
                            {prod.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {prod.sku}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" color="primary" fontWeight="bold">
                            {formatCurrency(prod.base_price)}
                          </Typography>
                          {prod.stock > 0 ? (
                             <Chip label={`Stock: ${prod.stock}`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                          ) : (
                             <Chip label="AGOTADO" size="small" color="error" sx={{ fontSize: '0.7rem', height: 20 }} />
                          )}
                        </Box>
                        {prod.is_serializable && <Chip label="Requiere IMEI" size="small" color="warning" sx={{ mt: 1, fontSize: '0.65rem', height: 20 }} />}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>

          {/* --- COLUMNA DERECHA (TICKET) --- */}
          <Box sx={{ width: { xs: '40%', md: '30%' }, p: 2, pl: 0, display: 'flex', flexDirection: 'column' }}>
            <Paper elevation={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}>
              
              <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold"><ShoppingCartIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> Ticket</Typography>
                <Box display="flex" gap={1} alignItems="center">
                  {cart.length > 0 && (
                    <Button size="small" color="inherit" onClick={suspendCurrentSale} sx={{ border: '1px outset rgba(255,255,255,0.4)', borderRadius: 1.5, minWidth: '40px', px: 1 }}>
                        <PauseIcon fontSize="small"/> 
                    </Button>
                  )}
                  {suspendedSales.length > 0 && (
                    <Button size="small" color="warning" variant="contained" onClick={() => setSuspendedDialogOpen(true)} sx={{ borderRadius: 1.5, minWidth: '40px', px: 1, boxShadow: 2 }}>
                        <ListAltIcon fontSize="small"/> {suspendedSales.length}
                    </Button>
                  )}
                  <Chip label={`${cart.length} Items`} size="small" sx={{ bgcolor: 'background.paper', color: 'primary.main', fontWeight: 'bold' }} />
                </Box>
              </Box>

              {/* LISTA DE ITEMS */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'background.paper' }}>
                <List disablePadding>
                  {cart.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5, mt: 4 }}>
                      <ShoppingCartIcon sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
                      <Typography color="text.secondary">Carrito Vacío</Typography>
                    </Box>
                  ) : (
                    cart.map((item) => (
                      <ListItem key={item.uniqueId} divider secondaryAction={<IconButton size="small" onClick={() => removeFromCart(item.uniqueId)}><DeleteIcon color="error" fontSize="small" /></IconButton>}>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight="bold" color="text.primary">{item.name}</Typography>}
                          secondary={
                            <>
                              {item.is_serializable && <Typography variant="caption" display="block" color="warning.main">[IMEI: {item.serial_number}]</Typography>}
                              <Typography variant="caption" color="text.secondary">{item.quantity} x S/ {item.price.toFixed(2)}</Typography>
                            </>
                          }
                        />
                        <Typography variant="body2" fontWeight="bold" sx={{ mr: 2, color: 'text.primary' }}>S/ {(item.quantity * item.price).toFixed(2)}</Typography>
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>

              {/* ZONA INFERIOR: CLIENTE Y TOTALES */}
              <Box sx={{ bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}>
                
                {/* BUSCADOR DE CLIENTE */}
                <Box sx={{ p: 2, pb: 1 }}>
                  <TextField
                    label="DNI Cliente (Enter para buscar)" variant="outlined" size="small" fullWidth
                    value={clientDni} onChange={(e) => setClientDni(e.target.value)}
                    inputRef={clientInputRef}
                    onKeyDown={handleSearchClient}
                    InputProps={{ 
                        startAdornment: (<InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment>),
                        endAdornment: loadingClient && <CircularProgress size={20}/>
                    }}
                    sx={{ bgcolor: 'background.paper', mb: 1 }}
                  />
                  
                  {/* VISUALIZACIÓN DE NOMBRE MANUAL */}
                  {isManualClient && (
                      <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'warning.main' }}>
                          <TextField
                              label="Nombre de Cliente Manual" variant="outlined" size="small" fullWidth
                              value={clientName} onChange={(e) => setClientName(e.target.value.toUpperCase())}
                              autoFocus
                              placeholder="Ej: JUAN PEREZ"
                              sx={{ mb: 1 }}
                          />
                          <Box>
                              <Typography variant="caption" color="success.main">✨ Nuevo (Se registrará al cobrar)</Typography>
                              <Box mt={0.5}>
                                  <FormControlLabel
                                      control={<Checkbox size="small" checked={acceptsMarketing} onChange={(e) => setAcceptsMarketing(e.target.checked)} color="primary" />}
                                      label={<Typography variant="caption" color="text.secondary">Autoriza promociones (Ley N° 29733)</Typography>}
                                  />
                              </Box>
                          </Box>
                      </Box>
                  )}

                  {/* VISUALIZACIÓN DE NOMBRE Y PUNTOS (AUTOMÁTICO) */}
                  {clientName && !isManualClient && (
                      <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'primary.light' }}>
                          <Typography variant="subtitle2" color="primary" fontWeight="bold" noWrap>{clientName}</Typography>
                          {clientId ? (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                  <StarIcon sx={{ color: 'gold', fontSize: 16 }} />
                                  <Typography variant="caption" fontWeight="bold">{clientPoints} Puntos</Typography>
                              </Box>
                          ) : (
                              <Box>
                                  <Typography variant="caption" color="success.main">✨ Nuevo (Se registrará al cobrar)</Typography>
                                  <Box mt={0.5}>
                                      <FormControlLabel
                                          control={<Checkbox size="small" checked={acceptsMarketing} onChange={(e) => setAcceptsMarketing(e.target.checked)} color="primary" />}
                                          label={<Typography variant="caption" color="text.secondary">Autoriza promociones (Ley N° 29733)</Typography>}
                                      />
                                  </Box>
                              </Box>
                          )}
                      </Box>
                  )}
                </Box>

                <Box sx={{ p: 2, pt: 0 }}>
                  {/* SUBTOTAL, DESCUENTO Y TOTAL */}
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">Subtotal:</Typography>
                      <Typography variant="body2">{formatCurrency(total)}</Typography>
                    </Box>
                    
                    {/* Visualización de Descuento Normal */}
                    {discountAmount > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="error.main">
                          {appliedCouponId ? 'Cupón Promocional:' : `Descuento (${discountType === 'PERCENTAGE' ? `${discountValue}%` : 'Fijo'}):`}
                        </Typography>
                        <Typography variant="body2" color="error.main" fontWeight="bold">
                          -S/ {discountAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    )}

                    {/* Visualización de Descuento Puntos */}
                    {pointsMoney > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="warning.main">
                          Canje Puntos ({pointsUsed}):
                        </Typography>
                        <Typography variant="body2" color="warning.main" fontWeight="bold">
                          -S/ {pointsMoney.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="h6" color="text.secondary">TOTAL:</Typography>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {formatCurrency(netTotal)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* MÓDULO CUPONES / PROMOCIONES */}
                  <Box display="flex" gap={1} mb={2}>
                     <TextField 
                        size="small" 
                        fullWidth 
                        placeholder="Código de Descuento"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={appliedCouponId !== null || cart.length === 0}
                     />
                     {appliedCouponId ? (
                        <Button color="error" variant="contained" onClick={handleRemoveCoupon} size="small" sx={{ minWidth: "80px" }}>
                           Quitar
                        </Button>
                     ) : (
                        <Button color="primary" variant="contained" onClick={handleValidateCoupon} disabled={!couponCode || isVerifyingCoupon || cart.length === 0} size="small" sx={{ minWidth: "80px" }}>
                           {isVerifyingCoupon ? "..." : "Aplicar"}
                        </Button>
                     )}
                  </Box>

                  {/* BOTÓN PUNTOS (SOLO SI TIENE PUNTOS) */}
                  {clientPoints > 0 && cart.length > 0 && (
                      <Button 
                        variant={pointsUsed > 0 ? "contained" : "outlined"}
                        color="warning" 
                        fullWidth 
                        size="small"
                        startIcon={<EmojiEventsIcon />}
                        onClick={togglePointsRedemption}
                        sx={{ mb: 1 }}
                      >
                        {pointsUsed > 0 
                            ? `Cancelar Canje (-S/ ${pointsMoney.toFixed(2)})` 
                            : `Canjear Puntos (Disp: ${clientPoints})`}
                      </Button>
                  )}

                  {/* BOTÓN DESCUENTO NORMAL */}
                  <Button 
                    variant="outlined" 
                    color="warning" 
                    fullWidth 
                    size="small"
                    startIcon={<DiscountIcon />}
                    onClick={() => setDiscountDialogOpen(true)}
                    disabled={cart.length === 0 || appliedCouponId !== null} // Bloqueado si hay cupón activo
                    sx={{ mb: 1 }}
                  >
                    {discountAmount > 0 && !appliedCouponId ? `Descuento Manual: -S/ ${discountAmount.toFixed(2)}` : 'Aplicar Descuento Manual'}
                  </Button>
                  
                  <Grid container spacing={1} mb={2}>
                     <Grid item xs={4}>
                       <Button variant="outlined" fullWidth size="small" onClick={() => handleCheckoutAttempt('Efectivo')} sx={{ textTransform: 'none' }}>
                         <AttachMoneyIcon fontSize="small" sx={{ mr: 0.5 }}/> EFECTIVO
                       </Button>
                     </Grid>
                     <Grid item xs={4}>
                       <Button variant="outlined" fullWidth size="small" onClick={() => handleCheckoutAttempt('Tarjeta')} sx={{ textTransform: 'none' }}>
                         <CreditCardIcon fontSize="small" sx={{ mr: 0.5 }}/> TARJETA
                       </Button>
                     </Grid>
                     <Grid item xs={4}>
                       <Button variant="outlined" fullWidth size="small" onClick={() => handleCheckoutAttempt('Yape')} sx={{ textTransform: 'none' }}>
                         <QrCodeIcon fontSize="small" sx={{ mr: 0.5 }}/> YAPE/PLIN
                       </Button>
                     </Grid>
                  </Grid>

                  <Button 
                      variant="contained" color="success" fullWidth size="large" 
                      disabled={cart.length === 0 || loadingSale} 
                      onClick={() => handleCheckoutAttempt('Efectivo')}
                  >
                      {loadingSale ? "PROCESANDO..." : `COBRAR S/ ${formatCurrency(netTotal)}`}
                  </Button>

                  {/* LEYENDA ATAJOS */}
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {[
                      { key: 'F1', label: 'Cobrar' },
                      { key: 'F2', label: 'Buscar' },
                      { key: 'F3', label: 'Cliente' },
                      { key: 'ESC', label: 'Limpiar' },
                    ].map(s => (
                      <Chip
                        key={s.key}
                        label={`${s.key} ${s.label}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 22 }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </CashGuard>

      {/* MODAL IMEI */}
      <Dialog open={imeiDialogOpen} onClose={() => setImeiDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>Seleccionar IMEI</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {loadingImeis ? <CircularProgress /> : (
            <List>
              {availableImeis.map((imei) => {
                const serialNumber = typeof imei === 'string' ? imei : imei.serial_number;
                return (
                  <ListItem key={serialNumber} disablePadding>
                    <ListItemButton onClick={() => addToCartWithImei(serialNumber)}>
                      <ListItemText 
                        primary={<strong>{serialNumber}</strong>} 
                        secondary="Disponible" 
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
        <Button onClick={() => setImeiDialogOpen(false)} color="error">Cancelar</Button>
      </DialogActions>
      </Dialog>

      {/* MODAL DESCUENTO */}
      <Dialog 
        open={discountDialogOpen} 
        onClose={() => {
          setDiscountDialogOpen(false);
          setSupervisorPin('');
        }} 
        maxWidth="xs" 
        fullWidth
      >
        {/* ... (Contenido del modal descuento igual que antes) ... */}
        <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DiscountIcon /> Aplicar Descuento
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Tipo de descuento:</Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Button 
                  variant={discountType === 'PERCENTAGE' ? 'contained' : 'outlined'}
                  fullWidth
                  onClick={() => setDiscountType('PERCENTAGE')}
                  color="warning"
                >
                  % Porcentaje
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button 
                  variant={discountType === 'FIXED_AMOUNT' ? 'contained' : 'outlined'}
                  fullWidth
                  onClick={() => setDiscountType('FIXED_AMOUNT')}
                  color="warning"
                >
                  S/ Monto Fijo
                </Button>
              </Grid>
            </Grid>
          </Box>

          <TextField
            fullWidth
            label={discountType === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Monto (S/)'}
            type="number"
            value={discountValue}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setDiscountValue(e.target.value);
              if (discountType === 'PERCENTAGE') {
                const calcDiscount = total * (val / 100);
                setDiscountAmount(calcDiscount > total ? total : calcDiscount);
                setNeedsApproval(val > 15);
              } else {
                setDiscountAmount(val > total ? total : val);
                setNeedsApproval((val / total * 100) > 15);
              }
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start">{discountType === 'PERCENTAGE' ? '%' : 'S/'}</InputAdornment>
            }}
            sx={{ mb: 2 }}
          />

          <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Subtotal:</Typography>
              <Typography variant="body2">S/ {total.toFixed(2)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="error.main">Descuento:</Typography>
              <Typography variant="body2" color="error.main" fontWeight="bold">
                -S/ {discountAmount.toFixed(2)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight="bold">Total:</Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                S/ {(total - discountAmount).toFixed(2)}
              </Typography>
            </Box>
          </Paper>

          {needsApproval && (
            <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LockIcon fontSize="small" /> Descuento mayor a 15% - Requiere aprobación
              </Typography>
              <TextField
                fullWidth
                label="PIN del Supervisor"
                type="password"
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                inputProps={{ maxLength: 6 }}
                size="small"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setDiscountDialogOpen(false);
              setDiscountValue('');
              setDiscountAmount(0);
              setSupervisorPin('');
              setNeedsApproval(false);
            }} 
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              setDiscountValue('');
              setDiscountAmount(0);
              setSupervisorPin('');
              setNeedsApproval(false);
              setDiscountDialogOpen(false);
            }} 
            color="error"
            disabled={discountAmount === 0}
          >
            Quitar Descuento
          </Button>
          <Button 
            variant="contained" 
            color="warning"
            onClick={() => {
              if (needsApproval && !supervisorPin) {
                alert('Ingrese el PIN del supervisor');
                return;
              }
              if (needsApproval && supervisorPin.length < 4) {
                alert('PIN inválido');
                return;
              }
              setDiscountDialogOpen(false);
              setSupervisorPin('');
            }}
            disabled={discountAmount === 0}
          >
            Aplicar Descuento
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* MODAL COBRANZA Y VUELTO (TIER 3) */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoneyIcon /> {paymentMethod === 'Efectivo' ? 'Cobrar en Efectivo' : `Cobrar con ${paymentMethod}`}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
           <Typography variant="h2" align="center" color="success.main" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
              S/ {netTotal.toFixed(2)}
           </Typography>
           <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
              Total a Pagar
           </Typography>
           
           <Divider sx={{ my: 3 }} />

           {paymentMethod === 'Efectivo' ? (
              <Box>
                <TextField 
                   fullWidth label="Monto Recibido del Cliente (S/)" type="number" 
                   autoFocus
                   value={amountReceived} 
                   onChange={(e) => setAmountReceived(e.target.value)}
                   InputProps={{ startAdornment: <InputAdornment position="start">S/</InputAdornment> }}
                />
                {(amountReceived && parseFloat(amountReceived) >= netTotal) ? (
                   <Typography variant="h5" align="center" color="primary.main" fontWeight="bold" sx={{ mt: 3 }}>
                     Vuelto: S/ {(parseFloat(amountReceived) - netTotal).toFixed(2)}
                   </Typography>
                ) : (
                   <Typography variant="body2" align="center" color="error.main" sx={{ mt: 2 }}>
                     Ingrese un monto mayor o igual al total a pagar
                   </Typography>
                )}
              </Box>
           ) : (
              <Box>
                <TextField 
                   fullWidth label="N° de Operación o Referencia" type="text"
                   autoFocus
                   value={paymentReference} 
                   onChange={(e) => setPaymentReference(e.target.value)}
                   required
                />
              </Box>
           )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPaymentDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button 
            variant="contained" color="success" onClick={handlePay} size="large"
            disabled={
              loadingSale || 
              (paymentMethod === 'Efectivo' && (!amountReceived || parseFloat(amountReceived) < netTotal)) ||
              (paymentMethod !== 'Efectivo' && !paymentReference.trim())
            }
          >
             {loadingSale ? "PROCESANDO..." : "CONFIRMAR PAGO"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL LISTA DE SUSPENDIDAS (TIER 3) */}
      <Dialog open={suspendedDialogOpen} onClose={() => setSuspendedDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ListAltIcon /> Ventas Suspendidas ({suspendedSales.length})
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List>
            {suspendedSales.length === 0 && <ListItem><Typography color="text.secondary">No hay ventas suspendidas.</Typography></ListItem>}
            {suspendedSales.map(sale => (
               <ListItem key={sale.id} divider>
                 <ListItemText 
                    primary={`Venta de: ${sale.clientName || 'PÚBLICO GENERAL'} - S/ ${sale.netTotal.toFixed(2)}`}
                    secondary={`Suspendida a las ${sale.date} | ${sale.cart.length} items en carrito`}
                 />
                 <Button variant="outlined" color="primary" onClick={() => resumeSuspendedSale(sale)} sx={{ mr: 1 }}>Retomar</Button>
                 <IconButton onClick={() => setSuspendedSales(suspendedSales.filter(s => s.id !== sale.id))} color="error">
                    <DeleteIcon />
                 </IconButton>
               </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
           <Button onClick={() => setSuspendedDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Layout>
  );
}

export default POS;