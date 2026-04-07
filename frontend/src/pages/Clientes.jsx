import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../utils/axios";
import {
  DollarSign,
  Plus,
  X,
  FileText,
  CreditCard,
  ArrowUpDown,
  AlertCircle,
  User,
} from "lucide-react";
import DocumentoForm from "../components/DocumentoForm";
import DocumentoTable from "../components/DocumentoTable";
import PagoFormMulti from "../components/PagoFormMulti";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function Clientes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clientes, setClientes] = useState([]);
  const [todosDocumentos, setTodosDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteEmpresa, setNuevoClienteEmpresa] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [showNuevoClienteForm, setShowNuevoClienteForm] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState("nombre");
  const [ordenDesc, setOrdenDesc] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedClienteId) {
        fetchClientes();
      }
    };

    const handleFocus = () => {
      if (selectedClienteId) {
        fetchClientes();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedClienteId]);

  useEffect(() => {
    const clienteId = searchParams.get("id");
    if (clienteId && clientes.length > 0) {
      const clienteIdNum = parseInt(clienteId);
      const clienteExiste = clientes.find((c) => c.id === clienteIdNum);
      if (clienteExiste) {
        handleSelectCliente(clienteIdNum);
        setTimeout(() => {
          const elemento = document.getElementById(`cliente-${clienteIdNum}`);
          if (elemento) {
            elemento.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }
  }, [searchParams, clientes]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const [clientesRes, documentosRes] = await Promise.all([
        axios.get(`${API_URL}/clientes`),
        axios.get(`${API_URL}/documentos`),
      ]);
      setClientes(clientesRes.data.data || []);
      setTodosDocumentos(documentosRes.data.data || []);

      if (selectedClienteId) {
        const response = await axios.get(
          `${API_URL}/documentos/cliente/${selectedClienteId}`,
        );
        const documentosFiltrados = (response.data.data || []).filter(
          (doc) => Math.abs(doc.saldoPendiente) > 0.01,
        );
        setDocumentos(documentosFiltrados);
      }
    } catch (error) {
      toast.error("Error al cargar clientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentos = async (clienteId) => {
    try {
      const response = await axios.get(
        `${API_URL}/documentos/cliente/${clienteId}`,
      );
      const documentosFiltrados = (response.data.data || []).filter(
        (doc) => Math.abs(doc.saldoPendiente) > 0.01,
      );
      setDocumentos(documentosFiltrados);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      setDocumentos([]);
    }
  };

  const handleSelectCliente = (clienteId) => {
    setSelectedClienteId(clienteId);
    setSearchTerm("");
    setShowNuevoClienteForm(false);
    fetchDocumentos(clienteId);
  };

  const handleDocumentoAgregado = async (nuevoDocumento) => {
    setDocumentos((prev) => [nuevoDocumento, ...prev]);
    setTodosDocumentos((prev) => [nuevoDocumento, ...prev]);
    await fetchClientes();
    setShowDocumentoForm(false); // Cerrar el formulario después de guardar
  };

  const handleDocumentoEliminado = async (documentoId) => {
    setDocumentos((prev) => prev.filter((d) => d.id !== documentoId));
    setTodosDocumentos((prev) => prev.filter((d) => d.id !== documentoId));
    await fetchClientes();

    if (selectedClienteId) {
      await fetchDocumentos(selectedClienteId);
    }
  };

  const handlePagoGuardado = async (pagoData) => {
    try {
      const response = await axios.post(`${API_URL}/pagos`, pagoData);
      toast.success("Pago registrado exitosamente");
      setShowPagoForm(false);

      await fetchClientes();
      if (selectedClienteId) {
        await fetchDocumentos(selectedClienteId);
      }
    } catch (error) {
      toast.error("Error al registrar el pago");
      console.error(error);
    }
  };

  const handleAgregarCliente = async (e) => {
    e.preventDefault();

    const nombre = nuevoClienteNombre.trim();
    const empresa = nuevoClienteEmpresa.trim();

    if (!nombre || !empresa) {
      toast.error("Nombre y empresa son obligatorios");
      return;
    }

    const existeDuplicado = clientes.some(
      (c) =>
        c.nombre?.trim().toLowerCase() === nombre.toLowerCase() &&
        c.empresa?.trim().toLowerCase() === empresa.toLowerCase(),
    );

    if (existeDuplicado) {
      toast.error("Ya existe un cliente con ese nombre y empresa");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/clientes`, {
        nombre,
        empresa,
      });
      setClientes((prev) => [response.data.data, ...prev]);
      toast.success("Cliente agregado exitosamente");
      setNuevoClienteNombre("");
      setNuevoClienteEmpresa("");
      setShowNuevoClienteForm(false);
      handleSelectCliente(response.data.data.id);
    } catch (error) {
      console.error(
        "Error al agregar cliente:",
        error?.response?.data || error,
      );
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Error al agregar cliente";
      toast.error(message);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value || 0);
  };

  const calcularDeudaCliente = (clienteId) => {
    return todosDocumentos
      .filter((doc) => doc.clienteId === clienteId && doc.saldoPendiente > 0)
      .reduce((sum, doc) => sum + doc.saldoPendiente, 0);
  };

  const contarFacturasPendientes = (clienteId) => {
    return todosDocumentos.filter(
      (doc) => doc.clienteId === clienteId && doc.saldoPendiente > 0,
    ).length;
  };

  const getEstadoBadge = (deuda) => {
    if (deuda > 1000) {
      return { texto: "Con deuda", color: "#E76F51", bgColor: "#fee2e2" };
    }
    if (deuda > 0) {
      return { texto: "Pendiente", color: "#F4A261", bgColor: "#fef3c7" };
    }
    return { texto: "Al día", color: "#5FB49C", bgColor: "#d4f1e9" };
  };

  const clienteFiltrados = clientes.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(searchLower) ||
      c.empresa.toLowerCase().includes(searchLower)
    );
  });

  const clientesOrdenados = [...clienteFiltrados].sort((a, b) => {
    let valorA, valorB;

    switch (ordenarPor) {
      case "nombre":
        valorA = a.nombre.toLowerCase();
        valorB = b.nombre.toLowerCase();
        break;
      case "empresa":
        valorA = a.empresa.toLowerCase();
        valorB = b.empresa.toLowerCase();
        break;
      case "deuda":
        valorA = calcularDeudaCliente(a.id);
        valorB = calcularDeudaCliente(b.id);
        break;
      default:
        return 0;
    }

    if (valorA < valorB) return ordenDesc ? 1 : -1;
    if (valorA > valorB) return ordenDesc ? -1 : 1;
    return 0;
  });

  const handleOrdenar = (campo) => {
    if (ordenarPor === campo) {
      setOrdenDesc(!ordenDesc);
    } else {
      setOrdenarPor(campo);
      setOrdenDesc(false);
    }
  };

  const clienteSeleccionado = clientes.find((c) => c.id === selectedClienteId);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        Cargando clientes...
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Título y botón de crear cliente */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Gestión de Clientes
        </h1>
        {!selectedClienteId && (
          <button
            onClick={() => setShowNuevoClienteForm(!showNuevoClienteForm)}
            className="text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
            style={{ backgroundColor: "#5FB49C" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#4da08a")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#5FB49C")
            }
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        )}
      </div>

      {!selectedClienteId ? (
        <>
          {showNuevoClienteForm && (
            <div className="bg-green-50 rounded-lg border-2 border-green-200 p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base md:text-lg font-bold text-gray-900">
                  Crear Nuevo Cliente
                </h2>
                <button
                  onClick={() => {
                    setShowNuevoClienteForm(false);
                    setNuevoClienteNombre("");
                    setNuevoClienteEmpresa("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAgregarCliente} className="space-y-3">
                <input
                  type="text"
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
                  autoFocus
                />
                <select
                  value={nuevoClienteEmpresa}
                  onChange={(e) => setNuevoClienteEmpresa(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
                >
                  <option value="">Selecciona una empresa</option>
                  <option value="Elcor">Elcor</option>
                  <option value="LCA">LCA</option>
                  <option value="Piamontesa">Piamontesa</option>
                  <option value="Cremigal">Cremigal</option>
                  <option value="DSP">DSP</option>
                  <option value="Delicias de la Nona">
                    Delicias de la Nona
                  </option>
                  <option value="Noble">Noble</option>
                </select>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="text-white font-semibold py-2 px-6 rounded-lg transition w-full sm:w-auto"
                    style={{ backgroundColor: "#5FB49C" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#4da08a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#5FB49C")
                    }
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNuevoClienteForm(false);
                      setNuevoClienteNombre("");
                      setNuevoClienteEmpresa("");
                    }}
                    className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition w-full sm:w-auto"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            {clientes.length > 0 && (
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar cliente por nombre o empresa..."
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 transition"
                />
                {searchTerm && (
                  <p className="text-xs text-gray-500 mt-2">
                    {clientesOrdenados.length}{" "}
                    {clientesOrdenados.length === 1
                      ? "resultado"
                      : "resultados"}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                {clientes.length > 0
                  ? `Clientes (${clientesOrdenados.length})`
                  : "Mis Clientes"}
              </h2>
              {clientes.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOrdenar("nombre")}
                    className={`px-3 py-1 text-xs rounded-lg flex items-center gap-1 transition ${
                      ordenarPor === "nombre"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Nombre <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleOrdenar("deuda")}
                    className={`px-3 py-1 text-xs rounded-lg flex items-center gap-1 transition ${
                      ordenarPor === "deuda"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Deuda <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {clientes.length === 0 ? (
              <div className="text-center py-12">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                  style={{ backgroundColor: "#E8F5F1" }}
                >
                  <User className="w-10 h-10" style={{ color: "#5FB49C" }} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¡Comienza agregando tu primer cliente!
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Crea un cliente para comenzar a gestionar facturas y pagos de
                  forma simple.
                </p>
                <button
                  onClick={() => setShowNuevoClienteForm(true)}
                  className="text-white font-medium py-3 px-6 rounded-lg transition inline-flex items-center gap-2"
                  style={{ backgroundColor: "#5FB49C" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#4da08a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#5FB49C")
                  }
                >
                  <Plus className="w-5 h-5" />
                  Crear mi primer cliente
                </button>
              </div>
            ) : clientesOrdenados.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm mb-2">No se encontraron clientes</p>
                <p className="text-xs">Intenta con otro término de búsqueda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientesOrdenados.map((cliente) => {
                  const deuda = calcularDeudaCliente(cliente.id);
                  const facturasPendientes = contarFacturasPendientes(
                    cliente.id,
                  );
                  const badge = getEstadoBadge(deuda);

                  return (
                    <button
                      key={cliente.id}
                      id={`cliente-${cliente.id}`}
                      onClick={() => handleSelectCliente(cliente.id)}
                      className="w-full text-left bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-lg hover:bg-blue-50 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition">
                              {cliente.nombre}
                            </h3>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: badge.bgColor,
                                color: badge.color,
                              }}
                            >
                              {badge.texto}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {cliente.empresa}
                          </p>
                        </div>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 transition">
                          <span className="text-gray-400 group-hover:text-blue-600 font-bold">
                            →
                          </span>
                        </div>
                      </div>

                      {(deuda > 0 || facturasPendientes > 0) && (
                        <div className="flex items-center gap-4 text-sm">
                          {deuda > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertCircle
                                className="w-4 h-4"
                                style={{ color: "#E76F51" }}
                              />
                              <span
                                className="font-semibold"
                                style={{ color: "#E76F51" }}
                              >
                                {formatCurrency(deuda)}
                              </span>
                            </div>
                          )}
                          {facturasPendientes > 0 && (
                            <div className="text-gray-600">
                              {facturasPendientes} factura
                              {facturasPendientes !== 1 && "s"} pendiente
                              {facturasPendientes !== 1 && "s"}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#1F3A5F" }}
                  >
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {clienteSeleccionado?.nombre}
                    </h2>
                    <p className="text-sm md:text-base text-gray-600">
                      {clienteSeleccionado?.empresa}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedClienteId(null);
                  setDocumentos([]);
                  setSearchTerm("");
                  setShowDocumentoForm(false);
                  setShowPagoForm(false);
                  setShowNuevoClienteForm(false);
                }}
                className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition text-sm border border-gray-300 flex items-center gap-2"
              >
                ← Volver
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div
              className="bg-white rounded-lg shadow-lg p-4 md:p-5 border-l-4"
              style={{ borderLeftColor: "#E76F51" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Saldo Pendiente
                </p>
                <div
                  className="p-1.5 md:p-2 rounded-full"
                  style={{ backgroundColor: "#FEF2F0" }}
                >
                  <AlertCircle
                    className="w-4 h-4 md:w-5 md:h-5"
                    style={{ color: "#E76F51" }}
                  />
                </div>
              </div>
              <p
                className="text-2xl md:text-3xl font-bold"
                style={{ color: "#E76F51" }}
              >
                {formatCurrency(calcularDeudaCliente(selectedClienteId))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {contarFacturasPendientes(selectedClienteId)} factura
                {contarFacturasPendientes(selectedClienteId) !== 1 && "s"}{" "}
                pendiente
                {contarFacturasPendientes(selectedClienteId) !== 1 && "s"}
              </p>
            </div>

            <div
              className="bg-white rounded-lg shadow-lg p-4 md:p-5 border-l-4"
              style={{ borderLeftColor: "#1F3A5F" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Total Facturado
                </p>
                <div
                  className="p-1.5 md:p-2 rounded-full"
                  style={{ backgroundColor: "#E8EFF7" }}
                >
                  <FileText
                    className="w-4 h-4 md:w-5 md:h-5"
                    style={{ color: "#1F3A5F" }}
                  />
                </div>
              </div>
              <p
                className="text-2xl md:text-3xl font-bold"
                style={{ color: "#1F3A5F" }}
              >
                {formatCurrency(
                  todosDocumentos
                    .filter((d) => d.clienteId === selectedClienteId)
                    .reduce((sum, d) => sum + (d.monto || 0), 0),
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {
                  todosDocumentos.filter(
                    (d) => d.clienteId === selectedClienteId,
                  ).length
                }{" "}
                documento
                {todosDocumentos.filter(
                  (d) => d.clienteId === selectedClienteId,
                ).length !== 1 && "s"}{" "}
                total
                {todosDocumentos.filter(
                  (d) => d.clienteId === selectedClienteId,
                ).length !== 1 && "es"}
              </p>
            </div>

            <div
              className="bg-white rounded-lg shadow-lg p-4 md:p-5 border-l-4"
              style={{ borderLeftColor: "#5FB49C" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Total Pagado
                </p>
                <div
                  className="p-1.5 md:p-2 rounded-full"
                  style={{ backgroundColor: "#E8F5F1" }}
                >
                  <DollarSign
                    className="w-4 h-4 md:w-5 md:h-5"
                    style={{ color: "#5FB49C" }}
                  />
                </div>
              </div>
              <p
                className="text-2xl md:text-3xl font-bold"
                style={{ color: "#5FB49C" }}
              >
                {formatCurrency(
                  todosDocumentos
                    .filter((d) => d.clienteId === selectedClienteId)
                    .reduce((sum, d) => sum + (d.monto || 0), 0) -
                    calcularDeudaCliente(selectedClienteId),
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Historial completo de pagos
              </p>
            </div>
          </div>

          {!showDocumentoForm && !showPagoForm && (
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">
                Acciones Rápidas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <button
                  onClick={() => setShowDocumentoForm(true)}
                  className="bg-white border-2 hover:bg-blue-50 rounded-lg p-4 md:p-6 transition-all hover:shadow-lg group text-left"
                  style={{ borderColor: "#1F3A5F" }}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: "#1F3A5F" }}
                    >
                      <FileText className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base md:text-lg mb-0.5 md:mb-1">
                        Agregar Factura
                      </p>
                      <p className="text-xs md:text-sm text-gray-600">
                        Crear nueva factura o remito
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowPagoForm(true)}
                  className="bg-white border-2 hover:bg-green-50 rounded-lg p-4 md:p-6 transition-all hover:shadow-lg group text-left"
                  style={{ borderColor: "#5FB49C" }}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: "#5FB49C" }}
                    >
                      <CreditCard className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base md:text-lg mb-0.5 md:mb-1">
                        Registrar Pago
                      </p>
                      <p className="text-xs md:text-sm text-gray-600">
                        Cargar pago recibido del cliente
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {showPagoForm && (
            <div className="flex justify-center mb-4">
              <button
                onClick={() => {
                  setShowPagoForm(false);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancelar
              </button>
            </div>
          )}

          {!showDocumentoForm && !showPagoForm && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    Facturas Pendientes de Pago
                  </h3>
                  {documentos.length > 0 && (
                    <span
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: "#FEF2F0", color: "#E76F51" }}
                    >
                      {documentos.length} pendiente
                      {documentos.length !== 1 && "s"}
                    </span>
                  )}
                </div>
              </div>
              <DocumentoTable
                documentos={documentos}
                clienteId={selectedClienteId}
                onDocumentoEliminado={handleDocumentoEliminado}
              />
            </div>
          )}

          {showDocumentoForm && (
            <DocumentoForm
              clienteId={selectedClienteId}
              clienteNombre={clienteSeleccionado?.nombre}
              clienteEmpresa={clienteSeleccionado?.empresa}
              onDocumentoAgregado={handleDocumentoAgregado}
              onCancel={() => setShowDocumentoForm(false)}
            />
          )}

          {showPagoForm && (
            <PagoFormMulti
              clientes={clientes}
              onSave={handlePagoGuardado}
              onCancel={() => setShowPagoForm(false)}
              clienteIdPreseleccionado={selectedClienteId}
            />
          )}
        </>
      )}
    </div>
  );
}
