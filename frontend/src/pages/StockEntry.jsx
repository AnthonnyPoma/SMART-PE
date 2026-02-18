import React, { useState, useEffect } from "react";
import {
  Typography, TextField, Button, MenuItem, Paper,
  Grid, Chip, Alert, Divider, InputAdornment, Box
} from "@mui/material";
import Layout from "../components/Layout";
import axios from "axios";
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SaveIcon from '@mui/icons-material/Save';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';

const API_URL = "http://localhost:8000";

function StockEntry() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]); // Nuevo estado para proveedores
  
  // Datos del Formulario
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(""); // Nuevo
  const [docType, setDocType] = useState("FACTURA"); // Nuevo
  const [docNumber, setDocNumber] = useState(""); // Nuevo
  
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState("");
  
  const [currentImei, setCurrentImei] = useState("");
  const [serialsList, setSerialsList] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Cargar Productos y Proveedores al inicio
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [resProd, resSup] = await Promise.all([
            axios.get(`${API_URL}/products/`, config),
            axios.get(`${API_URL}/suppliers/`, config)
        ]);
        setProducts(resProd.data);
        setSuppliers(resSup.data);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    };
    fetchData();
  }, []);

  const currentProd = products.find(p => p.product_id === selectedProduct);

  const handleAddImei = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = currentImei.trim();
      if (!code) return;
      if (serialsList.includes(code)) {
        alert("Este IMEI ya está en la lista");
        return;
      }
      setSerialsList([...serialsList, code]);
      setCurrentImei("");
    }
  };

  const removeImei = (code) => {
    setSerialsList(serialsList.filter(s => s !== code));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('token');
    const storeId = localStorage.getItem('store_id'); // ✅ ID Dinámico

    if (!token) {
        setMessage({ type: "error", text: "No estás autenticado" });
        setLoading(false);
        return;
    }

    try {
      let payload = {
        product_id: selectedProduct,
        store_id: storeId ? parseInt(storeId) : 1, // Fallback si falla
        quantity: 0,
        unit_cost: parseFloat(unitCost),
        serials: [],
        // Nuevos campos de Compra
        supplier_id: selectedSupplier,
        document_type: docType,
        document_number: docNumber,
        notes: "Ingreso vía Web"
      };

      if (currentProd.is_serializable) {
        if (serialsList.length === 0) throw new Error("Ingresa al menos un IMEI");
        payload.serials = serialsList;
        payload.quantity = serialsList.length;
      } else {
        payload.quantity = parseInt(quantity);
        if (payload.quantity <= 0) throw new Error("Cantidad inválida");
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/stock/entry`, payload, config);      
      
      setMessage({ type: "success", text: "✅ Compra registrada correctamente" });
      
      // Reset parcial (mantenemos proveedor y factura por si sigue ingresando items de la misma compra)
      setQuantity(1);
      setSerialsList([]);
      setUnitCost("");
      setSelectedProduct("");

    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || error.message || "Error desconocido";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <LocalShippingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">Ingreso de Mercadería</Typography>
            <Typography variant="body1" color="text.secondary">Registra compras a proveedores y actualiza stock.</Typography>
          </Box>
        </Box>

        {message && <Alert severity={message.type} sx={{ mb: 3 }}>{message.text}</Alert>}

        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <form onSubmit={handleSubmit}>
            
            {/* SECCIÓN 1: DATOS DE LA COMPRA (PROVEEDOR) */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon color="action"/> Datos de Compra
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <TextField
                        select fullWidth label="Seleccionar Proveedor" required
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                    >
                        {suppliers.map((sup) => (
                            <MenuItem key={sup.supplier_id} value={sup.supplier_id}>
                                {sup.name} {sup.ruc ? `(${sup.ruc})` : ''}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField 
                        select fullWidth label="Tipo Doc." 
                        value={docType} onChange={(e) => setDocType(e.target.value)}
                    >
                        <MenuItem value="FACTURA">Factura</MenuItem>
                        <MenuItem value="BOLETA">Boleta</MenuItem>
                        <MenuItem value="GUIA">Guía Remisión</MenuItem>
                    </TextField>
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField 
                        fullWidth label="N° Documento" required placeholder="F001-123"
                        value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                    />
                </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* SECCIÓN 2: DATOS DEL PRODUCTO */}
            <Typography variant="h6" gutterBottom>Detalle del Ingreso</Typography>
            
            <TextField
              select label="Producto" fullWidth value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setSerialsList([]); }}
              sx={{ mb: 3 }}
            >
              {products.map((prod) => (
                <MenuItem key={prod.product_id} value={prod.product_id}>
                  {prod.sku} - {prod.name} 
                </MenuItem>
              ))}
            </TextField>

            {currentProd && (
              <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3, bgcolor: 'background.default' }}>
                <Box display="flex" gap={1} mb={2}>
                  <Chip 
                    label={currentProd.is_serializable ? "REQUIERE SERIES (IMEI)" : "CANTIDAD SIMPLE"} 
                    color={currentProd.is_serializable ? "warning" : "info"}
                    size="small"
                  />
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Costo Unitario (S/)" type="number" fullWidth required
                            value={unitCost} onChange={(e) => setUnitCost(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><AttachMoneyIcon/></InputAdornment> }}
                        />
                    </Grid>
                    
                    {!currentProd.is_serializable && (
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Cantidad" type="number" fullWidth required
                                value={quantity} onChange={(e) => setQuantity(e.target.value)}
                            />
                        </Grid>
                    )}
                </Grid>

                {currentProd.is_serializable && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>Escáner de IMEIs:</Typography>
                    <TextField
                      fullWidth placeholder="Escanea o escribe IMEI y presiona ENTER"
                      value={currentImei}
                      onChange={(e) => setCurrentImei(e.target.value)}
                      onKeyDown={handleAddImei}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: 'background.paper', p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      {serialsList.length === 0 && <Typography variant="caption" color="text.secondary">Lista vacía</Typography>}
                      {serialsList.map((code, index) => (
                        <Chip key={index} label={code} onDelete={() => removeImei(code)} sx={{ m: 0.5 }} />
                      ))}
                    </Box>
                    <Typography align="right" variant="caption" display="block" mt={1}>
                      Total Leídos: {serialsList.length}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            <Button 
              type="submit" variant="contained" size="large" fullWidth 
              disabled={!selectedProduct || !selectedSupplier || loading}
              startIcon={<SaveIcon />} color="primary" sx={{ py: 1.5, fontWeight: 'bold' }}
            >
              {loading ? "Procesando..." : "REGISTRAR COMPRA"}
            </Button>

          </form>
        </Paper>
      </Box>
    </Layout>
  );
}

export default StockEntry;