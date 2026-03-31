import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Menu, X, ShoppingCart } from 'lucide-react';
import { getCategories } from '../api';
import { Link } from 'react-router-dom';

const MegaMenu = () => {
  const [categories, setCategories] = useState([]);
  const [activeRoot, setActiveRoot] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    getCategories().then(data => setCategories(data)).catch(console.error);
  }, []);

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex flex-shrink-0 items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="font-bold text-xl text-slate-800">SMART PE</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex relative space-x-1">
              <div 
                className="group inline-flex items-center"
                onMouseLeave={() => setActiveRoot(null)}
              >
                <button 
                  onMouseEnter={() => setActiveRoot('categories')}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Menu size={18} /> Todas las Categorías 
                  <ChevronDown size={14} className={`transition-transform duration-200 ${activeRoot === 'categories' ? 'rotate-180' : ''}`} />
                </button>

                {/* Mega Menu Dropdown */}
                {activeRoot === 'categories' && (
                  <div className="absolute left-0 top-full mt-0 w-full min-w-[600px] z-50 bg-white shadow-xl rounded-b-xl border border-gray-100 p-6 flex gap-6">
                    <div className="w-1/3 border-r border-gray-100 pr-4">
                      {categories.map(cat => (
                        <div key={cat.id} className="group/item relative">
                          <Link 
                            to={`/catalog?category=${cat.id}`}
                            className="flex justify-between items-center py-2 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-md w-full text-left"
                          >
                            {cat.name}
                            {cat.subcategories?.length > 0 && <ChevronRight size={14} />}
                          </Link>

                          {/* Level 2 (Subcategories) */}
                          {cat.subcategories?.length > 0 && (
                            <div className="hidden group-hover/item:block absolute left-full top-0 pl-2 min-h-[calc(100%+16px)] w-68 z-10">
                              <div className="bg-slate-50 border border-gray-100 rounded-lg p-4 shadow-md min-h-full w-full">
                                <h3 className="font-bold text-blue-600 mb-3 border-b border-gray-200 pb-2">{cat.name}</h3>
                                <ul className="space-y-2">
                                  {cat.subcategories.map(sub => (
                                    <li key={sub.id}>
                                      <Link to={`/catalog?category=${sub.id}`} className="text-sm text-slate-600 hover:text-blue-600 block py-1">
                                        {sub.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="w-2/3 pl-4">
                       {/* Featured Promo Area inside Mega Menu */}
                       <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 h-full flex flex-col justify-center items-start">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Oferta Especial</span>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">¡Cyber Days llegaron!</h3>
                          <p className="text-sm text-slate-600 mb-4">Hasta 50% de descuento en tecnología seleccionada.</p>
                          <Link to="/catalog" className="text-sm font-bold text-white bg-blue-600 px-4 py-2 rounded-full hover:bg-blue-700">Ver ofertas</Link>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              <Link to="/catalog" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600">Catálogo</Link>
              <Link to="/" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600">Ofertas</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <Link to="/cart" className="relative p-2 text-slate-600 hover:text-blue-600">
                <ShoppingCart size={20} />
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">3</span>
             </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MegaMenu;
