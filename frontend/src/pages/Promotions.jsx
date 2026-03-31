import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DiscountIcon from '@mui/icons-material/Discount';
import api from '../api/axios';

function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discount_type: 'PERCENTAGE',
    value: 0,
    min_purchase: 0,
    max_discount: 0,
    requires_approval: false,
    valid_from: '',
    valid_until: ''
  });

  const fetchPromotions = async () => {
    try {
      const res = await api.get('/promotions/');
      setPromotions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleOpen = () => {
    setFormData({
      name: '',
      code: '',
      discount_type: 'PERCENTAGE',
      value: 0,
      min_purchase: 0,
      max_discount: 0,
      requires_approval: false,
      valid_from: '',
      valid_until: ''
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        min_purchase: formData.min_purchase > 0 ? formData.min_purchase : null,
        max_discount: formData.max_discount > 0 ? formData.max_discount : null,
      };
      await api.post('/promotions/', payload);
      setOpen(false);
      fetchPromotions();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("¿Seguro que deseas desactivar este cupón?")) {
        try {
            await api.delete(`/promotions/${id}`);
            fetchPromotions();
        } catch (error) {
            alert("Error: " + (error.response?.data?.detail || error.message));
        }
    }
  }

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" fontWeight="bold">Cupones y Promociones</Typography>
            <Typography variant="body1" color="text.secondary">Crea reglas de descuento que se validarán automáticamente en Caja.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          Nuevo Cupón
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell><b>Estado</b></TableCell>
              <TableCell><b>Nombre</b></TableCell>
              <TableCell><b>Código Promo</b></TableCell>
              <TableCell><b>Descuento</b></TableCell>
              <TableCell><b>Mín. Compra</b></TableCell>
              <TableCell><b>Expiración</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {promotions.map((p) => (
              <TableRow key={p.promotion_id}>
                <TableCell>
                  <Chip label={p.is_active ? "ACTIVO" : "INACTIVO"} color={p.is_active ? "success" : "default"} size="small" />
                </TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell><Typography fontWeight="bold" color="primary">{p.code || '-'}</Typography></TableCell>
                <TableCell>
                  {p.discount_type === 'PERCENTAGE' ? `${p.value}%` : `S/ ${p.value}`}
                </TableCell>
                <TableCell>{p.min_purchase ? `S/ ${p.min_purchase}` : '-'}</TableCell>
                <TableCell>{p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'Sin F. Vencimiento'}</TableCell>
                <TableCell align="center">
                  <IconButton color="error" onClick={() => handleDelete(p.promotion_id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {promotions.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">No hay cupones creados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DiscountIcon color="primary" /> Crear Cupón
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre Interno (Ej: Navidad 2026)" required
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Código para el cajero" required placeholder="NAVI26"
                value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Tipo de Descuento"
                value={formData.discount_type} onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
              >
                <MenuItem value="PERCENTAGE">Porcentaje (%)</MenuItem>
                <MenuItem value="FIXED_AMOUNT">Monto Fijo (S/)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Valor a Descontar" required
                value={formData.value} onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Compra Mínima (Opcional)"
                value={formData.min_purchase} onChange={(e) => setFormData({...formData, min_purchase: parseFloat(e.target.value) || 0})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="date" label="Válido Desde" InputLabelProps={{ shrink: true }}
                value={formData.valid_from} onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="date" label="Válido Hasta" InputLabelProps={{ shrink: true }}
                value={formData.valid_until} onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name || !formData.code || formData.value <= 0}>
            Guardar Cupón
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default Promotions;
