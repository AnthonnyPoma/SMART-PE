import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Paper, Typography, TextField, Button, 
  Tabs, Tab, Card, CardContent, CircularProgress, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, Divider, MenuItem,
  FormControl, InputLabel, Select
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../api/axios';
import { formatCurrency } from '../utils/format';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Iconos
import AssessmentIcon from '@mui/icons-material/Assessment';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'; // Icono original de utilidad
import FilterListIcon from '@mui/icons-material/FilterList';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ef5350', '#ab47bc'];

function Dashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🕒 FECHAS POR DEFECTO: ÚLTIMOS 10 DÍAS (Pedido Usuario)
  const today = new Date();
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(today.getDate() - 9); // Hoy + 9 dias atras = 10 dias

  const todayStr = today.toISOString().split('T')[0];
  const startStr = tenDaysAgo.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(startStr); 
  const [endDate, setEndDate] = useState(todayStr);

  // Data Reportes
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [bySeller, setBySeller] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [salesByHour, setSalesByHour] = useState([]); // Nuevo
  
  // Data Inventario
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [inventoryValuation, setInventoryValuation] = useState({ total_valuation: 0, total_items: 0 });
  const [dinosaurProducts, setDinosaurProducts] = useState([]);

  // Data Comparativa Tiendas
  const [storesComparison, setStoresComparison] = useState([]);

  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { start_date: startDate, end_date: endDate, store_id: localStorage.getItem('store_id') || undefined };
      
      const [resSummary, resTop, resCat, resSeller, resPayment, resProds, resValuation, resDino, resHour, resStores] = await Promise.all([
        api.get('/reports/sales-summary', { params }),
        api.get('/reports/top-products', { params }),
        api.get('/reports/by-category', { params }),
        api.get('/reports/by-seller', { params }),
        api.get('/reports/payment-methods', { params }),
        api.get('/products/', { params: { store_id: params.store_id } }),
        api.get('/reports/inventory-valuation', { params: { store_id: params.store_id } }),
        api.get('/reports/low-rotation', { params: { days: 30, store_id: params.store_id } }),
        api.get('/reports/sales-by-hour', { params }), // Nuevo
        api.get('/reports/stores-comparison', { params: { start_date: startDate, end_date: endDate } }) // Comparativa
      ]);

      setSummary(resSummary.data);
      setTopProducts(resTop.data);
      setByCategory(resCat.data);
      setBySeller(resSeller.data);
      setPaymentMethods(resPayment.data);
      setInventoryValuation(resValuation.data);
      setDinosaurProducts(resDino.data);
      setSalesByHour(resHour.data);
      setStoresComparison(resStores.data);

      const critical = resProds.data.filter(p => p.stock <= p.min_stock);
      setLowStockProducts(critical);

    } catch (error) {
      console.error("Error cargando dashboard:", error);
      setError("No se pudieron cargar los datos. Verifique su conexión.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePresetChange = (e) => {
      const val = e.target.value;
      if (!val) return;
      const end = new Date();
      const start = new Date();
      if (val === 'diario') {
         // keep today
      } else if (val === 'semanal') {
         start.setDate(end.getDate() - 7);
      } else if (val === 'quincenal') {
         start.setDate(end.getDate() - 15);
      } else if (val === 'mensual') {
         start.setMonth(end.getMonth() - 1);
      } else if (val === 'anual') {
         start.setFullYear(end.getFullYear() - 1);
      }
      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
  };

  // KPI Card
  const KpiCard = ({ title, value, icon, color, subtitle, growth }) => (
    <Card elevation={3} sx={{ bgcolor: color, color: 'white', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 'bold' }}>{title}</Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>{value}</Typography>
            
            {growth !== undefined && (
              <Chip 
                label={`${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth).toFixed(1)}% vs periodo anterior`} 
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold', height: 24, mt: 1
                }} 
              />
            )}
            
            {subtitle && <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 1 }}>{subtitle}</Typography>}
          </Box>
          <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body, html, #root, main { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background-color: white !important;
            color: #000 !important;
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          ::-webkit-scrollbar { display: none; }
          
          .no-print { display: none !important; }
          .print-only { display: block !important; }

          /* Typography for Print */
          .print-only * { font-family: 'Helvetica', 'Arial', sans-serif !important; }
          .print-header { border-bottom: 3px solid #1a237e; padding-bottom: 10px; margin-bottom: 20px; }
          .print-title { font-size: 24pt; font-weight: bold; color: #1a237e; margin: 0; text-transform: uppercase; }
          .print-subtitle { font-size: 14pt; color: #424242; margin-top: 5px; }
          .print-meta { font-size: 10pt; color: #666; margin-top: 10px; display: flex; justify-content: space-between; }
          
          .print-section { margin-bottom: 30px; page-break-inside: avoid; }
          .print-section-title { font-size: 14pt; font-weight: bold; color: #1a237e; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase;}
          .print-page-break { page-break-before: always; break-before: page; padding-top: 15px; }
          
          /* KPI Grid for Print */
          .print-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .print-kpi-card { border: 1px solid #ccc; padding: 15px; border-radius: 4px; background: #fafafa; }
          .print-kpi-label { font-size: 9pt; color: #666; text-transform: uppercase; font-weight: bold; }
          .print-kpi-value { font-size: 18pt; font-weight: bold; color: #000; margin-top: 5px; }
          
          /* Tables for Print */
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
          .print-table th { background-color: #f0f0f0; color: #333; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #ccc; }
          .print-table th.right { text-align: right; }
          .print-table td { padding: 8px; border: 1px solid #ccc; }
          .print-table td.right { text-align: right; }
          .print-table tr:nth-child(even) { background-color: #fafafa; }
          
          .print-row { display: flex; gap: 20px; }
          .print-col { flex: 1; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
      
      <Box className="no-print">

      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          Panel de Control
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resumen ejecutivo del {startDate === endDate ? startDate : `${startDate} al ${endDate}`}.
        </Typography>
      </Box>

      {/* FILTROS */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default', border: '1px solid #e0e0e0', borderRadius: 2 }}>
         <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
               <TextField 
                  select fullWidth size="small"
                  label="Filtro rápido"
                  defaultValue="" 
                  onChange={handlePresetChange} 
                  sx={{ bgcolor: 'white', minWidth: 160 }}
               >
                  <MenuItem value="" disabled>Seleccione...</MenuItem>
                  <MenuItem value="diario">Hoy (Diario)</MenuItem>
                  <MenuItem value="semanal">Últimos 7 días</MenuItem>
                  <MenuItem value="quincenal">Últimos 15 días</MenuItem>
                  <MenuItem value="mensual">Último Mes</MenuItem>
                  <MenuItem value="anual">Último Año</MenuItem>
               </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
               <TextField 
                  label="Desde" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                  value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  sx={{ bgcolor: 'white' }}
               />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
               <TextField 
                  label="Hasta" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                  value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  sx={{ bgcolor: 'white' }}
               />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
               <Button 
                  variant="outlined" fullWidth startIcon={<FilterListIcon />}
                  onClick={fetchDashboardData} disabled={loading}
               >
                  {loading ? '...' : 'Filtrar'}
               </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
               <Button 
                  variant="contained" color="secondary" fullWidth startIcon={<PictureAsPdfIcon />}
                  onClick={() => window.print()} disabled={loading}
               >
                  Exportar PDF
               </Button>
            </Grid>
         </Grid>
      </Paper>

      {/* TABS */}
      <Paper square elevation={0} sx={{ bgcolor: 'background.default', mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
          <Tab icon={<TrendingUpIcon />} iconPosition="start" label="Gerencial" />
          <Tab icon={<InventoryIcon />} iconPosition="start" label="Inventario" />
          <Tab icon={<GroupIcon />} iconPosition="start" label="Equipo" />
          <Tab icon={<StorefrontIcon />} iconPosition="start" label="Sucursales" />
        </Tabs>
      </Paper>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" p={5} flexDirection="column" alignItems="center">
           <WarningIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
           <Typography variant="h6" color="error">{error}</Typography>
           <Button variant="outlined" sx={{ mt: 2 }} onClick={fetchDashboardData}>Reintentar</Button>
        </Box>
      ) : !summary ? (
        <Box display="flex" justifyContent="center" p={5} flexDirection="column" alignItems="center">
             <AssessmentIcon color="disabled" sx={{ fontSize: 60, mb: 2 }} />
             <Typography variant="h6" color="text.secondary">No hay datos disponibles.</Typography>
        </Box>
      ) : (
        <Box>
            {/* 1. VISIÓN GERENCIAL */}
            {tabValue === 0 && summary && (
                <Box>
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <KpiCard 
                        title="VENTA TOTAL" 
                        value={formatCurrency(summary.total_sales)} 
                        icon={<AttachMoneyIcon fontSize="large" />} 
                        color="#1565c0" 
                        growth={summary.growth?.sales}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <KpiCard 
                        title="UTILIDAD BRUTA" 
                        value={formatCurrency(summary.gross_profit)} 
                        subtitle="Ganancia estimada" 
                        icon={<AccountBalanceWalletIcon fontSize="large" />} 
                        color="#2e7d32" 
                        growth={summary.growth?.profit}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <KpiCard 
                        title="TRANSACCIONES" 
                        value={summary.transaction_count} 
                        icon={<ReceiptIcon fontSize="large" />} 
                        color="#0288d1" 
                        growth={summary.growth?.transactions}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <KpiCard 
                        title="TICKET PROMEDIO" 
                        value={formatCurrency(summary.average_ticket)} 
                        icon={<TrendingUpIcon fontSize="large" />} 
                        color="#ed6c02" 
                        growth={summary.growth?.ticket}
                      />
                    </Grid>
                  </Grid>

                  {/* Disclaimer si algún producto no tiene costo registrado */}
                  {summary.has_estimated_cost && (
                    <Box sx={{ mb: 2, px: 1 }}>
                      <Chip
                        icon={<WarningIcon />}
                        label="Utilidad Bruta estimada: algunos productos no tienen costo de compra registrado. Ingresa los costos reales en el módulo de Inventario para mayor precisión."
                        color="warning"
                        variant="outlined"
                        size="small"
                        sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
                      />
                    </Box>
                  )}

                  <Grid container spacing={3}>

                    <Grid item xs={12} md={7}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: 400 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">Tendencia de Ventas (Últimos días)</Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={summary.chart_data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="total" fill="#1565c0" name="Ventas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: 400 }}>
                             <Typography variant="h6" gutterBottom fontWeight="bold">Top 10 Productos</Typography>
                             <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={topProducts.slice(0,10)} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="value" fill="#0288d1" name="Venta S/" radius={[0, 4, 4, 0]}>
                                        {topProducts.slice(0, 10).map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">Métodos de Pago</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Método</TableCell><TableCell align="right">Monto</TableCell><TableCell align="right">%</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {paymentMethods.map((m, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{m.name}</TableCell>
                                                <TableCell align="right">{formatCurrency(m.value)}</TableCell>
                                                <TableCell align="right">{summary.total_sales > 0 ? `${((m.value/summary.total_sales)*100).toFixed(1)}%` : '0%'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                  </Grid>
                </Box>
            )}

            {/* 2. INVENTARIO */}
            {tabValue === 1 && (
                <Box>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                       {/* KPI: VALORIZADO DE INVENTARIO */}
                       <Grid item xs={12} md={6}>
                          <KpiCard 
                              title="VALORIZADO (ESTIMADO)" 
                              value={formatCurrency(inventoryValuation.total_valuation)} 
                              subtitle={`${inventoryValuation.total_items} unds. (Basado en Precio Lista)`}
                              icon={<AccountBalanceWalletIcon fontSize="large" />} 
                              color="#4527a0" 
                          />
                       </Grid>
                       {/* ALERTAS STOCK */}
                       <Grid item xs={12} md={6}>
                           <Paper elevation={3} sx={{ p: 2, height: '100%', borderLeft: '6px solid #d32f2f', overflow: 'auto' }}>
                             <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <WarningIcon color="error" />
                                <Typography variant="h6" fontWeight="bold" color="error">Alertas de Stock Bajo ({lowStockProducts.length})</Typography>
                             </Box>
                             {lowStockProducts.length === 0 ? (
                                 <Box display="flex" alignItems="center" justifyContent="center" height="60%">
                                    <Typography color="success.main" variant="body1">✅ Todo el inventario tiene stock saludable</Typography>
                                 </Box>
                             ) : (
                                <TableContainer sx={{ maxHeight: 200 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="center">Stock</TableCell><TableCell align="center">Min</TableCell></TableRow></TableHead>
                                        <TableBody>
                                            {lowStockProducts.map((p) => (
                                                <TableRow key={p.product_id} hover>
                                                    <TableCell>{p.name}</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main' }}>{p.stock}</TableCell>
                                                    <TableCell align="center">{p.min_stock}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                             )}
                           </Paper>
                       </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} sx={{ p: 3, height: 400 }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold">Ventas por Categoría</Typography>
                                <ResponsiveContainer width="100%" height="90%">
                                    <BarChart data={byCategory} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Bar dataKey="value" fill="#8884d8" name="Ventas" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                        
                        {/* REPORTE DINOSAURIOS (Low Rotation) */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} sx={{ p: 3, height: 400, overflow: 'auto' }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold" color="text.secondary">
                                    Productos Sin Movimiento (30 días)
                                </Typography>
                                <Typography variant="caption" display="block" mb={2}>
                                    Productos con stock que no registran ventas recientes.
                                </Typography>
                                
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="right">Stock</TableCell><TableCell align="right">Valorizado</TableCell></TableRow></TableHead>
                                        <TableBody>
                                            {dinosaurProducts.length === 0 ? (
                                                <TableRow><TableCell colSpan={3} align="center">🎉 ¡Excelente! Todo el stock está rotando.</TableCell></TableRow>
                                            ) : (
                                                dinosaurProducts.map((d, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{d.name}</TableCell>
                                                        <TableCell align="right">{d.stock}</TableCell>
                                                        <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatCurrency(d.value)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* 3. EQUIPO */}
            {/* 3. EQUIPO (MEJORADO) */}
            {tabValue === 2 && (
                <Box>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                       {/* Ranking Cards */}
                       {bySeller.map((seller, index) => (
                           <Grid item xs={12} sm={6} md={4} key={index}>
                               <Card elevation={index === 0 ? 5 : 2} sx={{ borderLeft: index === 0 ? '6px solid gold' : 'none' }}>
                                   <CardContent>
                                       <Box display="flex" alignItems="center" gap={2}>
                                           <Avatar sx={{ bgcolor: index === 0 ? 'gold' : 'primary.main', width: 56, height: 56 }}>
                                               {seller.name.charAt(0).toUpperCase()}
                                           </Avatar>
                                           <Box>
                                               <Typography variant="h6" fontWeight="bold">
                                                  {seller.name} 
                                                  {index === 0 && " 👑"}
                                               </Typography>
                                               <Typography variant="h5" color="text.primary" fontWeight="bold">
                                                   S/ {seller.total.toFixed(2)}
                                               </Typography>
                                               <Typography variant="body2" color="text.secondary">
                                                   {seller.count} ventas realizadas
                                               </Typography>
                                           </Box>
                                       </Box>
                                   </CardContent>
                               </Card>
                           </Grid>
                       ))}
                    </Grid>

                    {/* Gráficos de Equipo */}
                    <Grid container spacing={3}>
                       <Grid item xs={12} md={6}>
                          <Paper elevation={3} sx={{ p: 3, height: 400 }}>
                              <Typography variant="h6" gutterBottom fontWeight="bold">Comparativa de Ventas</Typography>
                              <ResponsiveContainer width="100%" height="90%">
                                  <BarChart data={bySeller}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip formatter={(value) => formatCurrency(value)} />
                                      <Bar dataKey="total" fill="#0288d1" name="Ventas" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </Paper>
                       </Grid>

                       {/* HORA PICO (Heatmap simplificado) */}
                       <Grid item xs={12} md={6}>
                          <Paper elevation={3} sx={{ p: 3, height: 400 }}>
                              <Typography variant="h6" gutterBottom fontWeight="bold">Horas Pico (Tráfico en Tienda)</Typography>
                              <Typography variant="caption" display="block" mb={2}>Transacciones por hora del día</Typography>
                              <ResponsiveContainer width="100%" height="85%">
                                  <BarChart data={salesByHour}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="hour" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="transactions" fill="#ed6c02" name="Transacciones" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </Paper>
                       </Grid>
                    </Grid>
                </Box>
            )}

            {/* 4. COMPARATIVA SUCURSALES */}
            {tabValue === 3 && (
                <Box>
                    <Typography variant="h5" fontWeight="bold" gutterBottom color="text.primary">
                        🏢 Comparativa de Sucursales
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Rendimiento comparativo de todas las tiendas en el período seleccionado.
                    </Typography>

                    {storesComparison.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No hay datos para el período seleccionado.</Typography>
                        </Paper>
                    ) : (
                        <>
                            {/* Gráfico de barras comparativo */}
                            <Paper elevation={3} sx={{ p: 3, mb: 3, height: 400 }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold">Ventas Totales por Sucursal</Typography>
                                <ResponsiveContainer width="100%" height="85%">
                                    <BarChart data={storesComparison} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(v) => `S/ ${(v/1000).toFixed(0)}k`} />
                                        <YAxis type="category" dataKey="store_name" width={140} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Bar dataKey="total_sales" name="Ventas Totales" radius={[0, 4, 4, 0]}>
                                            {storesComparison.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>

                            {/* Tabla resumen */}
                            <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                                        <TableRow>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Sucursal</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Ventas Totales</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Transacciones</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Ticket Promedio</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Top Producto</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {storesComparison.map((store, idx) => (
                                            <TableRow key={store.store_id} hover sx={{ bgcolor: idx === 0 ? 'rgba(0,136,254,0.05)' : 'inherit' }}>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {idx === 0 && <EmojiEventsIcon sx={{ color: '#FFD700', fontSize: 20 }} />}
                                                        <Typography fontWeight={idx === 0 ? 'bold' : 'normal'}>
                                                            {store.store_name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography fontWeight="bold" color="success.main">
                                                        {formatCurrency(store.total_sales)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip label={store.transaction_count} color="primary" size="small" />
                                                </TableCell>
                                                <TableCell align="right">{formatCurrency(store.avg_ticket)}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {store.top_product || '-'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Box>
            )}
        </Box>
      )}
      </Box>

      {/* =========================================
          VISTA EXCLUSIVA PARA REPORTE PDF (Oculta en web)
          ========================================= */}
      <Box className="print-only">
        {summary && (
          <>
            <div className="print-header">
              <div className="print-title">SMART PE S.A.C.</div>
              <div className="print-subtitle">REPORTE GERENCIAL DE RESULTADOS</div>
              <div className="print-meta">
                <span><strong>Periodo Analizado:</strong> {startDate === endDate ? startDate : `Del ${startDate} al ${endDate}`}</span>
                <span><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="print-section">
              <div className="print-section-title">A. Resumen Ejecutivo de Operaciones</div>
              <div className="print-kpi-grid">
                <div className="print-kpi-card">
                  <div className="print-kpi-label">Venta Bruta Total</div>
                  <div className="print-kpi-value">{formatCurrency(summary.total_sales)}</div>
                </div>
                <div className="print-kpi-card">
                  <div className="print-kpi-label">Utilidad Bruta Proyectada</div>
                  <div className="print-kpi-value">{formatCurrency(summary.gross_profit)}</div>
                </div>
                <div className="print-kpi-card">
                  <div className="print-kpi-label">Volumen de Transacciones</div>
                  <div className="print-kpi-value">{summary.transaction_count} Facturas/Boletas</div>
                </div>
                <div className="print-kpi-card">
                  <div className="print-kpi-label">Ticket Promedio</div>
                  <div className="print-kpi-value">{formatCurrency(summary.average_ticket)}</div>
                </div>
              </div>
            </div>

            <div className="print-section">
              <div className="print-row">
                <div className="print-col">
                  <div className="print-section-title">B. Flujo de Medios de Pago</div>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>Método Aplicado</th>
                        <th className="right">Monto Recaudado</th>
                        <th className="right">Participación (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethods.map((m, i) => (
                        <tr key={i}>
                          <td>{m.name}</td>
                          <td className="right">{formatCurrency(m.value)}</td>
                          <td className="right">{summary.total_sales > 0 ? ((m.value/summary.total_sales)*100).toFixed(2) : 0}%</td>
                        </tr>
                      ))}
                      {paymentMethods.length === 0 && <tr><td colSpan="3" align="center">Sin datos de pagos</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="print-col">
                  <div className="print-section-title">C. Rendimiento del Personal Comercial</div>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th className="right">Monto Colocado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bySeller.slice(0, 10).map((s, i) => (
                        <tr key={i}>
                          <td>{s.name}</td>
                          <td className="right">{formatCurrency(s.value)}</td>
                        </tr>
                      ))}
                      {bySeller.length === 0 && <tr><td colSpan="2" align="center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="print-page-break"></div>
            <div className="print-section">
              <div className="print-header">
                 <div className="print-subtitle">ANEXOS: DETALLE DE ESTRUCTURA DE VENTAS</div>
                 <div className="print-meta">
                   <span><strong>Emitido:</strong> {new Date().toLocaleDateString()}</span>
                   <span>Pág. 2</span>
                 </div>
              </div>

              <div className="print-row">
                <div className="print-col">
                  <div className="print-section-title">D. Categorías Dominantes</div>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>Línea de Negocio</th>
                        <th className="right">Volumen Soles (S/)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCategory.map((c, i) => (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td className="right">{formatCurrency(c.value)}</td>
                        </tr>
                      ))}
                      {byCategory.length === 0 && <tr><td colSpan="2" align="center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="print-col">
                  <div className="print-section-title">E. Top 15 SKUs (Productos Estrella)</div>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Descripción del Producto / SKU</th>
                        <th className="right">Facturado (S/)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.slice(0, 15).map((p, i) => (
                        <tr key={i}>
                          <td>{i+1}</td>
                          <td>{p.name}</td>
                          <td className="right">{formatCurrency(p.value)}</td>
                        </tr>
                      ))}
                      {topProducts.length === 0 && <tr><td colSpan="3" align="center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="print-section">
                <div className="print-section-title">F. Estado del Almacén Actual (Valorización)</div>
                <table className="print-table" style={{ width: '50%' }}>
                    <thead>
                        <tr>
                            <th>Indicador de Stock</th>
                            <th className="right">Monto Estimado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Valorización Total Estimada (P.Lista)</td>
                            <td className="right">{formatCurrency(inventoryValuation?.total_valuation || 0)}</td>
                        </tr>
                        <tr>
                            <td>Unidades Totales Físicas Disponibles</td>
                            <td className="right">{(inventoryValuation?.total_items || 0).toLocaleString()} Unds.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #000', width: '250px', textAlign: 'center', fontSize: '10pt' }}>
                 Firma y Sello de Gerencia / Administración
            </div>

          </>
        )}
      </Box>

    </Layout>
  );
}

export default Dashboard;