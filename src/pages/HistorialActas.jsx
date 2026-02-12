import React, { useState, useEffect } from 'react';
import {
    FileText,
    Clock,
    User,
    MapPin,
    CheckCircle,
    AlertCircle,
    Building2,
    Grid3x3,
    Filter,
    Search,
    Calendar,
    TrendingUp,
    Eye,
    Edit,
    Save,
    X,
    ShieldCheck,
    ClipboardCheck
} from 'lucide-react';

const HistorialActas = () => {
    const [actas, setActas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [actaSeleccionada, setActaSeleccionada] = useState(null);
    const [mostrarDetalle, setMostrarDetalle] = useState(false);
    const [mostrarEdicion, setMostrarEdicion] = useState(false);
    const [frentes, setFrentes] = useState([]);
    const [guardando, setGuardando] = useState(false);
    
    // Estados para edición
    const [votosAlcalde, setVotosAlcalde] = useState([]);
    const [votosConcejal, setVotosConcejal] = useState([]);
    const [votosNulos, setVotosNulos] = useState(0);
    const [votosBlancos, setVotosBlancos] = useState(0);
    const [observaciones, setObservaciones] = useState('');

    const API_URL = import.meta.env.VITE_API_URL;

    const cargarActas = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/votos`);
            const data = await response.json();
            
            if (data.success) {
                setActas(data.data);
            }
        } catch (error) {
            console.error('Error al cargar actas:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarDetalleActa = async (id) => {
        try {
            const response = await fetch(`${API_URL}/votos/acta/${id}`);
            const data = await response.json();
            
            if (data.success) {
                setActaSeleccionada(data.data);
                setMostrarDetalle(true);
            }
        } catch (error) {
            console.error('Error al cargar detalle:', error);
        }
    };

    const cargarFrentes = async () => {
        try {
            const response = await fetch(`${API_URL}/votos/frentes`);
            const data = await response.json();
            if (data.success) {
                setFrentes(data.data);
            }
        } catch (error) {
            console.error('Error al cargar frentes:', error);
        }
    };

    const iniciarEdicion = async (id) => {
        try {
            // Cargar detalle del acta
            const response = await fetch(`${API_URL}/votos/acta/${id}`);
            const data = await response.json();
            
            if (data.success) {
                setActaSeleccionada(data.data);
                
                // Cargar frentes si no están cargados
                if (frentes.length === 0) {
                    await cargarFrentes();
                }
                
                // Inicializar votos para edición
                const votosAlcaldeActa = data.data.votos
                    .filter(v => v.tipo_cargo === 'alcalde')
                    .map(v => ({ id_frente: v.id_frente, cantidad: v.cantidad }));
                
                const votosConcejalesActa = data.data.votos
                    .filter(v => v.tipo_cargo === 'concejal')
                    .map(v => ({ id_frente: v.id_frente, cantidad: v.cantidad }));
                
                setVotosAlcalde(votosAlcaldeActa);
                setVotosConcejal(votosConcejalesActa);
                setVotosNulos(data.data.acta.votos_nulos || 0);
                setVotosBlancos(data.data.acta.votos_blancos || 0);
                setObservaciones(data.data.acta.observaciones || '');
                
                setMostrarEdicion(true);
                setMostrarDetalle(false);
            }
        } catch (error) {
            console.error('Error al iniciar edición:', error);
            alert('Error al cargar datos para edición');
        }
    };

    const guardarEdicion = async () => {
        try {
            setGuardando(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                alert('No estás autenticado. Por favor inicia sesión.');
                return;
            }

            const response = await fetch(`${API_URL}/votos/acta/${actaSeleccionada.acta.id_acta}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    votos_nulos: parseInt(votosNulos) || 0,
                    votos_blancos: parseInt(votosBlancos) || 0,
                    observaciones,
                    votos_alcalde: votosAlcalde.filter(v => v.cantidad > 0),
                    votos_concejal: votosConcejal.filter(v => v.cantidad > 0)
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Acta editada exitosamente');
                setMostrarEdicion(false);
                cargarActas(); // Recargar lista
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error al guardar edición:', error);
            alert('Error al guardar los cambios');
        } finally {
            setGuardando(false);
        }
    };

    const actualizarVoto = (tipo, idFrente, cantidad) => {
        const setter = tipo === 'alcalde' ? setVotosAlcalde : setVotosConcejal;
        const votos = tipo === 'alcalde' ? votosAlcalde : votosConcejal;
        
        const index = votos.findIndex(v => v.id_frente === idFrente);
        if (index >= 0) {
            const nuevosVotos = [...votos];
            nuevosVotos[index] = { id_frente: idFrente, cantidad: Math.max(0, cantidad) };
            setter(nuevosVotos);
        } else {
            setter([...votos, { id_frente: idFrente, cantidad: Math.max(0, cantidad) }]);
        }
    };

    const getVotosPorFrente = (tipo, idFrente) => {
        const votos = tipo === 'alcalde' ? votosAlcalde : votosConcejal;
        const voto = votos.find(v => v.id_frente === idFrente);
        return voto ? voto.cantidad : 0;
    };

    useEffect(() => {
        cargarActas();
        cargarFrentes();
    }, []);

    const actasFiltradas = actas.filter(acta => {
        const coincideBusqueda = 
            acta.codigo_mesa?.toLowerCase().includes(busqueda.toLowerCase()) ||
            acta.nombre_recinto?.toLowerCase().includes(busqueda.toLowerCase()) ||
            acta.nombre_geografico?.toLowerCase().includes(busqueda.toLowerCase());
        
        const coincideEstado = 
            filtroEstado === 'todos' || 
            acta.estado === filtroEstado;
        
        return coincideBusqueda && coincideEstado;
    });

    const estadisticas = {
        total: actas.length,
        registradas: actas.filter(a => a.estado === 'registrada').length,
        validadas: actas.filter(a => a.estado === 'validada').length,
        rechazadas: actas.filter(a => a.estado === 'rechazada').length
    };

    const getEstadoBadge = (estado) => {
        const estados = {
            registrada: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Registrada' },
            validada: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Validada' },
            rechazada: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Rechazada' },
            pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' }
        };
        
        const config = estados[estado] || estados.registrada;
        const IconComponent = config.icon;
        
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
                <IconComponent className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 mb-2">
                    Historial de Actas Registradas
                </h1>
                <p className="text-gray-600">
                    Registro completo de todas las actas procesadas en el sistema
                </p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-6 h-6 text-gray-600" />
                        <span className="text-gray-600 font-semibold">Total</span>
                    </div>
                    <p className="text-4xl font-black text-gray-900">{estadisticas.total}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                        <span className="text-gray-600 font-semibold">Registradas</span>
                    </div>
                    <p className="text-4xl font-black text-blue-600">{estadisticas.registradas}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-gray-600 font-semibold">Validadas</span>
                    </div>
                    <p className="text-4xl font-black text-green-600">{estadisticas.validadas}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                        <span className="text-gray-600 font-semibold">Votos Totales</span>
                    </div>
                    <p className="text-4xl font-black text-purple-600">
                        {actas.reduce((sum, a) => sum + (a.votos_totales || 0), 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por mesa, recinto o distrito..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="registrada">Registradas</option>
                            <option value="validada">Validadas</option>
                            <option value="rechazada">Rechazadas</option>
                            <option value="pendiente">Pendientes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de Actas */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando actas...</p>
                    </div>
                ) : actasFiltradas.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">No se encontraron actas</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Mesa</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Recinto</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Distrito</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Registrado por</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Fecha / Edición</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Votos</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {actasFiltradas.map((acta) => (
                                    <tr key={acta.id_acta} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Grid3x3 className="w-4 h-4 text-gray-400" />
                                                <span className="font-bold text-gray-900">{acta.codigo_mesa}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-900">{acta.nombre_recinto || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{acta.nombre_geografico || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{acta.nombre_usuario}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600">
                                                        {new Date(acta.fecha_registro).toLocaleDateString('es-BO', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {acta.editada && acta.fecha_ultima_edicion && (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
                                                            Editada
                                                        </span>
                                                        <span className="text-gray-500">
                                                            {new Date(acta.fecha_ultima_edicion).toLocaleDateString('es-BO', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-center">
                                                <span className="font-bold text-gray-900">{acta.votos_totales || 0}</span>
                                                <div className="text-xs text-gray-500">
                                                    Nulos: {acta.votos_nulos || 0} | Blancos: {acta.votos_blancos || 0}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getEstadoBadge(acta.estado)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => cargarDetalleActa(acta.id_acta)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition text-sm font-semibold"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => iniciarEdicion(acta.id_acta)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition text-sm font-semibold"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Editar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Detalle */}
            {mostrarDetalle && actaSeleccionada && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white z-10 px-8 py-6 border-b border-gray-200 rounded-t-3xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-gray-900">Detalle del Acta</h2>
                                <button
                                    onClick={() => setMostrarDetalle(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            {/* Información del Acta */}
                            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Información General</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-600">Mesa:</span>
                                        <p className="font-bold text-gray-900">{actaSeleccionada.acta.codigo_mesa}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Recinto:</span>
                                        <p className="font-bold text-gray-900">{actaSeleccionada.acta.nombre_recinto}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Distrito:</span>
                                        <p className="font-bold text-gray-900">{actaSeleccionada.acta.nombre_geografico}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Registrado por:</span>
                                        <p className="font-bold text-gray-900">{actaSeleccionada.acta.nombre_usuario}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Fecha de Registro:</span>
                                        <p className="font-bold text-gray-900">
                                            {new Date(actaSeleccionada.acta.fecha_registro).toLocaleDateString('es-BO', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    {actaSeleccionada.acta.editada && actaSeleccionada.acta.fecha_ultima_edicion && (
                                        <div>
                                            <span className="text-sm text-gray-600">Última Edición:</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                                                    Editada
                                                </span>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {new Date(actaSeleccionada.acta.fecha_ultima_edicion).toLocaleDateString('es-BO', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-sm text-gray-600">Votos Totales:</span>
                                        <p className="font-bold text-gray-900">{actaSeleccionada.acta.votos_totales}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Estado:</span>
                                        <div className="mt-1">{getEstadoBadge(actaSeleccionada.acta.estado)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Imagen del Acta */}
                            {actaSeleccionada.acta.imagen_url && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Imagen del Acta</h3>
                                    <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                                        <img
                                            src={`${API_URL}${actaSeleccionada.acta.imagen_url}`}
                                            alt="Acta escaneada"
                                            className="w-full h-auto max-h-96 object-contain rounded-xl cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => window.open(`${API_URL}${actaSeleccionada.acta.imagen_url}`, '_blank')}
                                        />
                                        <p className="text-xs text-gray-500 text-center mt-2">Click para ver en tamaño completo</p>
                                    </div>
                                </div>
                            )}

                            {/* Votos por Frente */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Votos por Frente Político</h3>
                                <div className="space-y-4">
                                    {actaSeleccionada.votos.map((voto) => (
                                        <div key={voto.id_voto} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-12 h-12 rounded-xl"
                                                        style={{ backgroundColor: voto.color || '#E31E24' }}
                                                    />
                                                    <div>
                                                        <p className="font-bold text-gray-900">{voto.siglas}</p>
                                                        <p className="text-sm text-gray-600">{voto.nombre_frente}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Cargo: <span className="font-semibold">{voto.tipo_cargo}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-gray-900">{voto.cantidad}</p>
                                                    <p className="text-sm text-gray-600">votos</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Observaciones */}
                            {actaSeleccionada.acta.observaciones && (
                                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                    <h3 className="text-sm font-bold text-yellow-800 mb-2">Observaciones:</h3>
                                    <p className="text-sm text-yellow-700">{actaSeleccionada.acta.observaciones}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición */}
            {mostrarEdicion && actaSeleccionada && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white z-10 px-8 py-6 border-b border-gray-200 rounded-t-3xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Editar Acta</h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Mesa: {actaSeleccionada.acta.codigo_mesa} - {actaSeleccionada.acta.nombre_recinto}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setMostrarEdicion(false)}
                                    disabled={guardando}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            {/* Votos Alcalde */}
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                                    Votos Alcalde
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {frentes.map((frente) => (
                                        <div key={`alcalde-${frente.id_frente}`} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-indigo-300 transition">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div
                                                        className="w-12 h-12 rounded-xl flex-shrink-0"
                                                        style={{ backgroundColor: frente.color || '#E31E24' }}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900">{frente.siglas}</p>
                                                        <p className="text-xs text-gray-600">{frente.nombre}</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={getVotosPorFrente('alcalde', frente.id_frente) || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        actualizarVoto('alcalde', frente.id_frente, parseInt(value) || 0);
                                                    }}
                                                    className="w-24 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl py-3 focus:border-indigo-600 focus:outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Votos Concejal */}
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <ClipboardCheck className="w-6 h-6 text-purple-600" />
                                    Votos Concejal
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {frentes.map((frente) => (
                                        <div key={`concejal-${frente.id_frente}`} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-purple-300 transition">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div
                                                        className="w-12 h-12 rounded-xl flex-shrink-0"
                                                        style={{ backgroundColor: frente.color || '#E31E24' }}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900">{frente.siglas}</p>
                                                        <p className="text-xs text-gray-600">{frente.nombre}</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={getVotosPorFrente('concejal', frente.id_frente) || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        actualizarVoto('concejal', frente.id_frente, parseInt(value) || 0);
                                                    }}
                                                    className="w-24 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl py-3 focus:border-purple-600 focus:outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Votos Nulos y Blancos */}
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200 hover:border-red-400 transition">
                                    <label className="block text-sm font-bold text-red-900 mb-3">
                                        Votos Nulos
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={votosNulos || ''}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                            setVotosNulos(parseInt(value) || 0);
                                        }}
                                        className="w-full text-center text-3xl font-bold border-2 border-gray-300 rounded-xl py-3 focus:border-red-600 focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-gray-400 transition">
                                    <label className="block text-sm font-bold text-gray-900 mb-3">
                                        Votos Blancos
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={votosBlancos || ''}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                            setVotosBlancos(parseInt(value) || 0);
                                        }}
                                        className="w-full text-center text-3xl font-bold border-2 border-gray-300 rounded-xl py-3 focus:border-gray-600 focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-900 mb-3">
                                    Observaciones
                                </label>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    rows={3}
                                    className="w-full border-2 border-gray-300 rounded-xl p-4 focus:border-indigo-600 focus:outline-none"
                                    placeholder="Observaciones adicionales sobre esta acta..."
                                />
                            </div>

                            {/* Botones */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={guardarEdicion}
                                    disabled={guardando}
                                    className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {guardando ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setMostrarEdicion(false)}
                                    disabled={guardando}
                                    className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition font-bold text-lg disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialActas;
