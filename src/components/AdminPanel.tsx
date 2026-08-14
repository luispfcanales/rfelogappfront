import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  MapPin, 
  Plus, 
  Trash2, 
  Pencil, 
  Shield, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Tag,
  X,
  Save,
  Loader2
} from 'lucide-react';
import type { 
  User, 
  CatalogoData, 
  UserRole, 
  EmpresaTransporte, 
  Destino, 
  Destinatario, 
  TipoSolicitud 
} from '../types';

interface AdminPanelProps {
  currentUser?: User;
  users: User[];
  catalogos: CatalogoData;
  onRefreshUsers: () => void;
  onRefreshCatalogos: () => void;
  apiBase: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users,
  catalogos,
  onRefreshUsers,
  onRefreshCatalogos,
  apiBase,
}) => {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'empresas' | 'destinos' | 'destinatarios' | 'tipos_solicitud'>('usuarios');
  
  const isAdmin = currentUser?.rol === 'Administrador';

  // Safe Array Guards
  const safeUsers = Array.isArray(users) ? users : [];
  const safeEmpresas = Array.isArray(catalogos?.empresas_transporte) ? catalogos.empresas_transporte : [];
  const safeDestinos = Array.isArray(catalogos?.destinos) ? catalogos.destinos : [];
  const safeDestinatarios = Array.isArray(catalogos?.destinatarios) ? catalogos.destinatarios : [];
  const safeTiposSolicitud = Array.isArray(catalogos?.tipos_solicitud) ? catalogos.tipos_solicitud : [];

  // New User Form State
  const [newDni, setNewDni] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState<UserRole>('Solicitante');
  const [newEsGestor, setNewEsGestor] = useState(false);

  // New Catalog Items States
  const [newEmpresaNombre, setNewEmpresaNombre] = useState('');
  const [newEmpresaRequiereClave, setNewEmpresaRequiereClave] = useState(false);

  const [newDestinoNombre, setNewDestinoNombre] = useState('');

  const [newDestinatarioNombre, setNewDestinatarioNombre] = useState('');
  const [newDestinatarioEsProveedor, setNewDestinatarioEsProveedor] = useState(false);
  const [newDestinatarioDestinoIds, setNewDestinatarioDestinoIds] = useState<string[]>([]);

  const [newTipoSolicitudNombre, setNewTipoSolicitudNombre] = useState('');

  // Notification state
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal Editing States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserDNI, setEditUserDNI] = useState('');
  const [editUserNombre, setEditUserNombre] = useState('');
  const [editUserRol, setEditUserRol] = useState<UserRole>('Solicitante');
  const [editUserEsGestor, setEditUserEsGestor] = useState(false);

  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaTransporte | null>(null);
  const [editEmpresaNombre, setEditEmpresaNombre] = useState('');
  const [editEmpresaRequiereClave, setEditEmpresaRequiereClave] = useState(false);

  const [editingDestino, setEditingDestino] = useState<Destino | null>(null);
  const [editDestinoNombre, setEditDestinoNombre] = useState('');

  const [editingDestinatario, setEditingDestinatario] = useState<Destinatario | null>(null);
  const [editDestinatarioNombre, setEditDestinatarioNombre] = useState('');
  const [editDestinatarioEsProveedor, setEditDestinatarioEsProveedor] = useState(false);
  const [editDestinatarioDestinoIds, setEditDestinatarioDestinoIds] = useState<string[]>([]);

  const [editingTipoSolicitud, setEditingTipoSolicitud] = useState<TipoSolicitud | null>(null);
  const [editTipoSolicitudNombre, setEditTipoSolicitudNombre] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  // --- MODAL OPENERS ---
  const openEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserDNI(u.dni);
    setEditUserNombre(u.nombre);
    setEditUserRol(u.rol);
    setEditUserEsGestor(u.es_gestor_activado || false);
  };

  const openEditEmpresa = (emp: EmpresaTransporte) => {
    setEditingEmpresa(emp);
    setEditEmpresaNombre(emp.nombre);
    setEditEmpresaRequiereClave(emp.requiere_clave || false);
  };

  const openEditDestino = (dest: Destino) => {
    setEditingDestino(dest);
    setEditDestinoNombre(dest.nombre);
  };

  const openEditDestinatario = (destin: Destinatario) => {
    setEditingDestinatario(destin);
    setEditDestinatarioNombre(destin.nombre);
    setEditDestinatarioEsProveedor(destin.es_proveedor || false);
    setEditDestinatarioDestinoIds(destin.destino_ids || []);
  };

  const openEditTipoSolicitud = (tipo: TipoSolicitud) => {
    setEditingTipoSolicitud(tipo);
    setEditTipoSolicitudNombre(tipo.nombre);
  };

  // --- TOGGLE GESTOR ---
  const handleToggleGestor = async (user: User) => {
    const updated: User = {
      ...user,
      es_gestor_activado: !user.es_gestor_activado,
    };

    try {
      const res = await fetch(`${apiBase}/api/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Estado de gestor para ${user.nombre} actualizado.`);
        onRefreshUsers();
      } else {
        showNotification(data.error || 'Error al actualizar usuario', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para actualizar usuario.', 'error');
    }
  };

  // --- SAVE EDITS (PUT Handlers) ---

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const trimmedDNI = (isAdmin ? editUserDNI : editingUser.dni).trim();
    if (!trimmedDNI || !/^\d{8}$/.test(trimmedDNI)) {
      showNotification('El número de documento (DNI) debe contener exactamente 8 dígitos numéricos.', 'error');
      return;
    }

    if (!editUserNombre.trim()) {
      showNotification('El nombre no puede estar vacío.', 'error');
      return;
    }

    setIsSaving(true);
    const payload = {
      old_dni: editingUser.dni,
      dni: trimmedDNI,
      nombre: editUserNombre.trim(),
      rol: editUserRol,
      es_gestor_activado: editUserRol === 'Gestor' || editUserRol === 'Administrador' ? editUserEsGestor : false,
    };

    try {
      const res = await fetch(`${apiBase}/api/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Usuario "${payload.nombre}" actualizado exitosamente.`);
        setEditingUser(null);
        onRefreshUsers();
      } else {
        showNotification(data.error || 'Error al actualizar usuario', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para actualizar usuario.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpresa) return;
    if (!editEmpresaNombre.trim()) {
      showNotification('El nombre de la empresa no puede estar vacío.', 'error');
      return;
    }

    setIsSaving(true);
    const payload = {
      tipo: 'empresas',
      data: {
        id: editingEmpresa.id,
        nombre: editEmpresaNombre.trim(),
        requiere_clave: editEmpresaRequiereClave,
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Empresa "${editEmpresaNombre.trim()}" actualizada exitosamente.`);
        setEditingEmpresa(null);
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al actualizar empresa', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para actualizar empresa.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDestino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDestino) return;
    if (!editDestinoNombre.trim()) {
      showNotification('El nombre del destino no puede estar vacío.', 'error');
      return;
    }

    setIsSaving(true);
    const payload = {
      tipo: 'destinos',
      data: {
        id: editingDestino.id,
        nombre: editDestinoNombre.trim(),
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Destino "${editDestinoNombre.trim()}" actualizado exitosamente.`);
        setEditingDestino(null);
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al actualizar destino', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para actualizar destino.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDestinatario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDestinatario) return;
    if (!editDestinatarioNombre.trim()) {
      showNotification('El nombre del destinatario no puede estar vacío.', 'error');
      return;
    }

    setIsSaving(true);
    const payload = {
      tipo: 'destinatarios',
      data: {
        id: editingDestinatario.id,
        nombre: editDestinatarioNombre.trim(),
        es_proveedor: editDestinatarioEsProveedor,
        destino_ids: editDestinatarioDestinoIds,
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Destinatario "${editDestinatarioNombre.trim()}" actualizado exitosamente.`);
        setEditingDestinatario(null);
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al actualizar destinatario', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para actualizar destinatario.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTipoSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTipoSolicitud) return;
    if (!editTipoSolicitudNombre.trim()) {
      showNotification('El nombre del tipo de solicitud no puede estar vacío.', 'error');
      return;
    }

    setIsSaving(true);
    const payload = {
      tipo: 'tipos_solicitud',
      data: {
        id: editingTipoSolicitud.id,
        nombre: editTipoSolicitudNombre.trim(),
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Tipo de solicitud "${editTipoSolicitudNombre.trim()}" actualizado exitosamente.`);
        setEditingTipoSolicitud(null);
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al actualizar tipo de solicitud', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para actualizar tipo de solicitud.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- CREATE HANDLERS ---

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDni.length !== 8) {
      showNotification('El DNI debe tener 8 dígitos numéricos.', 'error');
      return;
    }

    const payload: User = {
      dni: newDni,
      nombre: newNombre.trim(),
      rol: newRol,
      es_gestor_activado: newRol === 'Gestor' ? newEsGestor : false,
    };

    try {
      const res = await fetch(`${apiBase}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Usuario creado exitosamente.');
        setNewDni('');
        setNewNombre('');
        onRefreshUsers();
      } else {
        showNotification(data.error || 'Error al crear usuario', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para crear usuario.', 'error');
    }
  };

  // Create Empresa
  const handleCreateEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpresaNombre.trim()) return;

    const payload = {
      tipo: 'empresas',
      data: {
        id: `emp_${Date.now()}`,
        nombre: newEmpresaNombre.trim(),
        requiere_clave: newEmpresaRequiereClave,
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Empresa de transporte creada exitosamente.');
        setNewEmpresaNombre('');
        setNewEmpresaRequiereClave(false);
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al crear empresa', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para crear empresa.', 'error');
    }
  };

  // Create Destino
  const handleCreateDestino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestinoNombre.trim()) return;

    const payload = {
      tipo: 'destinos',
      data: {
        id: `dest_${Date.now()}`,
        nombre: newDestinoNombre.trim(),
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Destino creado exitosamente.');
        setNewDestinoNombre('');
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al crear destino', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para crear destino.', 'error');
    }
  };

  // Create Destinatario
  const handleCreateDestinatario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestinatarioNombre.trim()) return;

    const payload = {
      tipo: 'destinatarios',
      data: {
        id: `destin_${Date.now()}`,
        nombre: newDestinatarioNombre.trim(),
        es_proveedor: newDestinatarioEsProveedor,
        destino_ids: newDestinatarioDestinoIds,
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Tipo de destinatario creado exitosamente.');
        setNewDestinatarioNombre('');
        setNewDestinatarioEsProveedor(false);
        setNewDestinatarioDestinoIds([]);
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al crear destinatario', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para crear destinatario.', 'error');
    }
  };

  // Create Tipo de Solicitud
  const handleCreateTipoSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipoSolicitudNombre.trim()) return;

    const payload = {
      tipo: 'tipos_solicitud',
      data: {
        id: `tipo_${Date.now()}`,
        nombre: newTipoSolicitudNombre.trim(),
      },
    };

    try {
      const res = await fetch(`${apiBase}/api/catalogos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Tipo de solicitud creado exitosamente.');
        setNewTipoSolicitudNombre('');
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al crear tipo de solicitud', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para crear tipo de solicitud.', 'error');
    }
  };

  // --- DELETE HANDLERS ---

  // Delete User
  const handleDeleteUser = async (userToDelete: User) => {
    if (currentUser && userToDelete.dni === currentUser.dni) {
      showNotification('No puedes eliminar tu propio usuario en sesión activa.', 'error');
      return;
    }
    if (userToDelete.dni === '72453560') {
      showNotification('No se puede eliminar el usuario Administrador principal del sistema.', 'error');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${userToDelete.nombre}" (DNI: ${userToDelete.dni})?`)) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/users?dni=${userToDelete.dni}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Usuario "${userToDelete.nombre}" eliminado exitosamente.`);
        onRefreshUsers();
      } else {
        showNotification(data.error || data.message || 'Error al eliminar usuario', 'error');
      }
    } catch (err: any) {
      showNotification(err?.message ? `Error: ${err.message}` : 'Error al conectar con el servidor para eliminar usuario.', 'error');
    }
  };

  // Delete Catalog Item
  const handleDeleteCatalogItem = async (tipo: 'empresas' | 'destinos' | 'destinatarios' | 'tipos_solicitud', id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este elemento del catálogo?')) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/catalogos?tipo=${tipo}&id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Elemento eliminado exitosamente del catálogo.');
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al eliminar elemento', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para eliminar elemento.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#122014] flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-[#2d5a27]" />
          <span>Panel de Administración de Catálogos & Usuarios</span>
        </h1>
        <p className="text-xs text-[#5a725e] mt-1">
          Gestiona las opciones desplegables del sistema, tipos de solicitud, y la configuración de usuarios y gestores.
        </p>
      </div>

      {/* Alert message */}
      {msg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
          msg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#f0f5f1] border border-[#e2ebe3] rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'usuarios'
              ? 'bg-white text-[#2d5a27] shadow-xs'
              : 'text-[#5a725e] hover:text-[#122014]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios & Gestores ({safeUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('empresas')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'empresas'
              ? 'bg-white text-[#2d5a27] shadow-xs'
              : 'text-[#5a725e] hover:text-[#122014]'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Empresas de Transporte ({safeEmpresas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('destinos')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'destinos'
              ? 'bg-white text-[#2d5a27] shadow-xs'
              : 'text-[#5a725e] hover:text-[#122014]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Destinos ({safeDestinos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('destinatarios')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'destinatarios'
              ? 'bg-white text-[#2d5a27] shadow-xs'
              : 'text-[#5a725e] hover:text-[#122014]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Destinatarios ({safeDestinatarios.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tipos_solicitud')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'tipos_solicitud'
              ? 'bg-white text-[#2d5a27] shadow-xs'
              : 'text-[#5a725e] hover:text-[#122014]'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Tipos de Solicitud ({safeTiposSolicitud.length})</span>
        </button>
      </div>

      {/* TAB 1: USUARIOS & GESTORES */}
      {activeTab === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Create User Form */}
          <div className="p-6 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs">
            <h3 className="text-sm font-bold text-[#122014] mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2d5a27]" />
              <span>Registrar Nuevo Usuario</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Número de DNI (8 dígitos)
                </label>
                <input
                  type="text"
                  value={newDni}
                  onChange={(e) => setNewDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Ej. 12345678"
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl font-mono text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej. JUAN CARLOS PEREZ"
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Rol Asignado
                </label>
                <select
                  value={newRol}
                  onChange={(e) => setNewRol(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                >
                  <option value="Solicitante">Solicitante</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              {newRol === 'Gestor' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="newEsGestor"
                    checked={newEsGestor}
                    onChange={(e) => setNewEsGestor(e.target.checked)}
                    className="rounded text-[#2d5a27] focus:ring-[#2d5a27]"
                  />
                  <label htmlFor="newEsGestor" className="text-[#4a5e4d] select-none">
                    Marcar como Gestor Activo
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all cursor-pointer mt-2"
              >
                Guardar Usuario
              </button>
            </form>
          </div>

          {/* Users List & Actions */}
          <div className="lg:col-span-2 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#e2ebe3] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#122014]">
                Lista de Usuarios & Activación de Gestores
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8faf7] border-b border-[#e2ebe3] text-[#5a725e] font-semibold">
                    <th className="py-3 px-4">DNI</th>
                    <th className="py-3 px-4">Nombre</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4 text-center">Gestor Activo</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2ebe3]">
                  {safeUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#5a725e]">
                        No hay usuarios registrados actualmente.
                      </td>
                    </tr>
                  ) : (
                    safeUsers.map((u) => (
                      <tr key={u.dni} className="hover:bg-[#f8faf7] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#122014]">
                          {u.dni}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#122014]">
                          {u.nombre}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.rol === 'Administrador'
                              ? 'bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]'
                              : u.rol === 'Gestor'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleGestor(u)}
                            className="p-1 text-[#5a725e] hover:text-[#2d5a27] transition-colors cursor-pointer"
                            title={u.es_gestor_activado ? 'Desactivar rol de gestor' : 'Activar rol de gestor'}
                          >
                            {u.es_gestor_activado ? (
                              <ToggleRight className="w-6 h-6 text-[#2d5a27]" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditUser(u)}
                              className="p-1.5 text-slate-500 hover:text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors cursor-pointer"
                              title={`Editar usuario ${u.nombre}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {u.dni !== '72453560' && u.dni !== currentUser?.dni ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title={`Eliminar usuario ${u.nombre}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#5a725e] italic px-1.5 py-0.5 rounded bg-[#f8faf7]">
                                Protegido
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPRESAS DE TRANSPORTE */}
      {activeTab === 'empresas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs">
            <h3 className="text-sm font-bold text-[#122014] mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2d5a27]" />
              <span>Registrar Empresa de Transporte</span>
            </h3>

            <form onSubmit={handleCreateEmpresa} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={newEmpresaNombre}
                  onChange={(e) => setNewEmpresaNombre(e.target.value)}
                  placeholder="Ej. Shalom, Olva Courier, etc."
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="requiereClave"
                  checked={newEmpresaRequiereClave}
                  onChange={(e) => setNewEmpresaRequiereClave(e.target.checked)}
                  className="rounded text-[#2d5a27] focus:ring-[#2d5a27]"
                />
                <label htmlFor="requiereClave" className="text-[#4a5e4d] select-none">
                  Requiere Clave de Seguridad (ej. Shalom)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all cursor-pointer mt-2"
              >
                Guardar Empresa
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#e2ebe3]">
              <h3 className="text-sm font-bold text-[#122014]">Empresas Registradas</h3>
            </div>
            <div className="divide-y divide-[#e2ebe3]">
              {safeEmpresas.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5a725e]">
                  No hay empresas de transporte registradas en el catálogo.
                </div>
              ) : (
                safeEmpresas.map((emp) => (
                  <div key={emp.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#f8faf7] transition-colors">
                    <div>
                      <div className="font-bold text-[#122014]">{emp.nombre}</div>
                      <div className="text-[#5a725e] text-[11px] mt-0.5">
                        {emp.requiere_clave ? 'Requiere clave obligatoria' : 'Envío estándar sin clave'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditEmpresa(emp)}
                        className="p-1.5 text-slate-500 hover:text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCatalogItem('empresas', emp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DESTINOS */}
      {activeTab === 'destinos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs">
            <h3 className="text-sm font-bold text-[#122014] mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2d5a27]" />
              <span>Registrar Nuevo Destino</span>
            </h3>

            <form onSubmit={handleCreateDestino} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre del Destino / Sede
                </label>
                <input
                  type="text"
                  value={newDestinoNombre}
                  onChange={(e) => setNewDestinoNombre(e.target.value)}
                  placeholder="Ej. Sede Central (Lima)"
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all cursor-pointer mt-2"
              >
                Guardar Destino
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#e2ebe3]">
              <h3 className="text-sm font-bold text-[#122014]">Destinos Registrados</h3>
            </div>
            <div className="divide-y divide-[#e2ebe3]">
              {safeDestinos.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5a725e]">
                  No hay destinos registrados en el catálogo.
                </div>
              ) : (
                safeDestinos.map((dest) => (
                  <div key={dest.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#f8faf7] transition-colors">
                    <div className="font-bold text-[#122014] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#2d5a27]" />
                      <span>{dest.nombre}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditDestino(dest)}
                        className="p-1.5 text-slate-500 hover:text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCatalogItem('destinos', dest.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DESTINATARIOS */}
      {activeTab === 'destinatarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs">
            <h3 className="text-sm font-bold text-[#122014] mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2d5a27]" />
              <span>Registrar Tipo de Destinatario</span>
            </h3>

            <form onSubmit={handleCreateDestinatario} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre del Destinatario
                </label>
                <input
                  type="text"
                  value={newDestinatarioNombre}
                  onChange={(e) => setNewDestinatarioNombre(e.target.value)}
                  placeholder="Ej. Proveedor, Almacén Principal, etc."
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Destinos Asociados (Etiquetas de Filtro)
                </label>
                <p className="text-[11px] text-[#5a725e] mb-2">
                  Selecciona los destinos donde este destinatario estará disponible para filtrar rápidamente:
                </p>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-2xl bg-[#f8faf7] border border-[#c8decb] max-h-36 overflow-y-auto">
                  {safeDestinos.length === 0 ? (
                    <span className="text-[11px] text-[#5a725e]">No hay destinos creados aún.</span>
                  ) : (
                    safeDestinos.map((dest) => {
                      const isSelected = newDestinatarioDestinoIds.includes(dest.id);
                      return (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => {
                            setNewDestinatarioDestinoIds((prev) =>
                              prev.includes(dest.id) ? prev.filter((id) => id !== dest.id) : [...prev, dest.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#2d5a27] text-white shadow-xs'
                              : 'bg-white text-[#5a725e] border border-[#c8decb] hover:border-[#2d5a27]'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          <span>{dest.nombre}</span>
                          {isSelected && <span>✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="esProveedor"
                  checked={newDestinatarioEsProveedor}
                  onChange={(e) => setNewDestinatarioEsProveedor(e.target.checked)}
                  className="rounded text-[#2d5a27] focus:ring-[#2d5a27]"
                />
                <label htmlFor="esProveedor" className="text-[#4a5e4d] select-none">
                  Habilita campo de nombre de Proveedor
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all cursor-pointer mt-2"
              >
                Guardar Destinatario
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#e2ebe3]">
              <h3 className="text-sm font-bold text-[#122014]">Destinatarios Registrados</h3>
            </div>
            <div className="divide-y divide-[#e2ebe3]">
              {safeDestinatarios.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5a725e]">
                  No hay destinatarios registrados en el catálogo.
                </div>
              ) : (
                safeDestinatarios.map((destin) => (
                  <div key={destin.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#f8faf7] transition-colors">
                    <div>
                      <div className="font-bold text-[#122014]">{destin.nombre}</div>
                      <div className="text-[#5a725e] text-[11px] mt-0.5">
                        {destin.es_proveedor ? 'Requiere especificar nombre del proveedor' : 'Destinatario interno'}
                      </div>
                      {/* Destination Tags */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {destin.destino_ids && destin.destino_ids.length > 0 ? (
                          destin.destino_ids.map((dId) => {
                            const destObj = safeDestinos.find((d) => d.id === dId);
                            return (
                              <span
                                key={dId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#eaf2eb] text-[#2d5a27] border border-[#c8decb]"
                              >
                                <MapPin className="w-2.5 h-2.5 text-[#2d5a27]" />
                                <span>{destObj?.nombre || dId}</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-[#88a58c] italic">
                            Disponible para todas las sedes
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditDestinatario(destin)}
                        className="p-1.5 text-slate-500 hover:text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCatalogItem('destinatarios', destin.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TIPOS DE SOLICITUD */}
      {activeTab === 'tipos_solicitud' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs">
            <h3 className="text-sm font-bold text-[#122014] mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2d5a27]" />
              <span>Registrar Tipo de Solicitud</span>
            </h3>

            <form onSubmit={handleCreateTipoSolicitud} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre del Tipo de Solicitud
                </label>
                <input
                  type="text"
                  value={newTipoSolicitudNombre}
                  onChange={(e) => setNewTipoSolicitudNombre(e.target.value)}
                  placeholder="Ej. Requerimiento de Bienes, Mantenimiento..."
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all cursor-pointer mt-2"
              >
                Guardar Tipo de Solicitud
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-white border border-[#e2ebe3] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#e2ebe3]">
              <h3 className="text-sm font-bold text-[#122014]">Tipos de Solicitud Registrados</h3>
            </div>
            <div className="divide-y divide-[#e2ebe3]">
              {safeTiposSolicitud.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5a725e]">
                  No hay tipos de solicitud registrados en el catálogo.
                </div>
              ) : (
                safeTiposSolicitud.map((tipo) => (
                  <div key={tipo.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#f8faf7] transition-colors">
                    <div className="font-bold text-[#122014] flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#2d5a27]" />
                      <span>{tipo.nombre}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditTipoSolicitud(tipo)}
                        className="p-1.5 text-slate-500 hover:text-[#2d5a27] hover:bg-[#eaf2eb] rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCatalogItem('tipos_solicitud', tipo.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODALS ================= */}

      {/* 1. Modal Editar Usuario */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ebe3] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2ebe3] pb-3">
              <h3 className="text-base font-bold text-[#122014] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#2d5a27]" />
                <span>Editar Usuario</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#4a5e4d]">
                    Número de Documento (DNI)
                  </label>
                  {isAdmin ? (
                    <span className="text-[10px] font-semibold text-[#2d5a27] bg-[#eaf2eb] px-2 py-0.5 rounded-full border border-[#c8decb]">
                      Modo Administrador
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#5a725e]">
                      Solo Administrador
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={isAdmin ? editUserDNI : editingUser.dni}
                  onChange={(e) => {
                    if (isAdmin) {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setEditUserDNI(val);
                    }
                  }}
                  disabled={!isAdmin}
                  placeholder="Ej. 12345678 (8 dígitos)"
                  required
                  maxLength={8}
                  className={`w-full px-3 py-2 border rounded-xl font-mono text-xs ${
                    isAdmin
                      ? 'bg-white border-[#c8decb] text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30'
                      : 'bg-[#f0f4f1] border-[#e2ebe3] text-[#5a725e] cursor-not-allowed'
                  }`}
                />
                <p className="text-[11px] text-[#5a725e] mt-1">
                  {isAdmin
                    ? 'Como Administrador tienes permisos exclusivos para editar y corregir el número de documento.'
                    : 'Solo un usuario con rol de Administrador puede realizar cambios en el número de documento.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={editUserNombre}
                  onChange={(e) => setEditUserNombre(e.target.value)}
                  placeholder="Nombre y Apellidos"
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Rol Asignado
                </label>
                <select
                  value={editUserRol}
                  onChange={(e) => setEditUserRol(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                >
                  <option value="Solicitante">Solicitante</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              {(editUserRol === 'Gestor' || editUserRol === 'Administrador') && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editEsGestor"
                    checked={editUserEsGestor}
                    onChange={(e) => setEditUserEsGestor(e.target.checked)}
                    className="rounded text-[#2d5a27] focus:ring-[#2d5a27]"
                  />
                  <label htmlFor="editEsGestor" className="text-[#4a5e4d] select-none">
                    Habilitar como Gestor Activo (recibe solicitudes)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2ebe3]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a725e] hover:bg-[#f0f5f1] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Editar Empresa */}
      {editingEmpresa && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ebe3] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2ebe3] pb-3">
              <h3 className="text-base font-bold text-[#122014] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#2d5a27]" />
                <span>Editar Empresa de Transporte</span>
              </h3>
              <button
                onClick={() => setEditingEmpresa(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmpresa} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={editEmpresaNombre}
                  onChange={(e) => setEditEmpresaNombre(e.target.value)}
                  placeholder="Ej. Shalom, Olva Courier"
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editRequiereClave"
                  checked={editEmpresaRequiereClave}
                  onChange={(e) => setEditEmpresaRequiereClave(e.target.checked)}
                  className="rounded text-[#2d5a27] focus:ring-[#2d5a27]"
                />
                <label htmlFor="editRequiereClave" className="text-[#4a5e4d] select-none">
                  Requiere Clave de Seguridad (ej. Shalom)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2ebe3]">
                <button
                  type="button"
                  onClick={() => setEditingEmpresa(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a725e] hover:bg-[#f0f5f1] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Editar Destino */}
      {editingDestino && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ebe3] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2ebe3] pb-3">
              <h3 className="text-base font-bold text-[#122014] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2d5a27]" />
                <span>Editar Destino / Sede</span>
              </h3>
              <button
                onClick={() => setEditingDestino(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDestino} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre del Destino / Sede
                </label>
                <input
                  type="text"
                  value={editDestinoNombre}
                  onChange={(e) => setEditDestinoNombre(e.target.value)}
                  placeholder="Ej. Sede Central (Lima)"
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2ebe3]">
                <button
                  type="button"
                  onClick={() => setEditingDestino(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a725e] hover:bg-[#f0f5f1] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Editar Destinatario */}
      {editingDestinatario && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ebe3] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2ebe3] pb-3">
              <h3 className="text-base font-bold text-[#122014] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#2d5a27]" />
                <span>Editar Tipo de Destinatario</span>
              </h3>
              <button
                onClick={() => setEditingDestinatario(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDestinatario} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre del Destinatario
                </label>
                <input
                  type="text"
                  value={editDestinatarioNombre}
                  onChange={(e) => setEditDestinatarioNombre(e.target.value)}
                  placeholder="Ej. Proveedor, Cliente Final"
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Destinos Asociados (Etiquetas de Filtro)
                </label>
                <p className="text-[11px] text-[#5a725e] mb-2">
                  Haz clic para activar o desactivar los destinos asignados a este destinatario:
                </p>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-2xl bg-[#f8faf7] border border-[#c8decb] max-h-40 overflow-y-auto">
                  {safeDestinos.length === 0 ? (
                    <span className="text-[11px] text-[#5a725e]">No hay destinos creados aún.</span>
                  ) : (
                    safeDestinos.map((dest) => {
                      const isSelected = editDestinatarioDestinoIds.includes(dest.id);
                      return (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => {
                            setEditDestinatarioDestinoIds((prev) =>
                              prev.includes(dest.id) ? prev.filter((id) => id !== dest.id) : [...prev, dest.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#2d5a27] text-white shadow-xs'
                              : 'bg-white text-[#5a725e] border border-[#c8decb] hover:border-[#2d5a27]'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          <span>{dest.nombre}</span>
                          {isSelected && <span>✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editEsProveedor"
                  checked={editDestinatarioEsProveedor}
                  onChange={(e) => setEditDestinatarioEsProveedor(e.target.checked)}
                  className="rounded text-[#2d5a27] focus:ring-[#2d5a27]"
                />
                <label htmlFor="editEsProveedor" className="text-[#4a5e4d] select-none">
                  Habilita campo de nombre de Proveedor
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2ebe3]">
                <button
                  type="button"
                  onClick={() => setEditingDestinatario(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a725e] hover:bg-[#f0f5f1] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Editar Tipo de Solicitud */}
      {editingTipoSolicitud && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e2ebe3] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2ebe3] pb-3">
              <h3 className="text-base font-bold text-[#122014] flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#2d5a27]" />
                <span>Editar Tipo de Solicitud</span>
              </h3>
              <button
                onClick={() => setEditingTipoSolicitud(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTipoSolicitud} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4a5e4d] mb-1">
                  Nombre del Tipo de Solicitud
                </label>
                <input
                  type="text"
                  value={editTipoSolicitudNombre}
                  onChange={(e) => setEditTipoSolicitudNombre(e.target.value)}
                  placeholder="Ej. Requerimiento de Bienes, Mantenimiento..."
                  required
                  className="w-full px-3 py-2 bg-[#f8faf7] border border-[#c8decb] rounded-xl text-[#122014] focus:ring-2 focus:ring-[#2d5a27]/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2ebe3]">
                <button
                  type="button"
                  onClick={() => setEditingTipoSolicitud(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a725e] hover:bg-[#f0f5f1] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2d5a27] hover:bg-[#366839] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
