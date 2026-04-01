import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingCart, Check, ArrowLeft, User, MapPin, CreditCard, ShieldCheck, ChevronRight, Package, Loader2 } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { submitCheckout } from "../api";
import { ProductImageMock } from "../components/Layout";

const FormField = ({ label, k, type = "text", placeholder = "", half = false, form, set, errors, setErrors }) => {
  const handleChange = (e) => {
    let val = e.target.value;
    // Si es DNI o Teléfono, limpiar todo lo que no sea número
    if (k === "dni" || k === "telefono") {
      val = val.replace(/\D/g, "");
    }
    set(k, val);
    setErrors(er => ({ ...er, [k]: "" }));
  };

  return (
    <div style={{ flex: half ? "0 0 calc(50% - 10px)" : "1 1 100%" }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", display: "block", marginBottom: 8 }}>{label}</label>
      <input 
        type={type} 
        value={form[k]} 
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={(k === "dni") ? 11 : (k === "telefono" ? 9 : 150)}
        style={{ width: "100%", borderColor: errors[k] ? "#EF4444" : "#CBD5E1", background: '#FFFFFF' }} 
      />
      {errors[k] && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6, fontWeight: 600 }}>{errors[k]}</p>}
    </div>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCartStore();
  const total = cart.reduce((acc, item) => acc + (parseFloat(item.base_price) * item.quantity), 0);
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);

  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "", dni: "", direccion: "", distrito: "", departamento: "Lima", referencias: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.apellido.trim()) e.apellido = "Requerido";
    if (!form.email.includes("@")) e.email = "Email inválido";
    
    if (form.telefono.length !== 9) {
      e.telefono = "Debe tener 9 dígitos";
    }
    
    if (form.dni.length !== 8 && form.dni.length !== 11) {
      e.dni = "DNI (8) o RUC (11) dígitos";
    }
    
    if (!form.direccion.trim()) e.direccion = "Requerido";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    
    setLoading(true);
    try {
      const orderPayload = {
        customer_name: `${form.nombre} ${form.apellido}`,
        customer_email: form.email,
        customer_phone: form.telefono,
        customer_document: form.dni,
        shipping_address: `${form.direccion}, ${form.distrito}, ${form.departamento}`,
        total_amount: total,
        items: cart.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: parseFloat(i.base_price)
        }))
      };

      const resp = await submitCheckout(orderPayload);
      setOrderNumber(`WEB-${resp.web_order_id}`);
      setSubmitted(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Hubo un error de conexión al emitir tu pedido. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !submitted) return (
    <div style={{ maxWidth: 640, margin: "100px auto", padding: 48, textAlign: "center", background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', borderRadius: 6 }}>
      <Package size={56} strokeWidth={1.5} color="#CBD5E1" style={{ margin: "0 auto" }} />
      <h2 style={{ fontWeight: 800, fontSize: 20, color: "#0F172A", marginTop: 24, letterSpacing: '-0.3px' }}>Tu carrito está vacío</h2>
      <p style={{ color: "#64748B", marginTop: 12, fontSize: 14 }}>Aún no has agregado productos a tu carrito. ¡Explora nuestro catálogo y descubre ofertas increíbles!</p>
      <button className="btn-primary" style={{ marginTop: 32, padding: "12px 32px", fontSize: 14 }} onClick={() => navigate("/catalog")}>Descubrir Ofertas</button>
    </div>
  );

  if (submitted) return (
    <div style={{ maxWidth: 640, margin: "100px auto", padding: 48, background: 'white', borderRadius: 6, border: '1px solid #E2E8F0', textAlign: "center", boxShadow: '0 10px 40px rgba(15, 23, 42, 0.05)' }} className="fade-in">
      <div style={{ width: 64, height: 64, background: "#F8FAFC", border: '1px solid #CBD5E1', borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
        <Check size={32} color="#1E3A8A" strokeWidth={2.5} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", marginBottom: 16, letterSpacing: '-0.5px' }}>¡Gracias por tu compra!</h1>
      <p style={{ color: "#475569", fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>Tu pedido ha sido registrado con éxito. Te hemos enviado un correo con todos los detalles y los pasos para la entrega.</p>
      <div style={{ background: "#F8FAFC", borderRadius: 6, border: '1px solid #E2E8F0', padding: 24, marginBottom: 32, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Número de Pedido</span>
          <span style={{ fontWeight: 700, color: "#1E3A8A", fontSize: 15 }}>{orderNumber}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Total Pagado</span>
          <span style={{ fontWeight: 800, color: "#0F172A", fontSize: 18 }}>S/ {total.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Método de Pago</span>
          <span style={{ fontWeight: 600, color: "#0F172A", fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} color="#1E3A8A" /> Transferencia / Yape</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 32 }}>Recibo enviado al correo: <strong style={{color:'#0F172A'}}>{form.email}</strong></p>
      <button className="btn-primary" onClick={() => navigate("/")} style={{ padding: "12px 40px", fontSize: 14 }}>Seguir Comprando</button>
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, fontSize: 13, color: "#94A3B8" }}>
        <Link to="/" style={{ color: "#1E3A8A", fontWeight: 600, textDecoration: 'none' }}>Inicio</Link>
        <ChevronRight size={14} opacity={0.5} />
        <Link to="/catalog" style={{ color: "#1E3A8A", fontWeight: 600, textDecoration: 'none' }}>Catálogo</Link>
        <ChevronRight size={14} opacity={0.5} />
        <span style={{ color: "#64748B", fontWeight: 500 }}>Checkout</span>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", marginBottom: 40, letterSpacing: '-1px' }}>Finalizar Compra</h1>

      <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap", flexDirection: "row-reverse" }}>
        {/* Order Summary */}
        <div style={{ width: 380, flexShrink: 0, flexGrow: 1 }}>
          <div style={{ background: "white", borderRadius: 6, padding: 32, border: '1px solid #E2E8F0', position: "sticky", top: 100, boxShadow: '0 4px 20px rgba(15,23,42,0.03)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #F1F5F9', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Resumen de Pedido ({count})
            </h2>
            <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 24, paddingRight: 8 }}>
              {cart.map(item => (
                <div key={item.product_id} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <ProductImageMock product={item} size={60} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, padding: "2px 0" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", lineHeight: 1.4, marginBottom: 6 }}>{item.name}</p>
                    <p style={{ fontSize: 12, color: "#64748B" }}>Cant: {item.quantity}</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", flexShrink: 0 }}>S/ {(parseFloat(item.base_price) * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            
            <div style={{ background: '#F8FAFC', padding: 24, borderRadius: 6, marginBottom: 24, border: '1px solid #E2E8F0' }}>
              {[["Subtotal", `S/ ${total.toLocaleString()}`], ["Envío", "Gratis"], ["Descuentos", "-S/ 0.00"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 12, fontWeight: 500 }}>
                  <span>{k}</span>
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>{v}</span>
                </div>
              ))}
              <div style={{ width: '100%', height: 1, background: '#CBD5E1', margin: '20px 0' }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: '-0.5px' }}>
                <span>Total a Pagar</span>
                <span>S/ {total.toLocaleString()}</span>
              </div>
            </div>

            <button onClick={handleSubmit} className="btn-primary" style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1, borderRadius: 6 }} disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Procesando pago...</> : <><Check size={16} strokeWidth={2.5} /> Confirmar Compra</>}
            </button>
            <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, fontSize: 12, color: "#64748B", textAlign: 'center', fontWeight: 500 }}>
              <ShieldCheck size={14} color="#1E3A8A" /> Compra 100% Segura Garantizada
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ flex: 999, minWidth: 320 }}>
          {/* Datos Personales */}
          <div style={{ background: "white", borderRadius: 6, padding: 40, marginBottom: 24, border: '1px solid #E2E8F0' }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 40, height: 40, background: "#F8FAFC", border: '1px solid #E2E8F0', borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} color="#1E3A8A" strokeWidth={2} /></div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: '-0.3px', marginBottom: 4 }}>Datos Personales</h2>
                <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Necesitamos tu información para la boleta.</p>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <FormField label="Nombres *" k="nombre" half form={form} set={set} errors={errors} setErrors={setErrors} />
              <FormField label="Apellidos *" k="apellido" half form={form} set={set} errors={errors} setErrors={setErrors} />
              <FormField label="Correo Electrónico *" k="email" type="email" placeholder="ejemplo@correo.com" form={form} set={set} errors={errors} setErrors={setErrors} />
              <FormField label="Teléfono o Celular *" k="telefono" type="tel" half placeholder="Ej: 987654321" form={form} set={set} errors={errors} setErrors={setErrors} />
              <FormField label="DNI o RUC *" k="dni" half form={form} set={set} errors={errors} setErrors={setErrors} />
            </div>
          </div>

          {/* Dirección */}
          <div style={{ background: "white", borderRadius: 6, padding: 40, marginBottom: 24, border: '1px solid #E2E8F0' }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 40, height: 40, background: "#F8FAFC", border: '1px solid #E2E8F0', borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPin size={18} color="#1E3A8A" strokeWidth={2} /></div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: '-0.3px', marginBottom: 4 }}>Dirección de Envío</h2>
                <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>¿A dónde enviamos tu pedido?</p>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <FormField label="Dirección Exacta *" k="direccion" placeholder="Calle, Avenida, Jr, Nro..." form={form} set={set} errors={errors} setErrors={setErrors} />
              <FormField label="Distrito *" k="distrito" half placeholder="Ej: Miraflores" form={form} set={set} errors={errors} setErrors={setErrors} />
              <div style={{ flex: "0 0 calc(50% - 10px)" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", display: "block", marginBottom: 8 }}>Departamento / Región *</label>
                <select value={form.departamento} onChange={e => set("departamento", e.target.value)} style={{ width: "100%", background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '10px 14px', borderRadius: 6, outline: 'none' }}>
                  {["Lima Metropolitana", "Lima Provincias", "Callao", "Arequipa", "Cusco", "La Libertad", "Piura", "Lambayeque", "Junín", "Ica", "Cajamarca", "Resto del Perú"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 100%" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", display: "block", marginBottom: 8 }}>Referencias de Entrega (Opcional)</label>
                <textarea value={form.referencias} onChange={e => set("referencias", e.target.value)} style={{ width: "100%", minHeight: 90, resize: "vertical", background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '10px 14px', borderRadius: 6 }} placeholder="Frente a un parque, casa verde, dejar en portería..." />
              </div>
            </div>
          </div>

          {/* Pago */}
          <div style={{ background: "white", borderRadius: 6, padding: 40, border: '1px solid #E2E8F0' }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 40, height: 40, background: "#F8FAFC", border: '1px solid #E2E8F0', borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={18} color="#1E3A8A" strokeWidth={2} /></div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: '-0.3px', marginBottom: 4 }}>Método de Pago</h2>
                <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Tu compra está protegida y encriptada.</p>
              </div>
            </div>
            <div style={{ border: "1px solid #1E3A8A", borderRadius: 6, padding: 24, background: "#F8FAFC", display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 20, height: 20, border: "2px solid #1E3A8A", borderRadius: "50%", background: "#1E3A8A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, background: 'white', borderRadius: '50%' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 8 }}>Paga seguro por Transferencia o Yape</p>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, fontWeight: 500 }}>Al confirmar la compra te mostraremos el QR de Yape y nuestros números de cuenta BCP / BBVA. Una vez realizado el pago tu pedido será despachado de inmediato con envío prioritario exprés a nivel nacional. ¡Fácil, rápido y sin ningún riesgo!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
