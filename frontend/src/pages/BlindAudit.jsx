import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import api from '../api/axios';

function BlindAudit() {
  const [activeAudit, setActiveAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Scans es un array [{ product_id, sku, name, qty }] que se agrupa visualmente
  const [scannedItems, setScannedItems] = useState({});
  const [barcodeInput, setBarcodeInput] = useState('');
  
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState('');
  
  const [auditResult, setAuditResult] = useState(null);
  
  const inputRef = useRef(null);

  const fetchActiveAudit = async () => {
    try {
      const storeId = localStorage.getItem('store_id') || 1;
      const res = await api.get(`/audits/open?store_id=${storeId}`);
      setActiveAudit(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
         setActiveAudit(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAudit();
  }, []);

  // Mantener focus en el input
  useEffect(() => {
    if (activeAudit && !closeModalOpen && !auditResult) {
       inputRef.current?.focus();
    }
  }, [activeAudit, closeModalOpen, auditResult, scannedItems]);

  const handleStartAudit = async () => {
    try {
      const storeId = localStorage.getItem('store_id') || 1;
      const res = await api.post('/audits/start', { store_id: parseInt(storeId), notes: "Auditoria Ciega" });
      setActiveAudit(res.data);
      setScannedItems({}); // Reset
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleScan = async (e) => {
    if (e.key === 'Enter') {
      const code = barcodeInput.trim();
      if (!code) return;
      
      try {
        const storeId = localStorage.getItem('store_id') || 1;
        // Search product by sku
        // Here we can use the same products endpoint but filtered
        const res = await api.get(`/products/?store_id=${storeId}&search=${code}`);
        const product = res.data.find(p => p.sku === code || p.product_id.toString() === code);
        
        if (product) {
           handleCountItem(product);
        } else {
           alert("Código no reconocido: " + code);
        }
      } catch (err) {
         console.error(err);
      }
      setBarcodeInput('');
    }
  };

  const handleCountItem = (product) => {
      setScannedItems(prev => {
          const existingItem = prev[product.product_id];
          if (existingItem) {
              return {
                  ...prev,
                  [product.product_id]: {
                      ...existingItem,
                      qty: existingItem.qty + 1
                  }
              };
          } else {
              return {
                  ...prev,
                  [product.product_id]: {
                      product_id: product.product_id,
                      name: product.name,
                      sku: product.sku,
                      qty: 1
                  }
              };
          }
      });
  };

  const removeScan = (product_id) => {
      setScannedItems(prev => {
          const newItems = { ...prev };
          delete newItems[product_id];
          return newItems;
      });
  };

  const submitAudit = async () => {
     try {
       const itemsArray = Object.values(scannedItems).map(i => ({
          product_id: i.product_id,
          counted_quantity: i.qty
       }));
       
       const res = await api.post(`/audits/${activeAudit.audit_id}/close`, {
           items: itemsArray,
           supervisor_pin: supervisorPin
       });
       
       setAuditResult(res.data);
       setCloseModalOpen(false);
       setActiveAudit(null);
     } catch (err) {
       alert("Error: " + (err.response?.data?.detail || err.message));
     }
  };

  const handleDownloadPDF = async () => {
      try {
          const res = await api.get(`/audits/${auditResult.audit_id}/pdf`, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Auditoria_${auditResult.audit_id}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
      } catch (err) {
          alert('Error al descargar PDF');
      }
  };

  return (
    <Layout disablePadding>
      <Box sx={{ 
          display: 'flex', 
          height: 'calc(100vh - 64px)', 
          overflowY: 'auto', 
          bgcolor: 'background.default',
          '@media print': {
              height: 'auto !important',
              overflow: 'visible !important',
              display: 'block !important',
              bgcolor: 'white'
          }
      }}>
          
         {loading ? <CircularProgress sx={{ m: 'auto' }} /> : (
            <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto', p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column' }}>
                <Box 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    mb={3}
                    sx={{ '@media print': { display: 'none' } }}
                >
                    <Box>
                        <Typography variant="h4" fontWeight="bold">Inventario Ciego</Typography>
                        <Typography variant="body1" color="text.secondary">Toma física de existencias usando lector láser.</Typography>
                    </Box>
                    {activeAudit && !auditResult && (
                       <Button variant="contained" color="error" onClick={() => setCloseModalOpen(true)}>
                         Cerrar Conteo
                       </Button>
                    )}
                </Box>

                {!activeAudit && !auditResult && (
                   <Paper sx={{ p: 5, textAlign: 'center', mt: 4, borderRadius: 3, '@media print': { display: 'none' } }}>
                       <InventoryIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                       <Typography variant="h5" mb={1} fontWeight="bold">Listo para Iniciar Auditoría</Typography>
                       <Typography color="text.secondary" mb={4}>Al iniciar, el sistema congela el stock actual para comparar diferencias cuando termines de contar.</Typography>
                       <Button variant="contained" size="large" onClick={handleStartAudit}>
                           ABRIR NUEVA AUDITORÍA
                       </Button>
                   </Paper>
                )}

                {activeAudit && !auditResult && (
                    <Box sx={{ '@media print': { display: 'none' } }}>
                       <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                          <Typography variant="h6" fontWeight="bold">
                              <QrCodeScannerIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> 
                              Modo Pistola Activo
                          </Typography>
                          <TextField 
                             inputRef={inputRef}
                             fullWidth autoFocus
                             placeholder="Escanea el Código de Barras y presiona Enter..."
                             variant="outlined"
                             value={barcodeInput}
                             onChange={(e) => setBarcodeInput(e.target.value)}
                             onKeyDown={handleScan}
                             sx={{ mt: 2, bgcolor: 'background.paper', borderRadius: 1 }}
                          />
                       </Paper>

                       <TableContainer component={Paper} elevation={1}>
                          <Table size="small">
                             <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                   <TableCell><b>SKU</b></TableCell>
                                   <TableCell><b>Producto</b></TableCell>
                                   <TableCell align="center"><b>Cant. Contada</b></TableCell>
                                   <TableCell align="center"><b>Quitar</b></TableCell>
                                </TableRow>
                             </TableHead>
                             <TableBody>
                                {Object.values(scannedItems).map((item) => (
                                   <TableRow key={item.product_id}>
                                      <TableCell>{item.sku}</TableCell>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell align="center">
                                         <Typography variant="h6" fontWeight="bold" color="primary">{item.qty}</Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                          <IconButton color="error" size="small" onClick={() => removeScan(item.product_id)}>
                                             <DeleteIcon />
                                          </IconButton>
                                      </TableCell>
                                   </TableRow>
                                ))}
                                {Object.keys(scannedItems).length === 0 && (
                                   <TableRow><TableCell colSpan={4} align="center" sx={{p:4, color:'text.secondary'}}>Aún no hay códigos escaneados.</TableCell></TableRow>
                                )}
                             </TableBody>
                           </Table>
                       </TableContainer>
                    </Box>
                )}

                {auditResult && (
                   <Paper 
                      elevation={0}
                      sx={{ 
                         p: 4, 
                         borderRadius: { xs: 0, md: 3 }, 
                         borderTop: 6, 
                         borderColor: 'success.main',
                         bgcolor: 'background.paper',
                         boxShadow: { md: 2 } 
                      }}
                   >
                       {/* ENCABEZADO PARA IMPRESIÓN */}
                       <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                           <Box display="flex" alignItems="center" gap={2}>
                               <CheckCircleIcon color="success" sx={{ fontSize: 50, '@media print': { display: 'none' } }}/>
                               <Box>
                                   <Typography variant="h4" fontWeight="bold">Acta de Auditoría Físico Nº {auditResult.audit_id}</Typography>
                                   <Typography variant="subtitle1" color="text.secondary">Reporte consolidado de existencias, mermas y sobrantes.</Typography>
                               </Box>
                           </Box>
                           <Button 
                               variant="contained" 
                               startIcon={<PrintIcon />} 
                               onClick={handleDownloadPDF}
                               sx={{ '@media print': { display: 'none' } }}
                           >
                               Descargar PDF Original
                           </Button>
                       </Box>

                       <Box display="flex" flexWrap="wrap" gap={4} mb={4} p={3} bgcolor="grey.50" borderRadius={2} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
                           <Box>
                               <Typography variant="caption" color="text.secondary" fontWeight="bold">FECHA DE CIERRE</Typography>
                               <Typography variant="body1">{new Date(auditResult.end_date).toLocaleString()}</Typography>
                           </Box>
                           <Box>
                               <Typography variant="caption" color="text.secondary" fontWeight="bold">SEDE / ALMACÉN</Typography>
                               <Typography variant="body1">Tienda Principal (ID: {auditResult.store_id})</Typography>
                           </Box>
                           <Box>
                               <Typography variant="caption" color="text.secondary" fontWeight="bold">USUARIO RESPONSABLE</Typography>
                               <Typography variant="body1">UID: {auditResult.user_id}</Typography>
                           </Box>
                           <Box>
                               <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL ITEMS REVISADOS</Typography>
                               <Typography variant="body1">{auditResult.items.length} SKUs Distintos</Typography>
                           </Box>
                       </Box>

                       <TableContainer sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                          <Table>
                             <TableHead sx={{ bgcolor: 'grey.100' }}>
                                <TableRow>
                                   <TableCell><b>Producto</b></TableCell>
                                   <TableCell align="center"><b>Sistema Creía</b></TableCell>
                                   <TableCell align="center"><b>Tú Contaste</b></TableCell>
                                   <TableCell align="center"><b>Diferencia</b></TableCell>
                                </TableRow>
                             </TableHead>
                             <TableBody>
                                {auditResult.items.map((item) => (
                                   <TableRow key={item.product_id}>
                                      <TableCell>{item.product_name}</TableCell>
                                      <TableCell align="center">{item.expected_quantity}</TableCell>
                                      <TableCell align="center">{item.counted_quantity}</TableCell>
                                      <TableCell align="center">
                                         <Typography 
                                            fontWeight="bold" 
                                            color={item.difference === 0 ? 'success.main' : 'error.main'}
                                         >
                                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                                         </Typography>
                                      </TableCell>
                                   </TableRow>
                                ))}
                             </TableBody>
                           </Table>
                       </TableContainer>
                       
                       <Box mt={4} sx={{ display: 'none', '@media print': { display: 'block', mt: 8 } }}>
                           <Box display="flex" justifyContent="space-around">
                               <Box textAlign="center">
                                   <Typography>_________________________</Typography>
                                   <Typography variant="caption">Firma Responsable</Typography>
                               </Box>
                               <Box textAlign="center">
                                   <Typography>_________________________</Typography>
                                   <Typography variant="caption">Firma Supervisor</Typography>
                               </Box>
                           </Box>
                       </Box>

                       <Box textAlign="center" mt={4}>
                           <Button 
                               variant="contained" 
                               size="large"
                               onClick={() => setAuditResult(null)}
                               sx={{ '@media print': { display: 'none' } }}
                           >
                               Volver al Menú de Inventario
                           </Button>
                       </Box>
                   </Paper>
                )}
            </Box>
         )}

      </Box>

      {/* MODAL CERRAR */}
      <Dialog open={closeModalOpen} onClose={() => setCloseModalOpen(false)}>
         <DialogTitle>Cerrar Auditoría de Inventario</DialogTitle>
         <DialogContent>
             <Typography mb={2}>Estás por finalizar el escaneo. El sistema comparará tu conteo ({Object.keys(scannedItems).length} productos distintos) contra la base de datos real y generará un reporte inalterable.</Typography>
             <TextField 
                fullWidth label="PIN Autorización de Cierre" type="password"
                value={supervisorPin} onChange={(e)=>setSupervisorPin(e.target.value)}
             />
         </DialogContent>
         <DialogActions>
            <Button onClick={()=>setCloseModalOpen(false)}>Seguir Escaneando</Button>
            <Button variant="contained" color="error" onClick={submitAudit} disabled={supervisorPin.length < 4}>Cerrar y Ver Resultados</Button>
         </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default BlindAudit;
