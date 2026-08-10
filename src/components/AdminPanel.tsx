import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  MapPin, 
  Plus, 
  Trash2, 
  Shield, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle2, 
  AlertCircle,
  Building
} from 'lucide-react';
import type { User, CatalogoData, UserRole } from '../types';

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
  const [activeTab, setActiveTab] = useState<'usuarios' | 'empresas' | 'destinos' | 'destinatarios'>('usuarios');
  
  // Safe Array Guards
  const safeUsers = Array.isArray(users) ? users : [];
  const safeEmpresas = Array.isArray(catalogos?.empresas_transporte) ? catalogos.empresas_transporte : [];
  const safeDestinos = Array.isArray(catalogos?.destinos) ? catalogos.destinos : [];
  const safeDestinatarios = Array.isArray(catalogos?.destinatarios) ? catalogos.destinatarios : [];

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

  // Notification state
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  // Toggle user gestor activo state
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
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Usuario "${userToDelete.nombre}" eliminado exitosamente.`);
        onRefreshUsers();
      } else {
        showNotification(data.error || 'Error al eliminar usuario', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para eliminar usuario.', 'error');
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
        onRefreshCatalogos();
      } else {
        showNotification(data.error || 'Error al crear destinatario', 'error');
      }
    } catch {
      showNotification('Error al conectar con el servidor para crear destinatario.', 'error');
    }
  };

  // Delete Catalog Item
  const handleDeleteCatalogItem = async (tipo: 'empresas' | 'destinos' | 'destinatarios', id: string) => {
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
          Gestiona las opciones desplegables del sistema y la activación de roles de gestores.
        </p>
      </div>

      {/* Alert message */}
      {msg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'destinatarios'
              ? 'bg-white text-[#2d5a27] shadow-xs'
              : 'text-[#5a725e] hover:text-[#122014]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Destinatarios ({safeDestinatarios.length})</span>
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

          {/* Users List & Gestor Active Switch */}
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
                            <span className="text-[11px] text-[#5a725e] italic px-2 py-0.5 rounded bg-[#f8faf7]">
                              Protegido
                            </span>
                          )}
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
                  <div key={emp.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#122014]">{emp.nombre}</div>
                      <div className="text-[#5a725e] text-[11px] mt-0.5">
                        {emp.requiere_clave ? 'Requiere clave obligatoria' : 'Envío estándar sin clave'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCatalogItem('empresas', emp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                  <div key={dest.id} className="p-4 flex items-center justify-between text-xs">
                    <div className="font-bold text-[#122014] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#2d5a27]" />
                      <span>{dest.nombre}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCatalogItem('destinos', dest.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                  <div key={destin.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#122014]">{destin.nombre}</div>
                      <div className="text-[#5a725e] text-[11px] mt-0.5">
                        {destin.es_proveedor ? 'Requiere especificar nombre del proveedor' : 'Destinatario interno'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCatalogItem('destinatarios', destin.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
