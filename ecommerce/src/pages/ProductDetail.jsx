import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, Truck, ShieldCheck, RotateCcw, Store, Heart, Star, ShoppingBag, Check } from "lucide-react";
import { getProductDetail, getProducts } from "../api";
import { useCartStore } from "../store/cartStore";
import { ProductImageMock } from "../components/Layout";

function Stars({ rating }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={15} fill={s <= Math.round(rating) ? "#F59E0B" : "transparent"} color={s <= Math.round(rating) ? "#F59E0B" : "#CBD5E1"} strokeWidth={s <= Math.round(rating) ? 0 : 2} />
      ))}
    </span>
  );
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("specs");
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setQty(1);
    getProductDetail(id)
      .then(p => {
        setProduct(p);
        getProducts({ category_id: p.category_id })
          .then(all => {
            const rel = all.filter(x => String(x.product_id) !== String(id)).slice(0, 4);
            setRelated(rel);
          })
          .catch(console.error);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 100, textAlign: "center", fontSize: 16, color: '#64748B', fontWeight: 500 }}>Cargando catálogo...</div>;
  if (!product) return <div style={{ padding: 100, textAlign: "center", fontSize: 18, color: '#0F172A', fontWeight: 700 }}>El producto seleccionado no existe o está agotado.</div>;

  const stock = Number(product.stock) || 0;
  const basePrice = parseFloat(product.base_price);
  const originalPrice = basePrice * 1.15;
  const rating = 4.8;
  const reviews = 42;

  const handleAdd = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
      {/* Breadcrumb Corporativo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, fontSize: 13, color: "#94A3B8" }}>
        <Link to="/" style={{ color: "#1E3A8A", fontWeight: 600, textDecoration: 'none' }}>Inicio</Link>
        <ChevronRight size={14} opacity={0.5} />
        <Link to={`/catalog?category=${product.category_id}`} style={{ color: "#1E3A8A", fontWeight: 600, textDecoration: 'none' }}>
          {product.category?.name || "Catálogo"}
        </Link>
        <ChevronRight size={14} opacity={0.5} />
        <span style={{ color: "#64748B", fontWeight: 500 }}>{product.name.substring(0, 50)}...</span>
      </div>

      {/* Product layout */}
      <div style={{ display: "flex", gap: 48, flexWrap: "wrap", marginBottom: 80 }}>
        {/* Image Gallery */}
        <div style={{ width: 480, flexShrink: 0, background: "white", borderRadius: 6, padding: 48, border: '1px solid #E2E8F0', display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
          <ProductImageMock product={product} size={280} />
          <div style={{ display: "flex", gap: 16 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ width: 80, height: 80, border: `1px solid ${i === 0 ? "#1E3A8A" : "#E2E8F0"}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: i === 0 ? 1 : 0.6, background: '#FFFFFF' }}>
                <ProductImageMock product={product} size={50} />
              </div>
            ))}
          </div>
        </div>

        {/* Info Detallada */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <span className="tag-badge" style={{ background: "#F1F5F9", color: "#1E3A8A", border: '1px solid #E2E8F0' }}>ENVÍO RÁPIDO</span>
            <span className="tag-badge" style={{ background: stock > 0 ? "#F0FFF4" : "#FEF2F2", color: stock > 0 ? "#166534" : "#991B1B", border: `1px solid ${stock > 0 ? '#BBF7D0' : '#FECACA'}` }}>{stock > 0 ? `Stock Disponible: ${stock}` : 'AGOTADO'}</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>SKU: {product.sku}</p>
          <h1 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 800, color: "#0F172A", lineHeight: 1.25, marginBottom: 20, letterSpacing: '-0.5px' }}>{product.name}</h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #E2E8F0' }}>
            <Stars rating={rating} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{rating}</span>
            <span style={{ color: '#E2E8F0' }}>|</span>
            <span style={{ fontSize: 13, color: "#64748B", cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}>{reviews} opiniones de clientes</span>
          </div>

          {/* Price block */}
          <div style={{ background: "#FFFFFF", border: '1px solid #CBD5E1', borderRadius: 6, padding: 28, marginBottom: 32, boxShadow: '0 4px 10px rgba(15, 23, 42, 0.02)' }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#1E3A8A", letterSpacing: '-1px' }}>S/ {basePrice.toLocaleString()}</span>
              <span style={{ fontSize: 16, color: "#94A3B8", textDecoration: "line-through", fontWeight: 600 }}>S/ {originalPrice.toLocaleString()}</span>
            </div>
            <p style={{ fontSize: 13, color: "#166534", fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, background: '#F0FFF4', padding: '6px 12px', borderRadius: 4, width: 'fit-content', border: '1px solid #BBF7D0' }}>
              <Check size={14} strokeWidth={2.5}/> Ahorras S/ {(originalPrice - basePrice).toLocaleString()} (Precio Exclusivo Web)
            </p>
            <p style={{ fontSize: 13, color: "#475569", marginTop: 16, fontWeight: 500 }}>
              Todo producto cuenta con garantía directa de fábrica.
            </p>
          </div>

          {/* Qty + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #CBD5E1", borderRadius: 6, overflow: "hidden", background: '#FFFFFF', height: 48 }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: '100%', border: "none", background: "#F8FAFC", cursor: "pointer", fontSize: 20, fontWeight: 500, color: "#475569", transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#F1F5F9'} onMouseLeave={e => e.currentTarget.style.background='#F8FAFC'}>−</button>
              <span style={{ width: 48, textAlign: "center", fontWeight: 700, fontSize: 16, borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qty}</span>
              <button 
                onClick={() => setQty(Math.min(stock > 0 ? stock : 99, qty + 1))} 
                disabled={stock > 0 && qty >= stock}
                style={{ width: 40, height: '100%', border: "none", background: "#F8FAFC", cursor: "pointer", fontSize: 20, fontWeight: 500, color: "#475569", opacity: (stock > 0 && qty >= stock) ? 0.3 : 1, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#F1F5F9'} onMouseLeave={e => e.currentTarget.style.background='#F8FAFC'}>+</button>
            </div>
            <button 
              onClick={handleAdd} 
              disabled={stock === 0}
              className="btn-outline" style={{ flex: 1, minWidth: 220, height: 48, fontSize: 15, fontWeight: 700, background: added ? "#1E3A8A" : (stock === 0 ? "#F8FAFC" : "#FFFFFF"), color: added ? "#FFFFFF" : (stock === 0 ? "#94A3B8" : "#1E3A8A"), borderColor: added ? "#1E3A8A" : (stock === 0 ? "#E2E8F0" : "#1E3A8A"), transition: "all 0.2s", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {added ? <><Check size={18} strokeWidth={2.5}/> ¡Agregado a tu carrito!</> : (stock === 0 ? "Agotado" : "Agregar al carrito")}
            </button>
            <button style={{ width: 48, height: 48, border: "1px solid #CBD5E1", borderRadius: 6, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.querySelector('svg').style.color = '#1E3A8A'; }} onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.querySelector('svg').style.color = '#94A3B8'; }}>
              <Heart size={20} color="#94A3B8" strokeWidth={2} style={{ transition: 'color 0.2s' }} />
            </button>
          </div>
          <button onClick={() => { handleAdd(); navigate("/checkout"); }} disabled={stock===0} className="btn-primary" style={{ width: "100%", height: 52, opacity: stock === 0 ? 0.4 : 1, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32, borderRadius: 6 }}>
            <ShoppingBag size={18} strokeWidth={2.5}/> Comprar ahora
          </button>

          {/* Delivery info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, background: '#FFFFFF', padding: 28, borderRadius: 6, border: '1px solid #E2E8F0' }}>
            {[
              { icon: <Truck size={18} color="#1E3A8A" strokeWidth={2} />, text: "Envíos asegurados a la puerta de tu casa" },
              { icon: <ShieldCheck size={18} color="#1E3A8A" strokeWidth={2} />, text: "Seguridad y soporte en todas tus compras" },
              { icon: <RotateCcw size={18} color="#1E3A8A" strokeWidth={2} />, text: "Devoluciones sin complicaciones" },
              { icon: <Store size={18} color="#1E3A8A" strokeWidth={2} />, text: "Opción de recojo GRATIS en nuestra tienda" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "#334155", fontWeight: 600 }}>
                <div style={{ background: '#F8FAFC', padding: 8, borderRadius: 6, border: '1px solid #E2E8F0' }}>{item.icon}</div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", borderRadius: 6, marginBottom: 80, border: '1px solid #E2E8F0' }}>
        <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
          {[{ key: "specs", label: "Especificaciones" }, { key: "desc", label: "Descripción" }, { key: "reviews", label: `Opiniones (${reviews})` }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: "20px 32px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: activeTab === tab.key ? "#1E3A8A" : "#64748B", borderBottom: `3px solid ${activeTab === tab.key ? "#1E3A8A" : "transparent"}`, transition: 'all 0.2s', letterSpacing: '-0.3px' }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ padding: 40 }}>
          {activeTab === "desc" && <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, maxWidth: 800 }}>{product.description || "Este equipo cuenta con lo último en tecnología, brindando un rendimiento espectacular y durabilidad incomparable."}</p>}
          {activeTab === "specs" && (
            <table style={{ width: "100%", maxWidth: 800, borderCollapse: "collapse", border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
              <tbody>
                <tr style={{ background: "#F8FAFC", borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 700, color: "#0F172A", width: "40%" }}>SKU (Código Interno)</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#475569", fontFamily: 'monospace' }}>{product.sku}</td>
                </tr>
                <tr style={{ background: "white" }}>
                  <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 700, color: "#0F172A", width: "40%" }}>Stock Disponible</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#475569", fontWeight: 500 }}>Solo {stock} unidades listas para entregar.</td>
                </tr>
              </tbody>
            </table>
          )}
          {activeTab === "reviews" && (
            <div style={{ maxWidth: 800 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 32, padding: 32, background: "#F8FAFC", borderRadius: 6, border: '1px solid #E2E8F0' }}>
                <div style={{ textAlign: "center", minWidth: 120 }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: "#0F172A", letterSpacing: '-2px' }}>{rating}</div>
                  <Stars rating={rating} />
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 8, fontWeight: 500 }}>{reviews} reseñas validadas</p>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid #E2E8F0', paddingLeft: 32 }}>
                  {[5, 4, 3, 2, 1].map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: "#0F172A", minWidth: 20, fontWeight: 700 }}>{s} <Star size={12} fill="#0F172A" strokeWidth={0}/></span>
                      <div style={{ flex: 1, height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "#1E3A8A", width: s === 5 ? "80%" : s === 4 ? "15%" : "2%", borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: '-0.5px' }}>Quizá También Te Interese</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {related.map(rp => (
              <div key={rp.product_id} className="product-card" style={{ background: "white", borderRadius: 6, overflow: "hidden", cursor: "pointer", display: 'flex', flexDirection: 'column' }} onClick={() => { navigate(`/product/${rp.product_id}`); window.scrollTo(0,0); }}>
                <div style={{ padding: 32, background: `#FFFFFF`, display: "flex", justifyContent: "center", borderBottom: '1px solid #F1F5F9' }}>
                  <ProductImageMock product={rp} size={130} />
                </div>
                <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>TOP</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", marginBottom: 16, lineHeight: 1.4, flex: 1 }}>{rp.name}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: '-0.5px' }}>S/ {parseFloat(rp.base_price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
