import React, { useState, useEffect } from "react";
import { formatCurrency } from '../utils/format';
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
  Avatar,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Category as CategoryIcon } from "@mui/icons-material";
import Layout from "../components/Layout";
import ExportExcelButton from '../components/ExportExcelButton';
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Products() {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // --- ESTADOS DE FORMULARIOS ---
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState("");
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

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const handleOpenCreateProduct = () => {
    setEditingProductId(null);
    setNewProduct({ sku: "", name: "", description: "", base_price: "", min_stock: 5, category_id: "", image_url: "", is_serializable: false });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProductId(prod.product_id);
    setNewProduct({
      sku: prod.sku || "", name: prod.name || "", description: prod.description || "",
      base_price: prod.base_price || "", min_stock: prod.min_stock || 5,
      category_id: prod.category_id || "", image_url: prod.image_url || "",
      is_serializable: prod.is_serializable || false
    });
    setIsProductModalOpen(true);
  };

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const [catRes, prodRes] = await Promise.all([
        axios.get(`${API_URL}/categories/`, config),
        axios.get(`${API_URL}/products/?store_id=${localStorage.getItem('store_id') || ''}`, config),
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

  // Cargar datos al iniciar
  useEffect(() => {
    fetchData();
  }, []);

  // --- LOGICA: CREAR CATEGORÍA ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { 
        name: newCategoryName,
        parent_id: newCategoryParent ? parseInt(newCategoryParent) : null
      };
      await axios.post(`${API_URL}/categories/`, payload, config);
      setNewCategoryName("");
      setNewCategoryParent("");
      fetchData();
      alert("Categoría creada ✅");
    } catch (error) {
      console.error(error);
      alert("Error creando categoría");
    }
  };

  // --- LOGICA: GUARDAR PRODUCTO (CREAR / EDITAR) ---
  const handleSaveProduct = async (e) => {
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

      if (editingProductId) {
        await axios.put(`${API_URL}/products/${editingProductId}`, payload, config);
        alert("Producto actualizado ✏️");
      } else {
        await axios.post(`${API_URL}/products/`, payload, config);
        alert("Producto creado 📦");
      }

      setIsProductModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Error: " + (error.response?.data?.detail || "Verifica los datos"));
    }
  };

  // Helper para construir el nombre completo jerárquico
  const getCategoryFullName = (catId) => {
    const cat = categories.find(c => c.category_id === catId);
    if (!cat) return "";
    if (!cat.parent_id) return cat.name;
    const parentName = getCategoryFullName(cat.parent_id);
    return parentName ? `${parentName} > ${cat.name}` : cat.name;
  };

  const sortedCategories = [...categories].sort((a, b) => 
    getCategoryFullName(a.category_id).localeCompare(getCategoryFullName(b.category_id))
  );

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
          📦 Centro de Inventario
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" color="primary" startIcon={<CategoryIcon />} onClick={() => setIsCategoryModalOpen(true)}>
            + Categoría
          </Button>
          <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={handleOpenCreateProduct}>
            Producto
          </Button>
          <ExportExcelButton
            data={products}
            filename="inventario"
            sheetName="Productos"
            columns={[
              { header: 'SKU', key: 'sku' },
              { header: 'Producto', key: 'name' },
              { header: 'Categoría', key: 'category', transform: (v) => v?.name || '-' },
              { header: 'Precio Base', key: 'base_price', transform: (v) => Number(v).toFixed(2) },
              { header: 'Costo', key: 'average_cost', transform: (v) => Number(v || 0).toFixed(2) },
              { header: 'Margen (%)', key: 'margin', transform: (v, row) => (row.base_price && row.average_cost && row.base_price > 0) ? (((row.base_price - row.average_cost) / row.base_price) * 100).toFixed(1) + '%' : '-' },
              { header: 'Stock', key: 'stock' },
              { header: 'Stock Mín.', key: 'min_stock' },
              { header: 'Serializable', key: 'is_serializable', transform: (v) => v ? 'Sí' : 'No' },
            ]}
          />
        </Box>
      </Box>

      <Box sx={{ mt: 2, width: '100%' }}>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#eee' }}>
                <TableRow>
                  <TableCell><b>Producto</b></TableCell>
                  <TableCell><b>Categoría</b></TableCell>
                  <TableCell><b>Precio</b></TableCell>
                  <TableCell><b>Margen %</b></TableCell>
                  <TableCell align="center"><b>Stock</b></TableCell>
                  <TableCell align="center"><b>Tipo</b></TableCell>
                  <TableCell align="center"><b>Acciones</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">Sin productos</TableCell></TableRow>
                ) : (
                  products.map((prod) => (
                    <TableRow key={prod.product_id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            variant="rounded" 
                            src={prod.image_url}
                            alt={prod.name}
                            sx={{ width: 45, height: 45 }}
                          >
                            {prod.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              {prod.sku}
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                              {prod.name}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getCategoryFullName(prod.category_id) || "—"}
                      </TableCell>
                      
                      <TableCell>{formatCurrency(prod.base_price)}</TableCell>

                      <TableCell>
                        <Typography variant="body2" color={
                          (prod.base_price && prod.average_cost) ? 
                          ((prod.base_price - prod.average_cost)/prod.base_price * 100 >= 20 ? 'success.main' : 'warning.main') 
                          : 'text.secondary'
                        } fontWeight="bold">
                          {(prod.base_price && prod.average_cost && prod.base_price > 0) 
                            ? `${(((prod.base_price - prod.average_cost) / prod.base_price) * 100).toFixed(1)}%` 
                            : 'N/A'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Chip 
                          label={prod.stock} 
                          color={prod.stock > 0 ? "primary" : "error"} 
                          size="small" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                         {prod.is_serializable ? (
                           <Chip label="IMEI" color="warning" size="small" variant="outlined"/>
                         ) : (
                           <Chip label="General" size="small" variant="outlined"/>
                         )}
                      </TableCell>
                      <TableCell align="center">
                         <IconButton color="primary" size="small" onClick={() => handleOpenEditProduct(prod)}>
                            <EditIcon fontSize="small"/>
                         </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
      </Box>

      {/* --- MODAL DE PRODUCTO --- */}
      <Dialog open={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProductId ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        <DialogContent dividers>
          <form id="productForm" onSubmit={handleSaveProduct}>
            <FormControl fullWidth size="small" sx={{ mb: 2, mt: 1 }}>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={newProduct.category_id}
                label="Categoría"
                onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                required
              >
                {sortedCategories.map((cat) => (
                  <MenuItem key={cat.category_id} value={cat.category_id}>{getCategoryFullName(cat.category_id)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="SKU / Código" size="small" fullWidth required sx={{ mb: 2 }} value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Nombre" size="small" fullWidth required sx={{ mb: 2 }} value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
              </Grid>
            </Grid>
            <TextField label="Descripción" size="small" fullWidth multiline rows={2} sx={{ mb: 2 }} value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Precio Base (S/)" type="number" size="small" fullWidth required sx={{ mb: 2 }} value={newProduct.base_price} onChange={(e) => setNewProduct({...newProduct, base_price: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="URL Imagen" size="small" fullWidth sx={{ mb: 2 }} value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} />
              </Grid>
            </Grid>
            <FormControlLabel control={<Checkbox checked={newProduct.is_serializable} onChange={(e) => setNewProduct({...newProduct, is_serializable: e.target.checked})} />} label="¿Usa Series/IMEI? (Celulares)" />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
          <Button type="submit" form="productForm" variant="contained" color="success">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* --- MODAL DE CATEGORÍA --- */}
      <Dialog open={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nueva Categoría o Subcategoría</DialogTitle>
        <DialogContent dividers>
          <form id="categoryForm" onSubmit={(e) => { handleCreateCategory(e); setIsCategoryModalOpen(false); }}>
             <TextField autoFocus label="Nombre" variant="outlined" size="small" fullWidth value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} sx={{ mt: 1, mb: 2 }} required />
             <FormControl fullWidth size="small">
                <InputLabel>Categoría Padre (Opcional)</InputLabel>
                <Select
                  value={newCategoryParent}
                  label="Categoría Padre (Opcional)"
                  onChange={(e) => setNewCategoryParent(e.target.value)}
                >
                  <MenuItem value=""><em>-- Ninguna (Es Familia Raíz) --</em></MenuItem>
                  {sortedCategories.map((cat) => (
                    <MenuItem key={cat.category_id} value={cat.category_id}>{getCategoryFullName(cat.category_id)}</MenuItem>
                  ))}
                </Select>
             </FormControl>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
          <Button type="submit" form="categoryForm" variant="contained" color="success">Guardar</Button>
        </DialogActions>
      </Dialog>

    </Layout>
  );
}

export default Products;