export type UserRole = 'Administrador' | 'Gestor' | 'Solicitante';

export interface User {
  dni: string;
  nombre: string;
  rol: UserRole;
  es_gestor_activado: boolean;
}

export interface EmpresaTransporte {
  id: string;
  nombre: string;
  requiere_clave: boolean;
}

export interface Destino {
  id: string;
  nombre: string;
}

export interface Destinatario {
  id: string;
  nombre: string;
  es_proveedor: boolean;
  destino_ids?: string[];
}

export interface TipoSolicitud {
  id: string;
  nombre: string;
}

export interface DestinoItem {
  id: string;
  nombre: string;
}

export interface DestinatarioItem {
  id: string;
  nombre: string;
  es_proveedor?: boolean;
  proveedor_nombre?: string;
  destino_id?: string;
  destino_nombre?: string;
}

export interface CatalogoData {
  empresas_transporte: EmpresaTransporte[];
  destinos: Destino[];
  destinatarios: Destinatario[];
  tipos_solicitud: TipoSolicitud[];
}

export type EstadoSolicitud = 'Borrador' | 'Enviado' | 'Recibido';
export type DocumentoTipo = 'Orden de Compra' | 'Requisición';

export interface DocumentoReference {
  id: string;
  nombre: string;
}

// Odoo Purchase Order Types
export interface OdooPurchaseOrderLine {
  id: number;
  product_id: number;
  product_name: string;
  name: string; // Line description
  product_qty: number;
  qty_received: number;
  qty_invoiced: number;
  price_unit: number;
  price_subtotal: number;
  product_uom_id: number;
  product_uom_name: string;
  seleccionada?: boolean;
}

export interface OdooPurchaseOrder {
  id: number;
  name: string; // e.g. "OC-03456"
  partner_id: number;
  partner_name: string; // Proveedor
  company_id: number;
  company_name: string;
  state: string; // 'draft' | 'sent' | 'to approve' | 'purchase' | 'done' | 'cancel'
  date_order: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  currency_id: number;
  currency_name: string;
  order_line_ids: number[];
  lines: OdooPurchaseOrderLine[];
}

export interface Solicitud {
  id: string;
  fecha_registro: string;
  solicitante_dni: string;
  solicitante_nombre: string;
  enviado_por_dni: string;
  enviado_por_nombre: string;
  numero_bultos?: number;
  tipo_solicitud_id?: string;
  tipo_solicitud_nombre?: string;
  empresa_transporte_id: string;
  empresa_transporte_nombre: string;
  empresa_transporte_clave?: string;
  destino_id: string;
  destino_nombre: string;
  destinos?: DestinoItem[];
  guia_transportista_id: string;
  guia_transportista_nombre: string;
  documento_tipo: DocumentoTipo;
  documentos_relacionados: DocumentoReference[];
  ordenes_compra?: OdooPurchaseOrder[];
  destinatario_id: string;
  destinatario_nombre: string;
  destinatario_proveedor_nombre?: string;
  destinatarios?: DestinatarioItem[];
  gestor_dni: string;
  gestor_nombre: string;
  comentarios?: string;
  estado: EstadoSolicitud;
  fecha_envio_destinatario?: string;
  fecha_transicion_borrador: string;
  fecha_transicion_enviado?: string;
  fecha_transicion_recibido?: string;
}

export interface UploadedFile {
  nombre: string;
  mime_type: string;
  contenido: string; // Base64
  previewUrl?: string;
  sizeBytes?: number;
}
