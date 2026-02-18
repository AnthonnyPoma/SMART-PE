import React, { useState, useEffect } from "react";
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  useTheme,
  Avatar
} from "@mui/material";
import Layout from "../components/Layout";
import axios from "axios";

const API_URL = "http://localhost:8000";

function Products() {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // --- ESTADOS DE FORMULARIOS ---
  const [newCategory, setNewCategory] = useState("");
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    description: "",
    base_price: "",
    min_stock: 5,
    category_id: "",
    image_url: "",
    is_serializable: false,
  });

  // Cargar datos al iniciar
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const [catRes, prodRes] = await Promise.all([
        axios.get(`${API_URL}/categories/`, config),
        axios.get(`${API_URL}/products/`, config),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error("Error cargando datos:", error);
      if (error.response?.status === 401) {
          alert("Sesión expirada. Por favor inicie sesión nuevamente.");
      }
    }
  };

  // --- LOGICA: CREAR CATEGORÍA ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/categories/`, { name: newCategory }, config);
      setNewCategory("");
      fetchData();
      alert("Categoría creada ✅");
    } catch (error) {
      alert("Error creando categoría");
    }
  };

  // --- LOGICA: CREAR PRODUCTO ---
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        ...newProduct,
        base_price: parseFloat(newProduct.base_price),
        min_stock: parseInt(newProduct.min_stock),
        category_id: parseInt(newProduct.category_id),
      };

      await axios.post(`${API_URL}/products/`, payload, config);

      setNewProduct({
        sku: "", name: "", description: "", base_price: "",
        min_stock: 5, category_id: "", image_url: "", is_serializable: false
      });
      fetchData();
      alert("Producto creado 📦");
    } catch (error) {
      console.error(error);
      alert("Error: " + (error.response?.data?.detail || "Verifica los datos"));
    }
  };

  return (
    <Layout>
      <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
        📦 Centro de Inventario
      </Typography>

      <Grid container spacing={3}>
        
        {/* === COLUMNA IZQUIERDA: FORMULARIOS === */}
        <Grid item xs={12} md={4}>
          
          {/* 1. CREAR CATEGORÍA */}
          <Card sx={{ mb: 3 }} elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>1. Nueva Categoría</Typography>
              <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '10px' }}>
                <TextField 
                  label="Nombre Categoría" 
                  variant="outlined" 
                  size="small" 
                  fullWidth
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button type="submit" variant="contained" color="secondary">+</Button>
              </form>
            </CardContent>
          </Card>

          {/* 2. CREAR PRODUCTO */}
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>2. Nuevo Producto</Typography>
              <form onSubmit={handleCreateProduct}>
                
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={newProduct.category_id}
                    label="Categoría"
                    onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                    required
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField 
                      label="SKU / Código" size="small" fullWidth required sx={{ mb: 2 }}
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField 
                      label="Nombre" size="small" fullWidth required sx={{ mb: 2 }}
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </Grid>
                </Grid>

                <TextField 
                  label="Descripción" size="small" fullWidth multiline rows={2} sx={{ mb: 2 }}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField 
                      label="Precio Base (S/)" type="number" size="small" fullWidth required sx={{ mb: 2 }}
                      value={newProduct.base_price}
                      onChange={(e) => setNewProduct({...newProduct, base_price: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField 
                      label="URL Imagen" size="small" fullWidth sx={{ mb: 2 }}
                      value={newProduct.image_url}
                      onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                    />
                  </Grid>
                </Grid>

                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={newProduct.is_serializable}
                      onChange={(e) => setNewProduct({...newProduct, is_serializable: e.target.checked})}
                    />
                  }
                  label="¿Usa Series/IMEI? (Celulares)"
                />

                <Button type="submit" variant="contained" color="success" fullWidth sx={{ mt: 2 }}>
                  Guardar Producto
                </Button>

              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* === COLUMNA DERECHA: TABLA === */}
        <Grid item xs={12} md={8}>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#eee' }}>
                <TableRow>
                  <TableCell><b>Img</b></TableCell>
                  <TableCell><b>SKU</b></TableCell>
                  <TableCell><b>Producto</b></TableCell>
                  <TableCell><b>Categoría</b></TableCell>
                  <TableCell><b>Precio</b></TableCell>
                  <TableCell><b>Stock</b></TableCell>
                  <TableCell><b>Tipo</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">Sin productos</TableCell></TableRow>
                ) : (
                  products.map((prod) => (
                    <TableRow key={prod.product_id} hover>
                      <TableCell>
                        <Avatar 
                          variant="rounded" 
                          src={prod.image_url}
                          alt={prod.name}
                          sx={{ width: 40, height: 40 }}
                        >
                          {/* Fallback si no hay imagen: Primera letra del nombre */}
                          {prod.name.charAt(0)}
                        </Avatar>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{prod.sku}</TableCell>
                      <TableCell>{prod.name}</TableCell>
                      <TableCell>
                        {categories.find(c => c.category_id === prod.category_id)?.name || "—"}
                      </TableCell>
                      
                      {/* 👇 AQUÍ ESTÁ LA CORRECCIÓN CLAVE 👇 */}
                      <TableCell>S/ {Number(prod.base_price).toFixed(2)}</TableCell>

                      <TableCell>
                        <Chip 
                          label={prod.stock} 
                          color={prod.stock > 0 ? "primary" : "error"} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                         {prod.is_serializable ? (
                           <Chip label="IMEI" color="warning" size="small" variant="outlined"/>
                         ) : (
                           <Chip label="General" size="small" variant="outlined"/>
                         )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Layout>
  );
}

export default Products;