import React, { useState, useEffect } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Box,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../api/axios'; // Centralized Axios configured with base URL and token

function PurchaseOrders() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/purchases/orders');
        setOrders(response.data);
      } catch (error) {
        console.error("Error al obtener las órdenes de compra:", error);
        alert("Hubo un error cargando las órdenes de compra.");
      }
    };
    fetchOrders();
  }, []);

  const fetchOrdersGlobal = async () => {
    try {
      const response = await api.get('/purchases/orders');
      setOrders(response.data);
    } catch (error) {
      console.error("Error al obtener las órdenes de compra:", error);
    }
  };

  const handleDownloadPDF = async (po_id) => {
    try {
      const response = await api.get(`/purchases/orders/${po_id}/pdf`, {
        responseType: 'blob', // Important for handling binary data (PDF)
      });
      
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = `Orden_Compra_OC-${po_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      alert("No se pudo generar/descargar el PDF.");
    }
  };

  const handleReceiveOrder = async (po_id) => {
    if (!window.confirm("¿Confirmar recepción de esta orden? Esto ingresará la mercadería al almacén físico de esta tienda.")) return;

    try {
      await api.put(`/purchases/orders/${po_id}/receive`);
      alert("Mercadería recibida con éxito y Kardex actualizado.");
      fetchOrdersGlobal(); // Refresh table
    } catch (error) {
      if (error.response?.data?.detail && error.response.data.detail.includes("seriado")) {
        // Redirigir a la pantalla de recepción avanzada
        if (window.confirm("Esta Orden contiene productos seriados (CELULARES). ¿Desea ir a la pantalla de Recepción por IMEI para escanearlos?")) {
           navigate(`/purchase-orders/${po_id}/receive`);
        }
      } else {
        console.error("Error al recibir orden:", error);
        alert(error.response?.data?.detail || "Hubo un error al procesar la recepción.");
      }
    }
  };

  const getStatusChip = (status) => {
    if (status === 'PENDIENTE') return <Chip label="PENDIENTE" color="warning" size="small" />;
    if (status === 'RECIBIDO') return <Chip label="RECIBIDO" color="success" size="small" />;
    if (status === 'ANULADO') return <Chip label="ANULADO" color="error" size="small" />;
    return <Chip label={status} size="small" />;
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Órdenes de Compra (OC)</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => navigate('/purchase-orders/new')}
        >
          Crear OC
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? theme.palette.action.hover : 'grey.200' }}>
              <TableCell><strong>N° OC</strong></TableCell>
              <TableCell><strong>Proveedor</strong></TableCell>
              <TableCell><strong>Fecha Emisión</strong></TableCell>
              <TableCell><strong>Total</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay órdenes de compra registradas.</TableCell>
              </TableRow>
            ) : (
              orders.map((po) => (
                <TableRow key={po.po_id} hover>
                  <TableCell><strong>OC-{po.po_id.toString().padStart(4, '0')}</strong></TableCell>
                  <TableCell>{po.supplier_name}</TableCell>
                  <TableCell>{new Date(po.date_created).toLocaleDateString()}</TableCell>
                  <TableCell>S/ {po.total_amount.toFixed(2)}</TableCell>
                  <TableCell>{getStatusChip(po.status)}</TableCell>
                  <TableCell align="center">
                    
                    {/* Botón Descargar PDF */}
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="secondary" 
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadPDF(po.po_id)}
                      sx={{ mr: 1 }}
                    >
                      PDF
                    </Button>

                    {/* Botón Recibir si está PENDIENTE */}
                    {po.status === 'PENDIENTE' && (
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="success" 
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => handleReceiveOrder(po.po_id)}
                      >
                        Recibir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Layout>
  );
}

export default PurchaseOrders;
