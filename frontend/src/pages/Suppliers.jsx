import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid,
  Chip, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import api from '../api/axios';

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  const [formData, setFormData] = useState({
    supplier_id: null,
    name: '',
    ruc: '',
    address: '',
    phone: '',
    email: '',
    contact_name: '',
    is_active: true
  });

  const fetchSuppliers = async () => {
    try {
      const res = await api.get(`/suppliers/`);
      setSuppliers(res.data);
    } catch (error) {
      console.error("Error cargando proveedores:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpen = (supplier = null) => {
    if (supplier) {
      setIsEdit(true);
      setFormData(supplier);
    } else {
      setIsEdit(false);
      setFormData({
        name: '', ruc: '', address: '', phone: '', email: '', contact_name: '', is_active: true
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isEdit) {
        await api.put(`/suppliers/${formData.supplier_id}`, formData);
      } else {
        await api.post(`/suppliers/`, formData);
      }
      setOpen(false);
      fetchSuppliers();

    } catch (error) {
      alert("Error al guardar: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShippingIcon fontSize="large" color="primary" /> Proveedores
            </Typography>
            <Typography variant="body1" color="text.secondary">Directorio de socios comerciales.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Nuevo Proveedor
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell><b>Empresa / RUC</b></TableCell>
              <TableCell><b>Contacto</b></TableCell>
              <TableCell><b>Comunicación</b></TableCell>
              <TableCell><b>Dirección</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No hay proveedores registrados.</TableCell></TableRow>
            ) : (
                suppliers.map((sup) => (
                <TableRow key={sup.supplier_id} hover>
                    <TableCell>
                        <Typography fontWeight="bold">{sup.name}</Typography>
                        <Chip label={sup.ruc || "S/N"} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                    </TableCell>
                    <TableCell>{sup.contact_name || "-"}</TableCell>
                    <TableCell>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                            {sup.phone && <Box display="flex" alignItems="center" gap={1} fontSize="0.85rem"><PhoneIcon fontSize="inherit" color="action" /> {sup.phone}</Box>}
                            {sup.email && <Box display="flex" alignItems="center" gap={1} fontSize="0.85rem"><EmailIcon fontSize="inherit" color="action" /> {sup.email}</Box>}
                        </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap title={sup.address}>{sup.address || "-"}</Typography></TableCell>
                    <TableCell align="center">
                        <IconButton onClick={() => handleOpen(sup)} color="primary"><EditIcon /></IconButton>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" /> {isEdit ? "Editar Proveedor" : "Registrar Proveedor"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Razón Social / Nombre" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="RUC" value={formData.ruc} onChange={(e) => setFormData({...formData, ruc: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Nombre de Contacto" placeholder="Ej: Sr. Juan" value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Teléfono / Celular" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Dirección Fiscal / Almacén" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>{isEdit ? "Guardar Cambios" : "Registrar"}</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default Suppliers;