import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  TextField,
  Chip,
  CircularProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import api from '../api/axios';

function PurchaseOrderReceive() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mapeo: { product_id: { expected: x, scanned: ['imei1', 'imei2'], is_serializable: true } }
  const [receiveData, setReceiveData] = useState({});
  const [currentImeiInput, setCurrentImeiInput] = useState({});

  useEffect(() => {
    if (id) fetchOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/purchases/orders/${id}`);
      const po = response.data;
      setOrder(po);

      // Evaluar qué partes necesitan IMEI basado en el endpoint get_products en el backend
      // Hacemos un llamado a products para saber cuáles son serializables
      const prodRes = await api.get('/products/');
      const catalogue = prodRes.data;

      let initData = {};
      po.details.forEach(det => {
        const prodMatch = catalogue.find(p => p.product_id === det.product_id);
        const isSerial = prodMatch ? prodMatch.is_serializable : false;
        
        initData[det.product_id] = {
          expected: det.quantity,
          name: det.product_name,
          unit_cost: det.unit_cost,
          is_serializable: isSerial,
          scanned: []
        };
      });
      setReceiveData(initData);

    } catch (error) {
      console.error("Error al obtener la orden:", error);
      alert("Hubo un error cargando los detalles de la orden.");
      navigate("/purchase-orders");
    } finally {
      setLoading(false);
    }
  };

  const handleImeiInput = (productId, value) => {
    setCurrentImeiInput({ ...currentImeiInput, [productId]: value });
  };

  const handleAddImei = (e, productId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = currentImeiInput[productId]?.trim();
      if (!code) return;

      const data = receiveData[productId];
      
      if (data.scanned.length >= data.expected) {
        alert("Ya has escaneado la cantidad solicitada para este producto.");
        return;
      }
      
      if (data.scanned.includes(code)) {
        alert("Este IMEI ya fue escaneado en esta sesión.");
        return;
      }

      setReceiveData({
        ...receiveData,
        [productId]: {
          ...data,
          scanned: [...data.scanned, code]
        }
      });
      setCurrentImeiInput({ ...currentImeiInput, [productId]: '' }); // clear input
    }
  };

  const removeImei = (productId, code) => {
    const data = receiveData[productId];
    setReceiveData({
      ...receiveData,
      [productId]: {
        ...data,
        scanned: data.scanned.filter(s => s !== code)
      }
    });
  };

  const handleSubmit = async () => {
    // Validar faltantes
    for (const data of Object.values(receiveData)) {
      if (data.is_serializable && data.scanned.length !== data.expected) {
        alert(`🚨 Faltan escanear IMEIs para el producto: ${data.name}. (Van ${data.scanned.length} de ${data.expected})`);
        return;
      }
    }

    if (!window.confirm("¿Confirmar que los números de serie son correctos y completar el ingreso al inventario físico?")) return;

    try {
        // Preparar payload
        const payload = {
            items: Object.entries(receiveData)
                .filter(([, data]) => data.is_serializable)
                .map(([pId, data]) => ({
                    product_id: parseInt(pId),
                    serials: data.scanned
                }))
        };

        await api.post(`/purchases/orders/${id}/receive-with-imeis`, payload);
        alert("¡Recepción Completada! Inventario y Series actualizados en el sistema.");
        navigate('/purchase-orders');

    } catch (error) {
        console.error("Error al enviar recepción:", error);
        alert(error.response?.data?.detail || "Hubo un error validando las series en el servidor.");
    }
  };

  if (loading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!order) return null;

  return (
    <Layout>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/purchase-orders')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Recepción Avanzada: OC-{order.po_id.toString().padStart(4, '0')}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Proveedor</Typography>
                <Typography variant="h6">{order.supplier_name}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Fecha Solicitada</Typography>
                <Typography variant="h6">{new Date(order.date_created).toLocaleDateString()}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Total Documento</Typography>
                <Typography variant="h6" color="primary">S/ {order.total_amount.toFixed(2)}</Typography>
            </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" sx={{ mb: 2 }}>Lista de Validación Física</Typography>
      
      {Object.entries(receiveData).map(([pId, data]) => (
        <Paper elevation={1} sx={{ p: 2, mb: 2, borderLeft: '6px solid', borderColor: data.is_serializable ? 'primary.main' : 'success.main' }} key={pId}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                    <Typography variant="h6">{data.name}</Typography>
                    <Typography variant="body2" color="textSecondary">Costo U: S/ {data.unit_cost.toFixed(2)}</Typography>
                </Grid>
                
                <Grid item xs={12} md={2}>
                    <Typography variant="h5" align="center" color={data.is_serializable && data.scanned.length < data.expected ? "error" : "success"}>
                        {data.is_serializable ? data.scanned.length : data.expected} / {data.expected}
                    </Typography>
                    <Typography variant="body2" align="center" color="textSecondary">
                        Recibidos
                    </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                    {data.is_serializable ? (
                        <Box>
                            {/* Input para escanear */}
                            <TextField
                                label="Escanear IMEI (Presione Enter)"
                                fullWidth
                                size="small"
                                value={currentImeiInput[pId] || ''}
                                onChange={(e) => handleImeiInput(pId, e.target.value)}
                                onKeyDown={(e) => handleAddImei(e, pId)}
                                disabled={data.scanned.length >= data.expected}
                                sx={{ mb: 1 }}
                            />
                            {/* Lista de chips */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {data.scanned.map(code => (
                                    <Chip 
                                        key={code} 
                                        label={code} 
                                        onDelete={() => removeImei(pId, code)} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined"
                                    />
                                ))}
                                {data.scanned.length === 0 && <Typography variant="caption" color="error">Requiere escaneo obligatorio.</Typography>}
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <Chip label="Producto General - Se recibirá completo automáticamente" color="default" />
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Paper>
      ))}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="text" color="inherit" onClick={() => navigate('/purchase-orders')}>
            Cancelar
        </Button>
        <Button 
            variant="contained" 
            color="primary" 
            size="large" 
            startIcon={<CheckCircleOutlineIcon />}
            onClick={handleSubmit}
        >
            Confirmar Recepción al Inventario
        </Button>
      </Box>

    </Layout>
  );
}

export default PurchaseOrderReceive;
