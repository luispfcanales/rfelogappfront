import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Search, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Package, 
  Download,
  Eye,
  RefreshCw,
  Clock,
  Filter,
  UserCheck,
  Tag
} from 'lucide-react';
import type { Solicitud, CatalogoData, EstadoSolicitud, User } from '../types';

interface DashboardProps {
  currentUser: User;
  solicitudes: Solicitud[];
  catalogos: CatalogoData;
  onDownloadPDF: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  solicitudes,
  catalogos,
  onDownloadPDF,
  onRefresh,
  loading,
}) => {
  const navigate = useNavigate();

  // Filter States
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterTipoSolicitud, setFilterTipoSolicitud] = useState<string>('todos');
  const [filterDestino, setFilterDestino] = useState<string>('todos');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('todos');
  const [filterFechaInicio, setFilterFechaInicio] = useState<string>('');
  const [filterFechaFin, setFilterFechaFin] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status badge styling helper
  const getStatusBadge = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'Borrador':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Pendiente de Envío
          </span>
        );
      case 'Enviado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Enviado
          </span>
        );
      case 'Recibido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2d5a27]" />
            Recibido
          </span>
        );
      default:
        return null;
    }
  };

  const safeSolicitudes = Array.isArray(solicitudes) ? solicitudes : [];
  const safeEmpresas = Array.isArray(catalogos?.empresas_transporte) ? catalogos.empresas_transporte : [];
  const safeDestinos = Array.isArray(catalogos?.destinos) ? catalogos.destinos : [];
  const safeTiposSolicitud = Array.isArray(catalogos?.tipos_solicitud) ? catalogos.tipos_solicitud : [];

  // Role-based visibility enforcement:
  // If role is Solicitante, only show requests belonging to this user
  const accessibleSolicitudes = useMemo(() => {
    if (currentUser.rol === 'Solicitante') {
      return safeSolicitudes.filter(
        (s) => s.solicitante_dni === currentUser.dni || s.enviado_por_dni === currentUser.dni
      );
    }
    return safeSolicitudes;
  }, [safeSolicitudes, currentUser]);

  // Filtered solicitudes calculation
  const filteredSolicitudes = useMemo(() => {
    return accessibleSolicitudes.filter((item) => {
      // Estado
      if (filterEstado !== 'todos' && item.estado !== filterEstado) {
        return false;
      }
      // Tipo de Solicitud
      if (filterTipoSolicitud !== 'todos' && item.tipo_solicitud_id !== filterTipoSolicitud && item.tipo_solicitud_nombre !== filterTipoSolicitud) {
        return false;
      }
      // Destino
      if (filterDestino !== 'todos' && item.destino_id !== filterDestino && !item.destinos?.some(d => d.id === filterDestino)) {
        return false;
      }
      // Empresa de transporte
      if (filterEmpresa !== 'todos' && item.empresa_transporte_id !== filterEmpresa) {
        return false;
      }
      // Rango de Fechas
      if (filterFechaInicio) {
        const itemDate = new Date(item.fecha_registro).toISOString().split('T')[0];
        if (itemDate < filterFechaInicio) return false;
      }
      if (filterFechaFin) {
        const itemDate = new Date(item.fecha_registro).toISOString().split('T')[0];
        if (itemDate > filterFechaFin) return false;
      }
      // Search query (code, solicitante, destinatario, gestor, tipo)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchId = item.id?.toLowerCase().includes(q);
        const matchSolicitante = item.solicitante_nombre?.toLowerCase().includes(q);
        const matchDestinatario = (item.destinatario_proveedor_nombre || item.destinatario_nombre || '').toLowerCase().includes(q);
        const matchGestor = item.gestor_nombre?.toLowerCase().includes(q);
        const matchTipo = item.tipo_solicitud_nombre?.toLowerCase().includes(q);
        if (!matchId && !matchSolicitante && !matchDestinatario && !matchGestor && !matchTipo) {
          return false;
        }
      }
      return true;
    });
  }, [accessibleSolicitudes, filterEstado, filterTipoSolicitud, filterDestino, filterEmpresa, filterFechaInicio, filterFechaFin, searchQuery]);

  // Statistics (based on accessible shipments)
  const stats = useMemo(() => {
    const total = accessibleSolicitudes.length;
    const borradores = accessibleSolicitudes.filter((s) => s.estado === 'Borrador').length;
    const enviados = accessibleSolicitudes.filter((s) => s.estado === 'Enviado').length;
    const recibidos = accessibleSolicitudes.filter((s) => s.estado === 'Recibido').length;
    return { total, borradores, enviados, recibidos };
  }, [accessibleSolicitudes]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#122014]">
              {currentUser.rol === 'Solicitante' ? 'Mis Solicitudes de Envío' : 'Tablero de Envíos'}
            </h1>
            {currentUser.rol === 'Solicitante' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb] flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Mis Envíos
              </span>
            )}
          </div>
          <p className="text-xs text-[#5a725e] mt-0.5">
            {currentUser.rol === 'Solicitante'
              ? 'Visualiza y consulta el estado de tus solicitudes registradas'
              : 'Monitoreo y trazabilidad general de solicitudes de logística interna'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#e2ebe3] bg-white text-[#4a5e4d] hover:text-[#2d5a27] hover:bg-[#eaf2eb] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/solicitudes/nueva')}
            className="px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2d5a27] hover:bg-[#366839] shadow-md shadow-[#2d5a27]/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Solicitud</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-white border border-[#e2ebe3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a725e]">
              {currentUser.rol === 'Solicitante' ? 'Mis Envíos' : 'Total Envíos'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#122014] mt-2">
            {stats.total}
          </div>
        </div>

        {/* Pendientes de Envío */}
        <div className="p-4 rounded-2xl bg-white border border-[#e2ebe3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a725e]">Pendientes de Envío</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#122014] mt-2">
            {stats.borradores}
          </div>
        </div>

        {/* Enviados */}
        <div className="p-4 rounded-2xl bg-white border border-[#e2ebe3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a725e]">En Tránsito</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {stats.enviados}
          </div>
        </div>

        {/* Recibidos */}
        <div className="p-4 rounded-2xl bg-white border border-[#e2ebe3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5a725e]">Recibidos</span>
            <div className="w-8 h-8 rounded-lg bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#2d5a27] mt-2">
            {stats.recibidos}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e2ebe3] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2d5a27]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros Avanzados</span>
          </div>
          {(filterEstado !== 'todos' || filterDestino !== 'todos' || filterEmpresa !== 'todos' || filterFechaInicio || filterFechaFin || searchQuery) && (
            <button
              onClick={() => {
                setFilterEstado('todos');
                setFilterDestino('todos');
                setFilterEmpresa('todos');
                setFilterFechaInicio('');
                setFilterFechaFin('');
                setSearchQuery('');
              }}
              className="text-xs text-rose-500 hover:underline cursor-pointer font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, solicitante, destinatario..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#e2ebe3] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
            />
          </div>

          {/* Estado */}
          <div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#e2ebe3] text-[#122014] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
            >
              <option value="todos">Todos los Estados</option>
              <option value="Borrador">Pendiente de Envío</option>
              <option value="Enviado">Enviado (En Tránsito)</option>
              <option value="Recibido">Recibido</option>
            </select>
          </div>

          {/* Tipo de Solicitud */}
          <div>
            <select
              value={filterTipoSolicitud}
              onChange={(e) => setFilterTipoSolicitud(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#e2ebe3] text-[#122014] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
            >
              <option value="todos">Todos los Tipos</option>
              {safeTiposSolicitud.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {/* Destino */}
          <div>
            <select
              value={filterDestino}
              onChange={(e) => setFilterDestino(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#e2ebe3] text-[#122014] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
            >
              <option value="todos">Todos los Destinos</option>
              {safeDestinos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          {/* Empresa */}
          <div>
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#e2ebe3] text-[#122014] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
            >
              <option value="todos">Todas las Empresas</option>
              {safeEmpresas.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha Inicio */}
          <div>
            <input
              type="date"
              value={filterFechaInicio}
              onChange={(e) => setFilterFechaInicio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#e2ebe3] text-[#122014] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
              title="Fecha desde"
            />
          </div>
        </div>
      </div>

      {/* Shipments Table Card */}
      <div className="rounded-2xl bg-white border border-[#e2ebe3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#e2ebe3] flex items-center justify-between">
          <div className="text-xs font-bold text-[#122014] flex items-center gap-2">
            <span>{currentUser.rol === 'Solicitante' ? 'Mis Envíos Registrados' : 'Envíos Registrados'}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#eaf2eb] text-[#2d5a27] text-[11px]">
              {filteredSolicitudes.length}
            </span>
          </div>
        </div>

        {filteredSolicitudes.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5a725e]">
            {loading ? 'Cargando solicitudes...' : currentUser.rol === 'Solicitante' ? 'Aún no tienes solicitudes de envío registradas con tu DNI.' : 'No se encontraron solicitudes con los filtros seleccionados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tipo & Bultos</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4">Transporte & Destino</th>
                  <th className="py-3 px-4">Destinatario</th>
                  <th className="py-3 px-4">Gestor</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ebe3]">
                {filteredSolicitudes.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-[#f8faf7] transition-colors cursor-pointer"
                    onClick={() => navigate(`/solicitudes/${item.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#2d5a27]">
                      {item.id}
                    </td>
                    <td className="py-3.5 px-4 text-[#5a725e] whitespace-nowrap">
                      {new Date(item.fecha_registro).toLocaleDateString('es-PE')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {item.tipo_solicitud_nombre && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Tag className="w-3 h-3 text-[#2d5a27]" />
                            <span>{item.tipo_solicitud_nombre}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-800">
                          <Package className="w-3 h-3 text-blue-600" />
                          <span>{item.numero_bultos || 1} {item.numero_bultos === 1 ? 'bulto' : 'bultos'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#122014]">
                        {item.solicitante_nombre}
                      </div>
                      <div className="text-[11px] font-mono text-[#5a725e]">
                        DNI: {item.solicitante_dni}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#122014] flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#2d5a27]" />
                        <span>{item.empresa_transporte_nombre || 'Sin empresa'}</span>
                      </div>
                      <div className="text-[11px] text-[#5a725e] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{item.destino_nombre}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#122014]">
                      {item.destinatario_proveedor_nombre || item.destinatario_nombre}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[#122014] font-medium">
                        {item.gestor_nombre}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(item.estado)}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/solicitudes/${item.id}`)}
                          className="p-1.5 text-[#5a725e] hover:text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors cursor-pointer"
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownloadPDF(item.id)}
                          className="p-1.5 text-[#5a725e] hover:text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors cursor-pointer"
                          title="Descargar Reporte PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
