import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid,
  MenuItem, Switch, FormControlLabel, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import KeyIcon from '@mui/icons-material/Key';
import api from '../api/axios'; // 👈 USAR CLIENTE SEGURO

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  // Estado del Formulario
  const [formData, setFormData] = useState({
    user_id: null,
    full_name: '',
    username: '',
    dni: '',
    password: '',
    role_id: 2, // Default Vendedor
    store_id: 1, // Default Tienda Principal
    phone: '',
    email: '',
    address: '',
    is_active: true
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/users/`); 
      setUsers(res.data);
    } catch (error) {
      console.error("Error users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get(`/users/roles`);
      setRoles(res.data);
    } catch (error) {
      // Fallback manual si falla el endpoint
      setRoles([
          {role_id: 1, name: 'Administrador'}, 
          {role_id: 2, name: 'Vendedor'},
          {role_id: 3, name: 'Almacenero'}
      ]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleOpen = (user = null) => {
    if (user) {
      setIsEdit(true);
      setFormData({
        user_id: user.user_id,
        full_name: user.full_name || '',
        username: user.username,
        dni: user.dni || '',
        password: '', // En edición, vacío significa "no cambiar"
        role_id: user.role_id,
        store_id: user.store_id,
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
        is_active: user.is_active
      });
    } else {
      setIsEdit(false);
      setFormData({
        user_id: null,
        full_name: '',
        username: '',
        dni: '',
        password: '',
        role_id: 2,
        store_id: 1,
        phone: '',
        email: '',
        address: '',
        is_active: true
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isEdit) {
        // Modo Edición
        await api.put(`/users/${formData.user_id}`, formData);
      } else {
        // Modo Creación
        await api.post(`/users/`, formData);
      }
      setOpen(false);
      fetchUsers();
    } catch (error) {
      alert("Error al guardar: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" fontWeight="bold">Gestión de Usuarios</Typography>
            <Typography variant="body1" color="text.secondary">Administra el acceso y roles de tu equipo.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpen()}
          sx={{ height: 40 }}
        >
          Nuevo Usuario
        </Button>
      </Box>

      {/* TABLA DE USUARIOS */}
      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell><b>Estado</b></TableCell>
              <TableCell><b>Nombre Completo</b></TableCell>
              <TableCell><b>Usuario / DNI</b></TableCell>
              <TableCell><b>Rol</b></TableCell>
              <TableCell><b>Contacto</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id} hover>
                <TableCell>
                  <Chip 
                    label={user.is_active ? "ACTIVO" : "INACTIVO"} 
                    color={user.is_active ? "success" : "default"} 
                    size="small" 
                    variant={user.is_active ? "filled" : "outlined"}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{user.full_name}</TableCell>
                <TableCell>
                  <Box display="flex" flexDirection="column">
                    <Typography variant="body2" fontWeight="bold">@{user.username}</Typography>
                    <Typography variant="caption" color="text.secondary">DNI: {user.dni}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={<BadgeIcon />} 
                    label={roles.find(r => r.role_id === user.role_id)?.name || "Rol " + user.role_id} 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.phone || "-"}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpen(user)} color="primary">
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL CREAR / EDITAR */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" /> {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* DATOS DE CUENTA */}
            <Grid item xs={12}><Typography variant="subtitle2" color="primary">ACCESO AL SISTEMA</Typography></Grid>
            
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Usuario (Login)" required
                value={formData.username}
                disabled={isEdit} // No permitir cambiar username al editar
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label={isEdit ? "Nueva Contraseña (Opcional)" : "Contraseña"} 
                type="password"
                required={!isEdit}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                InputProps={{
                    startAdornment: (<InputAdornment position="start"><KeyIcon color="action" /></InputAdornment>),
                }}
                helperText={isEdit ? "Dejar en blanco para mantener la actual" : "Requerido para ingresar"}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField 
                select fullWidth label="Rol de Usuario"
                value={formData.role_id}
                onChange={(e) => setFormData({...formData, role_id: e.target.value})}
              >
                {roles.map(r => (
                  <MenuItem key={r.role_id} value={r.role_id}>{r.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
               <FormControlLabel 
                 control={<Switch checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />}
                 label={formData.is_active ? "Usuario Activo (Puede ingresar)" : "Usuario Bloqueado (Acceso denegado)"}
               />
            </Grid>

            {/* DATOS PERSONALES */}
            <Grid item xs={12} sx={{ mt: 2 }}><Typography variant="subtitle2" color="primary">DATOS PERSONALES</Typography></Grid>
            
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Nombre Completo" required
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="DNI" required
                value={formData.dni}
                onChange={(e) => setFormData({...formData, dni: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Dirección"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {isEdit ? "Guardar Cambios" : "Crear Usuario"}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default Users;