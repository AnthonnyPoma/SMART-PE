import { useState } from 'react';
import { Container, Card, CardContent, Typography, TextField, Button, Box } from '@mui/material';
import logo from '../assets/logo_claro.png';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const response = await api.post('/auth/login', formData);
      const token = response.data.access_token;

      // Usar AuthContext para login global
      login(token); 
      
      // Decodificar para redirección (extraemos lógica de contexto temporalmente o reusamos parseJwt local)
      const decoded = parseJwt(token); 
      
      // 3. Redirigir según el rol
      if (decoded.role === 'cajero' || decoded.role === 'vendedor') {
          navigate('/pos'); 
      } else {
          navigate('/dashboard');
      }

    } catch (error) {
      console.error("Error de login:", error);
      if (error.response && error.response.status === 401) {
        alert("❌ Error: Usuario, contraseña incorrectos o cuenta bloqueada.");
      } else {
        alert("⚠️ Error de conexión con el servidor");
      }
    }
  };

 return (
    <Container maxWidth="xs" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card elevation={10} style={{ padding: '20px', borderRadius: '15px' }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" marginBottom={3}>
            
            {/* 2. AQUÍ PONEMOS EL LOGO 👇 */}
            <img 
              src={logo} 
              alt="Logo Smart PE" 
              style={{ width: '200px', marginBottom: '15px' }} 
            />
            
            <Typography variant="body2" color="textSecondary">
              Inicia sesión para continuar
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
             {/* ... (Los campos de texto y el botón se quedan IGUAL) ... */}
            <TextField
              label="Usuario"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              label="Contraseña"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              size="large"
              style={{ marginTop: '20px', fontWeight: 'bold' }}
            >
              INGRESAR
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Login;