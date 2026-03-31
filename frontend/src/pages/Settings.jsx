import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert,
  CircularProgress, Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import Layout from '../components/Layout';
import api from '../api/axios';

function Settings() {
  const [settings, setSettings] = useState({
    company_name: '',
    company_ruc: '',
    company_address: '',
    company_phone: '',
    ticket_footer: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/');
      setSettings(prev => ({
        ...prev,
        ...res.data
      }));
    } catch (error) {
      console.error("Error cargando configuración:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value || ''
      }));
      await api.put('/settings/', { settings: settingsArray });
      setMessage({ type: 'success', text: '✅ Configuración guardada correctamente' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Error al guardar la configuración' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              Configuración del Negocio
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Personaliza los datos de tu empresa que aparecen en tickets y reportes.
            </Typography>
          </Box>
        </Box>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          {/* DATOS DE LA EMPRESA */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🏢 Información de la Empresa
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de la Empresa"
                value={settings.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Ej: Mi Tienda S.A.C."
                helperText="Se mostrará en tickets y reportes"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="RUC"
                value={settings.company_ruc}
                onChange={(e) => handleChange('company_ruc', e.target.value)}
                placeholder="Ej: 20123456789"
                helperText="Número de RUC de la empresa"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección Fiscal"
                value={settings.company_address}
                onChange={(e) => handleChange('company_address', e.target.value)}
                placeholder="Ej: Av. Principal 123, Lima"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={settings.company_phone}
                onChange={(e) => handleChange('company_phone', e.target.value)}
                placeholder="Ej: 01-234-5678"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* PERSONALIZACIÓN DE TICKETS */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🧾 Personalización de Tickets
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensaje de Pie de Ticket"
                value={settings.ticket_footer}
                onChange={(e) => handleChange('ticket_footer', e.target.value)}
                placeholder="Ej: ¡Gracias por su compra! Visite www.mitienda.com"
                multiline
                rows={2}
                helperText="Se imprime al final de cada ticket de venta"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              size="large" 
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ px: 4, py: 1.5, fontWeight: 'bold' }}
            >
              {saving ? 'Guardando...' : 'GUARDAR CONFIGURACIÓN'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}

export default Settings;
