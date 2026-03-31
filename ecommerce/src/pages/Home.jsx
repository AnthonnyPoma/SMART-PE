import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, ShieldCheck, RotateCcw, CreditCard, Star, ArrowRight, Zap, TrendingUp, ChevronRight } from "lucide-react";
import { getCategories, getProducts } from "../api";
import { useCartStore } from "../store/cartStore";
import { ProductImageMock, getCategoryIcon } from "../components/Layout";

function Stars({ rating }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={15} fill={s <= Math.round(rating) ? "#F59E0B" : "transparent"} color={s <= Math.round(rating) ? "#F59E0B" : "#CBD5E1"} strokeWidth={s <= Math.round(rating) ? 0 : 2} />
      ))}
    </span>
  );
}

const HomePage = () => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [bannerIdx, setBannerIdx] = useState(0);

  const banners = [
    { title: "La mejor tecnología a tu alcance", sub: "Descubre miles de productos originales con garantía de tienda.", cta: "Ver Catálogo", badge: "SUPER OPORTUNIDAD", bg: "/Gemini_Generated_Image_rmky73rmky73rmky.png" },
    { title: "Nuevos Celulares y Laptops", sub: "Equípate con lo último. Envíos súper rápidos a nivel nacional.", cta: "Descubrir", badge: "NOVEDADES", bg: "/Gemini_Generated_Image_rmky73rmky73rmky (1).png" },
    { title: "Arma tu setup soñado", sub: "Los mejores componentes y monitores de todo el mercado.", cta: "Comprar Ahora", badge: "DESTACADO", bg: "/Gemini_Generated_Image_rmky73rmky73rmky (2).png" },
  ];
  
  const b = banners[bannerIdx];

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
    getProducts({ limit: 12 }).then(setProducts).catch(console.error);
  }, []);

  const onSale = products.slice(0, 4).map(p => ({ ...p, originalPrice: p.base_price * 1.2, tag: "SÚPER PRECIO", rating: 4.5, reviews: 24 }));
  const featured = products.slice(4, 10).map(p => ({ ...p, originalPrice: p.base_price * 1.1, tag: "NUEVO", rating: 4.8, reviews: 56, hot: true }));

  return (
    <div className="fade-in">
      {/* Hero Banner Dinámico con Imágenes Renderizadas */}
      <div style={{ background: `linear-gradient(to right, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.6) 100%), url('${b.bg}') center/cover no-repeat`, transition: "all 0.6s ease-in-out", minHeight: 480, display: "flex", alignItems: "center", position: "relative", overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, width: "100%", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 60, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, maxWidth: 640 }}>
            <span className="tag-badge" style={{ background: "rgba(37, 99, 235, 0.2)", color: "#93C5FD", marginBottom: 24, display: "inline-block", letterSpacing: 1, padding: "6px 14px", borderRadius: 4, fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.3)' }}>{b.badge}</span>
            <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, color: "white", lineHeight: 1.15, marginBottom: 20, letterSpacing: '-1px' }}>{b.title}</h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", marginBottom: 40, lineHeight: 1.6, fontWeight: 400 }}>{b.sub}</p>
            <button className="btn-primary" style={{ fontSize: 16, padding: "14px 32px", background: '#2563EB', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 6, fontWeight: 600 }} onClick={() => navigate("/catalog")}>
              {b.cta} <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        
        {/* Banner Controls */}
        <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 12 }}>
            {banners.map((_, i) => (
              <button key={i} onClick={() => setBannerIdx(i)} style={{ width: i === bannerIdx ? 40 : 12, height: 6, border: "none", borderRadius: 3, background: i === bannerIdx ? "#38BDF8" : "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Trust badges - Dinámicas/Grises */}
      <div style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          {[
            { icon: <Truck size={24} strokeWidth={1.5} />, title: "Envíos veloces", desc: "A todo el país" }, 
            { icon: <ShieldCheck size={24} strokeWidth={1.5} />, title: "Garantía total", desc: "100% productos originales" }, 
            { icon: <RotateCcw size={24} strokeWidth={1.5} />, title: "Compras sin riesgo", desc: "Devoluciones fáciles y rápidas" }, 
            { icon: <CreditCard size={24} strokeWidth={1.5} />, title: "Paga fácil", desc: "Tarjeta, Yape o Transferencia" }
          ].map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E3A8A' }}>{b.icon}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{b.title}</p>
                <p style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px" }}>
        {/* Category pills - Sharp Corners */}
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, marginBottom: 48 }} className="scrollbar-hide">
          {categories.slice(0, 10).map(cat => (
            <button key={cat.id} onClick={() => navigate(`/catalog?category=${cat.id}`)}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", background: "white", border: `1px solid #CBD5E1`, borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, color: '#334155', transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(37,99,235,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ color: '#1E3A8A' }}>{getCategoryIcon(cat.name, 18)}</span> {cat.name}
            </button>
          ))}
        </div>

        {/* Ofertas Flash */}
        {onSale.length > 0 && (
          <div style={{ marginBottom: 80 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Zap size={24} color="#1E3A8A" strokeWidth={2} />
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", letterSpacing: '-0.5px' }}>Ofertas Imperdibles</h2>
              </div>
              <button onClick={() => navigate("/catalog")} style={{ background: "transparent", border: "none", color: "#1E3A8A", cursor: "pointer", fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#1E40AF'} onMouseLeave={e => e.currentTarget.style.color='#1E3A8A'}>
                Ver todo <ChevronRight size={16} strokeWidth={2}/>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 24 }}>
              {onSale.map(p => (
                <div key={p.product_id} className="product-card" style={{ background: "white", overflow: "hidden", cursor: "pointer", display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/product/${p.product_id}`)}>
                  <div style={{ padding: 24, display: "flex", justifyContent: "center", background: `#FFFFFF`, borderBottom: '1px solid #F1F5F9' }}>
                    <ProductImageMock product={p} size={150} />
                  </div>
                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span className="tag-badge" style={{ background: "#EFF6FF", color: "#1E3A8A", marginBottom: 12, display: "inline-block", width: 'fit-content', border: '1px solid #BFDBFE' }}>{p.tag}</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", lineHeight: 1.4, flex: 1, marginBottom: 16 }}>{p.name}</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: "#1E3A8A", letterSpacing: '-0.5px' }}>S/ {parseFloat(p.base_price).toLocaleString()}</span>
                      <span style={{ fontSize: 13, color: "#94A3B8", textDecoration: "line-through", fontWeight: 500 }}>S/ {parseFloat(p.originalPrice).toLocaleString()}</span>
                    </div>
                    <button className="btn-outline" style={{ width: "100%", padding: "10px", fontSize: 14 }} onClick={e => { e.stopPropagation(); addToCart(p, 1); }}>Agregar al carrito</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Productos Populares */}
        {featured.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <TrendingUp size={24} color="#1E3A8A" strokeWidth={2} />
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", letterSpacing: '-0.5px' }}>Lo Más Vendido</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {featured.map(p => (
                <div key={p.product_id} className="product-card" style={{ background: "white", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }} onClick={() => navigate(`/product/${p.product_id}`)}>
                  <div style={{ padding: 28, display: "flex", justifyContent: "center", background: `#FFFFFF`, position: 'relative' }}>
                    <ProductImageMock product={p} size={160} />
                  </div>
                  <div style={{ padding: "0 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ width: '100%', height: 1, background: '#F1F5F9', marginBottom: 16 }}></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Stars rating={p.rating} />
                      <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>({p.reviews})</span>
                      {p.hot && <span className="tag-badge" style={{ background: "#F1F5F9", color: "#475569", marginLeft: "auto", border: '1px solid #E2E8F0' }}>TOP</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", lineHeight: 1.4, flex: 1, marginBottom: 16 }}>{p.name}</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: '-0.5px' }}>S/ {parseFloat(p.base_price).toLocaleString()}</span>
                    </div>
                    <button className="btn-primary" style={{ width: "100%", padding: "10px", fontSize: 14 }} onClick={e => { e.stopPropagation(); addToCart(p, 1); }}>Agregar al carrito</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
