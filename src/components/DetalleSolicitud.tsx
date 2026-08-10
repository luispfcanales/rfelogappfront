import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Truck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  PackageCheck,
  ExternalLink,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Loader2,
  Eye
} from 'lucide-react';
import type { Solicitud, User, EstadoSolicitud } from '../types';

interface DetalleSolicitudProps {
  solicitud?: Solicitud;
  allSolicitudes?: Solicitud[];
  currentUser: User;
  onBack?: () => void;
  onUpdateState: (id: string, nuevoEstado: EstadoSolicitud, fechaEnvioDestinatario?: string) => Promise<void>;
  onDownloadPDF: (id: string) => void;
  apiBase: string;
}

export const DetalleSolicitud: React.FC<DetalleSolicitudProps> = ({
  solicitud: directSolicitud,
  allSolicitudes = [],
  currentUser,
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

  // Check role permission for "Gestión de la solicitud"
  // MUST be the assigned gestor AND be active (or admin)
  const isAssignedGestor = (currentUser.dni === solicitud.gestor_dni && currentUser.es_gestor_activado) || currentUser.rol === 'Administrador';

  // Handle status progression
  const handleAdvanceState = async (nuevoEstado: EstadoSolicitud) => {
    setActionError(null);
    setUpdating(true);
    try {
      await onUpdateState(solicitud.id, nuevoEstado, nuevoEstado === 'Enviado' ? fechaEnvio : undefined);
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar estado');
    } finally {
      setUpdating(false);
    }
  };

  const toggleExpandOrder = (orderId: number) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Helper to get step status
  const getStepStatus = (stepName: EstadoSolicitud) => {
    const states: EstadoSolicitud[] = ['Borrador', 'Enviado', 'Recibido'];
    const currentIndex = states.indexOf(solicitud.estado);
    const stepIndex = states.indexOf(stepName);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
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
            <div className="flex items-center gap-2 text-xs text-[#2d5a27] font-mono font-bold">
              <span>Rainforest Expeditions</span>
              <span>•</span>
              <span>{solicitud.id}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#122014] mt-1">
              Seguimiento de Envío a {solicitud.destino_nombre}
            </h1>
            <div className="flex items-center gap-4 text-xs text-[#5a725e] mt-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Registrado: {new Date(solicitud.fecha_registro).toLocaleString('es-PE')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                {solicitud.empresa_transporte_nombre}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              solicitud.estado === 'Recibido'
                ? 'bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]'
                : solicitud.estado === 'Enviado'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {solicitud.estado === 'Recibido' && <CheckCircle2 className="w-4 h-4 text-[#2d5a27]" />}
              {solicitud.estado === 'Enviado' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              {solicitud.estado === 'Borrador' && <span className="w-2 h-2 rounded-full bg-slate-400" />}
              <span>{solicitud.estado === 'Enviado' ? 'En Tránsito (Enviado)' : solicitud.estado}</span>
            </span>
          </div>
        </div>

        {/* Stepper Timeline */}
        <div className="p-6 sm:p-8 border-b border-[#e2ebe3] bg-[#f8faf7]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5a725e] mb-6">
            Línea de Trazabilidad del Envío
          </div>

          <div className="grid grid-cols-3 gap-2 relative">
            {/* Step 1: Borrador */}
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                getStepStatus('Borrador') === 'completed' || getStepStatus('Borrador') === 'current'
                  ? 'bg-[#2d5a27] text-white shadow-md shadow-[#2d5a27]/25'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="mt-2 text-xs font-bold text-[#122014]">1. Borrador</div>
              <div className="text-[11px] text-[#5a725e] mt-0.5">
                Registrado por {solicitud.solicitante_nombre.split(' ')[0]}
              </div>
            </div>

            {/* Step 2: Enviado */}
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                getStepStatus('Enviado') === 'completed'
                  ? 'bg-[#2d5a27] text-white shadow-md shadow-[#2d5a27]/25'
                  : getStepStatus('Enviado') === 'current'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-4 ring-amber-500/20'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                <Send className="w-5 h-5" />
              </div>
              <div className="mt-2 text-xs font-bold text-[#122014]">2. Enviado (En Tránsito)</div>
              <div className="text-[11px] text-[#5a725e] mt-0.5">
                {solicitud.fecha_transicion_enviado 
                  ? new Date(solicitud.fecha_transicion_enviado).toLocaleDateString('es-PE')
                  : 'Pendiente de despacho'}
              </div>
            </div>

            {/* Step 3: Recibido */}
            <div className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                getStepStatus('Recibido') === 'completed' || getStepStatus('Recibido') === 'current'
                  ? 'bg-[#2d5a27] text-white shadow-md shadow-[#2d5a27]/25 ring-4 ring-[#2d5a27]/20'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                <PackageCheck className="w-5 h-5" />
              </div>
              <div className="mt-2 text-xs font-bold text-[#122014]">3. Recibido</div>
              <div className="text-[11px] text-[#5a725e] mt-0.5">
                {solicitud.fecha_transicion_recibido
                  ? new Date(solicitud.fecha_transicion_recibido).toLocaleDateString('es-PE')
                  : 'Pendiente de recepción'}
              </div>
            </div>
          </div>
        </div>

        {/* Gestor State Progression Action Box */}
        <div className="p-6 sm:p-8 bg-[#f0f5f1]/70 border-b border-[#e2ebe3]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#122014]">
              <ShieldCheck className="w-4 h-4 text-[#2d5a27]" />
              <span>Gestión de Estado del Envío</span>
            </div>
            <div className="text-[11px] text-[#5a725e]">
              Gestor Asignado: <strong className="text-[#122014]">{solicitud.gestor_nombre}</strong>
            </div>
          </div>

          {actionError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {!isAssignedGestor ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Solo el Gestor asignado ({solicitud.gestor_nombre}) con estado activo puede avanzar el estado de este envío.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitud.estado === 'Borrador' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#e2ebe3]">
                  <div>
                    <div className="text-xs font-bold text-[#122014]">
                      Despachar paquete hacia transportista
                    </div>
                    <div className="text-[11px] text-[#5a725e] mt-0.5">
                      Ingresa la fecha estimada o real de entrega al transportista para cambiar a estado "Enviado".
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={fechaEnvio}
                      onChange={(e) => setFechaEnvio(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs bg-[#f8faf7] border border-[#e2ebe3] text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                    />
                    <button
                      onClick={() => handleAdvanceState('Enviado')}
                      disabled={updating}
                      className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-amber-600 hover:bg-amber-500 shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Marcar como Enviado</span>
                    </button>
                  </div>
                </div>
              )}

              {solicitud.estado === 'Enviado' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#e2ebe3]">
                  <div>
                    <div className="text-xs font-bold text-[#122014]">
                      Confirmar recepción en destino
                    </div>
                    <div className="text-[11px] text-[#5a725e] mt-0.5">
                      Confirma que la encomienda fue recibida a conformidad por el destinatario.
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdvanceState('Recibido')}
                    disabled={updating}
                    className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2d5a27] hover:bg-[#366839] shadow-md shadow-[#2d5a27]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirmar Recepción (Recibido)</span>
                  </button>
                </div>
              )}

              {solicitud.estado === 'Recibido' && (
                <div className="p-4 rounded-2xl bg-[#eaf2eb] border border-[#c8decb] text-xs text-[#2d5a27] flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Este envío ha concluido su ciclo y se encuentra entregado y recibido a conformidad.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shipment Details Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5a725e]">
            Información Detallada del Envío
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
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

            {/* Destinatario */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Destinatario:</span>
              <div className="font-bold text-[#122014]">
                {solicitud.destinatario_proveedor_nombre || solicitud.destinatario_nombre}
              </div>
              <div className="text-[11px] text-[#5a725e]">{solicitud.destino_nombre}</div>
            </div>

            {/* Transporte & Shalom Clave */}
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Empresa de Transporte:</span>
              <div className="font-bold text-[#122014]">{solicitud.empresa_transporte_nombre}</div>
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
                  {solicitud.guia_transportista_nombre}
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
                      className="rounded-2xl bg-[#f8faf7] border border-[#c8decb] shadow-xs overflow-hidden"
                    >
                      <div className="p-4 flex items-center justify-between gap-3">
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
                          className="px-2.5 py-1.5 rounded-lg border border-[#c8decb] bg-white hover:bg-[#eaf2eb] text-xs font-semibold text-[#2d5a27] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{po.lines?.length || 0} productos</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expandable Line Items Table */}
                      {isExpanded && po.lines && po.lines.length > 0 && (
                        <div className="p-4 border-t border-[#e2ebe3] bg-white">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="text-[#5a725e] font-semibold border-b border-[#e2ebe3] bg-[#f8faf7]">
                                <tr>
                                  <th className="py-2 px-3">Producto / Descripción</th>
                                  <th className="py-2 px-3 text-right">Cant. Solicitada</th>
                                  <th className="py-2 px-3 text-right">Cant. Recibida</th>
                                  <th className="py-2 px-3 text-right">Precio Unit.</th>
                                  <th className="py-2 px-3 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e2ebe3]">
                                {po.lines.map((line) => (
                                  <tr key={line.id} className="hover:bg-[#f8faf7]">
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related Documents list */}
          {solicitud.documentos_relacionados && solicitud.documentos_relacionados.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#e2ebe3]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#5a725e]">
                Documentos Adjuntos de Respaldo ({solicitud.documentos_relacionados.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {solicitud.documentos_relacionados.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-[#2d5a27] shrink-0" />
                      <span className="font-semibold text-[#122014] truncate">{doc.nombre}</span>
                    </div>
                    <a
                      href={`${apiBase}/api/archivos/ver?id=${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors shrink-0"
                      title="Ver archivo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {solicitud.comentarios && (
            <div className="p-4 rounded-2xl bg-[#f8faf7] border border-[#e2ebe3] space-y-1">
              <span className="text-[11px] text-[#5a725e] font-semibold">Comentarios / Observaciones:</span>
              <p className="text-xs text-[#122014] whitespace-pre-wrap">{solicitud.comentarios}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
