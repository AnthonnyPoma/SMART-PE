import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import { formatCurrency } from '../utils/format';
import ExportExcelButton from '../components/ExportExcelButton';
import {
  Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Box, CircularProgress,
  TextField, MenuItem, Grid, InputAdornment, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Divider, Stack
} from "@mui/material";
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StoreIcon from '@mui/icons-material/Store';
import PersonIcon from '@mui/icons-material/Person';

function Kardex() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FILTROS Y PAGINACIÓN ---
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("TODOS");
  
  // Filtros de Fecha
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- MODAL DETALLE ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchKardex();
  }, [page, filterType, startDate, endDate]); // Recarga con cambios. search y usuario lo manejamos con botón Buscar o enter

  const fetchKardex = async () => {
    setLoading(true);
    try {
      // Preparar query params
      const params = new URLSearchParams({
        page: page,
        limit: 15
      });
      
      if (searchText) params.append("search", searchText);
      if (filterType !== "TODOS") params.append("type", filterType);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const storeId = localStorage.getItem('store_id');
      if (storeId) params.append("store_id", storeId);
      // user_id lo omitimos si no tenemos ID (el select en backend pide user_id en int).

      const res = await api.get(`/kardex?${params.toString()}`);
      
      setMovements(res.data.data);
      setTotalPages(res.data.total_pages);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({
      page: 1,
      limit: 1000000
    });
    if (searchText) params.append("search", searchText);
    if (filterType !== "TODOS") params.append("type", filterType);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const storeId = localStorage.getItem('store_id');
    if (storeId) params.append("store_id", storeId);
    
    const response = await api.get(`/kardex?${params.toString()}`);
    return response.data.data;
  };

  // Eliminamos el useEffect local de filtrado porque ahora es server-side

  // 🧹 FUNCIÓN PARA LIMPIAR FILTROS
  const resetFilters = () => {
    setSearchText("");
    setFilterType("TODOS");
    setStartDate("");
    setEndDate("");
    setPage(1);
    // Para recargar sin filtros, la forma más limpia es limpiar state y llamar a la función sin parámetros extra
    // El useEffect lo tomará al vaciar o se puede forzar timeout
    setTimeout(() => { fetchKardex(); }, 100);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // 📋 ABRIR MODAL DE DETALLE
  const openDetail = async (movementId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await api.get(`/kardex/${movementId}`);
      setDetailData(res.data);
    } catch (err) {
      console.error("Error cargando detalle:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <Layout>
      {/* ENCABEZADO */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.primary', fontWeight: 'bold' }}>
          <DescriptionIcon fontSize="large" color="primary" /> Kardex Valorizado
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Historial completo de movimientos de inventario. Haz clic en una fila para ver el detalle (IMEI, proveedor, tienda).
        </Typography>
      </Box>

      {/* BARRA DE FILTROS AVANZADA */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Grid container spacing={2} alignItems="center">
          
          {/* BUSCADOR */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth variant="outlined" size="small"
              placeholder="Buscar Producto..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter') {
                  setPage(1);
                  fetchKardex();
                }
              }}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>),
              }}
            />
          </Grid>

          {/* FECHA INICIO */}
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth type="date" size="small" label="Desde"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>

          {/* FECHA FIN */}
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth type="date" size="small" label="Hasta"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>

          {/* TIPO */}
          <Grid item xs={6} md={2}>
            <TextField
              select fullWidth label="Movimiento" size="small"
              value={filterType} onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="ENTRADA">Entradas (+)</MenuItem>
              <MenuItem value="SALIDA">Salidas (-)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} md={2}>
            <Button 
                variant="outlined" color="primary" fullWidth sx={{ height: 40 }}
                onClick={() => { setPage(1); fetchKardex(); }}
            >
                Buscar
            </Button>
          </Grid>

          {/* BOTONES ACCIÓN (REFRESH + LIMPIAR) */}
          <Grid item xs={12} md={1} sx={{ textAlign: 'right', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <ExportExcelButton
              data={[]}
              fetchData={fetchAllForExport}
              filename="kardex"
              sheetName="Movimientos"
              columns={[
                { header: 'Fecha', key: 'date', transform: (v) => v ? new Date(v).toLocaleString('es-PE') : '-' },
                { header: 'Producto', key: 'product_name' },
                { header: 'SKU', key: 'sku' },
                { header: 'Tipo', key: 'type' },
                { header: 'Cantidad', key: 'quantity' },
                { header: 'Costo U.', key: 'unit_cost', transform: (v) => v ? Number(v).toFixed(2) : '' },
                { header: 'Total', key: 'unit_cost', transform: (v, row) => v ? (row.quantity * Number(v)).toFixed(2) : '' },
                { header: 'Motivo', key: 'reason' },
                { header: 'Usuario', key: 'user_name' },
                { header: 'IMEI', key: 'serial_number' },
              ]}
            />
            <Tooltip title="Limpiar Filtros">
                <IconButton onClick={resetFilters} color="secondary" size="small">
                    <FilterListOffIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Recargar">
                <IconButton onClick={fetchKardex} color="primary" size="small">
                    <RefreshIcon />
                </IconButton>
            </Tooltip>
          </Grid>

        </Grid>
      </Paper>

      {/* TABLA DE DATOS */}
      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Producto</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Cant.</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Costo U.</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Motivo</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', width: 50 }}></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No se encontraron movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((mov, index) => {
                    const isEntry = mov.type === "ENTRADA" || mov.type === "IN";
                    const totalVal = (mov.quantity * (mov.unit_cost || 0));

                    return (
                        <TableRow 
                          key={mov.movement_id || index} 
                          hover 
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
                          onClick={() => openDetail(mov.movement_id)}
                        >
                            <TableCell sx={{ fontSize: '0.85rem' }}>{formatDate(mov.date)}</TableCell>
                            <TableCell>
                                <Typography variant="body2" fontWeight="bold">{mov.product_name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">{mov.sku}</Typography>
                                
                                {/* Mostrar un solo IMEI o un resumen de grupo */}
                                {mov.serial_number && (
                                  <Typography variant="caption" display="block" sx={{ color: 'info.main', fontFamily: 'monospace', mt: 0.5 }}>
                                    📱 {mov.serial_number}
                                  </Typography>
                                )}
                            </TableCell>
                            
                            <TableCell>
                                <Chip 
                                    label={isEntry ? "ENTRADA" : "SALIDA"} 
                                    color={isEntry ? "success" : "error"} 
                                    size="small" variant="outlined"
                                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                                />
                            </TableCell>
                            
                            <TableCell sx={{ fontWeight: 'bold', color: isEntry ? 'success.main' : 'error.main' }}>
                                {isEntry ? "+" : "-"}{mov.quantity}
                            </TableCell>
                            
                            <TableCell>
                                {mov.unit_cost ? formatCurrency(mov.unit_cost) : "-"}
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>
                                {mov.unit_cost ? formatCurrency(totalVal) : "-"}
                            </TableCell>

                            <TableCell sx={{ fontSize: '0.9rem' }}>{mov.reason}</TableCell>
                            <TableCell sx={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'text.secondary' }}>
                                {mov.user_name || "Sistema"}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Ver detalle">
                                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); openDetail(mov.movement_id); }}>
                                  <InfoOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                        </TableRow>
                    );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* PAGINACIÓN */}
      {!loading && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2, alignItems: 'center' }}>
            <Button 
                variant="outlined" 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
            >
                Anterior
            </Button>
            <Typography fontWeight="bold">Página {page} de {totalPages}</Typography>
            <Button 
                variant="outlined" 
                disabled={page >= totalPages} 
                onClick={() => setPage(page + 1)}
            >
                Siguiente
            </Button>
        </Box>
      )}

      {/* ==================== MODAL DE DETALLE ==================== */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon color="primary" /> Detalle del Movimiento
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
          ) : detailData ? (
            <Stack spacing={2}>
              {/* INFO GENERAL */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Producto</Typography>
                <Typography variant="h6" fontWeight="bold">{detailData.product_name}</Typography>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary">SKU: {detailData.sku}</Typography>
              </Box>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Tipo</Typography>
                  <Chip 
                    label={detailData.type} 
                    color={detailData.type === "ENTRADA" ? "success" : "error"} 
                    size="small" variant="filled"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Cantidad</Typography>
                  <Typography variant="h6" fontWeight="bold" color={detailData.type === "ENTRADA" ? "success.main" : "error.main"}>
                    {detailData.type === "ENTRADA" ? "+" : "-"}{detailData.quantity}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Costo Unitario</Typography>
                  <Typography>{detailData.unit_cost ? formatCurrency(detailData.unit_cost) : "S/ 0.00"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Valor Total</Typography>
                  <Typography fontWeight="bold">{detailData.total_value ? formatCurrency(detailData.total_value) : "S/ 0.00"}</Typography>
                </Grid>
              </Grid>

              <Divider />

              {/* MOTIVO Y CONTEXTO */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Motivo</Typography>
                <Typography>{detailData.reason || "-"}</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon fontSize="small" /> Usuario
                  </Typography>
                  <Typography>{detailData.user_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StoreIcon fontSize="small" /> Tienda
                  </Typography>
                  <Typography>{detailData.store_name || "N/A"}</Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">Fecha y Hora</Typography>
                <Typography>{formatDate(detailData.date)}</Typography>
              </Box>

              {/* SECCIÓN IMEI (si aplica) - AHORA COMO LISTA DE AGRUPADOS */}
              {detailData.serial_infos && detailData.serial_infos.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.secondary' }}>
                    <PhoneAndroidIcon fontSize="small" /> Información de Series / IMEIs ({detailData.serial_infos.length})
                  </Typography>
                  
                  <Box sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                    {detailData.serial_infos.map((serie, idx) => (
                      <Box 
                        key={serie.series_id || idx} 
                        sx={{ 
                          bgcolor: 'background.default', 
                          p: 1.5, 
                          mb: 1, 
                          borderRadius: 2, 
                          border: '1px solid', 
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Typography variant="body2" fontFamily="monospace" fontWeight="bold" color="info.main">
                          📱 {serie.serial_number}
                        </Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Estado: {serie.status?.toUpperCase()}
                          </Typography>
                          <Typography variant="caption" display="block" fontWeight="bold">
                            S/ {serie.cost?.toFixed(2) || "0.00"}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* SECCIÓN PROVEEDOR (si aplica) */}
              {detailData.supplier_info && (
                <>
                  <Divider />
                  <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.secondary' }}>
                      <LocalShippingIcon fontSize="small" /> Proveedor asociado
                    </Typography>
                    <Typography fontWeight="bold" color="text.primary">{detailData.supplier_info.name}</Typography>
                    {detailData.supplier_info.ruc && (
                      <Typography variant="body2" color="text.secondary">RUC: {detailData.supplier_info.ruc}</Typography>
                    )}
                  </Box>
                </>
              )}
            </Stack>
          ) : (
            <Typography color="error" textAlign="center">No se pudo cargar el detalle.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} variant="outlined">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default Kardex;