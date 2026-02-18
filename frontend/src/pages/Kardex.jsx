import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios"; // 👈 USAR CLIENTE SEGURO
import {
  Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Box, CircularProgress,
  TextField, MenuItem, Grid, InputAdornment, IconButton, Tooltip
} from "@mui/material";
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';

function Kardex() {
  const [movements, setMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FILTROS ---
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("TODOS");
  const [filterUser, setFilterUser] = useState("TODOS");
  
  // Filtros de Fecha
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [uniqueUsers, setUniqueUsers] = useState([]); 

  useEffect(() => {
    fetchKardex();
  }, []);

  const fetchKardex = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/kardex`); // 👈 api client
      setMovements(res.data);
      setFilteredMovements(res.data);
      
      const users = [...new Set(res.data.map(m => m.user_name))];
      setUniqueUsers(users);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Filtrado
  useEffect(() => {
    let result = movements;

    // 1. Texto (SKU o Nombre)
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(m => 
        m.product_name.toLowerCase().includes(lower) || 
        m.sku.toLowerCase().includes(lower)
      );
    }

    // 2. Tipo
    if (filterType !== "TODOS") {
      result = result.filter(m => {
          if (filterType === "ENTRADA") return m.type === "ENTRADA" || m.type === "IN";
          if (filterType === "SALIDA") return m.type === "SALIDA" || m.type === "OUT";
          return true;
      });
    }

    // 3. Usuario
    if (filterUser !== "TODOS") {
      result = result.filter(m => m.user_name === filterUser);
    }

    // 4. Rango de Fechas
    if (startDate) {
      result = result.filter(m => new Date(m.date) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      result = result.filter(m => new Date(m.date) <= end);
    }

    setFilteredMovements(result);
  }, [searchText, filterType, filterUser, startDate, endDate, movements]);

  // 🧹 FUNCIÓN PARA LIMPIAR FILTROS
  const resetFilters = () => {
    setSearchText("");
    setFilterType("TODOS");
    setFilterUser("TODOS");
    setStartDate("");
    setEndDate("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Layout>
      {/* ENCABEZADO */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.primary', fontWeight: 'bold' }}>
          <DescriptionIcon fontSize="large" color="primary" /> Kardex Valorizado
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Historial completo de movimientos de inventario de tu tienda.
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

          {/* USUARIO */}
          <Grid item xs={6} md={2}>
            <TextField
              select fullWidth label="Usuario" size="small"
              value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              {uniqueUsers.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
          </Grid>

          {/* BOTONES ACCIÓN (REFRESH + LIMPIAR) */}
          <Grid item xs={12} md={1} sx={{ textAlign: 'right', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
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
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No se encontraron movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((mov, index) => {
                    const isEntry = mov.type === "ENTRADA" || mov.type === "IN";
                    const totalVal = (mov.quantity * (mov.unit_cost || 0));

                    return (
                        <TableRow key={mov.movement_id || index} hover>
                            <TableCell sx={{ fontSize: '0.85rem' }}>{formatDate(mov.date)}</TableCell>
                            <TableCell>
                                <Typography variant="body2" fontWeight="bold">{mov.product_name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">{mov.sku}</Typography>
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
                                {mov.unit_cost ? `S/ ${Number(mov.unit_cost).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>
                                {mov.unit_cost ? `S/ ${totalVal.toFixed(2)}` : "-"}
                            </TableCell>

                            <TableCell sx={{ fontSize: '0.9rem' }}>{mov.reason}</TableCell>
                            <TableCell sx={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'text.secondary' }}>
                                {mov.user_name || "Sistema"}
                            </TableCell>
                        </TableRow>
                    );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Layout>
  );
}

export default Kardex;