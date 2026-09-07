import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, AlertTriangle, CheckCircle2, UserPlus, Trash2, 
  Users, ShieldAlert, Sparkles, Building2 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface TeamsPerson {
  personId: string;
  personCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: number;
  headPicUrl: string | null;
  is_registered_in_gym: boolean;
  local_person_id: number | null;
  local_tipo: string | null;
  membresia_estatus: string | null;
  plan_nombre: string | null;
  vigencia_fin: string | null;
  telefono: string;
}

interface TeamsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonImported: () => void;
}

export const TeamsSyncModal: React.FC<TeamsSyncModalProps> = ({ isOpen, onClose, onPersonImported }) => {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [selectedCuentaId, setSelectedCuentaId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [teamsData, setTeamsData] = useState<{
    totalTeams: number;
    unregisteredCount: number;
    registeredCount: number;
    persons: TeamsPerson[];
  } | null>(null);

  const [planes, setPlanes] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [purgingAll, setPurgingAll] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal rápido de importación
  const [importingPerson, setImportingPerson] = useState<TeamsPerson | null>(null);
  const [importPhone, setImportPhone] = useState('');
  const [importTipo, setImportTipo] = useState<'SOCIO' | 'EMPLEADO' | 'VISITANTE'>('SOCIO');
  const [importPlanId, setImportPlanId] = useState<number | ''>('');
  const [savingImport, setSavingImport] = useState(false);

  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  useEffect(() => {
    if (isOpen) {
      cargarCuentas();
      cargarPlanes();
    }
  }, [isOpen]);

  const cargarCuentas = async () => {
    try {
      const res = await fetch('/api/access/cuentas-hct');
      if (res.ok) {
        const data = await res.json();
        setCuentas(data);
        if (data.length > 0) {
          setSelectedCuentaId(data[0].id);
          escanearPersonas(data[0].id);
        }
      }
    } catch (e) {
      console.error('Error cargando cuentas:', e);
    }
  };

  const cargarPlanes = async () => {
    try {
      const res = await fetch('/api/gym/planes');
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        setPlanes(lista);
        if (lista.length > 0) setImportPlanId(lista[0].id);
      }
    } catch (e) {
      console.error('Error cargando planes:', e);
    }
  };

  const escanearPersonas = async (cuentaId = selectedCuentaId) => {
    setLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/iam/teams-persons/${cuentaId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error escaneando checador');
      setTeamsData(data);
    } catch (err: any) {
      setActionMsg({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImport = (p: TeamsPerson) => {
    setImportingPerson(p);
    setImportPhone(p.telefono || '');
    setImportTipo('SOCIO');
    if (planes.length === 0) {
      cargarPlanes();
    } else {
      setImportPlanId(planes[0].id);
    }
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importingPerson) return;
    setSavingImport(true);
    setActionMsg(null);

    try {
      const res = await fetch(`/api/iam/teams-persons/${selectedCuentaId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: importingPerson.personId,
          firstName: importingPerson.firstName,
          lastName: importingPerson.lastName,
          phone: importPhone.trim(),
          photoUrl: importingPerson.headPicUrl,
          tipo: importTipo,
          planId: importTipo === 'SOCIO' && importPlanId ? Number(importPlanId) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');

      setActionMsg({ ok: true, text: `"${importingPerson.fullName}" importado exitosamente a clientes` });
      setImportingPerson(null);
      onPersonImported();
      escanearPersonas(selectedCuentaId);
    } catch (err: any) {
      setActionMsg({ ok: false, text: err.message });
    } finally {
      setSavingImport(false);
    }
  };

  const handleDeleteFromTeams = async (p: TeamsPerson) => {
    if (!confirm(`¿Eliminar a "${p.fullName}" del checador y de Teams? Esta acción liberará 1 cupo.`)) return;

    setActionLoadingId(p.personId);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/iam/teams-persons/${selectedCuentaId}/${p.personId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo al eliminar de Teams');

      setActionMsg({ ok: true, text: `"${p.fullName}" eliminado de Teams y del checador.` });
      onPersonImported();
      escanearPersonas(selectedCuentaId);
    } catch (err: any) {
      setActionMsg({ ok: false, text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePurgeAllUnregistered = async () => {
    if (!teamsData || teamsData.unregisteredCount === 0) return;
    const msg = `⚠️ ATENCIÓN: Vas a purgar ${teamsData.unregisteredCount} personas NO registradas en el gimnasio de Teams y del checador.\n\n¿Deseas proceder?`;
    if (!confirm(msg)) return;

    setPurgingAll(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/iam/teams-persons/${selectedCuentaId}/purge-unregistered`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo en purga masiva');

      setActionMsg({ ok: true, text: data.message });
      escanearPersonas(selectedCuentaId);
      onPersonImported();
    } catch (err: any) {
      setActionMsg({ ok: false, text: err.message });
    } finally {
      setPurgingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card-theme border border-theme rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="p-5 border-b border-theme flex items-center justify-between gap-4 bg-theme-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-main-theme flex items-center gap-2">
                Buzón de Checador & Triaje Teams
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-theme border border-theme text-muted-theme font-mono">
                  En Vivo
                </span>
              </h3>
              <p className="text-xs text-muted-theme">
                Audita personas registradas en el hardware, impórtalas a tu gimnasio o purga usuarios externos.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-muted-theme hover:text-main-theme hover:bg-theme-subtle transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros y Acciones */}
        <div className="p-4 border-b border-theme bg-theme-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-muted-theme" />
            <select
              value={selectedCuentaId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedCuentaId(id);
                escanearPersonas(id);
              }}
              className="bg-card-theme border border-theme rounded-xl px-3 py-1.5 text-xs text-main-theme focus:outline-none focus:border-cyan-400 font-bold"
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} (ID {c.id})
                </option>
              ))}
            </select>

            <button
              onClick={() => escanearPersonas()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-theme border border-theme hover:text-cyan-400 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{loading ? 'Escaneando...' : 'Escanear Checador'}</span>
            </button>
          </div>

          {teamsData && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-card-theme border border-theme text-main-theme font-bold">
                  Total: {teamsData.totalTeams}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Vinculados: {teamsData.registeredCount}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  No Registrados: {teamsData.unregisteredCount}
                </span>
              </div>

              {teamsData.unregisteredCount > 0 && (
                <button
                  onClick={handlePurgeAllUnregistered}
                  disabled={purgingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{purgingAll ? 'Purgando...' : `Purgar ${teamsData.unregisteredCount} No Registrados`}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mensaje de Resultado de Acción */}
        {actionMsg && (
          <div className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            actionMsg.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {actionMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Lista de Personas */}
        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
              <p className="text-xs text-muted-theme font-medium">Consultando checadores y nube de Teams...</p>
            </div>
          ) : !teamsData || teamsData.persons.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-theme rounded-2xl">
              <Users className="w-8 h-8 mx-auto text-muted-theme" />
              <p className="text-xs font-bold text-main-theme">No se encontraron personas en este checador</p>
              <p className="text-[11px] text-muted-theme">Presiona "Escanear Checador" para sincronizar la lista.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamsData.persons.map((p) => (
                <div
                  key={p.personId}
                  className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                    p.is_registered_in_gym
                      ? 'bg-card-theme border-emerald-500/20 shadow-sm'
                      : 'bg-amber-500/5 border-amber-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Foto Facial */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-theme-subtle border border-theme shrink-0 flex items-center justify-center">
                      {p.headPicUrl ? (
                        <img src={p.headPicUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-muted-theme" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-main-theme truncate flex items-center gap-1.5">
                        {p.fullName || 'Sin Nombre'}
                        <span className="text-[10px] font-mono text-muted-theme">({p.personCode})</span>
                      </h4>
                      <div className="text-[11px] text-muted-theme font-mono truncate">ID: {p.personId}</div>

                      <div className="mt-2">
                        {p.is_registered_in_gym ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              🟢 Cliente en Sistema
                            </span>
                            {p.plan_nombre && (
                              <span className="px-2 py-0.5 rounded-full bg-theme-subtle border border-theme text-main-theme font-semibold">
                                {p.plan_nombre} ({p.membresia_estatus})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-[11px]">
                            <AlertTriangle className="w-3 h-3" /> No Registrado en Gym
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {!p.is_registered_in_gym && (
                      <button
                        onClick={() => handleOpenImport(p)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                          isCyber ? 'bg-volt text-black hover:opacity-90' : 'bg-sport-orange text-white hover:opacity-90'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Importar</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteFromTeams(p)}
                      disabled={actionLoadingId === p.personId}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/20 transition"
                      title="Eliminar de Teams y liberar cupo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === p.personId ? 'Borrando...' : 'Purgar'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Rápido de Importación a Clientes */}
        {importingPerson && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-card-theme border border-theme rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-theme pb-3">
                <h4 className="font-bold text-sm text-main-theme flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  Importar Persona a Clientes
                </h4>
                <button onClick={() => setImportingPerson(null)} className="text-muted-theme hover:text-main-theme">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmImport} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-theme">Nombre en Teams</label>
                  <input
                    type="text"
                    disabled
                    value={importingPerson.fullName}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs font-bold text-main-theme"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-theme">Teléfono (Obligatorio)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 2281234567"
                    value={importPhone}
                    onChange={(e) => setImportPhone(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-theme">Tipo de Persona</label>
                    <select
                      value={importTipo}
                      onChange={(e) => setImportTipo(e.target.value as any)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-bold"
                    >
                      <option value="SOCIO">Socio / Cliente</option>
                      <option value="EMPLEADO">Empleado / Staff</option>
                      <option value="VISITANTE">Visitante</option>
                    </select>
                  </div>

                  {importTipo === 'SOCIO' && (
                    <div>
                      <label className="text-xs font-semibold text-muted-theme">Plan Inicial</label>
                      <select
                        value={importPlanId}
                        onChange={(e) => setImportPlanId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-theme-subtle border border-theme text-xs text-main-theme font-bold focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">-- Sin Plan Inicial (Cobrar después) --</option>
                        {planes.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.nombre} (${pl.precio} MXN - {pl.duracion_dias} días)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setImportingPerson(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-muted-theme hover:bg-theme-subtle"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingImport}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                      isCyber ? 'bg-volt text-black hover:opacity-90' : 'bg-sport-orange text-white hover:opacity-90'
                    }`}
                  >
                    {savingImport ? 'Guardando...' : 'Confirmar Importación'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
