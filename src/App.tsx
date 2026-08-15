import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { User, Solicitud, CatalogoData, EstadoSolicitud } from './types';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FormSolicitud } from './components/FormSolicitud';
import { DetalleSolicitud } from './components/DetalleSolicitud';
import { AdminPanel } from './components/AdminPanel';

export function App() {
  const navigate = useNavigate();
  const [apiBase] = useState<string>(() => import.meta.env.VITE_API_BASE || 'https://rfelogappback.vercel.app');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rfe_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Always force clean light theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('rfe_theme');
  }, []);

  // Data collections (initialized empty, fetched dynamically from backend)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogoData>({
    empresas_transporte: [],
    destinos: [],
    destinatarios: [],
    tipos_solicitud: [],
  });

  const [loading, setLoading] = useState(false);

  // Load backend data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Load Solicitudes
      const solRes = await fetch(`${apiBase}/api/solicitudes`);
      const solData = await solRes.json();
      if (solData.success && Array.isArray(solData.data)) {
        setSolicitudes(solData.data);
      } else {
        setSolicitudes([]);
      }

      // 2. Load Catalogs
      const catRes = await fetch(`${apiBase}/api/catalogos`);
      const catData = await catRes.json();
      if (catData.success && catData.data) {
        setCatalogos({
          empresas_transporte: Array.isArray(catData.data.empresas_transporte) ? catData.data.empresas_transporte : [],
          destinos: Array.isArray(catData.data.destinos) ? catData.data.destinos : [],
          destinatarios: Array.isArray(catData.data.destinatarios) ? catData.data.destinatarios : [],
          tipos_solicitud: Array.isArray(catData.data.tipos_solicitud) ? catData.data.tipos_solicitud : [],
        });
      }

      // 3. Load Users
      const usrRes = await fetch(`${apiBase}/api/users`);
      const usrData = await usrRes.json();
      if (usrData.success && Array.isArray(usrData.data)) {
        setUsers(usrData.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching data from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('rfe_user', JSON.stringify(user));
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rfe_user');
    navigate('/login');
  };

  const handleCreateSuccess = (newSol: Solicitud) => {
    setSolicitudes((prev) => [newSol, ...prev]);
    navigate(`/solicitudes/${newSol.id}`);
  };

  const handleUpdateState = async (
    id: string,
    nuevoEstado: EstadoSolicitud,
    extraData?: {
      fecha_envio_destinatario?: string;
      empresa_transporte_id?: string;
      empresa_transporte_clave?: string;
      guia_archivo?: { nombre: string; mime_type: string; contenido: string };
      ordenes_compra?: any[];
      requisicion?: any;
    }
  ) => {
    if (!currentUser) return;

    try {
      const res = await fetch(`${apiBase}/api/solicitudes/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          estado: nuevoEstado,
          gestor_dni: currentUser.dni,
          fecha_envio_destinatario: extraData?.fecha_envio_destinatario,
          empresa_transporte_id: extraData?.empresa_transporte_id,
          empresa_transporte_clave: extraData?.empresa_transporte_clave,
          guia_archivo: extraData?.guia_archivo,
          ordenes_compra: extraData?.ordenes_compra,
          requisicion: extraData?.requisicion,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar');
      }
    } catch (err: any) {
      throw err;
    }

    // Refresh after success
    await fetchData();
  };

  // Download PDF Report using Maroto v2 endpoint
  const handleDownloadPDF = (id: string) => {
    window.open(`${apiBase}/api/solicitudes/reporte?id=${id}`, '_blank');
  };

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} apiBase={apiBase} />
          )
        }
      />

      {/* Root Route */}
      <Route
        path="/"
        element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />}
      />

      {/* Protected Routes inside Layout */}
      {currentUser ? (
        <Route
          path="/*"
          element={
            <Layout
              currentUser={currentUser}
              onLogout={handleLogout}
            >
              <Routes>
                <Route
                  path="/dashboard"
                  element={
                    <Dashboard
                      currentUser={currentUser}
                      solicitudes={solicitudes}
                      catalogos={catalogos}
                      onDownloadPDF={handleDownloadPDF}
                      onRefresh={fetchData}
                      loading={loading}
                    />
                  }
                />

                <Route
                  path="/solicitudes/nueva"
                  element={
                    <FormSolicitud
                      currentUser={currentUser}
                      users={users}
                      catalogos={catalogos}
                      onSaveSuccess={handleCreateSuccess}
                      apiBase={apiBase}
                    />
                  }
                />

                <Route
                  path="/solicitudes/:id"
                  element={
                    <DetalleSolicitud
                      allSolicitudes={solicitudes}
                      currentUser={currentUser}
                      catalogos={catalogos}
                      onUpdateState={handleUpdateState}
                      onDownloadPDF={handleDownloadPDF}
                      apiBase={apiBase}
                    />
                  }
                />

                <Route
                  path="/admin"
                  element={
                    currentUser.rol === 'Administrador' ? (
                      <AdminPanel
                        currentUser={currentUser}
                        users={users}
                        catalogos={catalogos}
                        onRefreshUsers={fetchData}
                        onRefreshCatalogos={fetchData}
                        apiBase={apiBase}
                      />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          }
        />
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default App;
