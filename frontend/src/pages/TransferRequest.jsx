import React, { useState, useEffect } from 'react';
import {
    Typography, Box, Paper, Button, TextField, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, List, ListItem,
    ListItemText, ListItemIcon, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

// const API_URL = "http://localhost:8000"; // No longer needed if api client handles base URL

function TransferRequest() {
    // Datos maestros
    const [stores, setStores] = useState([]);
    const [products, setProducts] = useState([]);

    // Formulario Cabecera
    const [targetStore, setTargetStore] = useState("");
    const [notes, setNotes] = useState("");

    // Formulario Detalle
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [items, setItems] = useState([]);

    // Modal IMEI
    const [imeiModalOpen, setImeiModalOpen] = useState(false);
    const [availableImeis, setAvailableImeis] = useState([]);
    const [selectedImeis, setSelectedImeis] = useState([]);
    const [currentProductForImei, setCurrentProductForImei] = useState(null);

    // Estados UI
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    // Obtener tienda origen del usuario autenticado
    const storedStoreId = localStorage.getItem('store_id');
    const sourceStoreId = storedStoreId ? parseInt(storedStoreId) : 1;

    // Carga inicial
    useEffect(() => {
        const fetchData = async () => {
            try {
                // api inyecta token automáticamente
                const resProd = await api.get(`/products/`);
                setProducts(resProd.data);

                const resStores = await api.get(`/stores/`);
                setStores(resStores.data);

            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    const fetchAvailableImeis = async (productId) => {
        try {
            const url = `/products/${productId}/series?store_id=${sourceStoreId}&status=disponible`;
            console.log('🔵 Solicitando IMEIs:', url);
            const res = await api.get(url);
            console.log('✅ IMEIs recibidos del backend:', res.data);
            console.log('✅ Cantidad:', res.data.length);

            // Normalizar respuesta: si el backend devuelve strings, convertir a objetos
            // IMPORTANTE: NO asignar series_id falso, usar null y depender de serial_number
            let normalizedData = res.data;
            if (res.data.length > 0 && typeof res.data[0] === 'string') {
                console.log('⚠️ Backend devolvió strings, normalizando (sin series_id)...');
                normalizedData = res.data.map((serial) => ({
                    series_id: null,  // NO usar index+1, el backend buscará por serial_number
                    serial_number: serial,
                    status: 'disponible',
                    product_id: productId
                }));
            }

            // Filtrar IMEIs que ya han sido seleccionados en la lista temporal de items
            // Para evitar que el usuario seleccione el mismo iPhone en dos filas distintas
            const currentSelectedSerials = items.map(i => i.serial_number).filter(Boolean);
            
            const filteredData = normalizedData.filter(imei => !currentSelectedSerials.includes(imei.serial_number));

            console.log('✅ Datos normalizados y filtrados:', filteredData);
            setAvailableImeis(filteredData);
        } catch (err) {
            console.error('❌ Error al cargar IMEIs:', err);
            console.error('❌ Response:', err.response?.data);
            setMessage({ type: 'error', text: 'Error al cargar IMEIs disponibles' });
        }
    };

    const handleAddItem = async () => {
        if (!selectedProduct || quantity <= 0) return;

        const prodObj = products.find(p => p.product_id === selectedProduct);

        // Validar si producto NO serializable ya existe (para agrupar o bloquear)
        if (!prodObj.is_serializable && items.find(i => i.product_id === selectedProduct)) {
            alert("El producto ya está en la lista. Si deseas más cantidad, elimínalo y agrégalo con la nueva cantidad total.");
            return;
        }

        // Si es serializable, abrir modal para seleccionar IMEIs
        if (prodObj.is_serializable) {
            setCurrentProductForImei(prodObj);
            setSelectedImeis([]);
            await fetchAvailableImeis(selectedProduct);
            setImeiModalOpen(true);
        } else {
            // Validar stock para productos no serializables
            if (prodObj.stock < quantity) {
                 alert(`Stock insuficiente. Solo hay ${prodObj.stock} unidades.`);
                 return;
            }

            // Agregar normalmente
            setItems([...items, {
                product_id: selectedProduct,
                name: prodObj.name,
                quantity: parseInt(quantity),
                is_serializable: false,
                series_id: null,
                serial_number: null
            }]);
            setSelectedProduct("");
            setQuantity(1);
        }
    };

    const handleToggleImei = (serialNumber) => {
        if (selectedImeis.includes(serialNumber)) {
            setSelectedImeis(selectedImeis.filter(sn => sn !== serialNumber));
        } else {
            if (selectedImeis.length >= parseInt(quantity)) {
                alert(`Solo puedes seleccionar ${quantity} IMEI(s)`);
                return;
            }
            // Doble chequeo de seguridad
            if (items.some(i => i.serial_number === serialNumber)) {
                alert("Este IMEI ya está en la lista de transferencia.");
                return;
            }
            setSelectedImeis([...selectedImeis, serialNumber]);
        }
    };

    const handleBarcodeInput = (e) => {
        const scannedSerial = e.target.value.trim();
        if (!scannedSerial) return;

        // Buscar el IMEI por serial number
        const imei = availableImeis.find(i => i.serial_number === scannedSerial);

        if (imei) {
            if (!selectedImeis.includes(imei.serial_number)) {
                if (selectedImeis.length < parseInt(quantity)) {
                    setSelectedImeis([...selectedImeis, imei.serial_number]);
                    e.target.value = ''; // Limpiar campo
                } else {
                    alert(`Ya seleccionaste ${quantity} IMEI(s)`);
                    e.target.value = '';
                }
            } else {
                alert('Este IMEI ya está seleccionado');
                e.target.value = '';
            }
        } else {
            alert('IMEI no encontrado o no disponible');
            e.target.value = '';
        }
    };

    const handleConfirmImeis = () => {
        if (selectedImeis.length !== parseInt(quantity)) {
            alert(`Debes seleccionar exactamente ${quantity} IMEI(s)`);
            return;
        }

        // Agregar un ítem por cada IMEI seleccionado (selectedImeis ahora contiene serial_numbers)
        const newItems = selectedImeis.map(serialNumber => {
            const imei = availableImeis.find(i => i.serial_number === serialNumber);
            return {
                product_id: currentProductForImei.product_id,
                name: currentProductForImei.name,
                quantity: 1,
                is_serializable: true,
                series_id: imei?.series_id || null,
                serial_number: serialNumber
            };
        });

        setItems([...items, ...newItems]);
        setImeiModalOpen(false);
        setSelectedProduct("");
        setQuantity(1);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!targetStore || items.length === 0) {
            alert("Completa todos los campos");
            return;
        }

        setLoading(true);
        try {
            // api ya maneja el token y la URL base
            const payload = {
                source_store_id: sourceStoreId,
                target_store_id: targetStore,
                notes: notes,
                items: items
            };

            await api.post(`/transfers/`, payload);
            setMessage({ type: 'success', text: 'Solicitud creada correctamente' });
            setTimeout(() => navigate('/transfers'), 1500);
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.detail || 'Error al crear solicitud';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 2 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Nueva Solicitud de Transferencia
                </Typography>

                {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

                <Paper sx={{ p: 3, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Datos de la Transferencia</Typography>
                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            select
                            label="Tienda Destino"
                            value={targetStore}
                            onChange={(e) => setTargetStore(e.target.value)}
                            fullWidth
                        >
                            {stores.filter(s => s.store_id !== sourceStoreId).map(store => (
                                <MenuItem key={store.store_id} value={store.store_id}>{store.name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Observaciones"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </Paper>

                <Paper sx={{ p: 3, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Agregar Productos</Typography>
                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            select
                            label="Producto"
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            fullWidth
                        >
                            {products.map(p => (
                                <MenuItem key={p.product_id} value={p.product_id}>
                                    <Box display="flex" alignItems="center" gap={1} width="100%">
                                        <Chip
                                            label={p.is_serializable ? "IMEI" : "General"}
                                            size="small"
                                            color={p.is_serializable ? "warning" : "default"}
                                            sx={{ minWidth: 70 }}
                                        />
                                        <Typography variant="body2">
                                            {p.name} - Stock: {p.stock || 0}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            type="number"
                            label="Cantidad"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            InputProps={{ inputProps: { min: 1 } }}
                        />
                        <Button variant="contained" onClick={handleAddItem}>Agregar</Button>
                    </Box>

                    {items.length > 0 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell>Producto</TableCell>
                                        <TableCell>IMEI / Serie</TableCell>
                                        <TableCell align="center">Cant.</TableCell>
                                        <TableCell align="center">Acción</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.serial_number || '-'}</TableCell>
                                            <TableCell align="center">{item.quantity}</TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>

                <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button onClick={() => navigate('/transfers')}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creando...' : 'CREAR SOLICITUD'}
                    </Button>
                </Box>

                {/* MODAL DE SELECCIÓN DE IMEI */}
                <Dialog open={imeiModalOpen} onClose={() => setImeiModalOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        Seleccionar IMEI/Serie - {currentProductForImei?.name}
                    </DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Selecciona {quantity} IMEI(s) disponible(s) ({selectedImeis.length} seleccionado(s))
                        </Typography>

                        {/* Campo para lector de código de barras */}
                        <TextField
                            fullWidth
                            label="Escanear Código de Barras / IMEI"
                            placeholder="Presiona Enter después de escanear"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleBarcodeInput(e);
                                }
                            }}
                            sx={{ mb: 2, mt: 1 }}
                            helperText="Escanea el código de barras del producto o ingresa el IMEI manualmente"
                        />

                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                            O selecciona manualmente:
                        </Typography>

                        <List>
                            {availableImeis.length === 0 ? (
                                <Typography variant="body2" color="error">
                                    No hay IMEIs disponibles en tu tienda para este producto.
                                </Typography>
                            ) : (
                                availableImeis.map((imei) => (
                                    <ListItem
                                        key={imei.serial_number}
                                        dense
                                        sx={{
                                            border: '1px solid #ddd',
                                            mb: 1,
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                        onClick={() => handleToggleImei(imei.serial_number)}
                                    >
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={selectedImeis.includes(imei.serial_number)}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<strong>{imei.serial_number}</strong>}
                                            secondary={imei.status || 'disponible'}
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setImeiModalOpen(false)}>Cancelar</Button>
                        <Button variant="contained" onClick={handleConfirmImeis} disabled={selectedImeis.length !== parseInt(quantity)}>
                            Confirmar ({selectedImeis.length}/{quantity})
                        </Button>
                    </DialogActions>
                </Dialog>

            </Box>
        </Layout>
    );
}

export default TransferRequest;
