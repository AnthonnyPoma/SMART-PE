import React, { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useCash } from '../../context/CashContext';
import CashModal from './CashModal';

export default function CashGuard({ children }) {
    const { cashStatus, loading, checkCashStatus } = useCash();
    const [modalOpen, setModalOpen] = useState(false);

    if (loading) return null;

    // Si tiene caja abierta, mostrar contenido protegido (el POS o similar)
    if (cashStatus && cashStatus.has_open_register) {
        return children;
    }

    // Callback al abrir caja exitosamente: forzar recarga del status
    const handleOpenSuccess = async () => {
        await checkCashStatus();
        setModalOpen(false);
    };

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
                onSuccess={handleOpenSuccess}
                onClose={() => setModalOpen(false)}
            />
        </Box>
    );
}
