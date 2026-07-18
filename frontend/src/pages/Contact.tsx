import { MapPin, Mail, Instagram, Facebook, Clock, MessageCircle } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen">
      <div className="bg-black text-white py-16">
        <div className="container-main">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Hablemos</p>
          <h1 className="text-4xl md:text-5xl font-black">Contacto</h1>
        </div>
      </div>

      <div className="container-main py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <h2 className="font-bold text-2xl mb-6">Envianos un mensaje</h2>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); alert('Mensaje enviado. Te respondemos en breve.') }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input className="input-base" placeholder="Tu nombre" required />
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input className="input-base" placeholder="Tu apellido" required />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input-base" type="email" placeholder="tu@email.com" required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input-base" placeholder="+54 9 221 ..." />
              </div>
              <div>
                <label className="label">Asunto *</label>
                <select className="input-base" required>
                  <option value="">Seleccioná un tema</option>
                  <option>Consulta sobre un producto</option>
                  <option>Pedido existente</option>
                  <option>Presupuesto corporativo</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className="label">Mensaje *</label>
                <textarea className="input-base resize-none" rows={5} placeholder="¿En qué te podemos ayudar?" required />
              </div>
              <button type="submit" className="btn-primary w-full">
                Enviar mensaje
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-bold text-2xl mb-6">Información de contacto</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-black flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Local</p>
                    <p className="text-gray-500 text-sm mt-1">Av. Ejemplo 1234<br />La Plata, Buenos Aires, Argentina</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-black flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <a href="https://wa.me/5492211234567" className="text-gray-500 text-sm mt-1 hover:text-black transition-colors block">
                      +54 9 221 123-4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-black flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Email</p>
                    <a href="mailto:info@inprint.com.ar" className="text-gray-500 text-sm mt-1 hover:text-black transition-colors block">
                      info@inprint.com.ar
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-black flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Horarios</p>
                    <div className="text-gray-500 text-sm mt-1 space-y-0.5">
                      <p>Lunes a Viernes: 9:00 a 18:00</p>
                      <p>Sábados: 9:00 a 13:00</p>
                      <p>Domingos: Cerrado</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social */}
            <div>
              <p className="font-semibold mb-4">Redes sociales</p>
              <div className="flex gap-3">
                <a href="#" className="flex items-center gap-2 border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-black hover:text-white hover:border-black transition-all">
                  <Instagram size={16} />
                  @inprint.ar
                </a>
                <a href="#" className="flex items-center gap-2 border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-black hover:text-white hover:border-black transition-all">
                  <Facebook size={16} />
                  In Print
                </a>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="h-48 bg-gray-100 border border-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MapPin size={24} className="mx-auto mb-2" />
                <p className="text-sm">Mapa — Av. Ejemplo 1234, La Plata</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
