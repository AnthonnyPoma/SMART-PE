import React, { createContext, useState, useMemo, useContext } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// 1. Creamos el contexto (el "control remoto" global)
const ColorModeContext = createContext({ 
  toggleColorMode: () => {},
  mode: 'light' 
});

// Hook personalizado para usar el contexto fácil en otros archivos
export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState('light'); // Empezamos en modo claro

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode, // Exportamos el modo actual ('light' o 'dark')
    }),
    [mode],
  );

  // 2. Definimos los colores para cada modo
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // ☀️ MODO CLARO
                primary: { main: '#1976d2' },
                background: { default: '#f4f6f8', paper: '#ffffff' },
              }
            : {
                // 🌙 MODO OSCURO
                primary: { main: '#90caf9' }, // Azul más suave para no lastimar la vista
                background: { default: '#121212', paper: '#1e1e1e' },
                text: { primary: '#ffffff', secondary: '#b0bec5' }
              }),
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Esto resetea el CSS y aplica el color de fondo global */}
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};