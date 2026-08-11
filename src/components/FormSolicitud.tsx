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
  MapPin
} from 'lucide-react';
import type { User, CatalogoData, UploadedFile, Solicitud, OdooPurchaseOrder } from '../types';
import { SearchableSelect, type SearchableOption } from './SearchableSelect';

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

  // 2. Solicitante
  const [solicitanteDNI, setSolicitanteDNI] = useState<string>(currentUser.dni);

  // 3. Enviado por
  const [enviadoPorDNI, setEnviadoPorDNI] = useState<string>(currentUser.dni);

  // 4. Empresa de transporte & Conditional Clave (Only for Gestor / Admin)
  const [empresaTransporteId, setEmpresaTransporteId] = useState<string>('');
  const [empresaTransporteClave, setEmpresaTransporteClave] = useState<string>('');

  // 5. Destino (Moved before Destinatario)
  const [destinoId, setDestinoId] = useState<string>('');

  // 6. Destinatario & Conditional Proveedor Name
  const [destinatarioId, setDestinatarioId] = useState<string>('');
  const [proveedorNombre, setProveedorNombre] = useState<string>('');

  // 7. Gestor Asignado
  const [gestorDNI, setGestorDNI] = useState<string>('');

  // 8. Guía Transportista File (Only for Gestor / Admin)
  const [guiaFile, setGuiaFile] = useState<UploadedFile | null>(null);

  // 9. Documento Relacionado - Orden de Compra Odoo (Only for Gestor / Admin)
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

  // Filter active gestores for dropdown
  const activeGestores = safeUsers.filter((u) => (u.rol === 'Gestor' || u.rol === 'Administrador') && u.es_gestor_activado);

  // Initialize dropdown defaults
  useEffect(() => {
    if (safeEmpresas.length > 0 && !empresaTransporteId) {
      setEmpresaTransporteId(safeEmpresas[0].id);
    }
    if (safeDestinos.length > 0 && !destinoId) {
      setDestinoId(safeDestinos[0].id);
    }
    if (safeDestinatarios.length > 0 && !destinatarioId) {
      setDestinatarioId(safeDestinatarios[0].id);
    }
    if (activeGestores.length > 0 && !gestorDNI) {
      setGestorDNI(activeGestores[0].dni);
    }
  }, [safeEmpresas, safeDestinos, safeDestinatarios, activeGestores]);

  // Options mapping for SearchableSelect components
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

  const destinatarioOptions: SearchableOption[] = safeDestinatarios.map((d) => ({
    id: d.id,
    title: d.nombre,
  }));

  const gestorOptions: SearchableOption[] = activeGestores.map((g) => ({
    id: g.dni,
    title: g.nombre,
    searchKeywords: `${g.nombre} ${g.dni}`,
  }));

  // Check conditional rule for Shalom
  const selectedEmpresa = safeEmpresas.find((e) => e.id === empresaTransporteId);
  const requiresShalomClave = !isSolicitante && (selectedEmpresa?.requiere_clave || selectedEmpresa?.nombre.toLowerCase().includes('shalom'));

  // Check conditional rule for Proveedor
  const selectedDestinatario = safeDestinatarios.find((d) => d.id === destinatarioId);
  const requiresProveedorNombre = selectedDestinatario?.es_proveedor || selectedDestinatario?.nombre.toLowerCase().includes('proveedor');

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
      return; // Already added
    }
    setSelectedOrdenesCompra((prev) => [...prev, po]);
    setExpandedOrderIds((prev) => ({ ...prev, [po.id]: true })); // Auto-expand
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

    if (!destinoId) {
      setError('Debes seleccionar el destino del envío.');
      return;
    }

    if (!destinatarioId) {
      setError('Debes seleccionar el destinatario.');
      return;
    }

    if (requiresProveedorNombre && !proveedorNombre.trim()) {
      setError('Al seleccionar destinatario Proveedor, debes indicar el nombre del proveedor.');
      return;
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

    const bodyPayload = {
      solicitud: {
        solicitante_dni: solicitanteDNI,
        enviado_por_dni: enviadoPorDNI,
        empresa_transporte_id: !isSolicitante ? empresaTransporteId : undefined,
        empresa_transporte_clave: (!isSolicitante && requiresShalomClave) ? empresaTransporteClave : undefined,
        destino_id: destinoId,
        destinatario_id: destinatarioId,
        destinatario_proveedor_nombre: requiresProveedorNombre ? proveedorNombre : undefined,
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

          {/* Point 2: Solicitante (Solo Nombre al seleccionar) */}
          <SearchableSelect
            label="2. Solicitante"
            sublabel="Selecciona el usuario que solicita el envío"
            selectedId={solicitanteDNI}
            onSelect={(id) => setSolicitanteDNI(id)}
            options={userOptions}
            icon={<UserIcon className="w-4 h-4" />}
            placeholder="Escribe para buscar solicitante..."
          />

          {/* Point 3: Enviado por (Solo Nombre al seleccionar) */}
          <SearchableSelect
            label="3. Enviado por"
            sublabel="Selecciona el encargado de entregar la carga al transportista"
            selectedId={enviadoPorDNI}
            onSelect={(id) => setEnviadoPorDNI(id)}
            options={userOptions}
            icon={<UserIcon className="w-4 h-4" />}
            placeholder="Escribe para buscar quien entrega la carga..."
          />

          {/* Point 4 (Gestor/Admin Only): Empresa de Transporte & Shalom Clave */}
          {!isSolicitante && (
            <div className="space-y-4">
              <SearchableSelect
                label="4. Empresa de Transporte"
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

          {/* Destino (Point 4 for Solicitante, Point 5 for Gestor/Admin) */}
          <SearchableSelect
            label={`${isSolicitante ? '4' : '5'}. Destino`}
            sublabel="Ciudad, sede o albergue de llegada"
            selectedId={destinoId}
            onSelect={(id) => setDestinoId(id)}
            options={destinoOptions}
            icon={<MapPin className="w-4 h-4" />}
            placeholder="Buscar ciudad o sede de destino..."
          />

          {/* Destinatario (Point 5 for Solicitante, Point 6 for Gestor/Admin) */}
          <div className="space-y-4">
            <SearchableSelect
              label={`${isSolicitante ? '5' : '6'}. Destinatario`}
              sublabel="Área, sede o proveedor final"
              selectedId={destinatarioId}
              onSelect={(id) => setDestinatarioId(id)}
              options={destinatarioOptions}
              icon={<Building className="w-4 h-4" />}
              placeholder="Buscar tipo de destinatario..."
            />

            {/* Conditional Proveedor Input */}
            {requiresProveedorNombre && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6 border-b border-[#e2ebe3]">
                <div />
                <div className="sm:col-span-2">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 animate-fade-in">
                    <label className="block text-xs font-bold text-amber-900">
                      Nombre / Razón Social del Proveedor Destinatario <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={proveedorNombre}
                      onChange={(e) => setProveedorNombre(e.target.value)}
                      placeholder="Ej. Distribuidora Amazónica S.A.C."
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-amber-300 text-[#122014] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gestor Asignado (Point 6 for Solicitante, Point 7 for Gestor/Admin) */}
          <SearchableSelect
            label={`${isSolicitante ? '6' : '7'}. Gestor Asignado`}
            sublabel="Gestor activo autorizado para recepcionar y coordinar"
            selectedId={gestorDNI}
            onSelect={(id) => setGestorDNI(id)}
            options={gestorOptions}
            icon={<ShieldCheck className="w-4 h-4" />}
            placeholder="Buscar gestor activo por nombre o DNI..."
            emptyMessage="No hay gestores activos disponibles."
          />

          {/* Gestor/Admin Only: Point 8: Guía del Transportista */}
          {!isSolicitante && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6 border-b border-[#e2ebe3]">
              <div>
                <label className="text-xs font-bold text-[#122014]">
                  8. Guía del Transportista <span className="text-rose-500">*</span>
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

          {/* Gestor/Admin Only: Point 9: Documento Relacionado - Órdenes de Compra (Odoo) */}
          {!isSolicitante && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6 border-b border-[#e2ebe3]">
              <div>
                <label className="text-xs font-bold text-[#122014] flex items-center gap-1.5">
                  <span>9. Documento Relacionado (Orden de Compra)</span>
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

                  {/* Search Results List with "Ojito" icon for product preview */}
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
                                {/* Ojito Button to preview products */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewOrder(po)}
                                  className="px-3 py-1.5 rounded-lg border border-[#c8decb] hover:bg-[#eaf2eb] text-[#2d5a27] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                  title="Ver detalle de productos"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Ver productos</span>
                                </button>

                                {/* Add Button */}
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
                            {/* Header Card */}
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
                                {/* Ojito / Expand toggle */}
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

          {/* Comentarios Opcionales (Point 7 for Solicitante, Point 10 for Gestor/Admin) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6">
            <div>
              <label className="text-xs font-bold text-[#122014]">
                {isSolicitante ? '7' : '10'}. Comentarios Opcionales
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
