import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Truck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Navigation, 
  ExternalLink, 
  Lock, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Loader2, 
  Eye,
  Upload,
  X,
  Plus,
  Search,
  CheckSquare,
  Square,
  Trash2,
  Image as ImageIcon,
  Tag,
  MapPin,
  Building
} from 'lucide-react';
import type { Solicitud, User, EstadoSolicitud, CatalogoData, OdooPurchaseOrder } from '../types';
import { SearchableSelect, type SearchableOption } from './SearchableSelect';

interface DetalleSolicitudProps {
  solicitud?: Solicitud;
  allSolicitudes?: Solicitud[];
  currentUser: User;
  catalogos?: CatalogoData;
  onBack?: () => void;
  onUpdateState: (
    id: string,
    nuevoEstado: EstadoSolicitud,
    extraData?: {
      fecha_envio_destinatario?: string;
      empresa_transporte_id?: string;
      empresa_transporte_clave?: string;
      guia_archivo?: { nombre: string; mime_type: string; contenido: string };
      ordenes_compra?: OdooPurchaseOrder[];
    }
  ) => Promise<void>;
  onDownloadPDF: (id: string) => void;
  apiBase: string;
}

export const DetalleSolicitud: React.FC<DetalleSolicitudProps> = ({
  solicitud: directSolicitud,
  allSolicitudes = [],
  currentUser,
  catalogos,
  onBack,
  onUpdateState,
  onDownloadPDF,
  apiBase,
}) => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();

  // Determine which solicitud to display
  const solicitud = directSolicitud || allSolicitudes.find((s) => s.id === params.id);

  // Input for Gestor when advancing to "Enviado"
  const [fechaEnvio, setFechaEnvio] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<number, boolean>>({});

  // Dispatch completion form states (for Borrador -> Enviado)
  const safeEmpresas = Array.isArray(catalogos?.empresas_transporte) ? catalogos.empresas_transporte : [];
  const [empresaId, setEmpresaId] = useState<string>('');
  const [empresaClave, setEmpresaClave] = useState<string>('');
  const [guiaFile, setGuiaFile] = useState<{
    nombre: string;
    mime_type: string;
    contenido: string;
    previewUrl?: string;
  } | null>(null);

  // Purchase Orders & Line selection state
  const [ordenesCompra, setOrdenesCompra] = useState<OdooPurchaseOrder[]>([]);

  // Line search states
  const [viewLineSearchQueries, setViewLineSearchQueries] = useState<Record<number, string>>({});
  const [editLineSearchQueries, setEditLineSearchQueries] = useState<Record<number, string>>({});
  const [modalLineSearch, setModalLineSearch] = useState<string>('');

  // Odoo Search state within DetalleSolicitud
  const [odooQuery, setOdooQuery] = useState('');
  const [odooLoading, setOdooLoading] = useState(false);
  const [odooSearchResults, setOdooSearchResults] = useState<OdooPurchaseOrder[] | null>(null);
  const [odooSearchError, setOdooSearchError] = useState<string | null>(null);
  const [showOdooSearch, setShowOdooSearch] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<OdooPurchaseOrder | null>(null);

  // Sync initial values from solicitud when loaded
  useEffect(() => {
    if (solicitud) {
      if (solicitud.empresa_transporte_id) {
        setEmpresaId(solicitud.empresa_transporte_id);
      } else if (safeEmpresas.length > 0 && !empresaId) {
        setEmpresaId(safeEmpresas[0].id);
      }
      if (solicitud.empresa_transporte_clave) {
        setEmpresaClave(solicitud.empresa_transporte_clave);
      }
      if (solicitud.ordenes_compra && Array.isArray(solicitud.ordenes_compra)) {
        setOrdenesCompra(
          solicitud.ordenes_compra.map((po) => ({
            ...po,
            lines: (po.lines || []).map((l) => ({
              ...l,
              seleccionada: l.seleccionada !== false, // default true
            })),
          }))
        );
        // Expand all by default
        const exp: Record<number, boolean> = {};
        solicitud.ordenes_compra.forEach((po) => {
          exp[po.id] = true;
        });
        setExpandedOrderIds(exp);
      }
    }
  }, [solicitud, safeEmpresas]);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (!solicitud) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-3xl border border-[#e2ebe3] shadow-xs space-y-4 animate-fade-in">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-[#122014]">Solicitud no encontrada</h2>
        <p className="text-xs text-[#5a725e]">
          No se pudo localizar el registro de la solicitud indicada en el sistema.
        </p>
        <button
          type="button"
          onClick={handleGoBack}
          className="px-6 py-2.5 rounded-xl bg-[#2d5a27] text-white text-xs font-semibold hover:bg-[#366839] transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Tablero</span>
        </button>
      </div>
    );
  }

  // Permissions: Gestor or Admin can manipulate shipment state
  const isGestorOrAdmin = currentUser.rol === 'Gestor' || currentUser.rol === 'Administrador';

  // Map Empresa options for SearchableSelect
  const empresaOptions: SearchableOption[] = safeEmpresas.map((e) => ({
    id: e.id,
    title: e.nombre,
    subtitle: e.requiere_clave ? 'Requiere Clave de Seguridad (ej. Shalom)' : 'Envío estándar sin clave',
  }));

  // Check Shalom requirement
  const selectedEmpresa = safeEmpresas.find((e) => e.id === empresaId);
  const requiresShalomClave = selectedEmpresa?.requiere_clave || selectedEmpresa?.nombre.toLowerCase().includes('shalom');

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || result;
        resolve(base64Data);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleGuiaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      setGuiaFile({
        nombre: file.name,
        mime_type: file.type || 'application/pdf',
        contenido: base64,
        previewUrl,
      });
      setActionError(null);
    } catch {
      setActionError('Error al procesar el archivo de la Guía.');
    }
  };

  // Toggle single line selection
  const handleToggleLine = (orderId: number, lineId: number) => {
    setOrdenesCompra((prev) =>
      prev.map((po) => {
        if (po.id !== orderId) return po;
        return {
          ...po,
          lines: (po.lines || []).map((l) => {
            if (l.id !== lineId) return l;
            return { ...l, seleccionada: !l.seleccionada };
          }),
        };
      })
    );
  };

  // Toggle all lines for a given order
  const handleToggleAllLines = (orderId: number, selectAll: boolean) => {
    setOrdenesCompra((prev) =>
      prev.map((po) => {
        if (po.id !== orderId) return po;
        return {
          ...po,
          lines: (po.lines || []).map((l) => ({ ...l, seleccionada: selectAll })),
        };
      })
    );
  };

  // Search Odoo in dispatch form
  const handleSearchOdoo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = odooQuery.trim();
    if (!query) return;

    setOdooLoading(true);
    setOdooSearchError(null);
    setOdooSearchResults(null);

    try {
      const res = await fetch(`${apiBase}/api/odoo/purchase-orders?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOdooSearchResults(data.data);
        if (data.data.length === 0) {
          setOdooSearchError(`No se encontraron órdenes de compra en Odoo con el término "${query}".`);
        }
      } else {
        setOdooSearchError(data.error || 'No se pudo obtener información de Odoo');
      }
    } catch {
      setOdooSearchError('Error de conexión con el servidor al consultar Odoo ERP.');
    } finally {
      setOdooLoading(false);
    }
  };

  const handleAddPurchaseOrder = (po: OdooPurchaseOrder) => {
    if (ordenesCompra.some((item) => item.id === po.id)) {
      return;
    }
    const poWithSelected = {
      ...po,
      lines: (po.lines || []).map((l) => ({ ...l, seleccionada: true })),
    };
    setOrdenesCompra((prev) => [...prev, poWithSelected]);
    setExpandedOrderIds((prev) => ({ ...prev, [po.id]: true }));
    setShowOdooSearch(false);
  };

  const handleRemovePurchaseOrder = (orderId: number) => {
    setOrdenesCompra((prev) => prev.filter((item) => item.id !== orderId));
  };

  const toggleExpandOrder = (orderId: number) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Handle status progression
  const handleAdvanceState = async (nuevoEstado: EstadoSolicitud) => {
    setActionError(null);

    if (nuevoEstado === 'Enviado') {
      if (!empresaId) {
        setActionError('Debes seleccionar la Empresa de Transporte antes de enviar.');
        return;
      }
      if (requiresShalomClave && !empresaClave.trim()) {
        setActionError('Para envíos con Shalom, debes ingresar la Clave de Seguridad.');
        return;
      }
      // Note: Guía is optional
      if (ordenesCompra.length > 0) {
        const totalSelected = ordenesCompra.reduce((acc, po) => {
          return acc + (po.lines || []).filter((l) => l.seleccionada).length;
        }, 0);
        if (totalSelected === 0) {
          setActionError('Debes marcar al menos una línea de producto para enviar.');
          return;
        }
      }
    }

    setUpdating(true);
    try {
      await onUpdateState(solicitud.id, nuevoEstado, {
        fecha_envio_destinatario: fechaEnvio,
        empresa_transporte_id: empresaId,
        empresa_transporte_clave: requiresShalomClave ? empresaClave : undefined,
        guia_archivo: guiaFile ? {
          nombre: guiaFile.nombre,
          mime_type: guiaFile.mime_type,
          contenido: guiaFile.contenido,
        } : undefined,
        ordenes_compra: ordenesCompra.length > 0 ? ordenesCompra : undefined,
      });
    } catch (err: any) {
      setActionError(err?.message || 'Error al actualizar el estado de la solicitud');
    } finally {
      setUpdating(false);
    }
  };

  const getOdooStateBadge = (state: string) => {
    switch (state) {
      case 'purchase':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
            Aprobada / Pedido
          </span>
        );
      case 'done':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Bloqueado / Realizado
          </span>
        );
      case 'draft':
      case 'sent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Borrador / Presupuesto
          </span>
        );
      case 'to approve':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Por Aprobar
          </span>
        );
      case 'cancel':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {state}
          </span>
        );
    }
  };

  // State timeline visual helper
  const renderTimeline = () => {
    const states: { id: EstadoSolicitud; label: string; date?: string }[] = [
      { id: 'Borrador', label: 'Borrador / Registrado', date: solicitud.fecha_transicion_borrador },
      { id: 'Enviado', label: 'Enviado / En Tránsito', date: solicitud.fecha_transicion_enviado },
      { id: 'Recibido', label: 'Recibido / Entregado', date: solicitud.fecha_transicion_recibido },
    ];

    const currentStateIndex = states.findIndex((s) => s.id === solicitud.estado);

    return (
      <div className="py-6 px-4 sm:px-8 border-b border-[#e2ebe3] bg-[#f8faf7]">
        <div className="relative flex items-center justify-between max-w-2xl mx-auto">
          {/* Connecting Line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#e2ebe3] z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#2d5a27] transition-all duration-500 z-0"
            style={{
              width: `${(currentStateIndex / (states.length - 1)) * 100}%`,
            }}
          />

          {states.map((st, index) => {
            const isCompleted = index <= currentStateIndex;
            const isCurrent = index === currentStateIndex;

            return (
              <div key={st.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-xs ${
                    isCurrent
                      ? 'bg-[#2d5a27] text-white ring-4 ring-[#2d5a27]/20 scale-110'
                      : isCompleted
                      ? 'bg-[#2d5a27] text-white'
                      : 'bg-white text-[#5a725e] border-2 border-[#c8decb]'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-2 text-center whitespace-nowrap ${
                    isCurrent ? 'text-[#2d5a27] font-bold' : isCompleted ? 'text-[#122014]' : 'text-[#5a725e]'
                  }`}
                >
                  {st.label}
                </span>
                {st.date && (
                  <span className="text-[10px] text-[#5a725e] mt-0.5 font-mono">
                    {new Date(st.date).toLocaleDateString('es-PE')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleGoBack}
          className="flex items-center gap-2 text-xs font-semibold text-[#5a725e] hover:text-[#2d5a27] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Tablero</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onDownloadPDF(solicitud.id)}
            className="px-4 py-2 rounded-xl border border-[#c8decb] bg-white hover:bg-[#eaf2eb] text-[#2d5a27] text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Guía PDF</span>
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="rounded-3xl bg-white border border-[#e2ebe3] shadow-xl overflow-hidden">
        
        {/* Banner Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-[#2d5a27]/10 via-[#4e8752]/5 to-transparent border-b border-[#e2ebe3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#2d5a27] font-bold uppercase tracking-wider">
              <span>Rainforest Expeditions</span>
              <span>•</span>
              <span className="font-mono">{solicitud.id}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#122014] mt-1">
              Detalle del Envío
            </h2>
            <p className="text-xs text-[#5a725e] mt-0.5">
              Registrado el {new Date(solicitud.fecha_registro).toLocaleString('es-PE')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5a725e]">Estado:</span>
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-bold ${
                solicitud.estado === 'Recibido'
                  ? 'bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]'
                  : solicitud.estado === 'Enviado'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {solicitud.estado}
            </span>
          </div>
        </div>

        {/* Lifecycle Visual Timeline */}
        {renderTimeline()}

        {/* ================= 1. INFORMACIÓN DETALLADA DEL ENVÍO ================= */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e2ebe3]">
            <span className="w-6 h-6 rounded-full bg-[#2d5a27] text-white flex items-center justify-center text-xs font-bold shrink-0">
              i
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#122014]">
              Información Detallada del Envío
            </h3>
          </div>

          {/* Grid Layout of Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Tipo de Solicitud */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Tipo de Solicitud:</span>
              </span>
              <div className="font-bold text-[#122014]">
                {solicitud.tipo_solicitud_nombre || 'General'}
              </div>
            </div>

            {/* Número de Bultos */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Número de Bultos:</span>
              </span>
              <div className="font-bold text-[#122014] text-sm">
                {solicitud.numero_bultos || 1} {solicitud.numero_bultos === 1 ? 'bulto' : 'bultos'}
              </div>
            </div>

            {/* Solicitante */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Solicitante:</span>
              <div className="font-bold text-[#122014]">{solicitud.solicitante_nombre}</div>
              <div className="text-[11px] font-mono text-[#5a725e]">DNI: {solicitud.solicitante_dni}</div>
            </div>

            {/* Enviado por */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Entregado por:</span>
              <div className="font-bold text-[#122014]">{solicitud.enviado_por_nombre}</div>
              <div className="text-[11px] font-mono text-[#5a725e]">DNI: {solicitud.enviado_por_dni}</div>
            </div>

            {/* Destino(s) */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1.5 sm:col-span-2 lg:col-span-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Destino(s):</span>
              </span>
              {solicitud.destinos && solicitud.destinos.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {solicitud.destinos.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#c8decb] text-[#122014]"
                    >
                      <MapPin className="w-3 h-3 text-[#2d5a27]" />
                      <span>{d.nombre}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="font-bold text-[#122014]">{solicitud.destino_nombre}</div>
              )}
            </div>

            {/* Destinatario(s) */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1.5 sm:col-span-2 lg:col-span-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Destinatario(s):</span>
              </span>
              {solicitud.destinatarios && solicitud.destinatarios.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {solicitud.destinatarios.map((d, i) => (
                    <span
                      key={`${d.id}_${i}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#c8decb] text-[#122014]"
                    >
                      <Building className="w-3 h-3 text-[#2d5a27]" />
                      <span>
                        {d.nombre}
                        {d.proveedor_nombre && <span className="text-[#2d5a27] font-normal"> ({d.proveedor_nombre})</span>}
                        {d.destino_nombre && <span className="text-[#5a725e] font-normal text-[11px]"> → {d.destino_nombre}</span>}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="font-bold text-[#122014]">
                  {solicitud.destinatario_proveedor_nombre || solicitud.destinatario_nombre}
                </div>
              )}
            </div>

            {/* Transporte & Shalom Clave */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Empresa de Transporte:</span>
              <div className="font-bold text-[#122014]">
                {solicitud.empresa_transporte_nombre || <span className="text-[#5a725e] font-normal italic">Pendiente de asignación</span>}
              </div>
              {solicitud.empresa_transporte_clave && (
                <div className="mt-1 p-1.5 rounded-lg bg-amber-100 text-amber-900 font-mono font-bold text-xs inline-block">
                  Clave Shalom: {solicitud.empresa_transporte_clave}
                </div>
              )}
            </div>

            {/* Guía Transportista */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-2">
              <span className="text-[11px] text-[#5a725e] font-semibold">Guía del Transportista:</span>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#122014] truncate max-w-[150px]">
                  {solicitud.guia_transportista_nombre || <span className="text-[#5a725e] font-normal italic">Sin guía adjunta</span>}
                </span>
                {solicitud.guia_transportista_id && (
                  <a
                    href={`${apiBase}/api/archivos/ver?id=${solicitud.guia_transportista_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Ver archivo adjunto"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ver</span>
                  </a>
                )}
              </div>
            </div>

            {/* Foto del Producto / Paquete */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-2">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Foto del Producto / Paquete:</span>
              </span>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#122014] truncate max-w-[150px]">
                  {solicitud.imagen_nombre || <span className="text-[#5a725e] font-normal italic">Sin foto adjunta</span>}
                </span>
                {solicitud.imagen_id && (
                  <a
                    href={`${apiBase}/api/archivos/ver?id=${solicitud.imagen_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Ver foto del producto"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver</span>
                  </a>
                )}
              </div>
            </div>

            {/* Gestor */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Gestor Responsable:</span>
              <div className="font-bold text-[#122014]">{solicitud.gestor_nombre}</div>
              <div className="text-[11px] font-mono text-[#5a725e]">DNI: {solicitud.gestor_dni}</div>
            </div>
          </div>

          {/* Odoo Purchase Orders Attached */}
          {solicitud.ordenes_compra && solicitud.ordenes_compra.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#e2ebe3]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#2d5a27] flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Órdenes de Compra Odoo Vinculadas ({solicitud.ordenes_compra.length})</span>
              </div>

              <div className="space-y-3">
                {solicitud.ordenes_compra.map((po) => {
                  const isExpanded = !!expandedOrderIds[po.id];
                  const lines = po.lines || [];
                  const searchQuery = (viewLineSearchQueries[po.id] || '').trim().toLowerCase();
                  
                  const filteredLines = searchQuery
                    ? lines.filter(
                        (l) =>
                          (l.product_name || '').toLowerCase().includes(searchQuery) ||
                          (l.name || '').toLowerCase().includes(searchQuery)
                      )
                    : lines;

                  return (
                    <div
                      key={po.id}
                      className="rounded-2xl bg-white border border-[#c8decb] shadow-xs overflow-hidden"
                    >
                      {/* Header */}
                      <div className="p-4 bg-[#f8faf7] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center font-mono font-bold text-xs">
                            OC
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#2d5a27]">
                                {po.name}
                              </span>
                              {getOdooStateBadge(po.state)}
                            </div>
                            <div className="text-xs font-semibold text-[#122014] mt-0.5">
                              {po.partner_name}
                            </div>
                            <div className="text-[11px] text-[#5a725e] flex items-center gap-3 mt-0.5">
                              <span>Fecha: {po.date_order ? new Date(po.date_order).toLocaleDateString('es-PE') : 'N/A'}</span>
                              <span>• {lines.length} producto(s)</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpandOrder(po.id)}
                          className="px-3 py-1.5 rounded-lg border border-[#c8decb] bg-white hover:bg-[#eaf2eb] text-xs font-semibold text-[#2d5a27] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{lines.length} productos</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expandable Table with Search Filter */}
                      {isExpanded && (
                        <div className="p-4 border-t border-[#e2ebe3] bg-white space-y-3">
                          {/* Search box */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={viewLineSearchQueries[po.id] || ''}
                              onChange={(e) =>
                                setViewLineSearchQueries((prev) => ({ ...prev, [po.id]: e.target.value }))
                              }
                              placeholder="Buscar línea de producto por nombre o descripción..."
                              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                            />
                          </div>

                          {(!lines || lines.length === 0) ? (
                            <div className="text-center py-4 text-xs text-[#5a725e]">
                              No se registran líneas de productos.
                            </div>
                          ) : filteredLines.length === 0 ? (
                            <div className="text-center py-4 text-xs text-[#5a725e]">
                              No se encontraron productos coincidentes con la búsqueda.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-[#e2ebe3] rounded-xl">
                              <table className="w-full text-left text-xs">
                                <thead className="text-[#5a725e] font-semibold border-b border-[#e2ebe3] bg-[#f8faf7]">
                                  <tr>
                                    <th className="py-2.5 px-3">Estado de Envío</th>
                                    <th className="py-2.5 px-3">Producto / Descripción</th>
                                    <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2ebe3]">
                                  {filteredLines.map((line) => (
                                    <tr key={line.id} className="hover:bg-[#f8faf7]">
                                      <td className="py-2.5 px-3">
                                        {line.seleccionada !== false ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Enviado
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                            No incluido
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="font-semibold text-[#122014]">
                                          {line.product_name || line.name}
                                        </div>
                                        {line.name && line.name !== line.product_name && (
                                          <div className="text-[11px] text-[#5a725e]">
                                            {line.name}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#122014]">
                                        {line.product_qty} {line.product_uom_name || ''}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          {solicitud.comentarios && (
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Comentarios / Observaciones:</span>
              <p className="text-xs text-[#122014] leading-relaxed whitespace-pre-wrap">
                {solicitud.comentarios}
              </p>
            </div>
          )}
        </div>

        {/* ================= 2. GESTIÓN DE ESTADO DEL ENVÍO ================= */}
        <div className="p-6 sm:p-8 bg-[#f8faf7] border-t border-[#e2ebe3]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#122014]">
              <ShieldCheck className="w-4 h-4 text-[#2d5a27]" />
              <span className="uppercase tracking-wider">Gestión de Estado del Envío</span>
            </div>
            {!isGestorOrAdmin && (
              <span className="text-[11px] text-[#5a725e] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Solo Gestores o Administradores pueden cambiar de estado</span>
              </span>
            )}
          </div>

          {actionError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {isGestorOrAdmin && (
            <div className="space-y-4">
              
              {/* STATE 1: BORRADOR -> ENVIADO */}
              {solicitud.estado === 'Borrador' && (
                <div className="p-5 rounded-2xl bg-white border border-[#c8decb] shadow-xs space-y-5">
                  <div>
                    <div className="font-bold text-[#122014] text-sm flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#2d5a27]" />
                      <span>Completar Despacho y Marcar como "Enviado"</span>
                    </div>
                    <p className="text-xs text-[#5a725e] mt-0.5">
                      Ingresa los datos del transportista y confirma los productos que se envían en este bulto.
                    </p>
                  </div>

                  {/* 1. Empresa de Transporte + Fecha */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SearchableSelect
                      label="Empresa de Transporte"
                      sublabel="Agencia o transportista"
                      selectedId={empresaId}
                      onSelect={(id) => setEmpresaId(id)}
                      options={empresaOptions}
                      icon={<Truck className="w-4 h-4" />}
                      placeholder="Seleccionar transportista..."
                      required={true}
                    />

                    {requiresShalomClave && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-amber-900">
                          Clave de Seguridad (Shalom) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={empresaClave}
                          onChange={(e) => setEmpresaClave(e.target.value)}
                          placeholder="Clave de 4 a 6 dígitos..."
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-amber-50 border border-amber-300 text-[#122014] font-mono tracking-wider focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#122014]">
                        Fecha de Entrega al Transportista <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={fechaEnvio}
                        onChange={(e) => setFechaEnvio(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                      />
                    </div>
                  </div>

                  {/* 2. Guía del Transportista File Upload (Optional) */}
                  <div className="space-y-2 pt-2 border-t border-[#e2ebe3]">
                    <label className="block text-xs font-bold text-[#122014]">
                      Guía del Transportista <span className="text-xs font-normal text-[#5a725e]">(Opcional)</span>
                    </label>
                    <p className="text-[11px] text-[#5a725e]">
                      Adjunta la foto o PDF de la guía emitida por la agencia de envíos
                    </p>

                    {!guiaFile && !solicitud.guia_transportista_id ? (
                      <label className="border-2 border-dashed border-[#c8decb] hover:border-[#2d5a27] rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#f8faf7] group">
                        <Upload className="w-6 h-6 text-[#2d5a27] group-hover:scale-110 transition-transform mb-1.5" />
                        <span className="text-xs font-semibold text-[#122014]">
                          Haz clic para adjuntar la Guía del Transportista
                        </span>
                        <span className="text-[10px] text-[#5a725e] mt-0.5">
                          Formatos admitidos: PDF, JPG, PNG (máx. 10MB)
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleGuiaUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#eaf2eb] border border-[#c8decb]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white text-[#2d5a27] flex items-center justify-center font-bold text-xs shadow-xs">
                            {guiaFile?.mime_type.includes('pdf') ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#122014] truncate max-w-xs">
                              {guiaFile?.nombre || solicitud.guia_transportista_nombre}
                            </div>
                            <div className="text-[10px] text-[#2d5a27] font-medium">
                              Guía lista para adjuntar
                            </div>
                          </div>
                        </div>
                        <label className="text-xs font-semibold text-[#2d5a27] hover:underline cursor-pointer">
                          Cambiar
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleGuiaUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* 3. Selección de Líneas de Órdenes de Compra a Enviar */}
                  <div className="space-y-4 pt-2 border-t border-[#e2ebe3]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-[#122014] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#2d5a27]" />
                          <span>Órdenes de Compra y Selección de Productos a Enviar</span>
                        </label>
                        <p className="text-[11px] text-[#5a725e] mt-0.5">
                          Marca o desmarca los productos específicos que se están despachando en esta encomienda
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowOdooSearch(!showOdooSearch)}
                        className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-[#c8decb] bg-white hover:bg-[#eaf2eb] text-[#2d5a27] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Vincular otra Orden Odoo</span>
                      </button>
                    </div>

                    {/* Collapsible Search bar for new PO */}
                    {showOdooSearch && (
                      <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#c8decb] space-y-3 animate-fade-in">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={odooQuery}
                              onChange={(e) => setOdooQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSearchOdoo();
                                }
                              }}
                              placeholder="Buscar OC por código (Ej: OC-06336)..."
                              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-[#c8decb]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSearchOdoo()}
                            disabled={odooLoading || !odooQuery.trim()}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          >
                            {odooLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            <span>Buscar</span>
                          </button>
                        </div>

                        {odooSearchError && (
                          <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                            {odooSearchError}
                          </div>
                        )}

                        {odooSearchResults && odooSearchResults.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {odooSearchResults.map((po) => (
                              <div
                                key={po.id}
                                className="p-3 rounded-xl bg-white border border-[#c8decb] flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="font-mono font-bold text-[#2d5a27]">{po.name}</div>
                                  <div className="text-[11px] text-[#5a725e]">{po.partner_name} • {po.lines?.length || 0} producto(s)</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddPurchaseOrder(po)}
                                  className="px-3 py-1 rounded-lg bg-[#2d5a27] text-white text-xs font-semibold hover:bg-[#366839] cursor-pointer"
                                >
                                  + Agregar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Orders List with Per-Line Checkbox selection */}
                    {ordenesCompra.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] text-center text-xs text-[#5a725e]">
                        No hay Órdenes de Compra vinculadas a esta solicitud. (Opcional)
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {ordenesCompra.map((po) => {
                          const lines = po.lines || [];
                          const allSelected = lines.length > 0 && lines.every((l) => l.seleccionada);
                          const someSelected = lines.some((l) => l.seleccionada);
                          const isExpanded = !!expandedOrderIds[po.id];
                          const searchQuery = (editLineSearchQueries[po.id] || '').trim().toLowerCase();

                          const filteredLines = searchQuery
                            ? lines.filter(
                                (l) =>
                                  (l.product_name || '').toLowerCase().includes(searchQuery) ||
                                  (l.name || '').toLowerCase().includes(searchQuery)
                              )
                            : lines;

                          return (
                            <div
                              key={po.id}
                              className="rounded-2xl bg-white border border-[#c8decb] shadow-xs overflow-hidden"
                            >
                              {/* Order Card Header */}
                              <div className="p-4 bg-[#f8faf7] border-b border-[#e2ebe3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center font-mono font-bold text-xs">
                                    OC
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-sm text-[#2d5a27]">
                                        {po.name}
                                      </span>
                                      {getOdooStateBadge(po.state)}
                                    </div>
                                    <div className="text-xs font-semibold text-[#122014] mt-0.5">
                                      Proveedor: {po.partner_name || 'Sin proveedor'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {/* Select All / Deselect All Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAllLines(po.id, !allSelected)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                      allSelected
                                        ? 'bg-[#2d5a27] text-white border-[#2d5a27]'
                                        : someSelected
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-white text-[#5a725e] border-[#c8decb] hover:bg-[#f8faf7]'
                                    }`}
                                  >
                                    {allSelected ? (
                                      <>
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        <span>Todas marcadas</span>
                                      </>
                                    ) : (
                                      <>
                                        <Square className="w-3.5 h-3.5" />
                                        <span>Marcar todas</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleExpandOrder(po.id)}
                                    className="p-1.5 text-[#5a725e] hover:bg-slate-100 rounded-lg cursor-pointer"
                                    title="Expandir/Contraer"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemovePurchaseOrder(po.id)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Quitar orden"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Lines Table with Checkboxes and Search */}
                              {isExpanded && (
                                <div className="p-4 bg-white space-y-3">
                                  {/* Search Filter */}
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                      type="text"
                                      value={editLineSearchQueries[po.id] || ''}
                                      onChange={(e) =>
                                        setEditLineSearchQueries((prev) => ({ ...prev, [po.id]: e.target.value }))
                                      }
                                      placeholder="Buscar línea de producto a enviar..."
                                      className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                                    />
                                  </div>

                                  {lines.length === 0 ? (
                                    <div className="text-center py-3 text-xs text-[#5a725e]">
                                      No hay productos en esta orden.
                                    </div>
                                  ) : filteredLines.length === 0 ? (
                                    <div className="text-center py-3 text-xs text-[#5a725e]">
                                      No se encontraron productos coincidentes.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto border border-[#e2ebe3] rounded-xl">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                                          <tr>
                                            <th className="py-2.5 px-3 w-10 text-center">Enviar</th>
                                            <th className="py-2.5 px-3">Producto / Descripción</th>
                                            <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#e2ebe3]">
                                          {filteredLines.map((line) => {
                                            const isChecked = !!line.seleccionada;
                                            return (
                                              <tr
                                                key={line.id}
                                                onClick={() => handleToggleLine(po.id, line.id)}
                                                className={`cursor-pointer transition-colors ${
                                                  isChecked ? 'bg-[#eaf2eb]/60 hover:bg-[#eaf2eb]' : 'hover:bg-slate-50 opacity-70'
                                                }`}
                                              >
                                                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleLine(po.id, line.id)}
                                                    className="w-4 h-4 accent-[#2d5a27] rounded cursor-pointer"
                                                  />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                  <div className={`font-semibold ${isChecked ? 'text-[#122014]' : 'text-slate-500'}`}>
                                                    {line.product_name || line.name}
                                                  </div>
                                                  {line.name && line.name !== line.product_name && (
                                                    <div className="text-[11px] text-[#5a725e]">
                                                      {line.name}
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#122014]">
                                                  {line.product_qty} {line.product_uom_name || ''}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAdvanceState('Enviado')}
                      disabled={updating}
                      className="px-6 py-2.5 rounded-xl bg-[#2d5a27] hover:bg-[#366839] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-[#2d5a27]/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Actualizando...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4 rotate-90" />
                          <span>Marcar como Enviado</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 2: ENVIADO -> RECIBIDO */}
              {solicitud.estado === 'Enviado' && (
                <div className="p-5 rounded-2xl bg-white border border-[#c8decb] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-[#122014] text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#2d5a27]" />
                      <span>Confirmar Recepción de la Encomienda</span>
                    </div>
                    <p className="text-xs text-[#5a725e] mt-0.5">
                      Haz clic una vez que el destinatario haya recogido y confirmado la llegada de los bultos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdvanceState('Recibido')}
                    disabled={updating}
                    className="px-6 py-2.5 rounded-xl bg-[#2d5a27] hover:bg-[#366839] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-[#2d5a27]/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Actualizando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar como Recibido</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STATE 3: RECIBIDO */}
              {solicitud.estado === 'Recibido' && (
                <div className="p-4 rounded-2xl bg-[#eaf2eb] border border-[#c8decb] text-xs text-[#2d5a27] flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Este envío ha concluido su ciclo y se encuentra entregado y recibido a conformidad.</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Product Preview Modal for Odoo Search (Ojito) */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#e2ebe3] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 sm:p-6 bg-[#f8faf7] border-b border-[#e2ebe3] flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-[#2d5a27]">
                    {previewOrder.name}
                  </span>
                  {getOdooStateBadge(previewOrder.state)}
                </div>
                <div className="text-xs font-semibold text-[#122014] mt-0.5">
                  Proveedor: {previewOrder.partner_name || 'Sin proveedor'}
                </div>
                <div className="text-[11px] text-[#5a725e] mt-0.5">
                  Fecha: {previewOrder.date_order ? new Date(previewOrder.date_order).toLocaleDateString('es-PE') : 'N/A'} • {previewOrder.lines?.length || 0} producto(s)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="p-2 rounded-xl text-[#5a725e] hover:text-[#122014] hover:bg-[#eaf2eb] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="px-5 pt-4">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modalLineSearch}
                  onChange={(e) => setModalLineSearch(e.target.value)}
                  placeholder="Filtrar productos por nombre o descripción..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="border border-[#e2ebe3] rounded-2xl overflow-hidden">
                {(() => {
                  const q = modalLineSearch.trim().toLowerCase();
                  const modalFilteredLines = (previewOrder.lines || []).filter(
                    (line) =>
                      !q ||
                      (line.product_name || '').toLowerCase().includes(q) ||
                      (line.name || '').toLowerCase().includes(q)
                  );

                  if (modalFilteredLines.length === 0) {
                    return (
                      <div className="text-center py-6 text-xs text-[#5a725e]">
                        No se encontraron productos coincidentes.
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                        <tr>
                          <th className="py-2.5 px-3">Producto / Descripción</th>
                          <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2ebe3]">
                        {modalFilteredLines.map((line) => (
                          <tr key={line.id} className="hover:bg-[#f8faf7]">
                            <td className="py-2.5 px-3 font-semibold text-[#122014]">
                              {line.product_name || line.name}
                              {line.name && line.name !== line.product_name && (
                                <div className="text-[11px] text-[#5a725e] font-normal">
                                  {line.name}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#122014]">
                              {line.product_qty} {line.product_uom_name || ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-[#f8faf7] border-t border-[#e2ebe3] flex items-center justify-between">
              <div className="text-xs font-semibold text-[#5a725e]">
                Total de productos: <strong className="text-[#122014]">{previewOrder.lines?.length || 0}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleAddPurchaseOrder(previewOrder);
                  setPreviewOrder(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] cursor-pointer shadow-xs"
              >
                + Agregar a Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
