import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, FormControlLabel, Checkbox, 
  MenuItem, Grid 
} from '@mui/material';
import api from '../api/axios';

function ProductModal({ open, handleClose, onProductSaved }) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    base_price: '',
    category_id: 1,
    is_serializable: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async () => {
    // Validamos que el SKU también esté presente
    if (!formData.name || !formData.base_price || !formData.sku) {
      alert("Por favor completa SKU, nombre y precio");
      return;
    }

    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        base_price: parseFloat(formData.base_price),
        category_id: parseInt(formData.category_id),
        is_serializable: formData.is_serializable
      };

      await api.post('/products/', payload);
      
      alert("¡Producto creado con éxito!");
      onProductSaved();
      handleClose();
      
      // Limpiamos el formulario
      setFormData({ 
        sku: '',
        name: '', 
        description: '', 
        base_price: '', 
        category_id: 1, 
        is_serializable: false 
      });

    } catch (error) {
      console.error("Error creando producto:", error);
      if (error.response && error.response.data) {
        // Mostrar detalle del error del backend
        alert(`Error: ${JSON.stringify(error.response.data.detail)}`);
      } else {
        alert("Error al guardar el producto");
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuevo Producto</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          
          {/* Campo SKU */}
          <Grid item xs={12}>
            <TextField 
              label="SKU / Código de Barras" 
              name="sku"
              fullWidth 
              placeholder="Ej: SONY-WH1000"
              value={formData.sku}
              onChange={handleChange}
              autoFocus // Pone el cursor aquí al abrir
            />
          </Grid>

          <Grid item xs={12}>
            <TextField 
              label="Nombre del Producto" 
              name="name"
              fullWidth 
              value={formData.name}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              label="Descripción" 
              name="description"
              fullWidth 
              multiline rows={2}
              value={formData.description}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField 
              label="Precio Base (S/)" 
              name="base_price"
              type="number"
              fullWidth 
              value={formData.base_price}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField 
              select 
              label="Categoría ID" 
              name="category_id"
              fullWidth
              value={formData.category_id}
              onChange={handleChange}
            >
              <MenuItem value={1}>Celulares (ID 1)</MenuItem>
              <MenuItem value={2}>Accesorios (ID 2)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={formData.is_serializable} 
                  onChange={handleChange} 
                  name="is_serializable" 
                  color="primary"
                />
              }
              label="¿Tiene número de serie (IMEI)?"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="error">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" color="success">
          Guardar Producto
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductModal;