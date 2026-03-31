import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, LinearProgress,
  Card, CardContent, Grid, Avatar
} from '@mui/material';
import api from '../api/axios';
import { formatCurrency } from '../utils/format';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

function Commissions() {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCommissions = async () => {
    try {
      const storeId = localStorage.getItem('store_id');
      const res = await api.get('/hr/commissions', { params: { store_id: storeId || undefined } });
      setCommissions(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  // formatCurrency ahora viene del util compartido

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" fontWeight="bold">Metas y Comisiones</Typography>
            <Typography variant="body1" color="text.secondary">
              Rendimiento de ventas frente a la meta del mes actual.
            </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} mb={3}>
        {commissions.map((user) => (
          <Grid item xs={12} md={6} lg={4} key={user.user_id}>
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{user.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
                  </Box>
                </Box>
                
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5} gap={1} flexWrap="wrap">
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Progreso Ventas Netas:</Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                      {formatCurrency(user.net_sales_month)} / {user.monthly_goal > 0 ? formatCurrency(user.monthly_goal) : 'Sin meta'}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={user.progress_percentage > 100 ? 100 : user.progress_percentage} 
                    color={user.progress_percentage >= 100 ? "success" : "primary"}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                     {user.monthly_goal > 0 ? `${user.progress_percentage.toFixed(1)}% de la meta` : 'Sin meta asignada'}
                  </Typography>
                </Box>

                <Box bgcolor="grey.50" p={2} borderRadius={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <MonetizationOnIcon color="success" />
                    <Typography variant="body2" fontWeight="bold">Comisión Acumulada</Typography>
                  </Box>
                  <Typography variant="h6" color="success.main" fontWeight="bold">
                    {formatCurrency(user.commission_earned)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
                  Tasa: {(user.commission_rate * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {commissions.length === 0 && !loading && (
            <Grid item xs={12}>
                <Typography variant="body1" color="text.secondary" textAlign="center" mt={5}>
                    No hay comisiones o metas configuradas para mostrar en este mes.
                </Typography>
            </Grid>
        )}
      </Grid>
    </Layout>
  );
}

export default Commissions;
