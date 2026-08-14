import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
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
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <div className="text-sm font-semibold text-[#5a725e]">
          No se encontró la solicitud solicitada (ID: {params.id || 'N/A'}).
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] cursor-pointer"
        >
          Volver al Tablero
        </button>
      </div>
    );
  }

  // Check if Solicitante has permission to view this solicitud
  const isOwner = solicitud.solicitante_dni === currentUser.dni || solicitud.enviado_por_dni === currentUser.dni;
  if (currentUser.rol === 'Solicitante' && !isOwner) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4 animate-fade-in">
        <div className="text-sm font-semibold text-rose-600">
          Acceso Restringido: Como usuario Solicitante, únicamente tienes autorización para consultar el detalle de tus propias solicitudes.
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] cursor-pointer"
        >
          Volver a Mis Solicitudes
        </button>
      </div>
    );
  }

  // Check role permission for "Gestión de la solicitud"
  // All Gestores and Administradores can manage shipment states
  const isGestorOrAdmin = currentUser.rol === 'Gestor' || currentUser.rol === 'Administrador';

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
          setOdooSearchError(`No se encontraron órdenes de compra en Odoo con "${query}".`);
        }
      } else {
        setOdooSearchError(data.error || 'No se pudo consultar Odoo');
      }
    } catch {
      setOdooSearchError('Error de conexión al consultar Odoo ERP.');
    } finally {
      setOdooLoading(false);
    }
  };

  const handleAddPurchaseOrder = (po: OdooPurchaseOrder) => {
    if (ordenesCompra.some((item) => item.id === po.id)) return;
    const poWithSelected = {
      ...po,
      lines: (po.lines || []).map((l) => ({ ...l, seleccionada: true })),
    };
    setOrdenesCompra((prev) => [...prev, poWithSelected]);
    setExpandedOrderIds((prev) => ({ ...prev, [po.id]: true }));
    setShowOdooSearch(false);
    setOdooSearchResults(null);
    setOdooQuery('');
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
      if (!guiaFile && !solicitud.guia_transportista_id && !solicitud.guia_transportista_nombre) {
        setActionError('Debes adjuntar obligatoriamente la Guía del Transportista antes de enviar.');
        return;
      }
      // If purchase orders are present, check that at least one line is selected
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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
            Aprobada
          </span>
        );
      case 'done':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Realizada
          </span>
        );
      case 'draft':
      case 'sent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Borrador
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleGoBack}
          className="flex items-center gap-2 text-xs font-semibold text-[#5a725e] hover:text-[#2d5a27] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Tablero</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onDownloadPDF(solicitud.id)}
            className="px-4 py-2 rounded-xl border border-[#c8decb] bg-[#eaf2eb] text-[#2d5a27] text-xs font-semibold hover:bg-[#d8ebd9] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte PDF</span>
          </button>
        </div>
      </div>

      {/* Main Details Card (Pure Light Theme) */}
      <div className="rounded-3xl bg-white border border-[#e2ebe3] shadow-xl overflow-hidden">
        
        {/* Banner Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-[#2d5a27]/10 via-[#4e8752]/5 to-transparent border-b border-[#e2ebe3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
              <span className="text-[#2d5a27]">Rainforest Expeditions</span>
              <span className="text-[#2d5a27]">•</span>
              <span className="text-[#2d5a27]">{solicitud.id}</span>
              {solicitud.tipo_solicitud_nombre && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {solicitud.tipo_solicitud_nombre}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Package className="w-3 h-3" />
                {solicitud.numero_bultos || 1} {solicitud.numero_bultos === 1 ? 'Bulto' : 'Bultos'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#122014] mt-1">
              Seguimiento de Envío a {solicitud.destino_nombre}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-[#5a725e] mt-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Registrado: {new Date(solicitud.fecha_registro).toLocaleString('es-PE')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                {solicitud.empresa_transporte_nombre || 'Sin empresa asignada'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              solicitud.estado === 'Recibido'
                ? 'bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]'
                : solicitud.estado === 'Enviado'
                ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {solicitud.estado === 'Recibido' && <CheckCircle2 className="w-4 h-4 text-[#2d5a27]" />}
              {solicitud.estado === 'Enviado' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              {solicitud.estado === 'Borrador' && <span className="w-2 h-2 rounded-full bg-slate-400" />}
              <span>{solicitud.estado === 'Enviado' ? 'En Tránsito (Enviado)' : solicitud.estado === 'Borrador' ? 'Pendiente de Envío' : solicitud.estado}</span>
            </span>
          </div>
        </div>

        {/* Stepper Timeline */}
        <div className="p-6 sm:p-10 border-b border-[#e2ebe3] bg-[#f8faf7]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#2d5a27] mb-8">
            LÍNEA DE TRAZABILIDAD DEL ENVÍO
          </div>

          <div className="relative">
            {/* Continuous Connecting Track */}
            <div className="absolute top-6 left-[16.66%] right-[16.66%] h-0.5 -translate-y-1/2 flex -z-0">
              {/* Segment 1 -> 2 */}
              <div className={`h-full flex-1 transition-all ${
                solicitud.estado === 'Enviado' || solicitud.estado === 'Recibido'
                  ? 'bg-[#2d5a27]'
                  : 'bg-[#d8e2da]'
              }`} />
              {/* Segment 2 -> 3 */}
              <div className={`h-full flex-1 transition-all ${
                solicitud.estado === 'Recibido'
                  ? 'bg-[#2d5a27]'
                  : 'bg-[#d8e2da]'
              }`} />
            </div>

            <div className="grid grid-cols-3 gap-2 relative z-10">
              {/* Step 1: Pendiente de Envío */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs bg-[#2d5a27] text-white shadow-md shadow-[#2d5a27]/25 ring-4 ring-white transition-all">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="mt-3 text-xs font-bold text-[#122014]">1. Pendiente de Envío</div>
                <div className="text-[11px] text-[#5a725e] mt-0.5">
                  Registrado por {solicitud.solicitante_nombre?.split(' ')[0] || 'Usuario'}
                </div>
              </div>

              {/* Step 2: Enviado (En Tránsito) */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  solicitud.estado === 'Recibido'
                    ? 'bg-[#2d5a27] text-white shadow-md shadow-[#2d5a27]/25 ring-4 ring-white'
                    : solicitud.estado === 'Enviado'
                    ? 'bg-[#f59e0b] text-white shadow-lg shadow-amber-500/25 ring-8 ring-amber-100'
                    : 'bg-[#eef2f6] text-[#64748b] border border-[#e2e8f0] ring-4 ring-white'
                }`}>
                  {solicitud.estado === 'Recibido' ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Navigation className={`w-5 h-5 ${solicitud.estado === 'Enviado' ? 'text-white fill-white rotate-90' : 'text-[#64748b]'}`} />
                  )}
                </div>
                <div className="mt-3 text-xs font-bold text-[#122014]">2. Enviado (En Tránsito)</div>
                <div className="text-[11px] text-[#5a725e] mt-0.5">
                  {solicitud.fecha_transicion_enviado 
                    ? new Date(solicitud.fecha_transicion_enviado).toLocaleDateString('es-PE')
                    : solicitud.fecha_envio_destinatario
                    ? new Date(solicitud.fecha_envio_destinatario).toLocaleDateString('es-PE')
                    : 'Pendiente de despacho'}
                </div>
              </div>

              {/* Step 3: Recibido */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  solicitud.estado === 'Recibido'
                    ? 'bg-[#2d5a27] text-white shadow-lg shadow-[#2d5a27]/25 ring-8 ring-[#eaf2eb]'
                    : 'bg-[#eef2f6] text-[#64748b] border border-[#e2e8f0] ring-4 ring-white'
                }`}>
                  {solicitud.estado === 'Recibido' ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Package className="w-5 h-5 text-[#64748b]" />
                  )}
                </div>
                <div className="mt-3 text-xs font-bold text-[#122014]">3. Recibido</div>
                <div className="text-[11px] text-[#5a725e] mt-0.5">
                  {solicitud.fecha_transicion_recibido
                    ? new Date(solicitud.fecha_transicion_recibido).toLocaleDateString('es-PE')
                    : 'Pendiente de recepción'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shipment Details Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5a725e]">
            Información Detallada del Envío
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {/* Tipo de Solicitud */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Tipo de Solicitud:</span>
              </span>
              <div className="font-bold text-[#122014] text-sm">
                {solicitud.tipo_solicitud_nombre || 'Estándar'}
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
                    className="p-1.5 text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors"
                    title="Ver archivo adjunto"
                  >
                    <ExternalLink className="w-4 h-4" />
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
                              <span>Total: <strong className="text-[#122014]">{po.amount_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} {po.currency_name || 'PEN'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpandOrder(po.id)}
                          className="px-3 py-1.5 rounded-lg border border-[#c8decb] bg-white hover:bg-[#eaf2eb] text-xs font-semibold text-[#2d5a27] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{po.lines?.length || 0} productos</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expandable Table */}
                      {isExpanded && (
                        <div className="p-4 border-t border-[#e2ebe3] bg-white">
                          {(!po.lines || po.lines.length === 0) ? (
                            <div className="text-center py-4 text-xs text-[#5a725e]">
                              No se registran líneas de productos.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="text-[#5a725e] font-semibold border-b border-[#e2ebe3] bg-[#f8faf7]">
                                  <tr>
                                    <th className="py-2 px-3">Estado de Envío</th>
                                    <th className="py-2 px-3">Producto / Descripción</th>
                                    <th className="py-2 px-3 text-right">Cant. Solicitada</th>
                                    <th className="py-2 px-3 text-right">Precio Unit.</th>
                                    <th className="py-2 px-3 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2ebe3]">
                                  {po.lines.map((line) => (
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
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-[#122014]">
                                        {line.product_qty} {line.product_uom_name || ''}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-[#122014]">
                                        {line.price_unit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2d5a27]">
                                        {line.price_subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
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

        {/* Gestor State Progression Action Box */}
        <div className="p-6 sm:p-8 bg-[#f8faf7] border-t border-[#e2ebe3]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#122014]">
              <ShieldCheck className="w-4 h-4 text-[#2d5a27]" />
              <span>Gestión de Estado del Envío</span>
            </div>
            <div className="text-[11px] text-[#5a725e] flex items-center gap-2 flex-wrap">
              <span>Gestor Responsable: <strong className="text-[#122014] uppercase">{solicitud.gestor_nombre}</strong></span>
              {isGestorOrAdmin && currentUser.dni !== solicitud.gestor_dni && (
                <span className="text-[10px] text-[#2d5a27] bg-[#eaf2eb] px-2 py-0.5 rounded-full border border-[#c8decb]">
                  Gestionando como: {currentUser.nombre} ({currentUser.rol})
                </span>
              )}
            </div>
          </div>

          {actionError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {!isGestorOrAdmin ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Solo los usuarios con rol de Gestor o Administrador tienen permisos para gestionar y avanzar el estado de este envío.
              </span>
            </div>
          ) : (
            <div>
              {/* STATE 1: BORRADOR -> ENVIADO (GESTION COMPLETA ANTES DE ENVIAR) */}
              {solicitud.estado === 'Borrador' && (
                <div className="space-y-6 p-6 rounded-3xl bg-white border border-[#c8decb] shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-[#122014]">
                      Preparar Despacho y Marcar como Enviado
                    </h3>
                    <p className="text-xs text-[#5a725e] mt-0.5">
                      Ingresa los datos de transporte, adjunta la guía del transportista y selecciona las líneas de producto de cada Orden de Compra antes de despachar.
                    </p>
                  </div>

                  {/* 1. Empresa de Transporte y Guía */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Empresa */}
                    <div className="space-y-2">
                      <SearchableSelect
                        label="Empresa de Transporte"
                        selectedId={empresaId}
                        onSelect={(id) => setEmpresaId(id)}
                        options={safeEmpresas.map((emp): SearchableOption => ({
                          id: emp.id,
                          title: emp.nombre,
                          subtitle: emp.requiere_clave || emp.nombre.toLowerCase().includes('shalom')
                            ? 'Requiere clave de seguridad (Shalom)'
                            : 'Agencia de transporte',
                        }))}
                        icon={<Truck className="w-4 h-4" />}
                        placeholder="Buscar empresa (Shalom, Olva, Marvisur...)"
                        required={true}
                        layout="stacked"
                      />

                      {requiresShalomClave && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 animate-fade-in">
                          <label className="block text-xs font-bold text-amber-950">
                            Clave de Retiro Shalom <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={empresaClave}
                            onChange={(e) => setEmpresaClave(e.target.value)}
                            placeholder="Ingresa la clave de 4 a 6 dígitos..."
                            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-amber-300 font-mono font-bold text-[#122014] tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                        </div>
                      )}
                    </div>

                    {/* Fecha de Envío */}
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

                  {/* 2. Guía del Transportista File Upload */}
                  <div className="space-y-2 pt-2 border-t border-[#e2ebe3]">
                    <label className="block text-xs font-bold text-[#122014]">
                      Guía del Transportista <span className="text-rose-500">*</span>
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
                                        <span>Marcar todas las líneas</span>
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

                              {/* Lines Table with Checkboxes */}
                              {isExpanded && (
                                <div className="p-4 bg-white overflow-x-auto">
                                  {lines.length === 0 ? (
                                    <div className="text-center py-3 text-xs text-[#5a725e]">
                                      No hay productos en esta orden.
                                    </div>
                                  ) : (
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                                        <tr>
                                          <th className="py-2.5 px-3 w-10 text-center">Enviar</th>
                                          <th className="py-2.5 px-3">Producto / Descripción</th>
                                          <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                                          <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#e2ebe3]">
                                        {lines.map((line) => {
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
                                              <td className="py-2.5 px-3 text-right font-mono font-medium">
                                                {line.product_qty} {line.product_uom_name || ''}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-mono text-[#5a725e]">
                                                {line.price_unit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2d5a27]">
                                                {line.price_subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dispatch Submit Button */}
                  <div className="pt-4 border-t border-[#e2ebe3] flex items-center justify-end">
                    <button
                      onClick={() => handleAdvanceState('Enviado')}
                      disabled={updating}
                      className="px-6 py-3 rounded-2xl font-bold text-xs text-white bg-[#f59e0b] hover:bg-[#d97706] shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 fill-white rotate-90" />}
                      <span>Marcar como Enviado (Despachar Encomienda)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 2: ENVIADO -> RECIBIDO */}
              {solicitud.estado === 'Enviado' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#e2ebe3] shadow-xs">
                  <div>
                    <div className="text-sm font-bold text-[#122014]">
                      Confirmar recepción en destino
                    </div>
                    <div className="text-xs text-[#5a725e] mt-0.5">
                      Confirma que la encomienda fue recibida a conformidad por el destinatario.
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdvanceState('Recibido')}
                    disabled={updating}
                    className="px-6 py-3 rounded-2xl font-bold text-xs text-white bg-[#2d5a27] hover:bg-[#23471e] shadow-md shadow-[#2d5a27]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirmar Recepción (Recibido)</span>
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
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="p-2 rounded-xl text-[#5a725e] hover:text-[#122014] hover:bg-[#eaf2eb] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <div className="border border-[#e2ebe3] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                    <tr>
                      <th className="py-2.5 px-3">Producto / Descripción</th>
                      <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                      <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2ebe3]">
                    {previewOrder.lines?.map((line) => (
                      <tr key={line.id} className="hover:bg-[#f8faf7]">
                        <td className="py-2.5 px-3 font-semibold text-[#122014]">
                          {line.product_name || line.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {line.product_qty} {line.product_uom_name || ''}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#5a725e]">
                          {line.price_unit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2d5a27]">
                          {line.price_subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-[#f8faf7] border-t border-[#e2ebe3] flex items-center justify-between">
              <div className="text-xs font-semibold text-[#5a725e]">
                Monto Total: <strong className="text-[#2d5a27] text-sm">{previewOrder.amount_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} {previewOrder.currency_name || 'PEN'}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleAddPurchaseOrder(previewOrder);
                  setPreviewOrder(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] cursor-pointer"
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
