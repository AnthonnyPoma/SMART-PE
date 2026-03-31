import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, Filter, Package, Heart, Star, Search } from "lucide-react";
import { getProducts, getCategories } from "../api";
import { useCartStore } from "../store/cartStore";
import { ProductImageMock, getCategoryIcon } from "../components/Layout";

function Stars({ rating }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={14} fill={s <= Math.round(rating) ? "#F59E0B" : "transparent"} color={s <= Math.round(rating) ? "#F59E0B" : "#CBD5E1"} strokeWidth={s <= Math.round(rating) ? 0 : 2} />
      ))}
    </span>
  );
}

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');
  
  const { addToCart } = useCartStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [addedId, setAddedId] = useState(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCat, setSelectedCat] = useState(categoryParam || "");
  const [sort, setSort] = useState("nuevo");

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (categoryParam !== selectedCat) setSelectedCat(categoryParam || "");
  }, [categoryParam]);

  useEffect(() => {
    const params = {};
    if (selectedCat) params.category_id = selectedCat;
    if (queryParam) params.search = queryParam;
    
    getProducts(params).then(data => {
      if (sort === "precio_asc") data.sort((a,b) => parseFloat(a.base_price) - parseFloat(b.base_price));
      if (sort === "precio_desc") data.sort((a,b) => parseFloat(b.base_price) - parseFloat(a.base_price));
      setProducts(data);
    }).catch(console.error);
  }, [selectedCat, queryParam, sort]);

  const handleAdd = (e, p) => {
    e.stopPropagation();
    addToCart(p, 1);
    setAddedId(p.product_id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const handleCatSelect = (catId) => {
    if (catId === selectedCat) {
      searchParams.delete('category');
      setSelectedCat("");
    } else {
      searchParams.set('category', catId);
      setSelectedCat(catId);
    }
    setSearchParams(searchParams);
  };

  const currentCategoryObj = categories.find(c => String(c.id) === String(selectedCat));

  return (
    <div className="fade-in" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, fontSize: 13, color: "#64748B" }}>
        <Link to="/" style={{ color: "#1E3A8A", fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}>Inicio</Link>
        <ChevronRight size={14} opacity={0.5} />
        <span style={{ color: selectedCat ? "#1E3A8A" : "#64748B", fontWeight: selectedCat ? 600 : 500, cursor: selectedCat ? 'pointer' : 'default', transition: 'color 0.2s' }} onClick={() => { if(selectedCat) { searchParams.delete('category'); setSearchParams(searchParams); }}}>Catálogo</span>
        {currentCategoryObj && (
          <>
            <ChevronRight size={14} opacity={0.5} />
            <span style={{ color: "#64748B", fontWeight: 500 }}>{currentCategoryObj.name}</span>
          </>
        )}
        <span style={{ marginLeft: "auto", fontWeight: 700, color: "#0F172A", border: '1px solid #CBD5E1', padding: '4px 12px', borderRadius: 4, fontSize: 12, background: 'white' }}>{products.length} productos</span>
      </div>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <aside style={{ width: sidebarOpen ? 260 : 0, flexShrink: 0, overflow: "hidden", transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {sidebarOpen && (
            <div style={{ background: "white", borderRadius: 6, padding: 24, border: '1px solid #E2E8F0' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#0F172A", letterSpacing: '-0.3px' }}>Filtros</span>
                <button onClick={() => { setSearchParams(new URLSearchParams()); setSelectedCat(""); }}
                  style={{ fontSize: 12, color: "#1E3A8A", fontWeight: 600, background: "none", border: "none", cursor: "pointer", transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#1E40AF'} onMouseLeave={e => e.currentTarget.style.color='#1E3A8A'}>Limpiar</button>
              </div>
              
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20 }}>Categorías</p>
                {categories.map(cat => (
                  <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 16, fontSize: 14 }}>
                    <div style={{ position: 'relative', width: 18, height: 18, border: `2px solid ${String(selectedCat) === String(cat.id) ? '#1E3A8A' : '#CBD5E1'}`, borderRadius: 4, background: String(selectedCat) === String(cat.id) ? '#1E3A8A' : 'transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {String(selectedCat) === String(cat.id) && <div style={{ width: 6, height: 6, background: 'white', borderRadius: 2 }} />}
                    </div>
                    <input type="checkbox" checked={String(selectedCat) === String(cat.id)} onChange={() => handleCatSelect(cat.id)} style={{ display: 'none' }} />
                    <span style={{ fontWeight: String(selectedCat) === String(cat.id) ? 700 : 500, color: String(selectedCat) === String(cat.id) ? "#0F172A" : "#475569", transition: 'color 0.2s' }}>
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, background: "white", padding: "12px 20px", borderRadius: 6, border: '1px solid #E2E8F0' }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "transparent", border: "1px solid #CBD5E1", borderRadius: 4, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#475569", transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#1E3A8A'; e.currentTarget.style.borderColor = '#94A3B8'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#CBD5E1'; }}>
              <Filter size={16} strokeWidth={2} /> {sidebarOpen ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
            <div style={{ flex: 1 }} />
            {queryParam && <span style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Search size={14} color="#1E3A8A"/> Búsqueda: "{queryParam}"</span>}
            <div style={{ width: 1, height: 24, background: '#E2E8F0', margin: '0 8px' }} />
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ border: "none", padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: 'transparent', color: '#0F172A', outline: 'none' }}>
              <option value="nuevo">Ordenar por: Más recientes</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
            </select>
          </div>

          {products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "100px 20px", background: "white", borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <Package size={56} strokeWidth={1.5} color="#CBD5E1" style={{ margin: "0 auto" }} />
              <p style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginTop: 20, letterSpacing: '-0.3px' }}>No hay resultados</p>
              <p style={{ color: "#64748B", marginTop: 8, fontSize: 14 }}>Intenta cambiar los filtros o busca con otras palabras.</p>
              <button className="btn-primary" style={{ marginTop: 24, padding: "10px 24px" }} onClick={() => { setSearchParams(new URLSearchParams()); setSelectedCat(""); }}>Limpiar filtros</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {products.map(p => {
                const rating = 4.5;
                const originalPrice = p.base_price * 1.15;
                const reviews = 24;

                return (
                <div key={p.product_id} className="product-card" style={{ background: "white", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }} onClick={() => navigate(`/product/${p.product_id}`)}>
                  <div style={{ padding: 24, display: "flex", justifyContent: "center", background: `#FFFFFF`, position: "relative", borderBottom: '1px solid #F1F5F9' }}>
                    <ProductImageMock product={p} size={150} />
                    <button style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "1px solid #E2E8F0", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex", transition: 'all 0.2s' }} onClick={e => e.stopPropagation()} onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.querySelector('svg').style.color = '#1E3A8A'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.querySelector('svg').style.color = '#94A3B8'; }}>
                      <Heart size={16} strokeWidth={2} color="#94A3B8" style={{ transition: 'color 0.2s' }} />
                    </button>
                  </div>
                  <div style={{ padding: "20px 24px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Stars rating={rating} />
                      <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>({reviews})</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", lineHeight: 1.4, flex: 1, marginBottom: 16 }}>{p.name}</p>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E3A8A", letterSpacing: '-0.5px' }}>S/ {parseFloat(p.base_price).toLocaleString()}</div>
                      <div style={{ fontSize: 13, color: "#94A3B8", textDecoration: "line-through", marginTop: 2, fontWeight: 500 }}>S/ {originalPrice.toLocaleString()}</div>
                    </div>
                    <button
                      onClick={e => handleAdd(e, p)}
                      className="btn-outline"
                      style={{ width: "100%", padding: "10px", background: addedId === p.product_id ? "#1E3A8A" : "transparent", color: addedId === p.product_id ? "white" : "#1E3A8A", borderColor: addedId === p.product_id ? "#1E3A8A" : "#1E3A8A" }}
                    >
                      {addedId === p.product_id ? "✓ Agregado" : "Agregar al carrito"}
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Catalog;
