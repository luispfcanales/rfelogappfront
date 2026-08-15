import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Truck,
  Building,
  User as UserIcon,
  Tag,
  Package,
  Download,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Lock,
  Search,
  Plus,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  MapPin,
  Camera,
  Layers,
  CheckSquare,
  Square,
  ShieldCheck
} from 'lucide-react';
import type {
  Solicitud,
  User,
  CatalogoData,
  EstadoSolicitud,
  OdooPurchaseOrder,
  OdooRequisicionData,
  DocumentoTipo
} from '../types';
import { SearchableSelect, type SearchableOption } from './SearchableSelect';

interface DetalleSolicitudProps {
  solicitud?: Solicitud;
  allSolicitudes?: Solicitud[];
  currentUser: User;
  catalogos: CatalogoData;
  onBack?: () => void;
  onUpdateState: (
    id: string,
    nuevoEstado: EstadoSolicitud,
    extraData?: {
      fecha_envio_destinatario?: string;
      empresa_transporte_id?: string;
      empresa_transporte_clave?: string;
      guia_archivo?: {
        nombre: string;
        mime_type: string;
        contenido: string;
      };
      ordenes_compra?: OdooPurchaseOrder[];
      requisicion?: OdooRequisicionData;
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

  // View expansion states
  const [viewExpandedOrderIds, setViewExpandedOrderIds] = useState<Record<number, boolean>>({});
  const [viewExpandedTransferIds, setViewExpandedTransferIds] = useState<Record<number, boolean>>({});

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

  // Document Type for dispatch form
  const [editDocumentoTipo, setEditDocumentoTipo] = useState<DocumentoTipo>('Orden de Compra');

  // Purchase Orders & Line selection state
  const [ordenesCompra, setOrdenesCompra] = useState<OdooPurchaseOrder[]>([]);
  const [editExpandedOrderIds, setEditExpandedOrderIds] = useState<Record<number, boolean>>({});

  // Requisition selection state
  const [selectedRequisicion, setSelectedRequisicion] = useState<OdooRequisicionData | null>(null);
  const [editExpandedTransferIds, setEditExpandedTransferIds] = useState<Record<number, boolean>>({});
  const [editRequisicionQuery, setEditRequisicionQuery] = useState('');
  const [editRequisicionLoading, setEditRequisicionLoading] = useState(false);
  const [editRequisicionError, setEditRequisicionError] = useState<string | null>(null);

  // Line search states
  const [viewLineSearchQueries, setViewLineSearchQueries] = useState<Record<number, string>>({});
  const [viewTransferSearchQueries, setViewTransferSearchQueries] = useState<Record<number, string>>({});
  const [editLineSearchQueries, setEditLineSearchQueries] = useState<Record<number, string>>({});
  const [editTransferSearchQueries, setEditTransferSearchQueries] = useState<Record<number, string>>({});

  // Odoo Search state within DetalleSolicitud (for POs)
  const [odooQuery, setOdooQuery] = useState('');
  const [odooLoading, setOdooLoading] = useState(false);
  const [odooSearchResults, setOdooSearchResults] = useState<OdooPurchaseOrder[] | null>(null);
  const [odooSearchError, setOdooSearchError] = useState<string | null>(null);
  const [showOdooSearch, setShowOdooSearch] = useState(false);

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

      if (solicitud.documento_tipo) {
        setEditDocumentoTipo(solicitud.documento_tipo);
      }

      if (solicitud.ordenes_compra && Array.isArray(solicitud.ordenes_compra)) {
        setOrdenesCompra(
          solicitud.ordenes_compra.map((po) => ({
            ...po,
            lines: (po.lines || []).map((l) => ({
              ...l,
              seleccionada: l.seleccionada !== false,
            })),
          }))
        );
        const exp: Record<number, boolean> = {};
        solicitud.ordenes_compra.forEach((po) => {
          exp[po.id] = true;
        });
        setViewExpandedOrderIds(exp);
        setEditExpandedOrderIds(exp);
      }

      if (solicitud.requisicion) {
        const reqData = {
          ...solicitud.requisicion,
          transferencias: (solicitud.requisicion.transferencias || []).map((t) => ({
            ...t,
            lines: (t.lines || []).map((l) => ({
              ...l,
              seleccionada: l.seleccionada !== false,
            })),
          })),
        };
        setSelectedRequisicion(reqData);
        const expT: Record<number, boolean> = {};
        (solicitud.requisicion.transferencias || []).forEach((t) => {
          expT[t.id] = true;
        });
        setViewExpandedTransferIds(expT);
        setEditExpandedTransferIds(expT);
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
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#122014]">Solicitud no encontrada</h2>
        <p className="text-xs text-[#5a725e]">
          No pudimos localizar los datos del requerimiento solicitado.
        </p>
        <button
          type="button"
          onClick={handleGoBack}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] cursor-pointer"
        >
          Volver al Tablero
        </button>
      </div>
    );
  }

  // Role permissions
  const isGestorOrAdmin = currentUser.rol === 'Gestor' || currentUser.rol === 'Administrador';

  // Options for Transport dropdown
  const empresaOptions: SearchableOption[] = safeEmpresas.map((e) => ({
    id: e.id,
    title: e.nombre,
    subtitle: e.requiere_clave ? 'Requiere Clave de Retiro (ej. Shalom)' : 'Envío estándar sin clave',
  }));

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

  // Switch between PO and Requisition in dispatch form
  const handleSwitchEditDocumentoTipo = (newTipo: DocumentoTipo) => {
    if (newTipo === editDocumentoTipo) return;
    setEditDocumentoTipo(newTipo);
  };

  // Toggle PO line selection in edit mode
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

  // Toggle all PO lines for a given order
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

  // Search Odoo in dispatch form (for POs)
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
          setOdooSearchError(`No se encontraron órdenes en Odoo con el término "${query}".`);
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
    setEditExpandedOrderIds((prev) => ({ ...prev, [po.id]: true }));
    setShowOdooSearch(false);
  };

  const handleRemovePurchaseOrder = (orderId: number) => {
    setOrdenesCompra((prev) => prev.filter((item) => item.id !== orderId));
  };

  // Requisition handlers for dispatch form
  const handleSearchRequisicion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = editRequisicionQuery.trim();
    if (!query) return;

    setEditRequisicionLoading(true);
    setEditRequisicionError(null);

    try {
      const res = await fetch(`${apiBase}/api/odoo/requisicion?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const req: OdooRequisicionData = data.data;
        if (!req.transferencias || req.transferencias.length === 0) {
          setEditRequisicionError(
            `La requisición "${req.name}" (${req.req_name || 'Sin asunto'}) fue encontrada, pero no tiene transferencias internas pendientes en estado Borrador o Listo.`
          );
        }
        const reqWithSelection: OdooRequisicionData = {
          ...req,
          transferencias: (req.transferencias || []).map((t) => ({
            ...t,
            lines: (t.lines || []).map((l) => ({ ...l, seleccionada: true })),
          })),
        };
        setSelectedRequisicion(reqWithSelection);
        const exp: Record<number, boolean> = {};
        (req.transferencias || []).forEach((t) => {
          exp[t.id] = true;
        });
        setEditExpandedTransferIds(exp);
      } else {
        setEditRequisicionError(data.error || `No se encontró ninguna requisición con el código "${query}".`);
      }
    } catch {
      setEditRequisicionError('Error al consultar la requisición en Odoo ERP.');
    } finally {
      setEditRequisicionLoading(false);
    }
  };

  const handleToggleTransferLine = (transferId: number, lineId: number) => {
    if (!selectedRequisicion) return;
    setSelectedRequisicion((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        transferencias: prev.transferencias.map((t) => {
          if (t.id !== transferId) return t;
          return {
            ...t,
            lines: t.lines.map((l) => (l.id === lineId ? { ...l, seleccionada: !l.seleccionada } : l)),
          };
        }),
      };
    });
  };

  const handleToggleAllTransferLines = (transferId: number, selectAll: boolean) => {
    if (!selectedRequisicion) return;
    setSelectedRequisicion((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        transferencias: prev.transferencias.map((t) => {
          if (t.id !== transferId) return t;
          return {
            ...t,
            lines: t.lines.map((l) => ({ ...l, seleccionada: selectAll })),
          };
        }),
      };
    });
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
      
      // Line validations
      if (editDocumentoTipo === 'Orden de Compra' && ordenesCompra.length > 0) {
        const totalSelected = ordenesCompra.reduce((acc, po) => {
          return acc + (po.lines || []).filter((l) => l.seleccionada).length;
        }, 0);
        if (totalSelected === 0) {
          setActionError('Debes marcar al menos una línea de producto de las órdenes vinculadas.');
          return;
        }
      }

      if (editDocumentoTipo === 'Requisición' && selectedRequisicion) {
        const totalSelected = selectedRequisicion.transferencias.reduce((acc, t) => {
          return acc + (t.lines || []).filter((l) => l.seleccionada).length;
        }, 0);
        if (totalSelected === 0) {
          setActionError('Debes marcar al menos una línea de producto de las transferencias de la requisición.');
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
        ordenes_compra: editDocumentoTipo === 'Orden de Compra' && ordenesCompra.length > 0 ? ordenesCompra : undefined,
        requisicion: editDocumentoTipo === 'Requisición' && selectedRequisicion ? selectedRequisicion : undefined,
      });
    } catch (err: any) {
      setActionError(err?.message || 'Error al actualizar el estado de la solicitud');
    } finally {
      setUpdating(false);
    }
  };

  const getOdooStateBadge = (state: string) => {
    switch (state) {
      // Requisiciones (employee.purchase.requisition)
      case 'new':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Nuevo
          </span>
        );
      case 'waiting_department_approval':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-800 border border-orange-200">
            Espera Aprob. Departamento
          </span>
        );
      case 'waiting_head_approval':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            Espera Aprob. Jefe
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
            Aprobada
          </span>
        );
      case 'purchase_order_created':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
            Orden de compra creada
          </span>
        );
      case 'received':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Recibido
          </span>
        );
      case 'cancelled':
      case 'cancel':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelado
          </span>
        );

      // Órdenes de Compra y Transferencias (purchase.order / stock.picking)
      case 'purchase':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
            Aprobada / Pedido
          </span>
        );
      case 'done':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Realizado
          </span>
        );
      case 'assigned':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
            Listo para Transferir
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Borrador
          </span>
        );
      case 'sent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Enviado / Pendiente
          </span>
        );
      case 'to approve':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Por Aprobar
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

  // Render Visual Lifecycle Timeline
  const renderTimeline = () => {
    const steps: {
      estado: EstadoSolicitud;
      label: string;
      date?: string;
      active: boolean;
      completed: boolean;
    }[] = [
      {
        estado: 'Borrador',
        label: 'Pendiente de Envío',
        date: solicitud.fecha_transicion_borrador || solicitud.fecha_registro,
        active: solicitud.estado === 'Borrador',
        completed: solicitud.estado === 'Enviado' || solicitud.estado === 'Recibido',
      },
      {
        estado: 'Enviado',
        label: 'En Tránsito (Enviado)',
        date: solicitud.fecha_transicion_enviado,
        active: solicitud.estado === 'Enviado',
        completed: solicitud.estado === 'Recibido',
      },
      {
        estado: 'Recibido',
        label: 'Entregado (Recibido)',
        date: solicitud.fecha_transicion_recibido,
        active: solicitud.estado === 'Recibido',
        completed: solicitud.estado === 'Recibido',
      },
    ];

    return (
      <div className="p-6 bg-[#f8faf7] border-b border-[#e2ebe3]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {steps.map((st, idx) => {
            const isDone = st.completed;
            const isCurrent = st.active;

            return (
              <div
                key={st.estado}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-white border-[#2d5a27] shadow-sm ring-2 ring-[#2d5a27]/20'
                    : isDone
                    ? 'bg-[#eaf2eb]/50 border-[#c8decb]'
                    : 'bg-white/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? 'bg-[#2d5a27] text-white'
                        : isCurrent
                        ? 'bg-[#2d5a27] text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-[#5a725e]">
                    Paso {idx + 1} de 3
                  </span>
                </div>

                <span
                  className={`text-xs font-bold ${
                    isCurrent ? 'text-[#2d5a27]' : isDone ? 'text-[#122014]' : 'text-slate-500'
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
                {solicitud.tipo_solicitud_nombre || 'No especificado'}
              </div>
            </div>

            {/* Número de Bultos */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Número de Bultos:</span>
              </span>
              <div className="font-bold text-[#122014] text-base">
                {solicitud.numero_bultos || 1} {solicitud.numero_bultos === 1 ? 'bulto' : 'bultos'}
              </div>
            </div>

            {/* Solicitante */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Solicitado por:</span>
              </span>
              <div className="font-bold text-[#122014]">
                {solicitud.solicitante_nombre}
              </div>
              <div className="text-[11px] text-[#5a725e] font-mono">
                DNI: {solicitud.solicitante_dni}
              </div>
            </div>

            {/* Enviado por */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Enviado por:</span>
              </span>
              <div className="font-bold text-[#122014]">
                {solicitud.enviado_por_nombre}
              </div>
              <div className="text-[11px] text-[#5a725e] font-mono">
                DNI: {solicitud.enviado_por_dni}
              </div>
            </div>

            {/* Gestor Responsable */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Gestor Responsable:</span>
              </span>
              <div className="font-bold text-[#122014]">
                {solicitud.gestor_nombre}
              </div>
              <div className="text-[11px] text-[#5a725e] font-mono">
                DNI: {solicitud.gestor_dni}
              </div>
            </div>

            {/* Empresa de Transporte */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Empresa de Transporte:</span>
              </span>
              <div className="font-bold text-[#122014]">
                {solicitud.empresa_transporte_nombre || 'Pendiente de asignar'}
              </div>
              {solicitud.empresa_transporte_clave && (
                <div className="text-[11px] text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block border border-amber-200 mt-0.5">
                  Clave Shalom: {solicitud.empresa_transporte_clave}
                </div>
              )}
            </div>

            {/* Fecha de Entrega al Transportista */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Fecha de Entrega al Transportista:</span>
              </span>
              <div className="font-bold text-[#122014]">
                {solicitud.fecha_envio_destinatario
                  ? new Date(solicitud.fecha_envio_destinatario).toLocaleDateString('es-PE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Pendiente de entrega'}
              </div>
            </div>

            {/* Guía del Transportista Adjunta */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Guía del Transportista:</span>
              </span>
              {solicitud.guia_transportista_id ? (
                <a
                  href={`${apiBase}/api/archivos/ver?id=${solicitud.guia_transportista_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#2d5a27] hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <span>{solicitud.guia_transportista_nombre || 'Ver archivo de la guía'}</span>
                </a>
              ) : (
                <div className="text-xs text-[#5a725e]">No se adjuntó guía</div>
              )}
            </div>

            {/* Foto del Producto Adjunta */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-[#2d5a27]" />
                <span>Foto del Producto / Paquete:</span>
              </span>
              {solicitud.imagen_id ? (
                <a
                  href={`${apiBase}/api/archivos/ver?id=${solicitud.imagen_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#2d5a27] hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{solicitud.imagen_nombre || 'Ver foto del producto'}</span>
                </a>
              ) : (
                <div className="text-xs text-[#5a725e]">No se adjuntó foto</div>
              )}
            </div>

          </div>

          {/* Destinos y Destinatarios */}
          <div className="p-5 rounded-2xl bg-[#f8faf7] border border-[#c8decb] space-y-4">
            <div className="text-xs font-bold text-[#122014] uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#2d5a27]" />
              <span>Destinos y Destinatarios Asignados</span>
            </div>

            {solicitud.destinos && solicitud.destinos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {solicitud.destinos.map((dest) => {
                  const recipients = (solicitud.destinatarios || []).filter(
                    (d) => d.destino_id === dest.id || (!d.destino_id && solicitud.destinos?.length === 1)
                  );

                  return (
                    <div key={dest.id} className="p-4 rounded-xl bg-white border border-[#e2ebe3] shadow-2xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-xs text-[#2d5a27]">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Sede / Destino: {dest.nombre}</span>
                      </div>
                      <div className="space-y-1 pl-5">
                        {recipients.length === 0 ? (
                          <div className="text-xs text-[#5a725e]">Sin destinatarios específicos</div>
                        ) : (
                          recipients.map((rec, i) => (
                            <div key={i} className="text-xs text-[#122014]">
                              • <span className="font-semibold">{rec.nombre}</span>
                              {rec.proveedor_nombre && (
                                <span className="text-amber-800 font-medium ml-1">
                                  (Proveedor: {rec.proveedor_nombre})
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-[#122014]">
                Destino: <strong>{solicitud.destino_nombre}</strong> • Destinatario: <strong>{solicitud.destinatario_nombre}</strong>
                {solicitud.destinatario_proveedor_nombre && (
                  <span className="text-amber-800 ml-1">
                    (Proveedor: {solicitud.destinatario_proveedor_nombre})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* READ-ONLY: ODOO REQUISICIÓN */}
          {solicitud.documento_tipo === 'Requisición' && solicitud.requisicion && (
            <div className="space-y-4 pt-2 border-t border-[#e2ebe3]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-[#122014] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#2d5a27]" />
                    <span>Requisición y Transferencias Internas Odoo ERP</span>
                  </label>
                  <p className="text-[11px] text-[#5a725e] mt-0.5">
                    Transferencias y productos incluidos en esta solicitud
                  </p>
                </div>
              </div>

              {/* Requisition Header Box */}
              <div className="p-4.5 rounded-2xl bg-[#eaf2eb] border border-[#c8decb] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#2d5a27] bg-white px-2.5 py-0.5 rounded-lg border border-[#c8decb]">
                      {solicitud.requisicion.name}
                    </span>
                    {getOdooStateBadge(solicitud.requisicion.state)}
                    <span className="text-xs text-[#5a725e]">
                      Solicitante: <strong className="text-[#122014]">{solicitud.requisicion.employee_name || 'N/A'}</strong>
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#122014] mt-1">
                    Asunto: {solicitud.requisicion.req_name || '(Sin asunto)'}
                  </div>
                </div>
              </div>

              {/* Transferencias List */}
              <div className="space-y-3">
                {(solicitud.requisicion.transferencias || []).map((transfer) => {
                  const isExpanded = !!viewExpandedTransferIds[transfer.id];
                  const lines = transfer.lines || [];
                  const searchQuery = (viewTransferSearchQueries[transfer.id] || '').trim().toLowerCase();

                  const filteredLines = searchQuery
                    ? lines.filter(
                        (l) =>
                          (l.product_name || '').toLowerCase().includes(searchQuery) ||
                          (l.name || '').toLowerCase().includes(searchQuery)
                      )
                    : lines;

                  const selectedCount = lines.filter((l) => l.seleccionada !== false).length;
                  const totalCount = lines.length;

                  return (
                    <div key={transfer.id} className="rounded-2xl bg-white border border-[#c8decb] shadow-2xs overflow-hidden">
                      <div className="p-3.5 bg-[#f8faf7] border-b border-[#e2ebe3] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center font-mono font-bold text-xs">
                            TR
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#2d5a27]">{transfer.name}</span>
                              <span className="shrink-0">{getOdooStateBadge(transfer.state)}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb] whitespace-nowrap shrink-0">
                                {selectedCount} de {totalCount} productos enviados
                              </span>
                            </div>
                            {(transfer.location_name || transfer.location_dest_name) && (
                              <div className="text-[11px] text-[#5a725e] mt-0.5">
                                {transfer.location_name} → {transfer.location_dest_name}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewExpandedTransferIds((prev) => ({ ...prev, [transfer.id]: !prev[transfer.id] }))}
                          className="px-2.5 py-1 rounded-lg border border-[#c8decb] hover:bg-white text-xs font-semibold text-[#2d5a27] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isExpanded ? 'Ocultar' : 'Ver productos'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3.5 bg-white space-y-3">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={viewTransferSearchQueries[transfer.id] || ''}
                              onChange={(e) =>
                                setViewTransferSearchQueries((prev) => ({ ...prev, [transfer.id]: e.target.value }))
                              }
                              placeholder="Buscar líneas de producto en esta transferencia..."
                              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                            />
                          </div>

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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* READ-ONLY: ODOO ORDENES DE COMPRA */}
          {solicitud.documento_tipo === 'Orden de Compra' && solicitud.ordenes_compra && solicitud.ordenes_compra.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-[#e2ebe3]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-[#122014] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#2d5a27]" />
                    <span>Órdenes de Compra y Productos a Enviar</span>
                  </label>
                  <p className="text-[11px] text-[#5a725e] mt-0.5">
                    Detalle de órdenes de compra vinculadas desde Odoo ERP
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {solicitud.ordenes_compra.map((po) => {
                  const isExpanded = !viewExpandedOrderIds[po.id];
                  const lines = po.lines || [];
                  const searchQuery = (viewLineSearchQueries[po.id] || '').trim().toLowerCase();

                  const filteredLines = searchQuery
                    ? lines.filter(
                        (l) =>
                          (l.product_name || '').toLowerCase().includes(searchQuery) ||
                          (l.name || '').toLowerCase().includes(searchQuery)
                      )
                    : lines;

                  const selectedCount = lines.filter((l) => l.seleccionada !== false).length;
                  const totalCount = lines.length;

                  return (
                    <div key={po.id} className="rounded-2xl bg-white border border-[#c8decb] shadow-2xs overflow-hidden">
                      <div className="p-3.5 bg-[#f8faf7] border-b border-[#e2ebe3] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-xs text-[#2d5a27]">{po.name}</span>
                          <span className="text-[11px] text-[#5a725e] truncate max-w-xs">{po.partner_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]">
                            {selectedCount} de {totalCount} productos enviados
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewExpandedOrderIds((prev) => ({ ...prev, [po.id]: !prev[po.id] }))}
                          className="px-2.5 py-1 rounded-lg border border-[#c8decb] hover:bg-white text-xs font-semibold text-[#2d5a27] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isExpanded ? 'Ocultar' : 'Ver productos'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3.5 bg-white space-y-3">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={viewLineSearchQueries[po.id] || ''}
                              onChange={(e) =>
                                setViewLineSearchQueries((prev) => ({ ...prev, [po.id]: e.target.value }))
                              }
                              placeholder="Buscar líneas de producto..."
                              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                            />
                          </div>

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

                  {/* 3. Documento Relacionado (Orden de Compra vs Requisición) */}
                  <div className="space-y-4 pt-2 border-t border-[#e2ebe3]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-[#122014] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#2d5a27]" />
                          <span>Selección de Productos a Despachar</span>
                        </label>
                        <p className="text-[11px] text-[#5a725e] mt-0.5">
                          Marca o desmarca los productos específicos que se están despachando en esta encomienda
                        </p>
                      </div>

                      {/* Selector Tabs */}
                      <div className="p-1 rounded-xl bg-[#f8faf7] border border-[#c8decb] flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSwitchEditDocumentoTipo('Orden de Compra')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            editDocumentoTipo === 'Orden de Compra'
                              ? 'bg-[#2d5a27] text-white shadow-2xs'
                              : 'text-[#5a725e] hover:bg-white'
                          }`}
                        >
                          Orden de Compra
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchEditDocumentoTipo('Requisición')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            editDocumentoTipo === 'Requisición'
                              ? 'bg-[#2d5a27] text-white shadow-2xs'
                              : 'text-[#5a725e] hover:bg-white'
                          }`}
                        >
                          Requisición
                        </button>
                      </div>
                    </div>

                    {/* DISPATCH EDIT: ORDEN DE COMPRA */}
                    {editDocumentoTipo === 'Orden de Compra' && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowOdooSearch(!showOdooSearch)}
                            className="px-3 py-1.5 rounded-xl border border-[#c8decb] bg-white hover:bg-[#eaf2eb] text-[#2d5a27] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Vincular otra Orden Odoo</span>
                          </button>
                        </div>

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
                              const isExpanded = !!editExpandedOrderIds[po.id];
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
                                        onClick={() =>
                                          setEditExpandedOrderIds((prev) => ({ ...prev, [po.id]: !prev[po.id] }))
                                        }
                                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#2d5a27] hover:bg-[#eaf2eb] border border-[#c8decb] flex items-center gap-1 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>{isExpanded ? 'Ocultar' : 'Ver líneas'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleRemovePurchaseOrder(po.id)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                        title="Eliminar de esta solicitud"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="p-4 space-y-3">
                                      <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                          type="text"
                                          value={editLineSearchQueries[po.id] || ''}
                                          onChange={(e) =>
                                            setEditLineSearchQueries((prev) => ({ ...prev, [po.id]: e.target.value }))
                                          }
                                          placeholder="Buscar líneas de producto..."
                                          className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                                        />
                                      </div>

                                      <div className="overflow-x-auto border border-[#e2ebe3] rounded-xl">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                                            <tr>
                                              <th className="py-2 px-3 w-12 text-center">Enviar</th>
                                              <th className="py-2 px-3">Producto / Descripción</th>
                                              <th className="py-2 px-3 text-right">Cant. Solicitada</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#e2ebe3]">
                                            {filteredLines.map((line) => (
                                              <tr
                                                key={line.id}
                                                onClick={() => handleToggleLine(po.id, line.id)}
                                                className={`cursor-pointer transition-colors ${
                                                  line.seleccionada
                                                    ? 'bg-[#eaf2eb]/40 hover:bg-[#eaf2eb]/70'
                                                    : 'hover:bg-slate-50 opacity-60'
                                                }`}
                                              >
                                                <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                  <input
                                                    type="checkbox"
                                                    checked={!!line.seleccionada}
                                                    onChange={() => handleToggleLine(po.id, line.id)}
                                                    className="w-4 h-4 rounded text-[#2d5a27] focus:ring-[#2d5a27] cursor-pointer"
                                                  />
                                                </td>
                                                <td className="py-2 px-3">
                                                  <div className="font-semibold text-[#122014]">
                                                    {line.product_name || line.name}
                                                  </div>
                                                  {line.name && line.name !== line.product_name && (
                                                    <div className="text-[11px] text-[#5a725e]">
                                                      {line.name}
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-bold text-[#122014]">
                                                  {line.product_qty} {line.product_uom_name || ''}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DISPATCH EDIT: REQUISICIÓN */}
                    {editDocumentoTipo === 'Requisición' && (
                      <div className="space-y-4">
                        {!selectedRequisicion ? (
                          <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#c8decb] space-y-3">
                            <label className="block text-xs font-bold text-[#122014]">
                              Buscar Requisición en Odoo ERP
                            </label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="w-4 h-4 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={editRequisicionQuery}
                                  onChange={(e) => setEditRequisicionQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSearchRequisicion();
                                    }
                                  }}
                                  placeholder="Ingresa número de requisición (Ej: EPR03508)..."
                                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] font-mono font-semibold uppercase"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSearchRequisicion()}
                                disabled={editRequisicionLoading || !editRequisicionQuery.trim()}
                                className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-[#2d5a27] hover:bg-[#366839] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                              >
                                {editRequisicionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                <span>Buscar</span>
                              </button>
                            </div>

                            {editRequisicionError && (
                              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                                {editRequisicionError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Requisition Header Card */}
                            <div className="p-4.5 rounded-2xl bg-[#eaf2eb] border border-[#c8decb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-[#2d5a27] bg-white px-2.5 py-0.5 rounded-lg border border-[#c8decb]">
                                    {selectedRequisicion.name}
                                  </span>
                                  {getOdooStateBadge(selectedRequisicion.state)}
                                  <span className="text-xs text-[#5a725e]">
                                    Solicitante: <strong className="text-[#122014]">{selectedRequisicion.employee_name || 'N/A'}</strong>
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-[#122014] mt-1">
                                  Asunto: {selectedRequisicion.req_name || '(Sin asunto)'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedRequisicion(null)}
                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-[#c8decb] text-rose-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Cambiar Requisición</span>
                              </button>
                            </div>

                            {/* Requisition Transfer Cards with Checkboxes */}
                            <div className="space-y-3">
                              {(selectedRequisicion.transferencias || []).map((transfer) => {
                                const isExpanded = !!editExpandedTransferIds[transfer.id];
                                const lines = transfer.lines || [];
                                const searchQuery = (editTransferSearchQueries[transfer.id] || '').trim().toLowerCase();

                                const filteredLines = searchQuery
                                  ? lines.filter(
                                      (l) =>
                                        (l.product_name || '').toLowerCase().includes(searchQuery) ||
                                        (l.name || '').toLowerCase().includes(searchQuery)
                                    )
                                  : lines;

                                const selectedCount = lines.filter((l) => l.seleccionada).length;
                                const totalCount = lines.length;
                                const allSelected = totalCount > 0 && selectedCount === totalCount;
                                const someSelected = lines.some((l) => l.seleccionada);

                                return (
                                  <div key={transfer.id} className="rounded-2xl bg-white border border-[#c8decb] overflow-hidden shadow-2xs">
                                    <div className="p-3.5 bg-[#f8faf7] border-b border-[#e2ebe3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <span className="w-7 h-7 rounded-lg bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center font-mono font-bold text-xs">
                                          TR
                                        </span>
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono font-bold text-xs text-[#2d5a27]">{transfer.name}</span>
                                            <span className="shrink-0">{getOdooStateBadge(transfer.state)}</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb] whitespace-nowrap shrink-0">
                                              {selectedCount} de {totalCount} seleccionados
                                            </span>
                                          </div>
                                          {(transfer.location_name || transfer.location_dest_name) && (
                                            <div className="text-[11px] text-[#5a725e] mt-0.5">
                                              {transfer.location_name} → {transfer.location_dest_name}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleAllTransferLines(transfer.id, !allSelected)}
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
                                          onClick={() =>
                                            setEditExpandedTransferIds((prev) => ({ ...prev, [transfer.id]: !prev[transfer.id] }))
                                          }
                                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#2d5a27] hover:bg-[#eaf2eb] border border-[#c8decb] flex items-center gap-1 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>{isExpanded ? 'Ocultar' : 'Ver líneas'}</span>
                                        </button>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="p-3.5 space-y-3">
                                        <div className="relative">
                                          <Search className="w-3.5 h-3.5 text-[#5a725e] absolute left-3 top-1/2 -translate-y-1/2" />
                                          <input
                                            type="text"
                                            value={editTransferSearchQueries[transfer.id] || ''}
                                            onChange={(e) =>
                                              setEditTransferSearchQueries((prev) => ({
                                                ...prev,
                                                [transfer.id]: e.target.value,
                                              }))
                                            }
                                            placeholder="Buscar líneas de producto en esta transferencia..."
                                            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#f8faf7] border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                                          />
                                        </div>

                                        <div className="overflow-x-auto border border-[#e2ebe3] rounded-xl">
                                          <table className="w-full text-left text-xs">
                                            <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                                              <tr>
                                                <th className="py-2 px-3 w-12 text-center">Enviar</th>
                                                <th className="py-2 px-3">Producto / Descripción</th>
                                                <th className="py-2 px-3 text-right">Cant. Solicitada</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#e2ebe3]">
                                              {filteredLines.map((line) => (
                                                <tr
                                                  key={line.id}
                                                  onClick={() => handleToggleTransferLine(transfer.id, line.id)}
                                                  className={`cursor-pointer transition-colors ${
                                                    line.seleccionada
                                                      ? 'bg-[#eaf2eb]/40 hover:bg-[#eaf2eb]/70'
                                                      : 'hover:bg-slate-50 opacity-60'
                                                  }`}
                                                >
                                                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                      type="checkbox"
                                                      checked={!!line.seleccionada}
                                                      onChange={() => handleToggleTransferLine(transfer.id, line.id)}
                                                      className="w-4 h-4 rounded text-[#2d5a27] focus:ring-[#2d5a27] cursor-pointer"
                                                    />
                                                  </td>
                                                  <td className="py-2 px-3">
                                                    <div className="font-semibold text-[#122014]">
                                                      {line.product_name || line.name}
                                                    </div>
                                                    {line.name && line.name !== line.product_name && (
                                                      <div className="text-[11px] text-[#5a725e]">
                                                        {line.name}
                                                      </div>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 text-right font-mono font-bold text-[#122014]">
                                                    {line.product_qty} {line.product_uom_name || ''}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions to Advance State */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#e2ebe3]">
                    <button
                      type="button"
                      onClick={() => handleAdvanceState('Enviado')}
                      disabled={updating}
                      className="px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2d5a27] hover:bg-[#22441d] shadow-sm shadow-[#2d5a27]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Actualizando Estado...</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4" />
                          <span>Confirmar Despacho y Marcar como "Enviado"</span>
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
                      <span>Confirmar Recepción por el Destinatario</span>
                    </div>
                    <p className="text-xs text-[#5a725e] mt-0.5">
                      Marca el envío como "Recibido" una vez que el paquete llegue satisfactoriamente a la sede de destino.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdvanceState('Recibido')}
                    disabled={updating}
                    className="px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2d5a27] hover:bg-[#22441d] shadow-sm shadow-[#2d5a27]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Actualizando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar como "Recibido"</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STATE 3: RECIBIDO (FINAL STATE) */}
              {solicitud.estado === 'Recibido' && (
                <div className="p-5 rounded-2xl bg-[#eaf2eb] border border-[#c8decb] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2d5a27] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#2d5a27] text-sm">
                      Envío Completado y Recibido
                    </div>
                    <p className="text-xs text-[#5a725e] mt-0.5">
                      Este envío ha completado satisfactoriamente todo su ciclo de vida.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
