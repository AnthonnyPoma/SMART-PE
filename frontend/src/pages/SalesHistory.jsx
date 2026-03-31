import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, Box,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  Grid, TextField, MenuItem, InputAdornment, Tooltip, CircularProgress
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListOffIcon from '@mui/icons-material/FilterListOff'; 
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Layout from '../components/Layout';
import api from '../api/axios';
import { formatCurrency, toTitleCase } from '../utils/format';
import ExportExcelButton from '../components/ExportExcelButton';

function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 50;

  // Estados para el Modal de Detalle
  const [selectedSale, setSelectedSale] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  // Estado para el botón de re-emisión SUNAT
  const [emitLoadingId, setEmitLoadingId] = useState(null);

  // --- Estados para Modal RMA ---
  const [rmaModalOpen, setRmaModalOpen] = useState(false);
  const [rmaForm, setRmaForm] = useState({
      sale_id: '',
      product_id: '',
      serial_number: '',
      product_name: '',
      issue_description: ''
  });

  // --- FILTROS ---
  const [searchText, setSearchText] = useState("");
  const [filterMethod, setFilterMethod] = useState("TODOS");
  const [filterUser, setFilterUser] = useState("TODOS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Listas de filtro estáticas (solo métodos de pago)
  const paymentMethodOptions = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'];

  useEffect(() => {
    fetchSales();
  }, [page]);

  const fetchSales = async (targetPage) => {
    setLoading(true);
    try {
      const storeId = localStorage.getItem('store_id');
      // Protección: si targetPage llega como Event (click handler), ignoarlo y usar estado actual
      const safePage = (typeof targetPage === 'number') ? targetPage : page;
      const params = {
        page: safePage,
        limit: LIMIT,
        store_id: storeId || undefined,
        search: searchText || undefined,
        payment_method: filterMethod !== 'TODOS' ? filterMethod : undefined,
        user_name: filterUser !== 'TODOS' ? filterUser : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      };
      const response = await api.get('/sales/history-paginated', { params });
      const { data, total_pages, total_items } = response.data;
      
      setSales(data);
      setTotalPages(total_pages);
      setTotalItems(total_items);

    } catch (error) {
      console.error("Error cargando historial:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllForExport = async () => {
    const storeId = localStorage.getItem('store_id');
    const params = {
      page: 1,
      limit: 1000000,
      store_id: storeId || undefined,
      search: searchText || undefined,
      payment_method: filterMethod !== 'TODOS' ? filterMethod : undefined,
      user_name: filterUser !== 'TODOS' ? filterUser : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    };
    const response = await api.get('/sales/history-paginated', { params });
    return response.data.data;
  };

  // 🔎 Al buscar/filtrar, resetear a página 1
  const handleApplyFilters = () => {
    setPage(1);
    fetchSales(1);
  };

  // 🧹 FUNCIÓN PARA LIMPIAR FILTROS
  const resetFilters = () => {
    setSearchText("");
    setFilterMethod("TODOS");
    setFilterUser("TODOS");
    setStartDate("");
    setEndDate("");
    setPage(1);
    // Fetch sin filtros en la siguiente renderización
    setTimeout(() => fetchSales(1), 0);
  };

  const handleOpenDetail = (sale) => {
    setSelectedSale(sale);
    setModalOpen(true);
  };

  // --- LÓGICA ANULACIÓN ---
  const handleOpenVoid = (sale) => {
    setSaleToVoid(sale);
    setVoidReason("Devolución por falla"); // Motivo default
    setVoidModalOpen(true);
  };

  const processVoidSale = async () => {
    if (!saleToVoid) return;
    setVoidLoading(true);
    try {
        await api.post(`/sales/${saleToVoid.sale_id}/void`, {
            reason: voidReason
        });
        alert("Anulación iniciada correctamente. Se está procesando la Nota de Crédito.");
        setVoidModalOpen(false);
        fetchSales(); // Recargar lista
    } catch (error) {
        console.error("Error anulando venta:", error);
        alert(error.response?.data?.detail || "Error al anular la venta");
    } finally {
        setVoidLoading(false);
    }
  };

  const handleDownloadSunatPdf = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert("Enlace PDF de SUNAT no disponible aún.");
    }
  };

  // ── Reintento Manual de Emisión SUNAT ────────────────────────────────────
  const handleEmitToSunat = async (saleId) => {
    setEmitLoadingId(saleId);
    try {
      await api.post(`/sales/${saleId}/emit_sunat`);
      alert(`✅ Re-emisión iniciada para Venta #${saleId}. Actualiza el historial en unos segundos.`);
      fetchSales();
    } catch (error) {
      alert(error.response?.data?.detail || "Error al iniciar la re-emisión a SUNAT");
    } finally {
      setEmitLoadingId(null);
    }
  };

  const handlePrintInternalTicket = async () => {
    if (!selectedSale) return;
    try {
      const response = await api.get(`/sales/${selectedSale.sale_id}/ticket`, {
        responseType: 'blob', 
      });
      const pdfUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("Error generando ticket interno PDF:", error);
      alert("Error al generar el ticket interno");
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' };
    return new Date(dateString).toLocaleDateString('es-PE', options);
  };

  // Helper para chips de estado
  const getStatusChip = (status, type) => {
    // Si es Nota de Crédito, mostramos su estado específico
    if (type === 'NC' || type === 'NOTA_CREDITO') {
        if (status === 'ACEPTADO') return <Chip icon={<CheckCircleIcon />} label="NC ACEPTADA" color="success" size="small" variant="outlined" />;
        if (status === 'RECHAZADO') return <Chip label="NC RECHAZADA" color="error" size="small" variant="outlined" />;
        return <Chip label="NC PENDIENTE" color="warning" size="small" variant="outlined" />;
    }

    if (status === 'ACEPTADO') return <Chip icon={<CheckCircleIcon />} label="ACEPTADO" color="success" size="small" variant="outlined" />;
    if (status === 'RECHAZADO') return <Chip label="RECHAZADO" color="error" size="small" variant="outlined" />;
    if (status === 'ANULADO')   return <Chip label="ANULADO" color="default" size="small" />;
    if (status === 'ERROR_SUNAT') return <Chip icon={<CloudUploadIcon />} label="ERROR SUNAT" color="error" size="small" variant="outlined" />;
    return <Chip label={status || 'PENDIENTE'} color="warning" size="small" variant="outlined" />;
  };

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.primary', fontWeight: 'bold' }}>
          <ReceiptLongIcon fontSize="large" color="primary" /> Historial de Ventas
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Consulta y auditoría de todas las transacciones realizadas.
        </Typography>
      </Box>

      {/* BARRA DE FILTROS */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Grid container spacing={2} alignItems="center">
          
          {/* BUSCADOR */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth variant="outlined" size="small"
              placeholder="Ticket # o DNI..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>),
              }}
            />
          </Grid>

          {/* FECHAS */}
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth type="date" size="small" label="Desde"
              InputLabelProps={{ shrink: true }}
              value={startDate} onChange={(e) => { setStartDate(e.target.value); }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth type="date" size="small" label="Hasta"
              InputLabelProps={{ shrink: true }}
              value={endDate} onChange={(e) => { setEndDate(e.target.value); }}
            />
          </Grid>

          {/* MÉTODO PAGO */}
          <Grid item xs={6} md={2}>
            <TextField
              select fullWidth label="Pago" size="small"
              value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              {paymentMethodOptions.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
          </Grid>

          {/* CAJERO */}
          <Grid item xs={6} md={1}>
            <Button variant="contained" size="small" onClick={handleApplyFilters} sx={{ height: 40, minWidth: 0, px: 2 }}>
              Filtrar
            </Button>
          </Grid>

          {/* BOTONES ACCIÓN (REFRESH + LIMPIAR) */}
          <Grid item xs={12} md={2} sx={{ textAlign: 'right', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <ExportExcelButton
              data={[]} // Dejamos data vacío para forzar fetchData
              fetchData={fetchAllForExport}
              filename="historial_ventas"
              sheetName="Ventas"
              reportTitle="Reporte de Historial de Ventas"
              columns={[
                { header: 'ID Venta', key: 'sale_id', transform: (v) => `#${String(v).padStart(6, '0')}` },
                { header: 'Fecha', key: 'date_created', transform: (v) => new Date(v).toLocaleString('es-PE') },
                { header: 'Cliente', key: 'client_name', transform: (v, row) => v || row.client_dni || 'Público General' },
                { header: 'Método Pago', key: 'payment_method' },
                { header: 'Total', key: 'total_amount', transform: (v) => Number(v).toFixed(2), totalizable: true },
                { header: 'Estado SUNAT', key: 'sunat_status' },
                { header: 'Tipo', key: 'invoice_type' },
                { header: 'Vendedor', key: 'user_name' },
              ]}
            />
            <Tooltip title="Limpiar Filtros">
                <IconButton onClick={resetFilters} color="secondary" size="small">
                    <FilterListOffIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Actualizar Datos">
                <IconButton onClick={fetchSales} color="primary" size="small">
                    <RefreshIcon />
                </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>
      
      {/* TABLA DE VENTAS */}
      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
           <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}> 
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>ID Venta</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Pago</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Estado SUNAT</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.length === 0 ? (
                 <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No se encontraron ventas.</TableCell></TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.sale_id} hover>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>#{sale.sale_id.toString().padStart(6, '0')}</TableCell>
                    <TableCell sx={{ fontSize: '0.9rem' }}>{formatDate(sale.date_created)}</TableCell>
                    <TableCell>{sale.client_name ? toTitleCase(sale.client_name) : (sale.client_dni || "Público General")}</TableCell>
                    <TableCell>
                      <Chip label={sale.payment_method} size="small" variant="outlined" sx={{ color: 'text.primary', borderColor: 'divider' }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>{formatCurrency(sale.total_amount)}</TableCell>
                    <TableCell>
                        {getStatusChip(sale.sunat_status, sale.invoice_type)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver Detalle">
                        <IconButton color="primary" onClick={() => handleOpenDetail(sale)} size="small">
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      {sale.sunat_status === 'ACEPTADO' && sale.xml_url && (
                          <Tooltip title="Descargar Boleta/Factura Electrónica SUNAT">
                            <IconButton color="success" onClick={() => handleDownloadSunatPdf(sale.xml_url)} size="small">
                                <ReceiptLongIcon />
                            </IconButton>
                          </Tooltip>
                      )}
                      {/* Botón azul: re-emit si está PENDIENTE o ERROR_SUNAT */}
                      {(sale.sunat_status === 'PENDIENTE' || sale.sunat_status === 'ERROR_SUNAT') && (
                          <Tooltip title="Enviar a SUNAT (Re-intentar emisión)">
                            <span>
                              <IconButton
                                color="info"
                                size="small"
                                disabled={emitLoadingId === sale.sale_id}
                                onClick={() => handleEmitToSunat(sale.sale_id)}
                              >
                                {emitLoadingId === sale.sale_id
                                  ? <CircularProgress size={18} color="inherit" />
                                  : <CloudUploadIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                      )}
                      {sale.sunat_status === 'ACEPTADO' && sale.invoice_type !== 'NC' && (
                          <Tooltip title="Anular Comprobante (Nota de Crédito)">
                            <IconButton color="error" onClick={() => handleOpenVoid(sale)} size="small">
                                <CancelIcon />
                            </IconButton>
                          </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* PAGINACIÓN */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {sales.length} de {totalItems} registros · Página {page} de {totalPages}
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ← Anterior
          </Button>
          <Button variant="outlined" size="small" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Siguiente →
          </Button>
        </Box>
      </Box>

      {/* MODAL DETALLE */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white' }}>
          <ReceiptLongIcon /> Detalle de Venta #{selectedSale?.sale_id.toString().padStart(6, '0')}
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.paper' }}>
          {selectedSale && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                 <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Fecha:</Typography>
                    <Typography variant="body2" fontWeight="bold">{formatDate(selectedSale.date_created)}</Typography>
                 </Grid>
                 <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Método de Pago:</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedSale.payment_method}</Typography>
                 </Grid>
              </Grid>
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Cliente: <b style={{ color: 'text.primary' }}>{selectedSale.client_dni || "Público General"}</b>
              </Typography>
              
              <Box sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                {selectedSale.details.map((detail, index) => (
                  <Box key={index} sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', '&:last-child': { borderBottom: 0 }, bgcolor: 'background.default' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{detail.product_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{detail.quantity} x S/ {detail.unit_price.toFixed(2)}</Typography>
                      {detail.serial_number && (
                        <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                          [SN: {detail.serial_number}]
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">S/ {detail.subtotal.toFixed(2)}</Typography>
                        <Tooltip title="Reportar Falla (Garantía / RMA)">
                            <IconButton size="small" color="warning" onClick={() => {
                                setRmaForm({
                                    sale_id: selectedSale.sale_id,
                                    product_id: detail.product_id,
                                    serial_number: detail.serial_number || '',
                                    product_name: detail.product_name,
                                    issue_description: ''
                                });
                                setRmaModalOpen(true);
                            }}>
                                <BuildIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'text.secondary' }}>
                <Typography variant="h6">TOTAL PAGADO</Typography>
                <Typography variant="h5" color="success.main" fontWeight="bold">{formatCurrency(selectedSale.total_amount)}</Typography>
              </Box>

              {/* Info Extra SI es NC */}
              {selectedSale.invoice_type === 'NC' && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 1 }}>
                      <Typography variant="caption" color="warning.dark" display="block">NOTA DE CRÉDITO</Typography>
                      <Typography variant="body2">Aplicada a venta original.</Typography>
                  </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">Cerrar</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintInternalTicket}>
            REIMPRIMIR TICKET INTERNO
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* MODAL ANULACIÓN */}
      <Dialog open={voidModalOpen} onClose={() => setVoidModalOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
            <CancelIcon /> Anular Comprobante
        </DialogTitle>
        <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
                ¿Está seguro de anular la venta <b>#{saleToVoid?.sale_id}</b>?
                Se emitirá automáticamente una <b>Nota de Crédito Electrónica</b> a SUNAT.
            </DialogContentText>
            <TextField
                autoFocus
                margin="dense"
                label="Motivo de Anulación"
                type="text"
                fullWidth
                variant="outlined"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
            />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setVoidModalOpen(false)} color="inherit" disabled={voidLoading}>
                Cancelar
            </Button>
            <Button onClick={processVoidSale} variant="contained" color="error" disabled={voidLoading || !voidReason.trim()}>
                {voidLoading ? <CircularProgress size={24} color="inherit" /> : "Confirmar Anulación y Emitir NC"}
            </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL RMA / GARANTÍA Aislado para evitar lags */}
      <RMAModal 
          open={rmaModalOpen} 
          onClose={() => setRmaModalOpen(false)} 
          initialData={rmaForm} 
          onSuccess={() => { setRmaModalOpen(false); setModalOpen(false); }}
      />
    </Layout>
  );
}

// Componente separado para evitar render re-evaluations de TODA la tabla al tipear
function RMAModal({ open, onClose, initialData, onSuccess }) {
    const [rmaForm, setRmaForm] = useState(initialData);
    const [rmaLoading, setRmaLoading] = useState(false);

    useEffect(() => {
        setRmaForm(initialData);
    }, [initialData]);

    const handleCreateRma = async () => {
        setRmaLoading(true);
        try {
            const storeId = localStorage.getItem('store_id') || 1;
            await api.post(`/rma/`, {
                sale_id: rmaForm.sale_id,
                product_id: rmaForm.product_id,
                serial_number: rmaForm.serial_number || null,
                store_id: parseInt(storeId),
                issue_description: rmaForm.issue_description
            });
            alert("Ticket de garantía (RMA) creado exitosamente.");
            onSuccess();
        } catch (error) {
            alert(error.response?.data?.detail || "Error al registrar la garantía");
        } finally {
            setRmaLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'warning.main', color: 'white' }}>
                <BuildIcon /> Reportar Garantía (RMA)
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <DialogContentText sx={{ mb: 2 }}>
                    Está a punto de crear un ticket de soporte técnico/logística inversa para:
                </DialogContentText>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="body2"><b>Venta:</b> #{rmaForm.sale_id?.toString().padStart(6, '0')}</Typography>
                    <Typography variant="body2"><b>Producto:</b> {rmaForm.product_name}</Typography>
                    {rmaForm.serial_number && (
                       <Typography variant="body2"><b>IMEI/Serie:</b> {rmaForm.serial_number}</Typography>
                    )}
                </Paper>

                <TextField
                    autoFocus
                    margin="dense"
                    label="Descripción del problema reportado por el cliente"
                    type="text"
                    multiline rows={4}
                    fullWidth
                    variant="outlined"
                    value={rmaForm.issue_description}
                    onChange={(e) => setRmaForm({ ...rmaForm, issue_description: e.target.value })}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={rmaLoading}>
                    Cancelar
                </Button>
                <Button onClick={handleCreateRma} variant="contained" color="warning" disabled={rmaLoading || !(rmaForm.issue_description || '').trim() || !rmaForm.product_id}>
                    {rmaLoading ? <CircularProgress size={24} /> : "Crear Ticket de RMA"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default SalesHistory;