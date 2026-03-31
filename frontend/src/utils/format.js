/**
 * Utilidades de formateo para SMART PE
 */

/**
 * Formatea un número como moneda peruana con separador de miles
 * formatCurrency(181030) => "S/ 181,030.00"
 * formatCurrency(0) => "S/ 0.00"
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formatea solo el número con separador de miles (sin "S/")
 * formatNumber(181030) => "181,030.00"
 */
export const formatNumber = (amount) => {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Normaliza un nombre a Title Case
 * toTitleCase("MARIA LOPEZ TEST") => "Maria Lopez Test"
 * toTitleCase("abel") => "Abel"
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
