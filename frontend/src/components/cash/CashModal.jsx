import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Typography, Box, Alert, CircularProgress
} from '@mui/material';
import { useCash } from '../../context/CashContext';

// MODOS: 'OPEN', 'CLOSE'
// MODOS: 'OPEN', 'CLOSE'
export default function CashModal({ open, mode, onClose }) {
    const { openCashRegister, closeCashRegister } = useCash();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [closureResult, setClosureResult] = useState(null); // Nuevo estado para resultado

    useEffect(() => {
        if (open) {
            setAmount('');
            setNotes('');
            setError('');
            setClosureResult(null); // Reseteamos resultado al abrir
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!amount || isNaN(amount) || parseFloat(amount) < 0) {
            setError('Ingresa un monto válido.');
            return;
        }

        setProcessing(true);
        setError('');

        let result;
        if (mode === 'OPEN') {
            result = await openCashRegister(amount);
            if (result.success) {
                onClose();
            } else {
                setError(result.message);
            }
        } else {
            // CIERRE
            result = await closeCashRegister(amount, notes);
            if (result.success && result.data) {
                 // Si devuelve data del cierre (necesitamos asegurar que el backend devuelva el objeto register)
                 // Si el contexto solo devuelve { success: true }, no podemos mostrar detalles.
                 // Asumiremos que el backend devuelve el register en la respuesta.
                 // Vamos a verificar CashContext.
                 setClosureResult(result.data); 
            } else if (result.success) {
                // Fallback si no hay data
                onClose();
            } else {
                setError(result.message);
            }
        }
        setProcessing(false);
    };

    const handleFinish = () => {
        onClose();
        setClosureResult(null);
    }

    const title = mode === 'OPEN' ? 'Abrir Caja (Iniciar Turno)' : 'Cerrar Caja (Arqueo)';
    const label = mode === 'OPEN' ? 'Monto Inicial (Sencillo)' : 'Monto Real en Caja (Efectivo)';
    const color = mode === 'OPEN' ? 'primary' : 'error';

    // RENDERIZADO DE RESULTADO DE CIERRE
    if (closureResult) {
        const diff = closureResult.difference || 0;
        const isPerfect = Math.abs(diff) < 0.01;
        const diffColor = isPerfect ? 'success.main' : (diff > 0 ? 'success.main' : 'error.main');
        const diffText = isPerfect ? 'Cuadre Perfecto' : (diff > 0 ? `Sobrante: S/ ${diff.toFixed(2)}` : `Faltante: S/ ${Math.abs(diff).toFixed(2)}`);

        return (
            <Dialog open={open} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                     Resultado del Cierre
                </DialogTitle>
                <DialogContent>
                    <Box textAlign="center" py={2}>
                        <Typography variant="h2" color={diffColor} gutterBottom>
                            {diffText}
                        </Typography>
                        
                        <Box mt={3} p={2} bgcolor="background.default" borderRadius={2}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography>Efectivo en Sistema:</Typography>
                                <Typography fontWeight="bold">S/ {closureResult.expected_cash?.toFixed(2)}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography>Efectivo Real (Contado):</Typography>
                                <Typography fontWeight="bold">S/ {closureResult.final_amount_real?.toFixed(2)}</Typography>
                            </Box>
                             <Box display="flex" justifyContent="space-between" mt={2} pt={2} borderTop={1} borderColor="divider">
                                <Typography variant="h6">Diferencia:</Typography>
                                <Typography variant="h6" color={diffColor}>S/ {diff.toFixed(2)}</Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button variant="contained" size="large" onClick={handleFinish}>
                        ENTENDIDO
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box mt={2}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                        {mode === 'OPEN' 
                            ? 'Ingresa el dinero en efectivo con el que inicias el día.' 
                            : 'Cuenta todo el dinero en efectivo (billetes + monedas) e ingrésalo aquí para comparar con el sistema. Nota: Si la diferencia (Sobrante o Faltante) supera los S/ 10, es OBLIGATORIO escribir una justificación.'}
                    </Typography>

                    <TextField
                        autoFocus
                        label={label}
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>S/</Typography> }}
                    />
                    
                    {mode === 'CLOSE' && (
                        <TextField
                            label="Notas / Observaciones"
                            multiline
                            rows={3}
                            fullWidth
                            variant="outlined"
                            sx={{ mt: 2 }}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                {/* En modo OPEN, a veces no se permite cancelar si es obligatorio */}
                {mode === 'CLOSE' && <Button onClick={onClose} disabled={processing}>Cancelar</Button>}
                
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    color={color}
                    disabled={processing}
                >
                    {processing ? <CircularProgress size={24} /> : (mode === 'OPEN' ? 'ABRIR TURN0' : 'CERRAR TURNO')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
