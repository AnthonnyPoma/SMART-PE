import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api/axios';

function PurchaseOrderCreate() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');

  // Items to add
  const [items, setItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppRes, prodRes] = await Promise.all([
          api.get('/suppliers/'),
          api.get('/products/')
        ]);
        setSuppliers(suppRes.data);
        setProducts(prodRes.data);
      } catch (error) {
        console.error("Error fetching suppliers or products:", error);
        alert("Hubo un error cargando datos base.");
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    if (!selectedProductId || quantity <= 0 || unitCost <= 0) {
      alert("Por favor seleccione un producto e ingrese cantidad y costo unitario válidos.");
      return;
    }

    const prod = products.find(p => p.product_id === selectedProductId);
    
    // Check if already in list
    const existingIndex = items.findIndex(i => i.product_id === selectedProductId);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += parseInt(quantity);
      newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].unit_cost;
      setItems(newItems);
    } else {
      setItems([...items, {
        product_id: prod.product_id,
        name: prod.name,
        quantity: parseInt(quantity),
        unit_cost: parseFloat(unitCost),
        subtotal: parseInt(quantity) * parseFloat(unitCost)
      }]);
    }

    // Reset fields
    setSelectedProductId('');
    setQuantity(1);
    setUnitCost('');
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((acc, current) => acc + current.subtotal, 0);
  };

  const handleSaveOC = async () => {
    if (!supplierId) {
      alert("Debe seleccionar un proveedor.");
      return;
    }
    if (items.length === 0) {
      alert("Debe agregar al menos un producto a la orden.");
      return;
    }

    const payload = {
      supplier_id: supplierId,
      expected_date: expectedDate ? new Date(expectedDate).toISOString() : null,
      notes: notes,
      items: items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost
      }))
    };

    try {
      const res = await api.post('/purchases/orders', payload);
      alert(`Orden de Compra OC-${res.data.po_id} generada con éxito.`);
      navigate('/purchase-orders');
    } catch (error) {
      console.error("Error al crear la orden de compra:", error);
      alert(error.response?.data?.detail || "Hubo un error al generar la orden.");
    }
  };

  const handleProductSelect = (e) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    
    const prod = products.find(p => p.product_id === pId);
    if (prod) {
      setUnitCost(prod.cost || '');
    }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/purchase-orders')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Crear Nueva Orden de Compra</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Cabecera de OC */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Datos de la Orden</Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              select
              label="Proveedor *"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              fullWidth
              variant="outlined"
              margin="normal"
            >
              <MenuItem value=""><em>Seleccione un proveedor</em></MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s.supplier_id} value={s.supplier_id}>
                  {s.name} ({s.ruc || 'Sin RUC'})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Fecha Esperada de Entrega"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              fullWidth
              variant="outlined"
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notas e Instrucciones"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              margin="normal"
              placeholder="Ej. Entregar en puerta trasera, horario de 9 a 5."
            />
          </Paper>
        </Grid>

        {/* Detalle de Productos */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Detalle de Productos</Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} sm={5}>
                <TextField
                  select
                  label="Producto *"
                  value={selectedProductId}
                  onChange={handleProductSelect}
                  fullWidth
                  size="small"
                >
                  <MenuItem value=""><em>Seleccione...</em></MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.product_id} value={p.product_id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Cantidad *"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  fullWidth
                  size="small"
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Costo Unit. (S/) *"
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  fullWidth
                  size="small"
                  inputProps={{ step: "0.01", min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={handleAddItem}
                  fullWidth
                  sx={{ height: '40px' }}
                >
                  Agregar
                </Button>
              </Grid>
            </Grid>

            {/* Tabla de Items Agregados */}
            <TableContainer component={Box} sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Costo U.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No hay productos agregados.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">S/ {item.unit_cost.toFixed(2)}</TableCell>
                        <TableCell align="right">S/ {item.subtotal.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <IconButton color="error" size="small" onClick={() => handleRemoveItem(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                TOTAL: S/ {calculateTotal().toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
               <Button 
                  variant="text" 
                  color="inherit" 
                  onClick={() => navigate('/purchase-orders')}
                >
                  Cancelar
                </Button>
               <Button 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveOC}
                >
                  Guardar Orden de Compra
                </Button>
            </Box>

          </Paper>
        </Grid>

      </Grid>
    </Layout>
  );
}

export default PurchaseOrderCreate;
