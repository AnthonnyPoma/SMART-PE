import React, { useState, useEffect } from 'react';
import {
    Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Box, Chip, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function TransferList() {
    const navigate = useNavigate();
    const [tabIndex, setTabIndex] = useState(0); // 0: Entrantes (Inbox), 1: Historial (Outbox)
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Detalle Modal
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchTransfers();
    }, [tabIndex]);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            const storedStoreId = localStorage.getItem('store_id');
            const myStoreId = storedStoreId ? parseInt(storedStoreId) : 1; 

            // Si tabIndex es 0 (Recibir), soy el DESTINO
            // Si tabIndex es 1 (Historial), soy el ORIGEN (o veo todo si soy admin, pero por ahora simplificado)
            const role = tabIndex === 0 ? 'destination' : 'origin';

            const res = await api.get(`/transfers/?role=${role}&store_id=${myStoreId}`);
            setTransfers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = (transfer) => {
        setSelectedTransfer(transfer);
        setDetailOpen(true);
    };

    const handleAction = async (action) => {
        // action: 'dispatch' | 'receive' | 'reject'
        if (!selectedTransfer) return;
        
        if (action === 'reject' && !window.confirm("¿Estás seguro de RECHAZAR esta mercadería? Volverá al origen.")) {
            return;
        }

        setActionLoading(true);
        try {
            await api.put(`/transfers/${selectedTransfer.transfer_id}/${action}`);

            alert("Operación exitosa");
            setDetailOpen(false);
            fetchTransfers(); // Recargar lista
        } catch (err) {
            console.error(err);
            alert("Error: " + (err.response?.data?.detail || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDIENTE': return 'warning';
            case 'EN_TRANSITO': return 'info';
            case 'COMPLETADO': return 'success'; // Era RECIBIDO en backend, ajustar si es necesario
            case 'RECIBIDO': return 'success';
            case 'RECHAZADO': return 'error';
            default: return 'default';
        }
    };

    return (
        <Layout>
            <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h4" fontWeight="bold">
                        Gestión de Transferencias
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/transfers/new')}>
                        Nueva Solicitud
                    </Button>
                </Box>

                <Paper sx={{ mb: 2 }}>
                    <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} indicatorColor="primary" textColor="primary">
                        <Tab label="Por Recibir (Entrantes)" />
                        <Tab label="Historial (Enviadas)" />
                    </Tabs>
                </Paper>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.200' }}>
                                <TableCell>#</TableCell>
                                <TableCell>Tienda Origen</TableCell>
                                <TableCell>Tienda Destino</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell>Fecha</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} align="center">Cargando...</TableCell></TableRow>
                            ) : transfers.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">No hay transferencias</TableCell></TableRow>
                            ) : (
                                transfers.map((t) => (
                                    <TableRow key={t.transfer_id}>
                                        <TableCell>{t.transfer_id}</TableCell>
                                        <TableCell>{t.source_store_name}</TableCell>
                                        <TableCell>{t.target_store_name}</TableCell>
                                        <TableCell>
                                            <Chip label={t.status} color={getStatusColor(t.status)} size="small" />
                                        </TableCell>
                                        <TableCell>{new Date(t.date_requested).toLocaleDateString()}</TableCell>
                                        <TableCell align="center">
                                            <IconButton onClick={() => handleOpenDetail(t)} color="primary">
                                                <VisibilityIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* MODAL DETALLE */}
                <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>
                        Detalle Transferencia #{selectedTransfer?.transfer_id}
                    </DialogTitle>
                    <DialogContent dividers>
                        {selectedTransfer && (
                            <>
                                <Grid container spacing={2} mb={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Origen:</Typography>
                                        <Typography variant="body1">{selectedTransfer.source_store_name}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Destino:</Typography>
                                        <Typography variant="body1">{selectedTransfer.target_store_name}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary">Observaciones:</Typography>
                                        <Typography variant="body2">{selectedTransfer.notes || '-'}</Typography>
                                    </Grid>
                                </Grid>

                                <Typography variant="h6" gutterBottom>Productos</Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Producto</TableCell>
                                                <TableCell>Cantidad</TableCell>
                                                <TableCell>Serie/IMEI</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedTransfer.items.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{item.product_name}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{item.serial_number || '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* ACCIONES */}
                                <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                                    {/* Si soy ORIGEN y está PENDIENTE -> Despachar */}
                                    {tabIndex === 1 && selectedTransfer.status === 'PENDIENTE' && (
                                        <Button 
                                            variant="contained" color="warning" 
                                            onClick={() => handleAction('dispatch')}
                                            disabled={actionLoading}
                                            startIcon={<LocalShippingIcon />}
                                        >
                                            Despachar
                                        </Button>
                                    )}

                                    {/* Si soy DESTINO y está EN_TRANSITO -> Recibir o Rechazar */}
                                    {tabIndex === 0 && selectedTransfer.status === 'EN_TRANSITO' && (
                                        <>
                                            <Button 
                                                variant="outlined" color="error" 
                                                onClick={() => handleAction('reject')}
                                                disabled={actionLoading}
                                                startIcon={<CancelIcon />}
                                            >
                                                Rechazar
                                            </Button>
                                            <Button 
                                                variant="contained" color="success"
                                                onClick={() => handleAction('receive')}
                                                disabled={actionLoading}
                                                startIcon={<CheckCircleIcon />}
                                            >
                                                Confirmar Recepción
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
}

export default TransferList;
