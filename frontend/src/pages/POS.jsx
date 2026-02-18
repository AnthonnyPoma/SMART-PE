import React, { useState, useEffect, useRef } from 'react';
import {
  Paper, Typography, TextField, Button, Box,
  List, ListItem, ListItemButton, ListItemText, IconButton, Divider,
  Card, CardActionArea, CardContent, Chip, InputAdornment, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, useTheme
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

import Layout from '../components/Layout';
import CashGuard from '../components/cash/CashGuard';
import axios from "axios";

const API_URL = "http://localhost:8000";

function POS() {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const searchInputRef = useRef(null);

  // --- ESTADOS DE CLIENTE Y PUNTOS ---
  const [clientDni, setClientDni] = useState('');
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState(null);
  const [clientPoints, setClientPoints] = useState(0);
  const [loadingClient, setLoadingClient] = useState(false);

  // --- ESTADOS DE REDENCIÓN DE PUNTOS (NUEVO) ---
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
    
    // 2. Restar Puntos (NUEVO)
    if (pointsMoney > 0) {
      currentNet -= pointsMoney;
    }
    
    setNetTotal(currentNet > 0 ? currentNet : 0);
  }, [cart, discountAmount, pointsMoney]); // Agregado pointsMoney

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
      // Resetear canje al cambiar cliente
      setPointsUsed(0);
      setPointsMoney(0);

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
        alert("Cliente no encontrado en BD ni RENIEC. Ingrese nombre manual si es necesario.");
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
  };

  const removeFromCart = (uniqueId) => {
    setCart(cart.filter(item => item.uniqueId !== uniqueId));
  };

  // 💰 PROCESO DE PAGO HÍBRIDO
  const handlePay = async () => {
    if (cart.length === 0) return alert("Carrito vacío");
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
                 address: "Dirección POS"
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
        payment_method: "Efectivo",
        client_dni: clientDni || null,
        client_id: finalClientId, 
        
        // Campos de Descuento
        discount_type: discountAmount > 0 ? discountType : null,
        discount_value: discountAmount > 0 ? parseFloat(discountValue) : 0,
        discount_amount: discountAmount,
        
        // Fidelización
        points_used: pointsUsed,
        points_discount_amount: pointsMoney,
        
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
  );

  return (
    <Layout disablePadding>
      <CashGuard>
        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: 'background.default' }}>

          {/* --- COLUMNA IZQUIERDA (CATÁLOGO) --- */}
          <Box sx={{ width: { xs: '60%', md: '70%' }, p: 2, display: 'flex', flexDirection: 'column' }}>
            
            <Paper elevation={0} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', borderRadius: 2, bgcolor: 'background.paper' }}>
              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <TextField
                inputRef={searchInputRef}
                fullWidth variant="standard" placeholder="Buscar producto..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ disableUnderline: true }}
              />
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
                            S/ {Number(prod.base_price).toFixed(2)}
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
                <Chip label={`${cart.length} Items`} size="small" sx={{ bgcolor: 'background.paper', color: 'primary.main', fontWeight: 'bold' }} />
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
                    onKeyDown={handleSearchClient}
                    InputProps={{ 
                        startAdornment: (<InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment>),
                        endAdornment: loadingClient && <CircularProgress size={20}/>
                    }}
                    sx={{ bgcolor: 'background.paper', mb: 1 }}
                  />
                  
                  {/* VISUALIZACIÓN DE NOMBRE Y PUNTOS */}
                  {clientName && (
                      <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'primary.light' }}>
                          <Typography variant="subtitle2" color="primary" fontWeight="bold" noWrap>{clientName}</Typography>
                          {clientId ? (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                  <StarIcon sx={{ color: 'gold', fontSize: 16 }} />
                                  <Typography variant="caption" fontWeight="bold">{clientPoints} Puntos</Typography>
                              </Box>
                          ) : (
                              <Typography variant="caption" color="success.main">✨ Nuevo (Se registrará al cobrar)</Typography>
                          )}
                      </Box>
                  )}
                </Box>

                <Box sx={{ p: 2, pt: 0 }}>
                  {/* SUBTOTAL, DESCUENTO Y TOTAL */}
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                      <Typography variant="body2">S/ {total.toFixed(2)}</Typography>
                    </Box>
                    
                    {/* Visualización de Descuento Normal */}
                    {discountAmount > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="error.main">
                          Descuento ({discountType === 'PERCENTAGE' ? `${discountValue}%` : 'Fijo'}):
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
                        S/ {netTotal.toFixed(2)}
                      </Typography>
                    </Box>
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

                  {/* BOTÓN DESCUENTO */}
                  <Button 
                    variant="outlined" 
                    color="warning" 
                    fullWidth 
                    size="small"
                    startIcon={<DiscountIcon />}
                    onClick={() => setDiscountDialogOpen(true)}
                    disabled={cart.length === 0}
                    sx={{ mb: 1 }}
                  >
                    {discountAmount > 0 ? `Descuento: -S/ ${discountAmount.toFixed(2)}` : 'Aplicar Descuento Normal'}
                  </Button>
                  
                  <Grid container spacing={1} mb={2}>
                     <Grid item xs={4}><Button variant="outlined" fullWidth size="small"><AttachMoneyIcon/></Button></Grid>
                     <Grid item xs={4}><Button variant="outlined" fullWidth size="small"><CreditCardIcon/></Button></Grid>
                     <Grid item xs={4}><Button variant="outlined" fullWidth size="small"><QrCodeIcon/></Button></Grid>
                  </Grid>

                  <Button 
                      variant="contained" color="success" fullWidth size="large" 
                      disabled={cart.length === 0 || loadingSale} 
                      onClick={handlePay}
                  >
                      {loadingSale ? "PROCESANDO..." : `COBRAR S/ ${netTotal.toFixed(2)}`}
                  </Button>
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
    </Layout>
  );
}

export default POS;