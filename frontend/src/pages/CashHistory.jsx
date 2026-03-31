import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Chip, TextField,
    Grid, MenuItem, Button, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import api from '../api/axios';
// import { format } from 'date-fns'; // Removed unused

import { formatCurrency } from '../utils/format';
import ExportExcelButton from '../components/ExportExcelButton';
import Layout from '../components/Layout';

export default function CashHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filtros
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [userId, setUserId] = useState(''); // Se usará en el futuro para selector de usuarios

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            let params = {};
            if (startDate) params.start_date = startDate.toISOString();
            if (endDate) params.end_date = endDate.toISOString();
            if (userId) params.user_id = userId;
            const storeId = localStorage.getItem('store_id');
            if (storeId) params.store_id = storeId;

            const response = await api.get('/cash/history', { params });
            setHistory(response.data);
        } catch (error) {
            console.error("Error cargando historial de cajas:", error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, userId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleFilter = () => {
        fetchHistory();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const getDiffColor = (diff) => {
        if (!diff || Math.abs(diff) < 0.1) return 'success'; // Cuadre perfecto (verde)
        if (diff > 0) return 'info'; // Sobrante (azul o info)
        return 'error'; // Faltante (rojo)
    };

    return (
        <Layout>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box p={3}>
                    <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
                        Historial de Cajas (Auditoría)
                    </Typography>
                    <Typography variant="body1" color="textSecondary" mb={3}>
                        Registro de todas las aperturas y cierres de caja.
                    </Typography>

                    {/* FILTROS */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={3}>
                                <DatePicker
                                    label="Fecha Inicio"
                                    value={startDate}
                                    onChange={(newValue) => setStartDate(newValue)}
                                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <DatePicker
                                    label="Fecha Fin"
                                    value={endDate}
                                    onChange={(newValue) => setEndDate(newValue)}
                                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button 
                                    variant="contained" 
                                    onClick={handleFilter} 
                                    fullWidth 
                                    startIcon={<RefreshIcon />}
                                >
                                    Filtrar
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <ExportExcelButton
                                    data={history}
                                    filename="historial_cajas"
                                    sheetName="Cajas"
                                    columns={[
                                        { header: 'ID', key: 'cash_id' },
                                        { header: 'Usuario', key: 'user', transform: (v, row) => v?.username || `User ${row.user_id}` },
                                        { header: 'Apertura', key: 'start_time', transform: (v) => v ? new Date(v).toLocaleString() : '-' },
                                        { header: 'Cierre', key: 'end_time', transform: (v) => v ? new Date(v).toLocaleString() : '-' },
                                        { header: 'Monto Inicial', key: 'start_amount', transform: (v) => Number(v || 0).toFixed(2) },
                                        { header: 'Esperado', key: 'expected_cash', transform: (v) => v ? Number(v).toFixed(2) : '-' },
                                        { header: 'Real', key: 'final_amount_real', transform: (v) => v ? Number(v).toFixed(2) : '-' },
                                        { header: 'Diferencia', key: 'difference', transform: (v) => v != null ? Number(v).toFixed(2) : '-' },
                                        { header: 'Estado', key: 'status', transform: (v) => v === 'OPEN' ? 'ABIERTA' : 'CERRADA' },
                                        { header: 'Notas', key: 'notes' },
                                    ]}
                                    sx={{ height: 40 }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* TABLA */}
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'background.default' }}>
                                <TableRow>
                                    <TableCell><strong>ID</strong></TableCell>
                                    <TableCell><strong>Usuario</strong></TableCell>
                                    <TableCell><strong>Apertura</strong></TableCell>
                                    <TableCell><strong>Cierre</strong></TableCell>
                                    <TableCell align="right"><strong>Monto Inicial</strong></TableCell>
                                    <TableCell align="right"><strong>Esperado (Sis)</strong></TableCell>
                                    <TableCell align="right"><strong>Real (Efectivo)</strong></TableCell>
                                    <TableCell align="center"><strong>Diferencia</strong></TableCell>
                                    <TableCell><strong>Estado</strong></TableCell>
                                    <TableCell><strong>Notas</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                                            No se encontraron registros.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((row) => (
                                        <TableRow key={row.cash_id} hover>
                                            <TableCell>#{row.cash_id}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {row.user?.username || `User ${row.user_id}`}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {row.user?.role?.name || row.user?.role}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(row.start_time)}</TableCell>
                                            <TableCell>{formatDate(row.end_time)}</TableCell>
                                            <TableCell align="right">{formatCurrency(row.start_amount)}</TableCell>
                                            <TableCell align="right">{row.status === 'CLOSED' ? formatCurrency(row.expected_cash) : '-'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                {row.status === 'CLOSED' ? formatCurrency(row.final_amount_real) : '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                {row.status === 'CLOSED' ? (
                                                    <Chip 
                                                        label={formatCurrency(row.difference)} 
                                                        color={getDiffColor(row.difference)}
                                                        variant={Math.abs(row.difference) < 0.1 ? "outlined" : "filled"}
                                                        size="small"
                                                    />
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={row.status === 'OPEN' ? 'ABIERTA' : 'CERRADA'} 
                                                    color={row.status === 'OPEN' ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {row.notes && (
                                                    <Tooltip title={row.notes}>
                                                        <InfoIcon color="action" fontSize="small" />
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </LocalizationProvider>
        </Layout>
    );
}
