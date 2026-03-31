import React, { useState } from 'react';
import { Button, Tooltip, CircularProgress } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

/**
 * Botón profesional para exportar datos a Excel (.xlsx)
 * Genera reportes con:
 * - Encabezado de empresa (nombre, tienda, fecha)
 * - Título del reporte
 * - Datos con columnas configurables
 * - Fila de totales automáticos (opcional)
 * 
 * Props:
 * - data: Array de objetos con los datos a exportar
 * - columns: Array de { header, key, transform?, totalizable? }
 * - filename: Nombre del archivo
 * - sheetName: Nombre de la hoja
 * - reportTitle: Título que aparece en el encabezado del Excel
 * - disabled, variant, size, sx
 */
export default function ExportExcelButton({ 
  data = [], 
  fetchData = null,
  columns = [], 
  filename = 'exportacion', 
  sheetName = 'Datos',
  reportTitle = '',
  disabled = false,
  variant = 'outlined',
  size = 'small',
  sx = {}
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    let exportData = data;

    if (fetchData) {
      setIsExporting(true);
      try {
        exportData = await fetchData();
      } catch (error) {
        console.error("Error obteniendo datos para exportar:", error);
        alert("Error al descargar los datos para exportación.");
        setIsExporting(false);
        return;
      }
      setIsExporting(false);
    }

    if (!exportData || exportData.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const storeName = localStorage.getItem('store_name') || 'SMART PE';
    const timestamp = new Date().toISOString().slice(0, 10);
    const now = new Date().toLocaleString('es-PE');

    // --- 1. Construir filas de ENCABEZADO ---
    const headerRows = [
      [storeName.toUpperCase()],
      [reportTitle || `Reporte de ${sheetName}`],
      [`Fecha de exportación: ${now}`],
      [`Total de registros: ${exportData.length}`],
      [], // Fila vacía para separar
    ];

    // --- 2. Construir fila de COLUMNAS ---
    const colHeaders = columns.map(col => col.header);

    // --- 3. Construir filas de DATOS ---
    const rows = exportData.map(row => {
      return columns.map(col => {
        const value = col.transform 
          ? col.transform(row[col.key], row) 
          : row[col.key];
        return value ?? '';
      });
    });

    // --- 4. Fila de TOTALES (si alguna columna es totalizable) ---
    const hasTotals = columns.some(col => col.totalizable);
    let totalRow = [];
    if (hasTotals) {
      totalRow = columns.map((col, idx) => {
        if (idx === 0) return 'TOTALES';
        if (col.totalizable) {
          const sum = exportData.reduce((acc, row) => {
            const val = Number(row[col.key]) || 0;
            return acc + val;
          }, 0);
          return sum.toFixed(2);
        }
        return '';
      });
    }

    // --- 5. Ensamblar todo ---
    const allRows = [
      ...headerRows,
      colHeaders,
      ...rows,
    ];
    if (hasTotals) {
      allRows.push([]); // Fila vacía
      allRows.push(totalRow);
    }

    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    
    // Auto-ajustar ancho de columnas
    const colWidths = columns.map((col, idx) => {
      const headerLen = col.header.length;
      const maxDataLen = rows.slice(0, 100).reduce((max, r) => {
        return Math.max(max, String(r[idx] || '').length);
      }, 0);
      return { wch: Math.max(headerLen, maxDataLen) + 3 };
    });
    ws['!cols'] = colWidths;

    // Merge encabezado (título de empresa ocupa todas las columnas)
    const mergeRange = columns.length - 1;
    if (mergeRange > 0) {
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: mergeRange } }, // Nombre empresa
        { s: { r: 1, c: 0 }, e: { r: 1, c: mergeRange } }, // Título reporte
        { s: { r: 2, c: 0 }, e: { r: 2, c: mergeRange } }, // Fecha
        { s: { r: 3, c: 0 }, e: { r: 3, c: mergeRange } }, // Total registros
      ];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
  };

  return (
    <Tooltip title={(!fetchData && data.length === 0) ? 'No hay datos' : (isExporting ? 'Descargando datos completos...' : 'Exportar a Excel')}>
      <span>
        <Button
          variant={variant}
          color="success"
          size={size}
          startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
          onClick={handleExport}
          disabled={disabled || isExporting || (!fetchData && data.length === 0)}
          sx={{ fontWeight: 'bold', ...sx }}
        >
          {isExporting ? 'Procesando' : 'Excel'}
        </Button>
      </span>
    </Tooltip>
  );
}
