import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Button
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import EditIcon from '@mui/icons-material/Edit';
import LoopIcon from '@mui/icons-material/Loop';
import CancelIcon from '@mui/icons-material/Cancel';
import PaidIcon from '@mui/icons-material/Paid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../api/axios';

function RMA() {
  const [rmas, setRmas] = useState([]);
  const [open, setOpen] = useState(false);
  
  const [selectedRma, setSelectedRma] = useState(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  const fetchRMAs = async () => {
    try {
      const storeId = localStorage.getItem('store_id') || 1;
      const res = await api.get(`/rma?store_id=${storeId}`);
      setRmas(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRMAs();
  }, []);

  const handleOpenStatus = (rma) => {
      setSelectedRma(rma);
      setStatus(rma.status);
      setNotes(rma.resolution_notes || '');
      setOpen(true);
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/rma/${selectedRma.rma_id}`, {
          status: status,
          resolution_notes: notes
      });
      setOpen(false);
      fetchRMAs();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusChip = (s) => {
      switch(s) {
          case 'PENDING': return <Chip label="PENDIENTE" color="warning" size="small" icon={<BuildIcon fontSize="small"/>}/>;
          case 'IN_REPAIR': return <Chip label="EN REPARACIÓN" color="info" size="small" icon={<LoopIcon fontSize="small"/>}/>;
          case 'REPLACED': return <Chip label="REEMPLAZADO" color="success" size="small" icon={<CheckCircleIcon fontSize="small"/>}/>;
          case 'REFUNDED': return <Chip label="REEMBOLSADO" color="secondary" size="small" icon={<PaidIcon fontSize="small"/>}/>;
          case 'REJECTED': return <Chip label="RECHAZADO/ANULADO" color="error" size="small" icon={<CancelIcon fontSize="small"/>}/>;
          default: return <Chip label={s} size="small" />;
      }
  };

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" fontWeight="bold">Garantías (RMA)</Typography>
            <Typography variant="body1" color="text.secondary">Seguimiento de productos fallados y devoluciones.</Typography>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell><b>Ticket #</b></TableCell>
              <TableCell><b>Fecha</b></TableCell>
              <TableCell><b>Venta Origen</b></TableCell>
              <TableCell><b>Producto</b></TableCell>
              <TableCell><b>IMEI / Serie</b></TableCell>
              <TableCell><b>Problema</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rmas.map((r) => (
              <TableRow key={r.rma_id}>
                <TableCell><b>RMA-{r.rma_id}</b></TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell>Venta #{r.sale_id}</TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell>{r.serial_number || 'N/A'}</TableCell>
                <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.issue_description}>
                    {r.issue_description}
                </TableCell>
                <TableCell align="center">{getStatusChip(r.status)}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleOpenStatus(r)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rmas.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{p:4}}>No hay casos de garantía registrados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Actualizar Estado - RMA-{selectedRma?.rma_id}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Producto: {selectedRma?.product_name} <br/>
              Problema Reportado: {selectedRma?.issue_description}
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>Estado del Ticket</InputLabel>
            <Select
              value={status}
              label="Estado del Ticket"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="PENDING">Pendiente (Recibido en Tienda)</MenuItem>
              <MenuItem value="IN_REPAIR">En Reparación (Enviado a Servicio Técnico)</MenuItem>
              <MenuItem value="REPLACED">Reemplazado por Equipo Nuevo</MenuItem>
              <MenuItem value="REFUNDED">Dinero Reembolsado al Cliente</MenuItem>
              <MenuItem value="REJECTED">Rechazado (Daño inducido o sin garantía)</MenuItem>
            </Select>
          </FormControl>

          <TextField 
             fullWidth label="Notas de Resolución (Opcional)" multiline rows={3} margin="normal"
             value={notes} onChange={(e) => setNotes(e.target.value)}
             placeholder="Ej. Se envió a Samsung. / Se cambió por un equipo nuevo Serie YYY..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpdate} variant="contained" color="primary">Guardar Cambios</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default RMA;
