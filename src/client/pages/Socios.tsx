import React, { useState, useEffect } from 'react';
import { Search, Plus, UserCheck, UserX, Phone, Calendar, Sparkles, Camera } from 'lucide-react';
import { WebcamModal } from '../components/WebcamModal';
import { useTheme } from '../context/ThemeContext';

export const Socios: React.FC<{ onSelectSocioForCobro: (socio: any) => void }> = ({ onSelectSocioForCobro }) => {
  const [socios, setSocios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Modal de alta
  const [modalAltaOpen, setModalAltaOpen] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorAlta, setErrorAlta] = useState('');

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  const cargarSocios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroEstatus !== 'TODOS') params.append('estatus', filtroEstatus);
      if (busqueda) params.append('q', busqueda);

      const res = await fetch(`/api/socios?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSocios(data);
      }
    } catch (err) {
      console.error('Error cargando socios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSocios();
  }, [filtroEstatus, busqueda]);

  const handleCrearSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoTelefono) {
      setErrorAlta('Nombre y teléfono son obligatorios');
      return;
    }

    try {
      setGuardando(true);
      setErrorAlta('');
      const res = await fetch('/api/socios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoNombre,
          telefono: nuevoTelefono,
          email: nuevoEmail,
          fotoBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fallo al registrar socio');
      }

      setModalAltaOpen(false);
      setNuevoNombre('');
      setNuevoTelefono('');
      setNuevoEmail('');
      setFotoBase64('');
      cargarSocios();

      // Ofrecer cobrarle inmediatamente
      onSelectSocioForCobro(data);
    } catch (err: any) {
      setErrorAlta(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-main-theme tracking-tight">
            Directorio de Socios
          </h2>
          <p className="text-sm text-muted-theme mt-1 font-medium">
            Padrón de clientes registrados y perfiles faciales HikCentral
          </p>
        </div>
        <button
          onClick={() => setModalAltaOpen(true)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-md ${
            isCyber
              ? 'bg-volt hover:bg-volt-hover text-black shadow-volt-glow'
              : 'bg-sport-orange hover:bg-sport-orange-hover text-white shadow-orange-glow'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Registrar Nuevo Socio
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card-theme p-3.5 rounded-2xl border border-theme card-shadow-theme">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-theme" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border transition focus:outline-none ${
              isCyber
                ? 'bg-[#151922] border-slate-700/80 text-white placeholder-slate-500 focus:border-volt'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sport-orange'
            }`}
          />
        </div>

        <div className="flex gap-2">
          {['TODOS', 'VIGENTE', 'VENCIDO'].map((est) => {
            const isSelected = filtroEstatus === est;
            return (
              <button
                key={est}
                onClick={() => setFiltroEstatus(est)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all ${
                  isSelected
                    ? isCyber
                      ? 'bg-volt text-black shadow-volt-glow'
                      : 'bg-sport-orange text-white shadow-orange-glow'
                    : isCyber
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {est}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla de Socios */}
      <div className="bg-card-theme border border-theme card-shadow-theme rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme text-left text-sm">
            <thead className="bg-card-alt-theme text-muted-theme font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-4 px-5">Socio</th>
                <th className="py-4 px-5">Contacto</th>
                <th className="py-4 px-5">Estatus Torniquete</th>
                <th className="py-4 px-5">Vigencia Membresía</th>
                <th className="py-4 px-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme text-main-theme">
              {socios.map((s) => (
                <tr
                  key={s.id}
                  className={`transition-colors ${
                    isCyber ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-4 px-5 flex items-center gap-3.5">
                    {s.foto_path ? (
                      <img
                        src={s.foto_path}
                        alt={s.nombre}
                        className="w-11 h-11 rounded-xl object-cover border-2 border-theme"
                      />
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isCyber
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {s.nombre.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-main-theme">{s.nombre}</p>
                      <span className="text-xs font-mono-numbers text-muted-theme">ID: #{s.id}</span>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-theme">
                      <Phone className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-mono-numbers">{s.telefono}</span>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                        s.estatus === 'VIGENTE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {s.estatus === 'VIGENTE' ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Acceso Concedido
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5" /> Bloqueado
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5 text-muted-theme" />
                      <span className="font-mono-numbers">{s.vigencia_fin || 'Sin membresía'}</span>
                    </div>
                    {s.plan_nombre && (
                      <span className="text-xs font-semibold text-muted-theme block mt-0.5">
                        {s.plan_nombre}
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => onSelectSocioForCobro(s)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isCyber
                          ? 'bg-volt/10 border-volt/30 text-volt hover:bg-volt hover:text-black'
                          : 'bg-sport-orange/10 border-sport-orange/30 text-sport-orange hover:bg-sport-orange hover:text-white'
                      }`}
                    >
                      Cobrar / Renovar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {socios.length === 0 && !loading && (
          <div className="p-12 text-center text-muted-theme text-sm">
            No se encontraron socios con los filtros actuales.
          </div>
        )}
      </div>

      {/* Modal Nuevo Socio */}
      {modalAltaOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-theme border border-theme rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl card-shadow-theme">
            <h3 className="font-display font-extrabold text-xl text-main-theme mb-4">
              Registro de Nuevo Socio
            </h3>

            {errorAlta && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold mb-4">
                {errorAlta}
              </div>
            )}

            <form onSubmit={handleCrearSocio} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez García"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium border transition focus:outline-none ${
                    isCyber
                      ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sport-orange'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
                  Teléfono Móvil (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 5512345678"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium border transition focus:outline-none ${
                    isCyber
                      ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sport-orange'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="juan@correo.com"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium border transition focus:outline-none ${
                    isCyber
                      ? 'bg-[#151922] border-slate-700/80 text-white focus:border-volt'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sport-orange'
                  }`}
                />
              </div>

              {/* Fotografía Facial */}
              <div>
                <label className="block text-xs font-bold text-muted-theme uppercase tracking-wider mb-2">
                  Fotografía Facial (Terminal Hikvision)
                </label>
                <div className="flex items-center gap-4">
                  {fotoBase64 ? (
                    <img
                      src={fotoBase64}
                      alt="Previa"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow-md"
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-xl border flex items-center justify-center text-xs text-center p-1 font-medium ${
                        isCyber
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      Sin foto
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setWebcamOpen(true)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                      isCyber
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{fotoBase64 ? 'Cambiar Foto' : 'Tomar con Webcam'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setModalAltaOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isCyber
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md ${
                    isCyber
                      ? 'bg-volt hover:bg-volt-hover text-black shadow-volt-glow'
                      : 'bg-sport-orange hover:bg-sport-orange-hover text-white shadow-orange-glow'
                  }`}
                >
                  {guardando ? 'Registrando...' : 'Guardar y Cobrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webcam Modal */}
      <WebcamModal
        isOpen={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        onCapture={(img) => setFotoBase64(img)}
      />
    </div>
  );
};
