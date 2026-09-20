import { Link } from 'react-router-dom'
import { Mail, Instagram } from 'lucide-react'
import logoWhite from '../../assets/logo-white.png'
import WhatsAppIcon from '../icons/WhatsAppIcon'

export default function Footer() {
  return (
    <footer className="bg-black text-white mt-24">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <img src={logoWhite} alt="In Print" className="h-16 w-auto" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Impresión fotográfica profesional. Tus momentos más importantes, impresos con la calidad que merecen.
            </p>
            <div className="mt-6">
              <p className="text-sm font-semibold text-white mb-3">¡Seguinos en nuestras redes!</p>
              <div className="flex gap-3">
                <a href="https://www.instagram.com/inprint.studio_/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                  <Instagram size={16} />
                </a>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Productos</h4>
            <ul className="space-y-3">
              {['Fotos Impresas', 'Fotolibros', 'Cuadros', 'Imanes', 'Stickers', 'Kits de Regalo'].map(item => (
                <li key={item}>
                  <Link to={`/catalogo/${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Información */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Información</h4>
            <ul className="space-y-3">
              <li><Link to="/mi-cuenta" className="text-sm text-gray-400 hover:text-white transition-colors">Mi cuenta</Link></li>
              <li><Link to="/contacto" className="text-sm text-gray-400 hover:text-white transition-colors">Contacto</Link></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Cómo funciona</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Términos y condiciones</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Contacto</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <WhatsAppIcon size={15} />
                <a href="https://wa.me/5492323618591" className="hover:text-white transition-colors">+54 9 2323 61-8591</a>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail size={15} />
                <a href="mailto:info@inprint.com.ar" className="hover:text-white transition-colors">info@inprint.com.ar</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="container-main py-6 flex items-center justify-center">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} In Print. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
