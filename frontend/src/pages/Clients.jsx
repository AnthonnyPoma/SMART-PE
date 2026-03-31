import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { toTitleCase } from '../utils/format';
import ExportExcelButton from '../components/ExportExcelButton';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid,
  InputAdornment, Tooltip, CircularProgress, Checkbox, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';

function Clients() {
  const [clients, setClients] = useState([]);
  // Removed unused loading state
  const [searchText, setSearchText] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 50;
  
  // Modal Crear/Editar
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [formData, setFormData] = useState({
    client_id: null,
    document_type: 'DNI',
    document_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    accepts_marketing: false
  });

  // Modal Historial
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, [page]);

  const fetchClients = async (targetPage) => {
    try {
      const params = {
        page: targetPage || page,
        limit: LIMIT,
        search: searchText || undefined
      };
      const res = await api.get('/clients/paginated', { params });
      const { data, total_pages, total_items } = res.data;
      setClients(data);
      setTotalPages(total_pages);
      setTotalItems(total_items);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchAllForExport = async () => {
    const params = {
      page: 1, // Obtener desde el inicio
      limit: 1000000, // Forzar obtención de todos los registros
      search: searchText || undefined
    };
    const response = await api.get('/clients/paginated', { params });
    return response.data.data;
  };

  const handleOpen = (client = null) => {
    if (client) {
      setIsEdit(true);
      setFormData({
        client_id: client.client_id,
        document_type: client.document_type || 'DNI',
        document_number: client.document_number,
        first_name: client.first_name,
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        accepts_marketing: client.accepts_marketing || false
      });
    } else {
      setIsEdit(false);
      setFormData({
        client_id: null,
        document_type: 'DNI',
        document_number: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        accepts_marketing: false
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isEdit) {
        await api.put(`/clients/${formData.client_id}`, formData);
      } else {
        await api.post('/clients/', formData);
      }
      setOpen(false);
      fetchClients();
    } catch (error) {
      alert("Error al guardar: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleSearchDocument = async () => {
    if (!formData.document_number) return;
    
    setLoadingSearch(true);
    try {
        let endpoint = '';
        if (formData.document_type === 'DNI') endpoint = `/external/dni/${formData.document_number}`;
        else if (formData.document_type === 'RUC') endpoint = `/external/ruc/${formData.document_number}`;
        else {
            alert("Búsqueda solo disponible para DNI o RUC");
            setLoadingSearch(false);
            return;
        }

        const res = await api.get(endpoint);
        const data = res.data;

        if (formData.document_type === 'DNI') {
            setFormData({
                ...formData,
                first_name: data.nombres || '',
                last_name: `${data.apellido_paterno} ${data.apellido_materno}`.trim(),
                address: data.direccion || formData.address
            });
        } else if (formData.document_type === 'RUC') {
            setFormData({
                ...formData,
                first_name: data.razon_social || '',
                last_name: '', // Empresas no suelen tener "apellido" separado aquí
                address: data.direccion || formData.address
            });
        }
    } catch (error) {
        alert(error.response?.data?.detail || "No se encontraron resultados para ese documento.");
    } finally {
        setLoadingSearch(false);
    }
  };

  const handleViewHistory = async (client) => {
    setSelectedClient(client);
    setHistoryOpen(true);
    setHistoryData([]);
    try {
        const res = await api.get(`/loyalty/points/${client.client_id}`);
        setHistoryData(res.data.history);
    } catch (error) {
        console.error("Error fetching history:", error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchClients(1);
  };

  const clientRows = React.useMemo(() => {
    return clients.map((client) => (
      <TableRow key={client.client_id} hover>
        <TableCell>
          <Typography variant="subtitle2" fontWeight="bold">
            {toTitleCase(client.first_name)} {toTitleCase(client.last_name)}
          </Typography>
        </TableCell>
        <TableCell>
            <Chip label={client.document_type} size="small" sx={{ mr: 1, fontSize: '0.7rem' }} />
            {client.document_number}
        </TableCell>
        <TableCell>
          <Typography variant="caption" display="block">{client.phone || "-"}</Typography>
          <Typography variant="caption" color="text.secondary">{client.email}</Typography>
        </TableCell>
        <TableCell align="center">
            <Chip 
                icon={<StarIcon sx={{ fontSize: 16 }} />} 
                label={`${client.current_points || 0} pts`} 
                color="warning" 
                variant={client.current_points > 0 ? "filled" : "outlined"}
                sx={{ fontWeight: 'bold' }}
            />
        </TableCell>
        <TableCell align="center">
          <Tooltip title="Ver Historial de Puntos">
            <IconButton onClick={() => handleViewHistory(client)} color="warning">
                <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar Datos">
            <IconButton onClick={() => handleOpen(client)} color="primary">
                <EditIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
    ));
  }, [clients]);

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" fontWeight="bold">Gestión de Clientes</Typography>
            <Typography variant="body1" color="text.secondary">Administra tu cartera de clientes y puntos de fidelidad.</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <ExportExcelButton
            data={[]} 
            fetchData={fetchAllForExport}
            filename="clientes"
            sheetName="Clientes"
            columns={[
              { header: 'Nombre', key: 'first_name', transform: (v, row) => `${v || ''} ${row.last_name || ''}`.trim() },
              { header: 'Tipo Doc', key: 'document_type' },
              { header: 'Documento', key: 'document_number' },
              { header: 'Teléfono', key: 'phone' },
              { header: 'Email', key: 'email' },
              { header: 'Puntos', key: 'current_points' },
            ]}
          />
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpen()}
          >
            Nuevo Cliente
          </Button>
        </Box>
      </Box>

      {/* BUSCADOR */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField 
            fullWidth 
            placeholder="Buscar por Nombre o DNI..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
                startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>)
            }}
            size="small"
        />
      </Paper>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell><b>Cliente</b></TableCell>
              <TableCell><b>Documento</b></TableCell>
              <TableCell><b>Contacto</b></TableCell>
              <TableCell align="center"><b>Puntos</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientRows}
          </TableBody>
        </Table>
      </TableContainer>

      {/* PAGINACIÓN */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {clients.length} de {totalItems} clientes · Página {page} de {totalPages}
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

      {/* MODAL CREAR / EDITAR */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
                <TextField select fullWidth label="Tipo Doc." 
                    SelectProps={{ native: true }}
                    value={formData.document_type}
                    onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">CE</option>
                </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField fullWidth label="Número Documento" 
                    value={formData.document_number}
                    onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton 
                                    onClick={handleSearchDocument} 
                                    disabled={loadingSearch || !formData.document_number || formData.document_type === 'CE'}
                                    color="primary"
                                    title="Buscar en SUNAT/RENIEC"
                                >
                                    {loadingSearch ? <CircularProgress size={24} /> : <TravelExploreIcon />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField fullWidth label="Nombres" required
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField fullWidth label="Apellidos" 
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField fullWidth label="Teléfono" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField fullWidth label="Email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
            </Grid>
            <Grid item xs={12}>
                <TextField fullWidth label="Dirección" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
            </Grid>
            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <FormControlLabel
                        control={
                            <Checkbox 
                                checked={formData.accepts_marketing} 
                                onChange={(e) => setFormData({...formData, accepts_marketing: e.target.checked})} 
                                color="primary" 
                            />
                        }
                        label={
                            <Typography variant="body2" color="text.secondary">
                                <b>Consentimiento Ley N° 29733:</b> El cliente autoriza el uso de sus datos para el envío de promociones, comprobantes y campañas de marketing.
                            </Typography>
                        }
                    />
                </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} variant="contained" color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL HISTORIAL PUNTOS */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StarIcon color="warning" /> Historial de Puntos
        </DialogTitle>
        <DialogContent dividers>
            {selectedClient && (
                <Box mb={2}>
                    <Typography variant="h6">{toTitleCase(selectedClient.first_name)} {toTitleCase(selectedClient.last_name)}</Typography>
                    <Typography variant="body2" color="text.secondary">Saldo Actual: <b>{selectedClient.current_points || 0} puntos</b></Typography>
                </Box>
            )}
            
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Motivo</TableCell>
                        <TableCell align="right">Puntos</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {historyData.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} align="center">Sin movimientos registrados</TableCell>
                        </TableRow>
                    ) : (
                        historyData.map((tx) => (
                            <TableRow key={tx.transaction_id}>
                                <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Typography variant="body2">{tx.reason}</Typography>
                                    <Typography variant="caption" color="text.secondary">{tx.type}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography color={tx.points > 0 ? "success.main" : "error.main"} fontWeight="bold">
                                        {tx.points > 0 ? "+" : ""}{tx.points}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setHistoryOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Layout>
  );
}

export default Clients;
