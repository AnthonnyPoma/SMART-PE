import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const parseJwt = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        setUser(null);
        setIsAuthenticated(false);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = parseJwt(token);
            if (decoded) {
                // Verificar expiración si fuera necesario
                setUser(decoded);
                setIsAuthenticated(true);
            } else {
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        const decoded = parseJwt(token);
        localStorage.setItem('role', decoded.role);
        localStorage.setItem('username', decoded.sub);
        localStorage.setItem('store_id', decoded.store_id); // ✅ Persistir ID Tienda
        // Si el token trajera el nombre, sería ideal. Si no, lo buscaremos luego.
        if (decoded.store_name) {
            localStorage.setItem('store_name', decoded.store_name);
        }
        if (decoded.full_name) {
             localStorage.setItem('full_name', decoded.full_name);
        }
        setUser(decoded);
        setIsAuthenticated(true);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
