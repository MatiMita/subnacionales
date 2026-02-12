import React, { useState, useEffect } from 'react';
import {
    Save,
    Plus,
    CheckCircle,
    ClipboardCheck,
   ShieldCheck,
    X,
    MapPin,
    Building2,
    Grid3x3,
    ChevronRight,
    FileText,
    ArrowLeft,
    Image,
    Upload
} from 'lucide-react';

const Transcripcion = () => {
    const [showModal, setShowModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Estados para el wizard
    const [distritos, setDistritos] = useState([]);
    const [recintos, setRecintos] = useState([]);
    const [mesas, setMesas] = useState([]);
    const [frentes, setFrentes] = useState([]);
    
    // Selecciones
    const [selectedDistrito, setSelectedDistrito] = useState(null);
    const [selectedRecinto, setSelectedRecinto] = useState(null);
    const [selectedMesa, setSelectedMesa] = useState(null);

    // Votos
    const [votosAlcalde, setVotosAlcalde] = useState([]);
    const [votosConcejal, setVotesConcejal] = useState([]);
    const [votosNulos, setVotosNulos] = useState(0);
    const [votosBlancos, setVotosBlancos] = useState(0);
    const [observaciones, setObservaciones] = useState('');
    
    // Imagen del acta
    const [imagenActa, setImagenActa] = useState(null);
    const [previewImagen, setPreviewImagen] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL;

    // Cargar distritos al abrir modal
    useEffect(() => {
        if (showModal) {
            cargarDistritos();
            cargarFrentes();
        }
    }, [showModal]);

    const cargarDistritos = async () => {
        try {
            const response = await fetch(`${API_URL}/geografico`);
            const data = await response.json();
            if (data.success) {
                const distritosData = data.data.filter(g => 
                    g.tipo === 'Distrito' || g.tipo === 'Municipio'
                );
                setDistritos(distritosData);
            }
        } catch (error) {
            console.error('Error al cargar distritos:', error);
        }
    };

    const cargarRecintos = async (idGeografico) => {
        try {
            const response = await fetch(`${API_URL}/votos/recintos?id_geografico=${idGeografico}`);
            const data = await response.json();
            if (data.success) {
                setRecintos(data.data);
            }
        } catch (error) {
            console.error('Error al cargar recintos:', error);
        }
    };

    const cargarMesas = async (idRecinto) => {
        try {
            const response = await fetch(`${API_URL}/votos/mesas?id_recinto=${idRecinto}`);
            const data = await response.json();
            if (data.success) {
                setMesas(data.data);
            }
        } catch (error) {
            console.error('Error al cargar mesas:', error);
        }
    };

    const cargarFrentes = async () => {
        try {
            const response = await fetch(`${API_URL}/votos/frentes`);
            const data = await response.json();
            if (data.success) {
                setFrentes(data.data);
                const votosIniciales = data.data.map(f => ({
                    id_frente: f.id_frente,
                    nombre: f.nombre,
                    siglas: f.siglas,
                    color: f.color,
                    cantidad: 0
                }));
                setVotosAlcalde(votosIniciales);
                setVotesConcejal(JSON.parse(JSON.stringify(votosIniciales)));
            }
        } catch (error) {
            console.error('Error al cargar frentes:', error);
        }
    };

    const handleSelectDistrito = (distrito) => {
        setSelectedDistrito(distrito);
        setSelectedRecinto(null);
        setSelectedMesa(null);
        cargarRecintos(distrito.id_geografico);
        setCurrentStep(2);
    };

    const handleSelectRecinto = (recinto) => {
        setSelectedRecinto(recinto);
        setSelectedMesa(null);
        cargarMesas(recinto.id_recinto);
        setCurrentStep(3);
    };

    const handleSelectMesa = (mesa) => {
        setSelectedMesa(mesa);
        setCurrentStep(4);
    };

    const updateVotos = (tipo, idFrente, value) => {
        const setVotos = tipo === 'alcalde' ? setVotosAlcalde : setVotesConcejal;
        setVotos(prev => prev.map(v =>
            v.id_frente === idFrente ? { ...v, cantidad: Math.max(0, value) } : v
        ));
    };
    
    const handleImagenChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tamaño (máx 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('La imagen no debe superar los 10MB');
                return;
            }
            
            // Validar tipo
            if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
                alert('Solo se permiten imágenes JPG, PNG o PDF');
                return;
            }
            
            setImagenActa(file);
            
            // Crear preview solo para imágenes
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewImagen(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                setPreviewImagen('pdf');
            }
        }
    };

    const handleRegistrarActa = async () => {
        setIsSaving(true);

        try {
            const token = localStorage.getItem('token');
            
            // Usar FormData para enviar imagen
            const formData = new FormData();
            formData.append('id_mesa', selectedMesa.id_mesa);
            formData.append('id_tipo_eleccion', 1);
            formData.append('votos_nulos', votosNulos);
            formData.append('votos_blancos', votosBlancos);
            formData.append('observaciones', observaciones);
            formData.append('votos_alcalde', JSON.stringify(votosAlcalde.filter(v => v.cantidad > 0)));
            formData.append('votos_concejal', JSON.stringify(votosConcejal.filter(v => v.cantidad > 0)));
            
            // Agregar imagen si existe
            if (imagenActa) {
                formData.append('imagen_acta', imagenActa);
            }
            
            const response = await fetch(`${API_URL}/votos/registrar-acta`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // NO incluir Content-Type, FormData lo maneja automáticamente
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setToastMsg('¡Acta registrada exitosamente en el sistema!');
                setShowToast(true);
                setTimeout(() => {
                    setShowToast(false);
                    setShowModal(false);
                    resetForm();
                }, 3000);
            } else {
                throw new Error(data.message || 'Error al registrar acta');
            }

        } catch (error) {
            console.error('Error:', error);
            setToastMsg('Error al registrar acta: ' + error.message);
            setShowToast(true);
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setCurrentStep(1);
        setSelectedDistrito(null);
        setSelectedRecinto(null);
       setSelectedMesa(null);
        setVotosNulos(0);
        setVotosBlancos(0);
        setObservaciones('');
        setImagenActa(null);
        setPreviewImagen(null);
        if (frentes.length > 0) {
            const votosIniciales = frentes.map(f => ({
                id_frente: f.id_frente,
                nombre: f.nombre,
                siglas: f.siglas,
                color: f.color,
                cantidad: 0
            }));
            setVotosAlcalde(votosIniciales);
            setVotesConcejal(votosIniciales);
        }
    };

    const totalVotosAlcalde = votosAlcalde.reduce((sum, v) => sum + v.cantidad, 0);
    const totalVotosConcejal = votosConcejal.reduce((sum, v) => sum + v.cantidad, 0);
    const totalGeneral = totalVotosAlcalde + totalVotosConcejal + votosNulos + votosBlancos;

    const VotoCard = ({ frente, tipo }) => (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div 
                        className="w-12 h-12 rounded-xl flex-shrink-0" 
                        style={{ backgroundColor: frente.color }}
                    />
                    <div className="flex-1">
                        <p className="font-bold text-gray-900">{frente.siglas}</p>
                        <p className="text-xs text-gray-500">{frente.nombre}</p>
                    </div>
                </div>
                <input
                    type="text"
                    inputMode="numeric"
                    value={frente.cantidad || ''}
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        updateVotos(tipo, frente.id_frente, parseInt(value) || 0);
                    }}
                    className="w-24 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl py-3 focus:border-indigo-600 focus:outline-none"
                    placeholder="0"
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 rounded-xl">
                                <FileText className="w-8 h-8 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900">Transcripción de Actas</h1>
                                <p className="text-gray-600 mt-1">Sistema de registro electoral</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                        >
                            <Plus className="w-6 h-6" />
                            Registrar Acta
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="container mx-auto px-6 py-12">
                <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
                    <div className="max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ClipboardCheck className="w-10 h-10 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            Comienza registrando un acta
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Haz clic en "Registrar Acta" para iniciar el proceso de transcripción de resultados electorales.
                        </p>
                        <div className="grid grid-cols-3 gap-6 text-left">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-indigo-600 mt-1" />
                                <div>
                                    <p className="font-semibold text-gray-900">Distrito</p>
                                    <p className="text-sm text-gray-600">Selecciona ubicación</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building2 className="w-5 h-5 text-indigo-600 mt-1" />
                                <div>
                                    <p className="font-semibold text-gray-900">Recinto</p>
                                    <p className="text-sm text-gray-600">Elige colegio</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Grid3x3 className="w-5 h-5 text-indigo-600 mt-1" />
                                <div>
                                    <p className="font-semibold text-gray-900">Mesa</p>
                                    <p className="text-sm text-gray-600">Ingresa votos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Wizard */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl my-8">
                        {/* Header del Modal */}
                        <div className="sticky top-0 bg-white z-10 px-8 py-6 border-b border-gray-200 rounded-t-3xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-black text-gray-900">Registro de Acta Electoral</h2>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            
                            {/* Stepper */}
                            <div className="flex items-center justify-between max-w-3xl mx-auto">
                                {[
                                    { num: 1, label: 'Distrito', icon: MapPin },
                                    { num: 2, label: 'Recinto', icon: Building2 },
                                    { num: 3, label: 'Mesa', icon: Grid3x3 },
                                    { num: 4, label: 'Votos', icon: FileText }
                                ].map((step, idx) => (
                                    <React.Fragment key={step.num}>
                                        <div className="flex flex-col items-center">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                                                currentStep >= step.num 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : 'bg-gray-200 text-gray-400'
                                            }`}>
                                                {currentStep > step.num ? (
                                                    <CheckCircle className="w-6 h-6" />
                                                ) : (
                                                    <step.icon className="w-6 h-6" />
                                                )}
                                            </div>
                                            <span className={`text-xs font-semibold mt-2 ${
                                                currentStep >= step.num ? 'text-indigo-600' : 'text-gray-400'
                                            }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                        {idx < 3 && (
                                            <div className={`flex-1 h-1 mx-2 rounded transition-all ${
                                                currentStep > step.num ? 'bg-indigo-600' : 'bg-gray-200'
                                            }`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="p-8 max-h-[calc(90vh-200px)] overflow-y-auto">
                            {/* Paso 1: Seleccionar Distrito */}
                            {currentStep === 1 && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-6">Selecciona el Distrito</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {distritos.map(distrito => (
                                            <button
                                                key={distrito.id_geografico}
                                                onClick={() => handleSelectDistrito(distrito)}
                                                className="p-6 border-2 border-gray-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-gray-900 mb-1">{distrito.nombre}</p>
                                                        <p className="text-sm text-gray-600">{distrito.tipo}</p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paso 2: Seleccionar Recinto */}
                            {currentStep === 2 && (
                                <div>
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold mb-4"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Volver a distritos
                                    </button>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Selecciona el Recinto Electoral
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Distrito: <span className="font-semibold">{selectedDistrito?.nombre}</span>
                                    </p>
                                    <div className="grid grid-cols-1 gap-4">
                                        {recintos.map(recinto => (
                                            <button
                                                key={recinto.id_recinto}
                                                onClick={() => handleSelectRecinto(recinto)}
                                                className="p-6 border-2 border-gray-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-gray-900 mb-1">{recinto.nombre}</p>
                                                        <p className="text-sm text-gray-600">{recinto.direccion}</p>
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            {recinto.cantidad_mesas} mesas disponibles
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paso 3: Seleccionar Mesa */}
                            {currentStep === 3 && (
                                <div>
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold mb-4"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Volver a recintos
                                    </button>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Selecciona la Mesa Electoral
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Recinto: <span className="font-semibold">{selectedRecinto?.nombre}</span>
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {mesas.map(mesa => (
                                            <button
                                                key={mesa.id_mesa}
                                                onClick={() => handleSelectMesa(mesa)}
                                                className="p-6 border-2 border-gray-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group"
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-900 mb-1">Mesa {mesa.numero_mesa}</p>
                                                    <p className="text-sm text-gray-600">{mesa.codigo}</p>
                                                    {mesa.actas_registradas > 0 && (
                                                        <p className="text-xs text-orange-600 mt-2 font-semibold">
                                                            ⚠️ Ya tiene {mesa.actas_registradas} acta(s) registrada(s)
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paso 4: Registrar Votos */}
                            {currentStep === 4 && (
                                <div>
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold mb-4"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Volver a mesas
                                    </button>
                                    
                                    {/* Información seleccionada */}
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-indigo-600 font-semibold mb-1">Distrito</p>
                                                <p className="text-gray-900 font-bold">{selectedDistrito?.nombre}</p>
                                            </div>
                                            <div>
                                                <p className="text-indigo-600 font-semibold mb-1">Recinto</p>
                                                <p className="text-gray-900 font-bold">{selectedRecinto?.nombre}</p>
                                            </div>
                                            <div>
                                                <p className="text-indigo-600 font-semibold mb-1">Mesa</p>
                                                <p className="text-gray-900 font-bold">Mesa {selectedMesa?.numero_mesa}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Votos para Alcalde */}
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-10 w-1 bg-indigo-600 rounded"></div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">Votos para Alcalde</h3>
                                                <p className="text-sm text-gray-600">Total: {totalVotosAlcalde} votos</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {votosAlcalde.map(frente => (
                                                <VotoCard key={`alc-${frente.id_frente}`} frente={frente} tipo="alcalde" />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Votos para Concejal */}
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-10 w-1 bg-emerald-600 rounded"></div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">Votos para Concejales</h3>
                                                <p className="text-sm text-gray-600">Total: {totalVotosConcejal} votos</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {votosConcejal.map(frente => (
                                                <VotoCard key={`con-${frente.id_frente}`} frente={frente} tipo="concejal" />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Votos Nulos y Blancos */}
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 hover:border-red-400 transition">
                                            <label className="block text-sm font-semibold text-red-700 mb-3">
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

                                        <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 hover:border-gray-400 transition">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Votos en Blanco
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
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Observaciones (opcional)
                                        </label>
                                        <textarea
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-indigo-600 focus:outline-none transition-all"
                                            rows="3"
                                            placeholder="Ingresa cualquier observación sobre esta acta..."
                                        />
                                    </div>

                                    {/* Imagen del Acta */}
                                    <div className="mb-8">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            <div className="flex items-center gap-2">
                                                <Image className="w-5 h-5 text-indigo-600" />
                                                Imagen del Acta Física (opcional)
                                            </div>
                                        </label>
                                        
                                        {!previewImagen ? (
                                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-indigo-600 hover:bg-indigo-50 transition-all">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-12 h-12 mb-3 text-gray-400" />
                                                    <p className="mb-2 text-sm text-gray-600 font-semibold">
                                                        Click para subir imagen del acta
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        JPG, PNG o PDF (máximo 10MB)
                                                    </p>
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                                                    onChange={handleImagenChange}
                                                />
                                            </label>
                                        ) : (
                                            <div className="relative border-2 border-gray-200 rounded-2xl p-4">
                                                <button
                                                    onClick={() => {
                                                        setImagenActa(null);
                                                        setPreviewImagen(null);
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all z-10"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                {previewImagen === 'pdf' ? (
                                                    <div className="flex items-center justify-center h-48 bg-gray-100 rounded-xl">
                                                        <div className="text-center">
                                                            <FileText className="w-16 h-16 text-red-500 mx-auto mb-2" />
                                                            <p className="text-gray-700 font-semibold">{imagenActa?.name}</p>
                                                            <p className="text-xs text-gray-500 mt-1">PDF cargado</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={previewImagen}
                                                        alt="Preview"
                                                        className="w-full h-auto max-h-64 object-contain rounded-xl"
                                                    />
                                                )}
                                                <p className="text-sm text-gray-600 mt-2 text-center">
                                                    {imagenActa?.name}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Total General */}
                                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-indigo-100 text-sm font-semibold mb-1">Total General de Votos</p>
                                                <p className="text-4xl font-black">{totalGeneral}</p>
                                            </div>
                                            <ClipboardCheck className="w-16 h-16 opacity-30" />
                                        </div>
                                    </div>

                                    {/* Botón Registrar */}
                                    <button
                                        onClick={handleRegistrarActa}
                                        disabled={isSaving || totalGeneral === 0}
                                        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                                            isSaving || totalGeneral === 0
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                                        }`}
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Registrando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-6 h-6" />
                                                Registrar Acta Electoral
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {showToast && (
                <div className="fixed bottom-8 right-8 z-50 animate-bounce-in">
                    <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 flex items-center space-x-4 max-w-md">
                        <div className="bg-green-500/20 p-3 rounded-xl">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-lg">¡Éxito!</p>
                            <p className="text-gray-300 text-sm">{toastMsg}</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.5) translateY(100px); opacity: 0; }
                    60% { transform: scale(1.1) translateY(-10px); }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default Transcripcion;
