import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ShoppingCart, X, Search, User, Home, Grid, ChevronDown, ChevronRight, 
  Minus, Plus, Trash2, Package, Smartphone, Laptop, Headphones, Tv, Tablet, 
  Gamepad2, Home as HomeIcon, Snowflake, Truck, Phone, ShieldCheck
} from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { getCategories } from "../api";

export const getCategoryIcon = (catName, size = 20) => {
  const map = {
    Celulares: <Smartphone size={size} strokeWidth={1.5} />,
    Laptops: <Laptop size={size} strokeWidth={1.5} />,
    Computo: <Laptop size={size} strokeWidth={1.5} />,
    Audio: <Headphones size={size} strokeWidth={1.5} />,
    Televisores: <Tv size={size} strokeWidth={1.5} />,
    Tablets: <Tablet size={size} strokeWidth={1.5} />,
    Gaming: <Gamepad2 size={size} strokeWidth={1.5} />,
    SmartHome: <HomeIcon size={size} strokeWidth={1.5} />,
    Climatizacion: <Snowflake size={size} strokeWidth={1.5} />
  };
  return map[catName] || <Package size={size} strokeWidth={1.5} />;
};

export function ProductImageMock({ product, size = 160 }) {
  if (product && product.image_url) {
    return (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", padding: 10, background: 'white' }}>
        <img src={product.image_url} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, background: `#F8FAFC`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: '1px solid #F1F5F9' }}>
      <span style={{ color: '#94A3B8' }}>{getCategoryIcon(product?.category?.name || "", size * 0.4)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CART DRAWER
// ═══════════════════════════════════════════════════════════════
function CartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity } = useCartStore();
  
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  const total = cart.reduce((acc, item) => acc + (item.base_price * item.quantity), 0);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", width: 420, maxWidth: "100vw", background: "white", height: "100%", display: "flex", flexDirection: "column", animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: '-10px 0 30px rgba(0,0,0,0.15)' }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: '#F1F5F9', padding: 8, borderRadius: 6 }}><ShoppingCart size={18} color="#0F172A" strokeWidth={2} /></div>
            <span style={{ color: "#0F172A", fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>Tu Carrito ({count})</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #CBD5E1", borderRadius: 6, padding: 8, cursor: "pointer", display: "flex", alignItems: "center", transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><X size={16} color="#475569" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#94A3B8" }}>
              <ShoppingCart size={48} strokeWidth={1.5} color="#CBD5E1" style={{ margin: "0 auto" }} />
              <p style={{ marginTop: 20, fontWeight: 600, color: "#475569", fontSize: 15 }}>Tu carrito está vacío</p>
              <p style={{ fontSize: 14, marginTop: 6, color: '#94A3B8' }}>¡Descubre miles de productos e increíbles ofertas!</p>
              <button onClick={() => { onClose(); navigate("/catalog"); }} className="btn-primary" style={{ marginTop: 24, padding: "10px 20px" }}>
                Ir de compras
              </button>
            </div>
          ) : cart.map(item => (
            <div key={item.product_id} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                 <ProductImageMock product={item} size={70} />
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: "2px 0" }}>
                <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 6, color: "#0F172A" }}>{item.name}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1E3A8A" }}>S/ {parseFloat(item.base_price).toLocaleString()}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 12, border: '1px solid #CBD5E1', width: 'fit-content', borderRadius: 4, overflow: 'hidden' }}>
                  <button onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))} style={{ width: 28, height: 28, border: "none", cursor: "pointer", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", color: '#475569' }}><Minus size={14} /></button>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 28, textAlign: "center", color: '#0F172A', borderLeft: '1px solid #CBD5E1', borderRight: '1px solid #CBD5E1', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} style={{ width: 28, height: 28, border: "none", cursor: "pointer", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", color: '#475569' }}><Plus size={14} /></button>
                </div>
              </div>
              <button title="Quitar item" onClick={() => removeFromCart(item.product_id)} style={{ alignSelf: 'flex-start', border: "none", background: "transparent", cursor: "pointer", color: "#94A3B8", padding: 4, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        
        {cart.length > 0 && (
          <div style={{ padding: "24px", borderTop: "1px solid #E2E8F0", background: '#F8FAFC' }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 500, color: "#64748B", fontSize: 13 }}>Subtotal ({count} items)</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>S/ {total.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontWeight: 500, color: "#64748B", fontSize: 13 }}>Costo de envío</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#1E3A8A" }}>¡Gratis o a calcular!</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #CBD5E1' }}>
              <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: "#0F172A", letterSpacing: '-0.5px' }}>S/ {total.toLocaleString()}</span>
            </div>
            <button className="btn-primary" style={{ width: "100%", fontSize: 15, padding: "12px 0", display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }} onClick={() => { onClose(); navigate("/checkout"); }}>
              <span>Ir a pagar</span> <ChevronRight size={16} />
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ShieldCheck size={14} /> Compra segura garantizada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEADER 
// ═══════════════════════════════════════════════════════════════
function Header({ cartOpen, setCartOpen }) {
  const navigate = useNavigate();
  const [megaOpen, setMegaOpen] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { cart } = useCartStore();
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  const menuRef = useRef();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
    const close = (e) => { 
        if (menuRef.current && !menuRef.current.contains(e.target)) setMegaOpen(null); 
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
        navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <header className="global-header" style={{ background: "#FFFFFF", position: "sticky", top: 0, zIndex: 1000, borderBottom: '1px solid #E2E8F0' }}>
        {/* Top bar informativo Dinámico Corporativo */}
        <div style={{ background: "#0F172A", padding: "8px 0", fontSize: 12, color: "#CBD5E1", display: 'flex', justifyContent: 'center', fontWeight: 500 }}>
          <div style={{ maxWidth: 1280, width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Truck size={14} color="#38BDF8" /> Envíos a todo el Perú</span>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)'}}></div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} color="#38BDF8" /> Pagos 100% seguros</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} color="#38BDF8" /> Llámanos: 01-700-1234
            </div>
          </div>
        </div>

        {/* Main bar */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 32 }}>
          {/* Logo Corporativo Dinámico */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src="/icono.png" alt="SMART PE" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <div>
                <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px', lineHeight: 1 }}>SMART PE</div>
                <div style={{ color: "#1E3A8A", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase' }}>Store</div>
              </div>
            </div>
          </Link>

          {/* Search */}
          <div style={{ flex: 1, position: "relative", maxWidth: 640 }}>
            <Search size={16} color="#64748B" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} strokeWidth={2} />
            <input
              type="text"
              placeholder="¿Qué estás buscando hoy?"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
              style={{ width: "100%", padding: "10px 16px 10px 40px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 14, background: "#F8FAFC", color: "#0F172A", outline: "none", transition: 'all 0.2s', fontWeight: 500 }}
            />
            <button
              onClick={handleSearch}
              style={{ position: "absolute", right: 6, top: 6, bottom: 6, background: "#1E3A8A", border: "none", borderRadius: 4, padding: "0 16px", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1E40AF'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1E3A8A'; }}
            >
              Buscar
            </button>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <button onClick={() => navigate("/login")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#334155", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#1E3A8A'} onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
              <User size={20} strokeWidth={1.5} /> <span className="hidden sm:inline">Mi Cuenta</span>
            </button>
            <div style={{ width: 1, height: 24, background: '#E2E8F0' }}></div>
            <button onClick={() => setCartOpen(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#334155", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, position: "relative", transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#1E3A8A'} onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
              <div style={{ position: 'relative' }}>
                 <ShoppingCart size={20} strokeWidth={1.5} />
                 {count > 0 && <span style={{ position: 'absolute', top: -8, right: -8, background: "#1E3A8A", color: "white", fontSize: 10, fontWeight: 700, borderRadius: 4, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: 'center', padding: "0 4px" }}>{count}</span>}
              </div>
              <span className="hidden sm:inline ml-1">Carrito</span>
            </button>
          </div>
        </div>

        {/* Mega menu nav - Sharp Corporate */}
        <nav ref={menuRef} style={{ borderTop: "1px solid #E2E8F0", position: 'relative', background: '#FFFFFF' }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 24, overflowX: "auto" }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#475569", padding: "14px 0", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", borderBottom: "2px solid transparent", transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#1E3A8A'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
              <Home size={16} strokeWidth={1.5} /> Inicio
            </button>
            <button onClick={() => navigate("/catalog")} style={{ background: "none", border: "none", color: "#475569", padding: "14px 0", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", borderBottom: "2px solid transparent", transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#1E3A8A'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
              <Grid size={16} strokeWidth={1.5} /> Catálogo
            </button>
            
            <div style={{ width: 1, height: 16, background: "#CBD5E1" }} />
            
            {categories.map(cat => (
              <div key={cat.id} style={{ position: 'relative', height: '100%' }}>
                  <button
                    onMouseEnter={() => setMegaOpen(cat.id)}
                    onClick={() => { navigate(`/catalog?category=${cat.id}`); setMegaOpen(null); }}
                    style={{
                      background: "none", border: "none", padding: "14px 0", cursor: "pointer",
                      fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      color: megaOpen === cat.id ? "#1E3A8A" : "#475569",
                      borderBottom: `2px solid ${megaOpen === cat.id ? "#1E3A8A" : "transparent"}`,
                      display: "flex", alignItems: "center", gap: 6, transition: "color 0.2s"
                    }}
                  >
                    <span style={{ color: megaOpen === cat.id ? "#1E3A8A" : '#94A3B8' }}>{getCategoryIcon(cat.name, 16)}</span> 
                    {cat.name} 
                    {cat.subcategories?.length > 0 && <ChevronDown size={14} style={{ opacity: 0.5 }} />}
                  </button>
                  <div style={{ position: 'absolute', bottom: -12, width: '100%', height: 12 }} onMouseEnter={() => setMegaOpen(cat.id)} />
              </div>
            ))}
          </div>

          {/* Mega dropdown background panel - Corporativo */}
          {megaOpen && categories.find(c => c.id === megaOpen)?.subcategories?.length > 0 && (
            <div
              onMouseEnter={() => setMegaOpen(megaOpen)}
              onMouseLeave={() => setMegaOpen(null)}
              style={{
                position: "absolute", top: "100%", left: 0, right: 0, background: "white",
                boxShadow: "0 10px 40px rgba(15, 23, 42, 0.08)", zIndex: 2000,
                borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0',
                display: "flex", justifyContent: 'center'
              }}
            >
              <div style={{ maxWidth: 1280, width: '100%', display: "flex", padding: "32px 24px", gap: 60, textAlign: 'left' }}>
                {(() => {
                    const cat = categories.find(c => c.id === megaOpen);
                    return (
                        <>
                        <div style={{ minWidth: 200, borderRight: "1px solid #F1F5F9", paddingRight: 40 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, background: `#F8FAFC`, border: '1px solid #E2E8F0', borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: '#1E3A8A' }}>{getCategoryIcon(cat.name, 20)}</div>
                            <span style={{ fontWeight: 700, fontSize: 18, color: "#0F172A", letterSpacing: '-0.3px' }}>{cat.name}</span>
                            </div>
                            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 24 }}>Descubre todo lo que necesitas con las mejores marcas y calidad 100% original.</p>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/catalog?category=${cat.id}`); setMegaOpen(null); }} style={{ background: '#1E3A8A', color: "white", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#1E40AF'; }} onMouseLeave={e => { e.currentTarget.style.background = '#1E3A8A'; }}>
                            Ver todo el catálogo <ChevronRight size={14} color="white" />
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap' }}>
                            {cat.subcategories.map((sub, i) => (
                                <div key={sub.id} style={{ minWidth: 160 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16, cursor: 'pointer', transition: 'color 0.2s' }} onClick={(e) => { e.stopPropagation(); navigate(`/catalog?category=${sub.id}`); setMegaOpen(null); }} onMouseEnter={e => e.currentTarget.style.color = '#1E3A8A'} onMouseLeave={e => e.currentTarget.style.color = '#0F172A'}>
                                    {sub.name}
                                </p>
                                {sub.subcategories?.length > 0 && (
                                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                                    {sub.subcategories.map((item, j) => (
                                        <li key={item.id} onClick={(e) => { e.stopPropagation(); navigate(`/catalog?category=${item.id}`); setMegaOpen(null); }}
                                        style={{ fontSize: 13, color: "#64748B", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", transition: 'color 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#1E3A8A'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = "#64748B"; }}
                                        >
                                        {item.name}
                                        </li>
                                    ))}
                                    </ul>
                                )}
                                </div>
                            ))}
                        </div>
                        </>
                    )
                })()}
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer style={{ background: "#0F172A", color: "#94A3B8", marginTop: 80, borderTop: '4px solid #1E3A8A' }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 32px" }}>
        <div style={{ display: "flex", gap: 60, flexWrap: "wrap", marginBottom: 60 }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <img src="/icono.png" alt="SMART PE" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              <span style={{ color: "white", fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>SMART PE Store</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#94A3B8', maxWidth: 360 }}>Tu tienda en línea de confianza con las mejores ofertas, productos originales y descuentos súper especiales a nivel nacional.</p>
          </div>
          {[
            { title: "Categorías", links: ["Audio y Video", "Laptops y Cómputo", "Celulares y Tablets", "Accesorios Rápidos"] },
            { title: "Soporte", links: ["Centro de Ayuda", "Sigue tu pedido", "Garantías y Devoluciones", "Preguntas Frecuentes"] },
            { title: "Información", links: ["Nuestros Locales", "Libro de Reclamaciones", "Términos y Condiciones", "Contáctanos"] },
          ].map(col => (
            <div key={col.title} style={{ minWidth: 160 }}>
              <p style={{ color: "white", fontWeight: 700, fontSize: 14, marginBottom: 20 }}>{col.title}</p>
              {col.links.map(l => <p key={l} style={{ fontSize: 13, marginBottom: 12, cursor: "pointer", color: '#94A3B8', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = "#38BDF8"} onMouseLeave={e => e.target.style.color = "#94A3B8"}>{l}</p>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: 'center' }}>
          <p style={{ fontSize: 12, color: '#64748B' }}>© {new Date().getFullYear()} Soluciones Tecnológicas SMART PE. Todos los derechos reservados.</p>
          <div style={{ display: "flex", gap: 24, fontSize: 12, color: '#64748B' }}>
            <span style={{ cursor: "pointer", transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color="white"} onMouseLeave={e=>e.target.style.color="#64748B"}>Políticas de Privacidad</span>
            <span style={{ cursor: "pointer", transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color="white"} onMouseLeave={e=>e.target.style.color="#64748B"}>Términos Contractuales</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT WRAPPER
// ═══════════════════════════════════════════════════════════════
const Layout = ({ children }) => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif", background: '#F8FAFC' }}>
      <Header cartOpen={cartOpen} setCartOpen={setCartOpen} />
      <main style={{ flex: 1, position: 'relative' }}>
        {children}
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default Layout;
