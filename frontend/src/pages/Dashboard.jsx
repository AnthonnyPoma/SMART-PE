import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Paper, Typography, TextField, Button, 
  Tabs, Tab, Card, CardContent, CircularProgress, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, Divider
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../api/axios';
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

  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { start_date: startDate, end_date: endDate };
      
      const [resSummary, resTop, resCat, resSeller, resPayment, resProds, resValuation, resDino, resHour] = await Promise.all([
        api.get('/reports/sales-summary', { params }),
        api.get('/reports/top-products', { params }),
        api.get('/reports/by-category', { params }),
        api.get('/reports/by-seller', { params }),
        api.get('/reports/payment-methods', { params }),
        api.get('/products/'),
        api.get('/reports/inventory-valuation'), // Global (o por store si se filtra dashboard.py)
        api.get('/reports/low-rotation', { params: { days: 30 } }), // Fijo 30 días
        api.get('/reports/sales-by-hour', { params }) // Nuevo
      ]);

      setSummary(resSummary.data);
      setTopProducts(resTop.data);
      setByCategory(resCat.data);
      setBySeller(resSeller.data);
      setPaymentMethods(resPayment.data);
      setInventoryValuation(resValuation.data);
      setDinosaurProducts(resDino.data);
      setSalesByHour(resHour.data);

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
            <Grid item xs={12} sm={4} md={3}>
               <TextField 
                  label="Desde" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                  value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  sx={{ bgcolor: 'white' }}
               />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
               <TextField 
                  label="Hasta" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                  value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  sx={{ bgcolor: 'white' }}
               />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
               <Button 
                  variant="outlined" fullWidth startIcon={<FilterListIcon />}
                  onClick={fetchDashboardData} disabled={loading}
               >
                  {loading ? '...' : 'Filtrar'}
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
                        value={`S/ ${summary.total_sales.toFixed(2)}`} 
                        icon={<AttachMoneyIcon fontSize="large" />} 
                        color="#1565c0" 
                        growth={summary.growth?.sales}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <KpiCard 
                        title="UTILIDAD BRUTA" 
                        value={`S/ ${summary.gross_profit.toFixed(2)}`} 
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
                        value={`S/ ${summary.average_ticket.toFixed(2)}`} 
                        icon={<TrendingUpIcon fontSize="large" />} 
                        color="#ed6c02" 
                        growth={summary.growth?.ticket}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: 400 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">Tendencia de Ventas (Últimos días)</Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={summary.chart_data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `S/ ${value}`} />
                                    <Bar dataKey="total" fill="#1565c0" name="Ventas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: 400 }}>
                             <Typography variant="h6" gutterBottom fontWeight="bold">Top 5 Productos</Typography>
                             <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie data={topProducts.slice(0,5)} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value">
                                        {topProducts.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
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
                                                <TableCell align="right">S/ {m.value.toFixed(2)}</TableCell>
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
                              value={`S/ ${inventoryValuation.total_valuation.toFixed(2)}`} 
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
                                        <Tooltip formatter={(value) => `S/ ${value}`} />
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
                                                        <TableCell align="right" sx={{ color: 'text.secondary' }}>S/ {d.value.toFixed(2)}</TableCell>
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
                                      <Tooltip formatter={(value) => `S/ ${value}`} />
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
        </Box>
      )}
    </Layout>
  );
}

export default Dashboard;