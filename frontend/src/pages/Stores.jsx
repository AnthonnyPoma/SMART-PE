import React, { useState, useEffect } from 'react';
import {
    Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Box, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
    CircularProgress, Alert, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';

import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Stores() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Modal Crear/Editar
    const [formOpen, setFormOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        phone: '',
        ruc: ''
    });

    // Modal de Personal
    const [staffOpen, setStaffOpen] = useState(false);
    const [storeStaff, setStoreStaff] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');

    // Cargar tiendas
    useEffect(() => {
        fetchStores();
        fetchAllUsers();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/stores/`, config);
            setStores(res.data);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al cargar tiendas' });
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/users/`, config);
            setAllUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenCreate = () => {
        setEditMode(false);
        setSelectedStore(null);
        setFormData({ name: '', address: '', city: '', phone: '', ruc: '' });
        setFormOpen(true);
    };

    const handleOpenEdit = (store) => {
        setEditMode(true);
        setSelectedStore(store);
        setFormData({
            name: store.name,
            address: store.address,
            city: store.city || '',
            phone: store.phone || '',
            ruc: store.ruc || ''
        });
        setFormOpen(true);
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (editMode) {
                await axios.put(`${API_URL}/stores/${selectedStore.store_id}`, formData, config);
                setMessage({ type: 'success', text: 'Tienda actualizada correctamente' });
            } else {
                await axios.post(`${API_URL}/stores/`, formData, config);
                setMessage({ type: 'success', text: 'Tienda creada correctamente' });
            }

            setFormOpen(false);
            fetchStores();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.detail || 'Error al guardar';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const handleDeactivate = async (storeId, storeName) => {
        if (!window.confirm(`¿Desactivar tienda "${storeName}"?`)) return;

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`${API_URL}/stores/${storeId}`, config);
            setMessage({ type: 'success', text: 'Tienda desactivada' });
            fetchStores();
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Error al desactivar';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const handleOpenStaff = async (store) => {
        setSelectedStore(store);
        setSelectedUser('');

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/stores/${store.store_id}/users`, config);
            setStoreStaff(res.data);
            setStaffOpen(true);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al cargar personal' });
        }
    };

    const handleAssignUser = async () => {
        if (!selectedUser) return;

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const params = new URLSearchParams({ store_id: selectedStore.store_id });
            await axios.put(`${API_URL}/users/${selectedUser}/assign-store?${params}`, {}, config);

            setMessage({ type: 'success', text: 'Empleado asignado correctamente' });
            setSelectedUser('');

            // Recargar personal y tiendas
            handleOpenStaff(selectedStore);
            fetchStores();
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Error al asignar empleado';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const handleRemoveUser = async (userId, userName) => {
        if (!window.confirm(`¿Remover a "${userName}" de esta tienda?`)) return;

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // Asignar a tienda 1 (Sede Principal) por defecto al remover
            const params = new URLSearchParams({ store_id: 1 });
            await axios.put(`${API_URL}/users/${userId}/assign-store?${params}`, {}, config);

            setMessage({ type: 'success', text: 'Empleado removido de la tienda' });

            // Recargar personal y tiendas
            handleOpenStaff(selectedStore);
            fetchStores();
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Error al remover empleado';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    return (
        <Layout>
            <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h4" fontWeight="bold">Administración de Tiendas</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                        Nueva Tienda
                    </Button>
                </Box>

                {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

                {loading ? (
                    <Box display="flex" justifyContent="center" p={5}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Dirección</TableCell>
                                    <TableCell>Ciudad</TableCell>
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell>Personal</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stores.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} align="center">No hay tiendas registradas</TableCell></TableRow>
                                ) : (
                                    stores.map((store) => (
                                        <TableRow key={store.store_id}>
                                            <TableCell><strong>{store.name}</strong></TableCell>
                                            <TableCell>{store.address}</TableCell>
                                            <TableCell>{store.city || '-'}</TableCell>
                                            <TableCell>{store.phone || '-'}</TableCell>
                                            <TableCell>{store.employee_count} empleado(s)</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={store.status ? "Activa" : "Inactiva"}
                                                    color={store.status ? "success" : "default"}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" color="info" onClick={() => handleOpenStaff(store)} title="Ver Personal">
                                                    <PeopleIcon />
                                                </IconButton>
                                                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(store)}>
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDeactivate(store.store_id, store.name)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* MODAL CREAR/EDITAR */}
                <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>{editMode ? 'Editar Tienda' : 'Nueva Tienda'}</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Nombre de Tienda *"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Dirección *"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Ciudad"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Teléfono"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="RUC (11 dígitos)"
                                    value={formData.ruc}
                                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                                    inputProps={{ maxLength: 11 }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
                        <Button variant="contained" onClick={handleSave} disabled={!formData.name || !formData.address}>
                            {editMode ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* MODAL DE PERSONAL */}
                <Dialog open={staffOpen} onClose={() => setStaffOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>
                        Personal de: {selectedStore?.name}
                    </DialogTitle>
                    <DialogContent>
                        {/* AGREGAR EMPLEADO */}
                        <Box sx={{ mb: 3, mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                Agregar Empleado
                            </Typography>
                            <Box display="flex" gap={2} alignItems="center">
                                <TextField
                                    select
                                    fullWidth
                                    label="Seleccionar Empleado"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    size="small"
                                >
                                    <MenuItem value="">-- Seleccione --</MenuItem>
                                    {allUsers
                                        .filter(u => !storeStaff.find(s => s.user_id === u.user_id))
                                        .map(user => (
                                            <MenuItem key={user.user_id} value={user.user_id}>
                                                {user.full_name} ({user.username}) - {user.role?.name || 'Sin rol'}
                                            </MenuItem>
                                        ))
                                    }
                                </TextField>
                                <Button
                                    variant="contained"
                                    onClick={handleAssignUser}
                                    disabled={!selectedUser}
                                    startIcon={<AddIcon />}
                                >
                                    Asignar
                                </Button>
                            </Box>
                        </Box>

                        {/* LISTA DE PERSONAL */}
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            Personal Asignado ({storeStaff.length})
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell>Nombre</TableCell>
                                        <TableCell>Usuario</TableCell>
                                        <TableCell>Rol</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell align="center">Acción</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {storeStaff.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                No hay empleados asignados a esta tienda
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        storeStaff.map((employee) => (
                                            <TableRow key={employee.user_id}>
                                                <TableCell>{employee.full_name}</TableCell>
                                                <TableCell>{employee.username}</TableCell>
                                                <TableCell>
                                                    <Chip label={employee.role} size="small" />
                                                </TableCell>
                                                <TableCell>{employee.email || '-'}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleRemoveUser(employee.user_id, employee.full_name)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setStaffOpen(false)}>Cerrar</Button>
                    </DialogActions>
                </Dialog>

            </Box>
        </Layout>
    );
}

export default Stores;
