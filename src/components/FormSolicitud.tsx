import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  AlertCircle, 
  Save, 
  Plus, 
  Search, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Trash2, 
  Eye, 
  User as UserIcon,
  Truck,
  Building,
  ShieldCheck,
  MapPin,
  Tag,
  Package
} from 'lucide-react';
import type { User, CatalogoData, UploadedFile, Solicitud, OdooPurchaseOrder, DestinatarioItem } from '../types';
import { SearchableSelect, MultiSearchableSelect, type SearchableOption } from './SearchableSelect';

interface FormSolicitudProps {
  currentUser: User;
  users: User[];
  catalogos: CatalogoData;
  onBack?: () => void;
  onSaveSuccess: (newSolicitud: Solicitud) => void;
  apiBase: string;
}

export const FormSolicitud: React.FC<FormSolicitudProps> = ({
  currentUser,
  users,
  catalogos,
  onBack,
  onSaveSuccess,
  apiBase,
}) => {
  const navigate = useNavigate();
  const isSolicitante = currentUser.rol === 'Solicitante';

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // 1. Current Date (Automatic, Non-editable)
  const [currentDate] = useState(() => new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }));

  // 2. Tipo de Solicitud
  const [tipoSolicitudId, setTipoSolicitudId] = useState<string>('');

  // 3. Número de Bultos
  const [numeroBultos, setNumeroBultos] = useState<string>('1');

  // 4. Solicitante
  const [solicitanteDNI, setSolicitanteDNI] = useState<string>(currentUser.dni);

  // 5. Enviado por
  const [enviadoPorDNI, setEnviadoPorDNI] = useState<string>(currentUser.dni);

  // 6. Empresa de transporte & Conditional Clave (Only for Gestor / Admin)
  const [empresaTransporteId, setEmpresaTransporteId] = useState<string>('');
  const [empresaTransporteClave, setEmpresaTransporteClave] = useState<string>('');

  // 7. Destinos (Multi-Select, starts empty)
  const [destinoIds, setDestinoIds] = useState<string[]>([]);

  // 8. Destinatarios por cada Destino seleccionado: Record<destinoId, destinatarioId[]>
  const [destinatariosByDestino, setDestinatariosByDestino] = useState<Record<string, string[]>>({});
  
  // Proveedor names per (destinoId + destinatarioId): Record<`${destId}_${destinId}`, string>
  const [proveedorNombres, setProveedorNombres] = useState<Record<string, string>>({});

  // 9. Gestor Asignado
  const [gestorDNI, setGestorDNI] = useState<string>('');

  // 10. Guía Transportista File (Only for Gestor / Admin)
  const [guiaFile, setGuiaFile] = useState<UploadedFile | null>(null);

  // 11. Documento Relacionado - Orden de Compra Odoo (Only for Gestor / Admin)
  const [odooQuery, setOdooQuery] = useState('');
  const [odooLoading, setOdooLoading] = useState(false);
  const [odooSearchResults, setOdooSearchResults] = useState<OdooPurchaseOrder[] | null>(null);
  const [odooSearchError, setOdooSearchError] = useState<string | null>(null);
  const [selectedOrdenesCompra, setSelectedOrdenesCompra] = useState<OdooPurchaseOrder[]>([]);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<number, boolean>>({});

  // Product inspection modal state (Ojito)
  const [previewOrder, setPreviewOrder] = useState<OdooPurchaseOrder | null>(null);

  // Comentarios
  const [comentarios, setComentarios] = useState<string>('');

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Safe array guards
  const safeUsers = Array.isArray(users) ? users : [];
  const safeEmpresas = Array.isArray(catalogos?.empresas_transporte) ? catalogos.empresas_transporte : [];
  const safeDestinos = Array.isArray(catalogos?.destinos) ? catalogos.destinos : [];
  const safeDestinatarios = Array.isArray(catalogos?.destinatarios) ? catalogos.destinatarios : [];
  const safeTiposSolicitud = Array.isArray(catalogos?.tipos_solicitud) ? catalogos.tipos_solicitud : [];

  // Filter active gestores for dropdown
  const activeGestores = safeUsers.filter((u) => (u.rol === 'Gestor' || u.rol === 'Administrador') && u.es_gestor_activado);

  // Initialize dropdown defaults (only for required single selects, NOT for multi-selects)
  useEffect(() => {
    if (safeTiposSolicitud.length > 0 && !tipoSolicitudId) {
      setTipoSolicitudId(safeTiposSolicitud[0].id);
    }
    if (safeEmpresas.length > 0 && !empresaTransporteId) {
      setEmpresaTransporteId(safeEmpresas[0].id);
    }
    if (activeGestores.length > 0 && !gestorDNI) {
      setGestorDNI(activeGestores[0].dni);
    }
  }, [safeTiposSolicitud, safeEmpresas, activeGestores]);

  // Options mapping for SearchableSelect components
  const tipoSolicitudOptions: SearchableOption[] = safeTiposSolicitud.map((t) => ({
    id: t.id,
    title: t.nombre,
  }));

  const userOptions: SearchableOption[] = safeUsers.map((u) => ({
    id: u.dni,
    title: u.nombre,
    searchKeywords: `${u.nombre} ${u.dni}`,
  }));

  const empresaOptions: SearchableOption[] = safeEmpresas.map((e) => ({
    id: e.id,
    title: e.nombre,
    subtitle: e.requiere_clave ? 'Requiere Clave de Retiro (ej. Shalom)' : 'Envío estándar sin clave',
  }));

  const destinoOptions: SearchableOption[] = safeDestinos.map((dest) => ({
    id: dest.id,
    title: dest.nombre,
  }));

  const gestorOptions: SearchableOption[] = activeGestores.map((g) => ({
    id: g.dni,
    title: g.nombre,
    searchKeywords: `${g.nombre} ${g.dni}`,
  }));

  // Options generator for Destinatarios filtered and prioritized per Destination
  const getDestinatarioOptionsForDestino = (destId: string): SearchableOption[] => {
    const destObj = safeDestinos.find((s) => s.id === destId);
    const destName = destObj?.nombre || 'este destino';

    // 1. Specifically tagged with this destination (top priority)
    const tagged = safeDestinatarios.filter(
      (d) => d.destino_ids && d.destino_ids.includes(destId)
    );

    // 2. Untagged recipients (available for all destinations)
    const untagged = safeDestinatarios.filter(
      (d) => !d.destino_ids || d.destino_ids.length === 0
    );

    // 3. Recipients tagged with other destinations (placed at bottom)
    const others = safeDestinatarios.filter(
      (d) => d.destino_ids && d.destino_ids.length > 0 && !d.destino_ids.includes(destId)
    );

    const orderedList = [...tagged, ...untagged, ...others];

    return orderedList.map((d) => {
      const isSpecificallyTagged = d.destino_ids && d.destino_ids.includes(destId);
      const isOtherTagged = d.destino_ids && d.destino_ids.length > 0 && !d.destino_ids.includes(destId);

      let subtitle = d.es_proveedor ? 'Requiere nombre del proveedor' : undefined;
      if (isSpecificallyTagged) {
        subtitle = subtitle ? `${subtitle} • Sede: ${destName}` : `Asignado a: ${destName}`;
      } else if (isOtherTagged) {
        const otherNames = d.destino_ids?.map((id) => safeDestinos.find((s) => s.id === id)?.nombre || id).join(', ');
        subtitle = subtitle ? `${subtitle} • Otras sedes: ${otherNames}` : `Otras sedes: ${otherNames}`;
      }

      return {
        id: d.id,
        title: d.nombre,
        subtitle,
        badge: isSpecificallyTagged ? `Sede ${destName}` : undefined,
        searchKeywords: `${d.nombre} ${isSpecificallyTagged ? destName : ''} ${d.es_proveedor ? 'proveedor' : ''}`,
      };
    });
  };

  // Toggle Destinos
  const handleToggleDestino = (destId: string) => {
    setDestinoIds((prev) => {
      if (prev.includes(destId)) {
        const next = prev.filter((id) => id !== destId);
        // Clean up destinatarios for this removed destino
        setDestinatariosByDestino((prevMap) => {
          const nextMap = { ...prevMap };
          delete nextMap[destId];
          return nextMap;
        });
        return next;
      } else {
        return [...prev, destId];
      }
    });
  };

  const handleRemoveDestino = (destId: string) => {
    setDestinoIds((prev) => prev.filter((id) => id !== destId));
    setDestinatariosByDestino((prevMap) => {
      const nextMap = { ...prevMap };
      delete nextMap[destId];
      return nextMap;
    });
  };

  // Toggle Destinatario for a specific Destino
  const handleToggleDestinatarioForDestino = (destId: string, destinId: string) => {
    setDestinatariosByDestino((prev) => {
      const currentList = prev[destId] || [];
      if (currentList.includes(destinId)) {
        const nextList = currentList.filter((id) => id !== destinId);
        const key = `${destId}_${destinId}`;
        setProveedorNombres((p) => {
          const nextP = { ...p };
          delete nextP[key];
          return nextP;
        });
        return { ...prev, [destId]: nextList };
      } else {
        return { ...prev, [destId]: [...currentList, destinId] };
      }
    });
  };

  const handleRemoveDestinatarioForDestino = (destId: string, destinId: string) => {
    setDestinatariosByDestino((prev) => {
      const currentList = prev[destId] || [];
      const nextList = currentList.filter((id) => id !== destinId);
      const key = `${destId}_${destinId}`;
      setProveedorNombres((p) => {
        const nextP = { ...p };
        delete nextP[key];
        return nextP;
      });
      return { ...prev, [destId]: nextList };
    });
  };

  // Check conditional rule for Shalom
  const selectedEmpresa = safeEmpresas.find((e) => e.id === empresaTransporteId);
  const requiresShalomClave = !isSolicitante && (selectedEmpresa?.requiere_clave || selectedEmpresa?.nombre.toLowerCase().includes('shalom'));

  // Helper to convert file to Base64
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

  // Handle single Guía file upload
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
        sizeBytes: file.size,
      });
      setError(null);
    } catch {
      setError('Error al procesar el archivo de la Guía.');
    }
  };

  // Search Odoo Purchase Orders
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

  // Add Purchase Order to selected list
  const handleAddPurchaseOrder = (po: OdooPurchaseOrder) => {
    if (selectedOrdenesCompra.some((item) => item.id === po.id)) {
      return;
    }
    setSelectedOrdenesCompra((prev) => [...prev, po]);
    setExpandedOrderIds((prev) => ({ ...prev, [po.id]: true }));
  };

  // Remove Purchase Order from selected list
  const handleRemovePurchaseOrder = (orderId: number) => {
    setSelectedOrdenesCompra((prev) => prev.filter((item) => item.id !== orderId));
  };

  // Toggle expand line items
  const toggleExpandOrder = (orderId: number) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Get state badge for Odoo PO
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

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!isSolicitante && !guiaFile) {
      setError('Debes adjuntar obligatoriamente el archivo de la Guía del Transportista.');
      return;
    }

    if (!isSolicitante && requiresShalomClave && !empresaTransporteClave.trim()) {
      setError('Para envíos con Shalom, el campo "Clave" es estrictamente obligatorio.');
      return;
    }

    const parsedBultos = parseInt(numeroBultos, 10);
    if (isNaN(parsedBultos) || parsedBultos < 1) {
      setError('El número de bultos debe ser un número entero mayor o igual a 1.');
      return;
    }

    if (destinoIds.length === 0) {
      setError('Debes seleccionar al menos un destino para el envío.');
      return;
    }

    // Validate recipients per each destination
    const allResolvedDestinatarios: DestinatarioItem[] = [];

    for (const destId of destinoIds) {
      const destObj = safeDestinos.find((d) => d.id === destId);
      const destRecipients = destinatariosByDestino[destId] || [];

      if (destRecipients.length === 0) {
        setError(`Debes seleccionar al menos un destinatario para el destino "${destObj?.nombre || destId}".`);
        return;
      }

      for (const destinId of destRecipients) {
        const destinObj = safeDestinatarios.find((d) => d.id === destinId);
        const isProv = destinObj?.es_proveedor || destinObj?.nombre.toLowerCase().includes('proveedor');
        const key = `${destId}_${destinId}`;
        const provName = proveedorNombres[key]?.trim();

        if (isProv && !provName) {
          setError(`Debes indicar el nombre del proveedor para "${destinObj?.nombre || 'Proveedor'}" en el destino "${destObj?.nombre || destId}".`);
          return;
        }

        allResolvedDestinatarios.push({
          id: destinId,
          nombre: destinObj?.nombre || destinId,
          es_proveedor: isProv,
          proveedor_nombre: isProv ? provName : undefined,
          destino_id: destId,
          destino_nombre: destObj?.nombre || destId,
        });
      }
    }

    if (!gestorDNI) {
      setError('Debes asignar a un Gestor activo.');
      return;
    }

    setSaving(true);

    // Prepare payload
    const archivosPayload: Record<string, { nombre: string; mime_type: string; contenido: string }> = {};
    if (guiaFile) {
      archivosPayload['guia'] = {
        nombre: guiaFile.nombre,
        mime_type: guiaFile.mime_type,
        contenido: guiaFile.contenido,
      };
    }

    // Build destinos list
    const destinosList = destinoIds.map((id) => {
      const dest = safeDestinos.find((d) => d.id === id);
      return {
        id,
        nombre: dest?.nombre || id,
      };
    });

    const firstProvName = Object.values(proveedorNombres).find((name) => !!name?.trim());

    const bodyPayload = {
      solicitud: {
        solicitante_dni: solicitanteDNI,
        enviado_por_dni: enviadoPorDNI,
        numero_bultos: parsedBultos,
        tipo_solicitud_id: tipoSolicitudId || undefined,
        empresa_transporte_id: !isSolicitante ? empresaTransporteId : undefined,
        empresa_transporte_clave: (!isSolicitante && requiresShalomClave) ? empresaTransporteClave : undefined,
        destino_id: destinoIds[0],
        destinos: destinosList,
        destinatario_id: allResolvedDestinatarios[0]?.id || '',
        destinatarios: allResolvedDestinatarios,
        destinatario_proveedor_nombre: firstProvName || undefined,
        gestor_dni: gestorDNI,
        documento_tipo: 'Orden de Compra',
        comentarios: comentarios.trim() || undefined,
        ordenes_compra: (!isSolicitante && selectedOrdenesCompra.length > 0) ? selectedOrdenesCompra : undefined,
      },
      archivos: archivosPayload,
    };

    try {
      const response = await fetch(`${apiBase}/api/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const result = await response.json();
      if (result.success && result.data) {
        onSaveSuccess(result.data);
      } else {
        setError(result.error || 'Error al guardar la solicitud en el backend');
      }
    } catch {
      setError('Error al conectar con el backend. Por favor, verifica la conexión y vuelve a intentarlo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header & Back Action */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleGoBack}
          className="flex items-center gap-2 text-xs font-semibold text-[#5a725e] hover:text-[#2d5a27] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Tablero</span>
        </button>

        <div className="text-xs text-[#5a725e]">
          Campos obligatorios <span className="text-rose-500 font-bold">*</span>
        </div>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-[#e2ebe3] shadow-xl overflow-hidden">
        
        {/* Banner Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-[#2d5a27]/10 via-[#4e8752]/5 to-transparent border-b border-[#e2ebe3]">
          <div className="flex items-center gap-2 text-xs text-[#2d5a27] font-bold uppercase tracking-wider">
            <span>Rainforest Expeditions</span>
            <span>•</span>
            <span>Nuevo Registro</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#122014] mt-1">
            Crear Solicitud de Envío
          </h2>
          <p className="text-xs text-[#5a725e] mt-1">
            {isSolicitante
              ? 'Completa los datos esenciales de tu envío para que el Gestor programe y despache tu carga'
              : 'Completa la información para registrar y programar el seguimiento logístico'}
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-8">

          {/* Point 1: Fecha de Registro (Automatic) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pb-6 border-b border-[#e2ebe3]">
            <div>
              <label className="text-xs font-bold text-[#122014]">
                1. Fecha de Registro
              </label>
              <p className="text-[11px] text-[#5a725e] mt-0.5">
                Generada automáticamente por el sistema
              </p>
            </div>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={currentDate}
                disabled
                className="w-full px-4 py-2.5 rounded-xl text-xs font-mono bg-[#f8faf7] border border-[#e2ebe3] text-[#5a725e] cursor-not-allowed"
              />
            </div>
          </div>

          {/* Point 2: Tipo de Solicitud */}
          <SearchableSelect
            label="2. Tipo de Solicitud"
            sublabel="Selecciona la categoría del requerimiento o trámite"
            selectedId={tipoSolicitudId}
            onSelect={(id) => setTipoSolicitudId(id)}
            options={tipoSolicitudOptions}
            icon={<Tag className="w-4 h-4" />}
            placeholder="Buscar tipo de solicitud..."
          />

          {/* Point 3: Número de Bultos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pb-6 border-b border-[#e2ebe3]">
            <div>
              <label className="text-xs font-bold text-[#122014]">
                3. Número de Bultos <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-[#5a725e] mt-0.5">
                Cantidad total de paquetes, cajas o valijas a enviar
              </p>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="w-9 h-9 rounded-xl bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center font-bold text-xs shadow-xs absolute left-2.5 top-1/2 -translate-y-1/2">
                    <Package className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numeroBultos}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        setNumeroBultos(val);
                      }
                    }}
                    onBlur={() => {
                      if (!numeroBultos || parseInt(numeroBultos, 10) < 1) {
                        setNumeroBultos('1');
                      }
                    }}
                    placeholder="Ej. 1, 5, 20..."
                    className="w-full pl-14 pr-4 py-2.5 rounded-xl text-xs bg-white border border-[#c8decb] text-[#122014] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 font-semibold"
                  />
                </div>

                {/* Botones +/- para incrementar/decrementar rápidamente */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(numeroBultos, 10) || 1;
                      setNumeroBultos(String(Math.max(1, current - 1)));
                    }}
                    className="w-9 h-9 rounded-xl border border-[#c8decb] bg-[#f8faf7] hover:bg-[#eaf2eb] text-[#2d5a27] font-bold text-base flex items-center justify-center transition-colors cursor-pointer select-none"
                    title="Disminuir bulto (-1)"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(numeroBultos, 10) || 0;
                      setNumeroBultos(String(current + 1));
                    }}
                    className="w-9 h-9 rounded-xl border border-[#c8decb] bg-[#f8faf7] hover:bg-[#eaf2eb] text-[#2d5a27] font-bold text-base flex items-center justify-center transition-colors cursor-pointer select-none"
                    title="Aumentar bulto (+1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Point 4: Solicitante */}
          <SearchableSelect
            label="4. Solicitante"
            sublabel="Selecciona el usuario que solicita el envío"
            selectedId={solicitanteDNI}
            onSelect={(id) => setSolicitanteDNI(id)}
            options={userOptions}
            icon={<UserIcon className="w-4 h-4" />}
            placeholder="Escribe para buscar solicitante..."
          />

          {/* Point 5: Enviado por */}
          <SearchableSelect
            label="5. Enviado por"
            sublabel="Selecciona el encargado de entregar la carga al transportista"
            selectedId={enviadoPorDNI}
            onSelect={(id) => setEnviadoPorDNI(id)}
            options={userOptions}
            icon={<UserIcon className="w-4 h-4" />}
            placeholder="Escribe para buscar quien entrega la carga..."
          />

          {/* Point 6 (Gestor/Admin Only): Empresa de Transporte & Shalom Clave */}
          {!isSolicitante && (
            <div className="space-y-4">
              <SearchableSelect
                label="6. Empresa de Transporte"
                sublabel="Empresa o agencia de envíos"
                selectedId={empresaTransporteId}
                onSelect={(id) => setEmpresaTransporteId(id)}
                options={empresaOptions}
                icon={<Truck className="w-4 h-4" />}
                placeholder="Buscar empresa de transporte..."
              />

              {/* Conditional Clave Input (for Shalom) */}
              {requiresShalomClave && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6 border-b border-[#e2ebe3]">
                  <div />
                  <div className="sm:col-span-2">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 animate-fade-in">
                      <label className="block text-xs font-bold text-amber-900">
                        Clave de Seguridad para Retiro (Shalom) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={empresaTransporteClave}
                        onChange={(e) => setEmpresaTransporteClave(e.target.value)}
                        placeholder="Ingresa la clave de retiro de 4 a 6 dígitos..."
                        className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-amber-300 text-[#122014] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-wider"
                      />
                      <p className="text-[11px] text-amber-700">
                        Obligatoria para que el destinatario pueda retirar la encomienda en agencia Shalom.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Destinos: Multiple Selection */}
          <MultiSearchableSelect
            label={`${isSolicitante ? '6' : '7'}. Destino(s)`}
            sublabel="Puedes seleccionar una o múltiples ciudades, sedes o albergues de llegada"
            selectedIds={destinoIds}
            onToggle={handleToggleDestino}
            onRemove={handleRemoveDestino}
            options={destinoOptions}
            icon={<MapPin className="w-4 h-4" />}
            placeholder="Buscar y seleccionar uno o más destinos..."
            required={true}
          />

          {/* Destinatarios por cada Destino seleccionado */}
          <div className="pb-6 border-b border-[#e2ebe3] space-y-4">
            <div>
              <label className="text-xs font-bold text-[#122014]">
                {isSolicitante ? '7' : '8'}. Destinatario(s) por Destino <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-[#5a725e] mt-0.5">
                Asigna a los encargados o proveedores de recepción correspondientes a cada lugar de llegada
              </p>
            </div>

            {destinoIds.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#f8faf7] border border-dashed border-[#c8decb] text-center space-y-1.5 animate-fade-in">
                <MapPin className="w-6 h-6 text-[#88a58c] mx-auto mb-1" />
                <div className="text-xs font-semibold text-[#122014]">
                  Ningún destino seleccionado
                </div>
                <p className="text-[11px] text-[#5a725e] max-w-sm mx-auto">
                  Selecciona primero uno o más destinos arriba para poder asignar los destinatarios de cada destino.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {destinoIds.map((destId, idx) => {
                  const destObj = safeDestinos.find((d) => d.id === destId);
                  const destName = destObj?.nombre || destId;
                  const selectedRecipients = destinatariosByDestino[destId] || [];

                  return (
                    <div 
                      key={destId} 
                      className="relative p-5 rounded-2xl bg-white border border-[#c8decb] shadow-xs space-y-3.5 animate-fade-in"
                      style={{ zIndex: 30 - idx }}
                    >
                      {/* Destination Header Tag */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#e2ebe3]">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#2d5a27] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-[#122014] flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#2d5a27]" />
                              <span>Destinatarios para: <strong className="text-[#2d5a27]">{destName}</strong></span>
                            </div>
                            <div className="text-[11px] text-[#5a725e]">
                              Área, sede o proveedor final que recepciona en {destName}
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#f8faf7] border border-[#c8decb] text-[#5a725e] shrink-0">
                          {selectedRecipients.length} seleccionado(s)
                        </span>
                      </div>

                      {/* Recipient Multi Select using layout="none" for full width and no redundant grid */}
                      <MultiSearchableSelect
                        selectedIds={selectedRecipients}
                        onToggle={(destinId) => handleToggleDestinatarioForDestino(destId, destinId)}
                        onRemove={(destinId) => handleRemoveDestinatarioForDestino(destId, destinId)}
                        options={getDestinatarioOptionsForDestino(destId)}
                        icon={<Building className="w-4 h-4" />}
                        placeholder={`Buscar y seleccionar destinatario(s) para ${destName}...`}
                        layout="none"
                        required={true}
                      />

                      {/* Render provider name input if any selected recipient is a Provider */}
                      {selectedRecipients.map((destinId) => {
                        const destinObj = safeDestinatarios.find((d) => d.id === destinId);
                        if (!destinObj || (!destinObj.es_proveedor && !destinObj.nombre.toLowerCase().includes('proveedor'))) {
                          return null;
                        }
                        const key = `${destId}_${destinId}`;
                        return (
                          <div key={key} className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5 animate-fade-in">
                            <label className="block text-xs font-bold text-amber-900">
                              Nombre / Razón Social del Proveedor ({destinObj.nombre}) en {destName} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={proveedorNombres[key] || ''}
                              onChange={(e) => setProveedorNombres((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="Ej. Distribuidora Amazónica S.A.C., Ferretería Central..."
                              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-amber-300 text-[#122014] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gestor Asignado */}
          <SearchableSelect
            label={`${isSolicitante ? '8' : '9'}. Gestor Asignado`}
            sublabel="Gestor activo autorizado para recepcionar y coordinar"
            selectedId={gestorDNI}
            onSelect={(id) => setGestorDNI(id)}
            options={gestorOptions}
            icon={<ShieldCheck className="w-4 h-4" />}
            placeholder="Buscar gestor activo por nombre o DNI..."
            emptyMessage="No hay gestores activos disponibles."
          />

          {/* Gestor/Admin Only: Guía del Transportista */}
          {!isSolicitante && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6 border-b border-[#e2ebe3]">
              <div>
                <label className="text-xs font-bold text-[#122014]">
                  10. Guía del Transportista <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-[#5a725e] mt-0.5">
                  Foto o PDF de la guía emitida por la agencia
                </p>
              </div>
              <div className="sm:col-span-2 space-y-3">
                {!guiaFile ? (
                  <label className="border-2 border-dashed border-[#c8decb] hover:border-[#2d5a27] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#f8faf7] group">
                    <Upload className="w-7 h-7 text-[#2d5a27] group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-xs font-semibold text-[#122014]">
                      Haz clic o arrastra la Guía aquí
                    </span>
                    <span className="text-[11px] text-[#5a725e] mt-0.5">
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
                      <div className="w-9 h-9 rounded-xl bg-white text-[#2d5a27] flex items-center justify-center font-bold text-xs shadow-xs">
                        {guiaFile.mime_type.includes('pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#122014] truncate max-w-xs">
                          {guiaFile.nombre}
                        </div>
                        <div className="text-[11px] text-[#5a725e]">
                          Guía adjunta correctamente
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuiaFile(null)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar archivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gestor/Admin Only: Órdenes de Compra (Odoo) */}
          {!isSolicitante && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6 border-b border-[#e2ebe3]">
              <div>
                <label className="text-xs font-bold text-[#122014] flex items-center gap-1.5">
                  <span>11. Documento Relacionado (Orden de Compra)</span>
                </label>
                <p className="text-[11px] text-[#5a725e] mt-0.5">
                  Búsqueda e inserción directa desde Odoo ERP
                </p>
              </div>
              <div className="sm:col-span-2 space-y-4">
                
                {/* Odoo Search Container */}
                <div className="p-5 rounded-2xl bg-[#f8faf7] border border-[#c8decb] space-y-3.5">
                  <label className="block text-xs font-bold text-[#122014]">
                    Buscar Orden de Compra en Odoo ERP
                  </label>
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
                        placeholder="Ingresa código o referencia (Ej: OC-06336 o 00322)..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-white border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchOdoo()}
                      disabled={odooLoading || !odooQuery.trim()}
                      className="px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2d5a27] hover:bg-[#366839] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      {odooLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Buscar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Search Error / Empty Alert */}
                  {odooSearchError && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{odooSearchError}</span>
                    </div>
                  )}

                  {/* Search Results List */}
                  {odooSearchResults && odooSearchResults.length > 0 && (
                    <div className="space-y-2.5 mt-3 pt-3 border-t border-[#e2ebe3] animate-fade-in">
                      <div className="text-[11px] font-bold text-[#5a725e]">
                        Resultados encontrados en Odoo ({odooSearchResults.length}):
                      </div>
                      <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                        {odooSearchResults.map((po) => {
                          const isAdded = selectedOrdenesCompra.some((item) => item.id === po.id);
                          return (
                            <div
                              key={po.id}
                              className="p-3.5 rounded-xl bg-white border border-[#c8decb] hover:border-[#2d5a27] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-[#2d5a27]">
                                    {po.name}
                                  </span>
                                  {getOdooStateBadge(po.state)}
                                </div>
                                <div className="text-xs font-semibold text-[#122014]">
                                  Proveedor: {po.partner_name || 'Sin proveedor'}
                                </div>
                                <div className="text-[11px] text-[#5a725e]">
                                  Total: <strong className="text-[#122014]">{po.amount_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} {po.currency_name || 'PEN'}</strong> • {po.lines?.length || 0} producto(s)
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => setPreviewOrder(po)}
                                  className="px-3 py-1.5 rounded-lg border border-[#c8decb] hover:bg-[#eaf2eb] text-[#2d5a27] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                  title="Ver detalle de productos"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Ver productos</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAddPurchaseOrder(po)}
                                  disabled={isAdded}
                                  className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isAdded
                                      ? 'bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb] opacity-80'
                                      : 'bg-[#2d5a27] text-white hover:bg-[#366839]'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Agregada</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Agregar</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Purchase Orders Multi-List */}
                {selectedOrdenesCompra.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-[#122014] flex items-center justify-between">
                      <span>Órdenes de Compra vinculadas a esta solicitud ({selectedOrdenesCompra.length})</span>
                    </div>

                    <div className="space-y-3">
                      {selectedOrdenesCompra.map((po) => {
                        const isExpanded = !!expandedOrderIds[po.id];
                        return (
                          <div
                            key={po.id}
                            className="rounded-2xl bg-white border border-[#c8decb] shadow-xs overflow-hidden"
                          >
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

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandOrder(po.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#c8decb] bg-white hover:bg-[#eaf2eb] text-xs font-semibold text-[#2d5a27] flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{po.lines?.length || 0} productos</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePurchaseOrder(po.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Quitar orden de compra"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Expandable Lines Table */}
                            {isExpanded && (
                              <div className="p-4 border-t border-[#e2ebe3] bg-white">
                                {(!po.lines || po.lines.length === 0) ? (
                                  <div className="text-center py-4 text-xs text-[#5a725e]">
                                    No se registran líneas detalladas para esta orden.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="text-[#5a725e] font-semibold border-b border-[#e2ebe3] bg-[#f8faf7]">
                                        <tr>
                                          <th className="py-2.5 px-3">Producto / Descripción</th>
                                          <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                                          <th className="py-2.5 px-3 text-right">Cant. Recibida</th>
                                          <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#e2ebe3]">
                                        {po.lines.map((line) => (
                                          <tr key={line.id} className="hover:bg-[#f8faf7]">
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
                                            <td className="py-2.5 px-3 text-right font-mono text-[#122014]">
                                              {line.product_qty} {line.product_uom_name || ''}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-[#5a725e]">
                                              {line.qty_received}
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

              </div>
            </div>
          )}

          {/* Comentarios Opcionales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6">
            <div>
              <label className="text-xs font-bold text-[#122014]">
                {isSolicitante ? '9' : '12'}. Comentarios Opcionales
              </label>
              <p className="text-[11px] text-[#5a725e] mt-0.5">
                Instrucciones especiales de manejo, contenido del paquete o empaque
              </p>
            </div>
            <div className="sm:col-span-2">
              <textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                rows={3}
                placeholder="Observaciones de empaque, fragilidad, contenido de la encomienda..."
                className="w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-[#e2ebe3] text-[#122014] placeholder:text-[#88a58c] focus:ring-2 focus:ring-[#2d5a27]/30"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 sm:p-8 bg-[#f8faf7] border-t border-[#e2ebe3] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#5a725e] hover:bg-[#eaf2eb] transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] shadow-md shadow-[#2d5a27]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando Solicitud...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Solicitud de Envío</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Ojito: Product Preview Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#e2ebe3] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
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
                  Fecha: {previewOrder.date_order ? new Date(previewOrder.date_order).toLocaleDateString('es-PE') : 'N/A'} • Total: <strong className="text-[#122014]">{previewOrder.amount_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} {previewOrder.currency_name || 'PEN'}</strong>
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

            {/* Modal Body: Products Table */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#2d5a27] mb-3 flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>Detalle de Productos / Líneas de la Orden ({previewOrder.lines?.length || 0})</span>
              </div>

              {(!previewOrder.lines || previewOrder.lines.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#5a725e]">
                  No se encontraron productos registrados en esta orden de compra.
                </div>
              ) : (
                <div className="border border-[#e2ebe3] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8faf7] text-[#5a725e] font-semibold border-b border-[#e2ebe3]">
                      <tr>
                        <th className="py-2.5 px-3">Producto / Descripción</th>
                        <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                        <th className="py-2.5 px-3 text-right">Cant. Recibida</th>
                        <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2ebe3]">
                      {previewOrder.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-[#f8faf7] transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-[#122014]">
                              {line.product_name || line.name}
                            </div>
                            {line.name && line.name !== line.product_name && (
                              <div className="text-[11px] text-[#5a725e] mt-0.5">
                                {line.name}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#122014]">
                            {line.product_qty} {line.product_uom_name || ''}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#5a725e]">
                            {line.qty_received}
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

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-[#f8faf7] border-t border-[#e2ebe3] flex items-center justify-between">
              <div className="text-xs font-semibold text-[#5a725e]">
                Monto Total: <span className="font-bold text-[#2d5a27] text-sm">{previewOrder.amount_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} {previewOrder.currency_name || 'PEN'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a725e] hover:bg-[#eaf2eb] transition-colors cursor-pointer"
                >
                  Cerrar
                </button>

                {!selectedOrdenesCompra.some((item) => item.id === previewOrder.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAddPurchaseOrder(previewOrder);
                      setPreviewOrder(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar a Solicitud</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
