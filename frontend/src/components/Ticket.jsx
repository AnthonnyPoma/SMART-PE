import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

const Ticket = ({ saleData }) => {
  
  // Si no hay datos, mostramos un placeholder para que el div siempre tenga contenido
  if (!saleData) {
    return <div style={{ padding: 10 }}>Preparando ticket...</div>;
  }

  return (
    <div style={{ 
      width: '80mm', 
      padding: '10px', 
      backgroundColor: 'white', 
      color: 'black', 
      fontFamily: 'monospace',
      fontSize: '12px' 
    }}>
      
      {/* CABECERA */}
      <Box textAlign="center" mb={2}>
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>
          SMART PE
        </Typography>
        <Typography variant="caption" display="block">RUC: 20123456789</Typography>
        <Typography variant="caption" display="block">Av. Larco 123, Miraflores</Typography>
        <Typography variant="caption" display="block">Telf: (01) 444-5555</Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: 'black', my: 1 }} />

      {/* DATOS VENTA */}
      <Box mb={1}>
        <Typography variant="caption" display="block"><b>Ticket:</b> #{saleData.sale_id}</Typography>
        <Typography variant="caption" display="block"><b>Fecha:</b> {new Date(saleData.date_created).toLocaleString()}</Typography>
        <Typography variant="caption" display="block"><b>Cliente:</b> {saleData.client_dni || "Público General"}</Typography>
        <Typography variant="caption" display="block"><b>Cajero:</b> {saleData.user_name || "Admin"}</Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: 'black', my: 1 }} />

      {/* PRODUCTOS */}
      <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ borderBottom: '1px dashed black', paddingBottom: '4px' }}>Cant.</th>
            <th style={{ borderBottom: '1px dashed black', paddingBottom: '4px' }}>Prod.</th>
            <th style={{ textAlign: 'right', borderBottom: '1px dashed black', paddingBottom: '4px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {saleData.details.map((item, index) => (
            <tr key={index}>
              <td style={{ paddingTop: '4px', verticalAlign: 'top' }}>{item.quantity}</td>
              <td style={{ paddingTop: '4px', verticalAlign: 'top' }}>
                {item.product_name}
                {item.serial_number && (
                  <div style={{ fontSize: '9px', fontStyle: 'italic' }}>SN: {item.serial_number}</div>
                )}
              </td>
              <td style={{ paddingTop: '4px', textAlign: 'right', verticalAlign: 'top' }}>
                {item.subtotal.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Divider sx={{ borderStyle: 'dashed', borderColor: 'black', my: 1 }} />

      {/* TOTALES */}
      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" fontWeight="bold">TOTAL:</Typography>
        <Typography variant="body1" fontWeight="bold">S/ {saleData.total_amount.toFixed(2)}</Typography>
      </Box>
      <Box mt={1}>
         <Box display="flex" justifyContent="space-between">
            <Typography variant="caption">Op. Gravada:</Typography>
            <Typography variant="caption">S/ {(saleData.total_amount / 1.18).toFixed(2)}</Typography>
         </Box>
         <Box display="flex" justifyContent="space-between">
            <Typography variant="caption">I.G.V. (18%):</Typography>
            <Typography variant="caption">S/ {(saleData.total_amount - (saleData.total_amount / 1.18)).toFixed(2)}</Typography>
         </Box>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: 'black', my: 2 }} />

      {/* PIE */}
      <Box textAlign="center">
        <Typography variant="caption" display="block">¡Gracias por su compra!</Typography>
        <Typography variant="caption" display="block">No se aceptan devoluciones</Typography>
        <br />
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Sistema: SMART PE v1.0</Typography>
      </Box>
    </div>
  );
};

export default Ticket;