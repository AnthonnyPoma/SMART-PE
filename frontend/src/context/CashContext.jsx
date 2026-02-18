import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CashContext = createContext();

export const useCash = () => useContext(CashContext);

export const CashProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [cashStatus, setCashStatus] = useState(null); // { has_open_register: bool, register: {...} }
    const [loading, setLoading] = useState(true);

    const checkCashStatus = async () => {
        if (!isAuthenticated) return;
        try {
            const response = await api.get('/cash/status');
            setCashStatus(response.data);
        } catch (error) {
            console.error("Error verificando caja:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            checkCashStatus();
        } else {
            setCashStatus(null);
        }
    }, [isAuthenticated]);

    const openCashRegister = async (amount) => {
        try {
            await api.post('/cash/open', {
                store_id: user.store_id, // Asumimos que user tiene store_id
                start_amount: parseFloat(amount)
            });
            await checkCashStatus();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.detail || "Error abriendo caja" };
        }
    };

    const closeCashRegister = async (realAmount, notes) => {
        try {
            const response = await api.post('/cash/close', {
                final_amount_real: parseFloat(realAmount),
                notes: notes
            });
            await checkCashStatus();
            return { success: true, data: response.data }; // Retornamos la respuesta del backend (CashRegister)
        } catch (error) {
            return { success: false, message: error.response?.data?.detail || "Error cerrando caja" };
        }
    };

    const registerMovement = async (type, amount, description) => {
        try {
            await api.post('/cash/movement', {
                type,
                amount: parseFloat(amount),
                description
            });
            await checkCashStatus(); // Actualizar balance
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.detail || "Error registrando movimiento" };
        }
    };

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('OPEN'); // 'OPEN' or 'CLOSE'

    const openCashModal = (mode = 'OPEN') => {
        setModalMode(mode);
        setModalOpen(true);
    };

    const closeCashModal = () => {
        setModalOpen(false);
    };

    return (
        <CashContext.Provider value={{
            cashStatus,
            loading,
            checkCashStatus,
            openCashRegister,
            closeCashRegister,
            registerMovement,
            // Modal State
            modalOpen,
            modalMode,
            openCashModal,
            closeCashModal,
            isCashOpen: cashStatus?.has_open_register // Helper
        }}>
            {children}
        </CashContext.Provider>
    );
};
