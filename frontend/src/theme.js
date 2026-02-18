import { createTheme } from "@mui/material/styles";

export const themeSettings = (mode) => {
  return createTheme({
    palette: {
      mode: mode,
      ...(mode === "dark"
        ? {
            // --- MODO OSCURO (CLEAN / NEUTRO) ---
            primary: {
              main: "#90caf9", // Azul claro suave
            },
            secondary: {
              main: "#f48fb1", // Rosa suave
            },
            background: {
              default: "#121212", // Negro estándar elegante
              paper: "#1e1e1e",   // Gris oscuro para tarjetas
            },
            text: {
              primary: "#ffffff",
              secondary: "#b0bec5",
            },
          }
        : {
            // --- MODO CLARO (CLÁSICO) ---
            primary: {
              main: "#1976d2", // Azul corporativo
            },
            secondary: {
              main: "#dc004e",
            },
            background: {
              default: "#f4f6f8", // Gris muy pálido (mejor que blanco puro para la vista)
              paper: "#ffffff",
            },
            text: {
              primary: "#1c2025",
              secondary: "#616161",
            },
          }),
    },
    typography: {
      fontFamily: "Roboto, Helvetica, Arial, sans-serif", // Fuente estándar limpia
      h1: { fontWeight: 700 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
    },
    // Componentes globales (Botones redondeados, etc)
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8, // Botones más modernos
            textTransform: 'none', // Quitar mayúsculas forzadas
            fontWeight: 'bold',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Quitar degradados raros en modo oscuro
          },
        },
      },
    },
  });
};