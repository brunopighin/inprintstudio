import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, Search, User, Menu, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

export default function Header() {
  const { itemCount, openCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchQuery)}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const navLinks = [
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/catalogo/fotolibros', label: 'Fotolibros' },
    { to: '/catalogo/cuadros', label: 'Cuadros' },
    { to: '/catalogo/kits-de-regalo', label: 'Kits regalo' },
  ]

  return (
    <>
      {/* Top announcement bar */}
      <div className="bg-black text-white text-center py-2 text-xs tracking-widest uppercase font-medium">
        Envíos a todo el país · Retiro en local · Impresión profesional
      </div>

      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="container-main">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0">
              <img src={logo} alt="In Print" className="h-16 md:h-20 w-auto" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? 'text-black border-b-2 border-black pb-0.5' : 'text-gray-500 hover:text-black'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-2">
              <button onClick={() => setSearchOpen(true)} className="btn-ghost p-2.5 rounded-none" aria-label="Buscar">
                <Search size={18} />
              </button>

              <Link to="/mi-cuenta" className="btn-ghost p-2.5 rounded-none" aria-label="Mi cuenta">
                <User size={18} />
                {user && <span className="hidden md:block text-xs">{user.name.split(' ')[0]}</span>}
              </Link>

              <button onClick={openCart} className="btn-ghost p-2.5 rounded-none relative" aria-label="Carrito">
                <ShoppingBag size={18} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden btn-ghost p-2.5 rounded-none">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white animate-fade-in">
            <div className="container-main py-4 flex flex-col gap-0">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `py-3 border-b border-gray-100 text-sm font-medium ${isActive ? 'text-black font-semibold' : 'text-gray-600'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Link to="/contacto" onClick={() => setMobileOpen(false)} className="py-3 text-sm font-medium text-gray-600">
                Contacto
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-20 animate-fade-in" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-12 pr-16 py-5 bg-white text-gray-900 text-lg border-none outline-none"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900">
                <X size={20} />
              </button>
            </form>
            <p className="text-gray-500 text-sm mt-3 text-center">Presioná Enter para buscar</p>
          </div>
        </div>
      )}
    </>
  )
}
