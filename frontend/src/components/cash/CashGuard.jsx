import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useCash } from '../../context/CashContext';
import CashModal from './CashModal';

export default function CashGuard({ children }) {
    const { cashStatus, loading } = useCash();
    const [modalOpen, setModalOpen] = useState(false);

    if (loading) return null; // O un spinner

    // Si tiene caja abierta, mostrar contenido protegido (el POS o similar)
    if (cashStatus && cashStatus.has_open_register) {
        return children;
    }

    // Si NO tiene caja abierta, mostrar Bloqueo
    return (
        <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            height="80vh"
        >
            <Paper elevation={3} sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
                <LockIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                    Caja Cerrada
                </Typography>
                <Typography variant="body1" color="textSecondary" paragraph>
                    Para realizar ventas, primero debes iniciar tu turno de caja.
                </Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    size="large"
                    onClick={() => setModalOpen(true)}
                >
                    ABRIR CAJA AHORA
                </Button>
            </Paper>

            <CashModal 
                open={modalOpen} 
                mode="OPEN" 
                onClose={() => setModalOpen(false)} // Se cerrará solo si tiene éxito dentro de Modal, o podemos forzar recarga
            />
        </Box>
    );
}
