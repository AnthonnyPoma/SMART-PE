import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Alert, CircularProgress, Divider, Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import Layout from '../components/Layout';
import api from '../api/axios';

// ─── Config de estados ───────────────────────────────────────────────
const STATUS_LABELS = {
  PENDIENTE:       { label: 'Pendiente',       color: 'warning' },
  PAGADO:          { label: 'Pagado',           color: 'info'    },
  EN_PREPARACION:  { label: 'En preparación',   color: 'primary' },
  ENVIADO:         { label: 'Enviado',          color: 'secondary' },
  ENTREGADO:       { label: 'Entregado',        color: 'success' },
  CANCELADO:       { label: 'Cancelado',        color: 'error'   },
};

const STATUS_FLOW = ['PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

function StatusChip({ status }) {
  const cfg = STATUS_LABELS[status] || { label: status, color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700, minWidth: 110 }} />;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// ─── Modal de detalle ────────────────────────────────────────────────
function OrderDetailModal({ order, open, onClose, onStatusChange }) {
  const [newStatus, setNewStatus] = useState(order?.status || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (order) setNewStatus(order.status);
  }, [order]);

  const [integrationResult, setIntegrationResult] = useState(null);

  const handleUpdate = async () => {
    if (!newStatus || newStatus === order.status) return;
    setUpdating(true);
    setIntegrationResult(null);
    try {
      const res = await api.patch(`/shop/orders/${order.order_id}/status`, { status: newStatus });
      if (res.data.integraciones) {
        setIntegrationResult(res.data.integraciones);
      }
      onStatusChange(order.order_id, newStatus);
      // Si hay integraciones, no cerrar el modal para mostrar el resultado
      if (!res.data.integraciones) {
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado del pedido. Revisa la consola para más detalles.');
    } finally {
      setUpdating(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LanguageIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Pedido Web #{order.order_id}
          </Typography>
        </Box>
        {/* Controles de Estado en el Header en lugar de ocupar mucho espacio abajo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              sx={{ '& .MuiSelect-select': { py: 0.5, px: 2, fontSize: '0.875rem', fontWeight: 'bold' } }}>
              {STATUS_FLOW.map(s => (
                <MenuItem key={s} value={s} sx={{ fontSize: '0.875rem' }}>
                  {STATUS_LABELS[s]?.label || s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleUpdate}
            disabled={updating || newStatus === order.status}
            startIcon={updating ? <CircularProgress size={12} color="inherit" /> : <EditIcon fontSize="small" />}
            sx={{ fontWeight: 'bold', textTransform: 'none' }}
          >
            {updating ? 'Guardando...' : 'Aplicar'}
          </Button>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2, pb: 1, px: 3 }}>
        
        {/* Información de cambio de estado a Pagado */}
        {order.status === 'PENDIENTE' && newStatus === 'PAGADO' && (
          <Alert severity="info" sx={{ mb: 2, py: 0 }}>
            <Typography variant="caption" fontWeight="bold">Importante: </Typography>
            <Typography variant="caption">Al aplicar "Pagado", el sistema descontará el stock e ingresará la venta al historial automáticamente.</Typography>
          </Alert>
        )}

        {/* Resultado de Integraciones (solo al confirmar PAGADO) */}
        {integrationResult && (
          <Alert severity="success" sx={{ mb: 2, py: 0 }}>
            <Typography variant="caption" fontWeight={700}>✅ Integraciones automáticas ejecutadas:</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
              <Typography component="li" variant="caption">
                <strong>Stock:</strong> {integrationResult.stock_discounted ? 'Descontado en Kardex.' : 'Problema al descontar stock.'}
              </Typography>
              <Typography component="li" variant="caption">
                <strong>Cliente:</strong> Vinculado (ID: {integrationResult.client_id}).
              </Typography>
              <Typography component="li" variant="caption">
                <strong>Venta:</strong> Generada con éxito (Comprobante: {integrationResult.sale_invoice}).
              </Typography>
            </Box>
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Datos del cliente */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                <PersonIcon fontSize="inherit" /> Datos del Cliente
              </Typography>
              <Typography variant="body2" fontWeight={600} gutterBottom>{order.customer_name}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Documento: <Box component="span" sx={{ fontWeight: 700 }}>{order.customer_document || 'No provisto'}</Box>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Email: {order.customer_email}</Typography>
              <Typography variant="body2" color="text.secondary">Teléfono: {order.customer_phone || '—'}</Typography>
            </Box>
          </Grid>

          {/* Datos de envío */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', height: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                <LocalShippingIcon fontSize="inherit" /> Detalles de Envío
              </Typography>
              <Typography variant="body2" gutterBottom>{order.shipping_address || 'Sin especificar'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', display: 'block', pt: 1 }}>
                Fecha Pedido: {formatDate(order.created_at)}
              </Typography>
            </Box>
          </Grid>

          {/* Items del pedido */}
          <Grid item xs={12}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>
                  <InventoryIcon fontSize="inherit" /> Productos ({order.items?.length || 0})
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, py: 1 }}>Código SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 1 }}>Descripción</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, py: 1 }}>Cant.</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>Precio Unit.</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>Monto Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(order.items || []).map(item => (
                      <TableRow key={item.item_id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{item.product_sku}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{item.product_name}</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.85rem' }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.85rem' }}>S/ {parseFloat(item.unit_price).toLocaleString('en-US', {minimumFractionDigits: 2})}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>S/ {parseFloat(item.subtotal).toLocaleString('en-US', {minimumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} align="right" sx={{ fontWeight: 700, pt: 1.5, pb: 1.5, borderBottom: 0 }}>IMPORTE TOTAL</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1.05rem', pt: 1.5, pb: 1.5, color: 'primary.main', borderBottom: 0 }}>
                        S/ {parseFloat(order.total_amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" size="small" sx={{ fontWeight: 'bold' }}>Cerrar Ventana</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Página Principal ────────────────────────────────────────────────
export default function WebOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (search.trim()) params.append('search', search.trim());
      const res = await api.get(`/shop/orders?${params}`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar los pedidos online.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);


  const handleSearch = (e) => { if (e.key === 'Enter') fetchOrders(); };

  const handleOpenDetail = (order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
  };

  // KPIs rápidos
  const kpis = {
    total: orders.length,
    pendiente: orders.filter(o => o.status === 'PENDIENTE').length,
    pagado: orders.filter(o => o.status === 'PAGADO').length,
    enviado: orders.filter(o => o.status === 'ENVIADO').length,
    totalMonto: orders.reduce((acc, o) => acc + parseFloat(o.total_amount), 0),
  };

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <LanguageIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>Pedidos Online (E-Commerce)</Typography>
          <Chip label="TIENDA WEB" color="primary" size="small" variant="outlined" sx={{ ml: 1, fontWeight: 700 }} />
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Actualizar">
              <IconButton onClick={fetchOrders} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Pedidos', value: kpis.total, color: 'primary.main' },
            { label: 'Pendientes', value: kpis.pendiente, color: 'warning.main' },
            { label: 'Pagados', value: kpis.pagado, color: 'info.main' },
            { label: 'Enviados', value: kpis.enviado, color: 'success.main' },
            { label: 'Ingresos Web', value: `S/ ${kpis.totalMonto.toLocaleString()}`, color: 'text.primary' },
          ].map((kpi) => (
            <Grid item xs={6} sm={4} md={2.4} key={kpi.label}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 1 }} elevation={1}>
                <Typography variant="h5" fontWeight={800} color={kpi.color}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{kpi.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
            sx={{ minWidth: 320 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Estado</InputLabel>
            <Select value={filterStatus} label="Estado" onChange={e => setFilterStatus(e.target.value)}>
              <MenuItem value="">Todos los estados</MenuItem>
              {STATUS_FLOW.map(s => (
                <MenuItem key={s} value={s}><StatusChip status={s} /></MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={fetchOrders} startIcon={<SearchIcon />}>Buscar</Button>
        </Box>

        {/* Alertas */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Tabla */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }} elevation={1}>
            <LanguageIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No hay pedidos que coincidan</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Los pedidos realizados desde la tienda web aparecerán aquí automaticamente.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.default' } }}>
                  <TableCell>#</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell align="center">Items</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(order => (
                  <TableRow
                    key={order.order_id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      ...(order.status === 'PENDIENTE' && {
                        backgroundColor: 'warning.50',
                        '&:hover': { backgroundColor: 'warning.100' }
                      })
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>WEB-{order.order_id}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{order.customer_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" display="block">{order.customer_email}</Typography>
                      <Typography variant="caption" color="text.secondary">{order.customer_phone || '—'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={order.item_count} size="small" />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      S/ {parseFloat(order.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <StatusChip status={order.status} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalle y actualizar estado">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDetail(order)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Modal Detalle */}
      <OrderDetailModal
        order={selectedOrder}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </Layout>
  );
}
