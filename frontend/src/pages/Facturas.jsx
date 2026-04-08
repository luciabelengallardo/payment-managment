import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../utils/axios";
import {
  FileText,
  Search,
  X,
  Eye,
  DollarSign,
  Calendar,
  User,
  Building2,
  AlertCircle,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function Facturas() {
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("todas"); // todas, pendientes, pagadas
  const [searchText, setSearchText] = useState("");

  // Ordenamiento
  const [ordenarPor, setOrdenarPor] = useState("fecha");
  const [ordenDesc, setOrdenDesc] = useState(true);

  // Modal de detalle
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [pagosDocumento, setPagosDocumento] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [documentosRes, clientesRes, pagosRes] = await Promise.all([
        axios.get(`${API_URL}/documentos`),
        axios.get(`${API_URL}/clientes`),
        axios.get(`${API_URL}/pagos`),
      ]);
      setDocumentos(documentosRes.data.data || []);
      setClientes(clientesRes.data.data || []);
      setPagos(pagosRes.data.data || []);
    } catch (error) {
      toast.error("Error al cargar datos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const calcularTotalPagado = (documentoId) => {
    let total = 0;
    pagos.forEach((pago) => {
      // Si el pago tiene detalles, solo contar los detalles aplicados a este documento
      if (pago.detallesPago && pago.detallesPago.length > 0) {
        pago.detallesPago.forEach((detalle) => {
          if (detalle.documentoId === documentoId) {
            total += detalle.monto || 0;
          }
        });
      } else {
        // Si no tiene detalles, contar el pago completo si fue aplicado a este documento
        if (pago.documentoId === documentoId) {
          total += pago.monto || 0;
        }
      }
    });
    return total;
  };

  const getClienteInfo = (clienteId) => {
    return clientes.find((c) => c.id === clienteId) || {};
  };

  const getEstadoBadge = (saldoPendiente, montoTotal) => {
    if (saldoPendiente <= 0) {
      return {
        texto: "Pagada",
        bgColor: "#d4f1e9",
        textColor: "#2d6a5a",
      };
    }

    const porcentajePagado = ((montoTotal - saldoPendiente) / montoTotal) * 100;

    if (porcentajePagado === 0) {
      return {
        texto: "Sin pagos",
        bgColor: "#fee2e2",
        textColor: "#991b1b",
      };
    }

    if (porcentajePagado < 100) {
      return {
        texto: "Pendiente",
        bgColor: "#fef3c7",
        textColor: "#92400e",
      };
    }

    return {
      texto: "A favor",
      bgColor: "#d4f1e9",
      textColor: "#2d6a5a",
    };
  };

  // Filtrar documentos
  const documentosFiltrados = documentos.filter((doc) => {
    // Filtro por búsqueda de texto
    if (searchText) {
      const cliente = getClienteInfo(doc.clienteId);
      const textoCompleto =
        `${doc.tipo} ${doc.numero} ${cliente.nombre} ${cliente.empresa}`.toLowerCase();
      if (!textoCompleto.includes(searchText.toLowerCase())) {
        return false;
      }
    }

    // Filtro por estado - calcular con pagos reales
    const pagadoDoc = calcularTotalPagado(doc.id);
    const saldoReal = doc.monto - pagadoDoc;
    
    if (filtroEstado === "pendientes" && saldoReal <= 0) {
      return false;
    }
    if (filtroEstado === "pagadas" && saldoReal > 0) {
      return false;
    }

    return true;
  });

  // Ordenar documentos
  const documentosOrdenados = [...documentosFiltrados].sort((a, b) => {
    let valorA, valorB;

    switch (ordenarPor) {
      case "fecha":
        valorA = new Date(a.fecha);
        valorB = new Date(b.fecha);
        break;
      case "cliente":
        const clienteA = getClienteInfo(a.clienteId);
        const clienteB = getClienteInfo(b.clienteId);
        valorA = clienteA.nombre?.toLowerCase() || "";
        valorB = clienteB.nombre?.toLowerCase() || "";
        break;
      case "monto":
        valorA = a.monto || 0;
        valorB = b.monto || 0;
        break;
      case "saldo":
        valorA = a.saldoPendiente || 0;
        valorB = b.saldoPendiente || 0;
        break;
      case "factura":
        valorA = `${a.tipo} ${a.numero}`.toLowerCase();
        valorB = `${b.tipo} ${b.numero}`.toLowerCase();
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
      setOrdenDesc(true);
    }
  };

  const handleVerDetalle = (doc) => {
    setDocumentoSeleccionado(doc);
    const pagosFiltrados = pagos.filter((pago) => {
      if (pago.documentoId === doc.id) return true;
      if (pago.detallesPago && pago.detallesPago.length > 0) {
        return pago.detallesPago.some((d) => d.documentoId === doc.id);
      }
      return false;
    });
    setPagosDocumento(pagosFiltrados);
    setShowDetalleModal(true);
  };

  const handleLimpiarFiltros = () => {
    setFiltroEstado("todas");
    setSearchText("");
  };

  const calcularTotales = () => {
    const montoTotal = documentosOrdenados.reduce(
      (sum, doc) => sum + (doc.monto || 0),
      0,
    );
    const totalPagado = documentosOrdenados.reduce(
      (sum, doc) => sum + calcularTotalPagado(doc.id),
      0,
    );
    // Calcular saldo pendiente real basado en monto - pagos
    const saldoPendiente = documentosOrdenados.reduce((sum, doc) => {
      const pagadoDoc = calcularTotalPagado(doc.id);
      const saldo = doc.monto - pagadoDoc;
      return sum + Math.max(0, saldo);
    }, 0);

    return { montoTotal, totalPagado, saldoPendiente };
  };

  const calcularContadores = () => {
    // Usar todos los documentos, no los filtrados, y calcular con pagos reales
    const total = documentos.length;
    const pagadas = documentos.filter((d) => {
      const pagado = calcularTotalPagado(d.id);
      return d.monto - pagado <= 0;
    }).length;
    const pendientes = documentos.filter((d) => {
      const pagado = calcularTotalPagado(d.id);
      return d.monto - pagado > 0;
    }).length;
    return { total, pagadas, pendientes };
  };

  const totales = calcularTotales();
  const contadores = calcularContadores();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "#1F3A5F" }}
          ></div>
          <p className="text-gray-600">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7" style={{ color: "#1F3A5F" }} />
            Historial de Facturas
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-gray-600">
              <span className="font-bold" style={{ color: "#1F3A5F" }}>
                {contadores.total}
              </span>{" "}
              total
            </span>
            <span className="text-white/60">•</span>
            <span className="text-gray-600">
              <span className="font-bold" style={{ color: "#5FB49C" }}>
                {contadores.pagadas}
              </span>{" "}
              pagadas
            </span>
            <span className="text-white/60">•</span>
            <span className="text-gray-600">
              <span className="font-bold" style={{ color: "#F4A261" }}>
                {contadores.pendientes}
              </span>{" "}
              pendientes
            </span>
          </div>
        </div>

        {/* Búsqueda rápida */}
        <div className="w-full md:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar factura o cliente..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs de Estado */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap">
            <button
              onClick={() => setFiltroEstado("todas")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filtroEstado === "todas"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Todas ({contadores.total})
            </button>
            <button
              onClick={() => setFiltroEstado("pagadas")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filtroEstado === "pagadas"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Pagadas ({contadores.pagadas})
            </button>
            <button
              onClick={() => setFiltroEstado("pendientes")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filtroEstado === "pendientes"
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Pendientes ({contadores.pendientes})
            </button>
          </div>
        </div>
      </div>

      {/* Resumen de totales - Solo visible si hay documentos */}
      {documentos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5" style={{ color: "#1F3A5F" }} />
              <p className="text-sm text-gray-600">Monto Total</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#1F3A5F" }}>
              {formatCurrency(totales.montoTotal)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" style={{ color: "#5FB49C" }} />
              <p className="text-sm text-gray-600">Total Pagado</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#5FB49C" }}>
              {formatCurrency(totales.totalPagado)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5" style={{ color: "#E76F51" }} />
              <p className="text-sm text-gray-600">Saldo Pendiente</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#E76F51" }}>
              {formatCurrency(totales.saldoPendiente)}
            </p>
          </div>
        </div>
      )}

      {/* Empty State o Tabla */}
      {documentos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center max-w-md mx-auto">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
              style={{ backgroundColor: "#E8EFF7" }}
            >
              <FileText className="w-10 h-10" style={{ color: "#1F3A5F" }} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No hay facturas todavía
            </h3>
            <p className="text-gray-600 mb-6">
              Las facturas aparecerán aquí cuando crees una desde la sección de{" "}
              <strong>Clientes</strong>.
            </p>
            <button
              onClick={() => navigate("/clientes")}
              className="text-white font-medium py-3 px-6 rounded-lg transition inline-flex items-center gap-2"
              style={{ backgroundColor: "#1F3A5F" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#152d47")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#1F3A5F")
              }
            >
              Ir a Clientes
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {documentosOrdenados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm mb-1">No se encontraron facturas</p>
                <p className="text-xs">Intenta ajustando los filtros</p>
              </div>
            ) : (
              documentosOrdenados.map((doc) => {
                const cliente = getClienteInfo(doc.clienteId);
                const totalPagado = calcularTotalPagado(doc.id);
                const saldo = doc.monto - totalPagado;
                const badge = getEstadoBadge(saldo, doc.monto);

                return (
                  <div key={doc.id} className="p-4 space-y-3">
                    {/* Header con badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {cliente.nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cliente.empresa}
                          </p>
                        </div>
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: badge.bgColor,
                          color: badge.textColor,
                        }}
                      >
                        {badge.texto}
                      </span>
                    </div>

                    {/* Factura info */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Factura:</span>
                      <span className="font-medium text-gray-900">
                        {doc.tipo} {doc.numero}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fecha:</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(doc.fecha)}
                      </span>
                    </div>

                    {/* Montos */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#1F3A5F" }}
                        >
                          {formatCurrency(doc.monto)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pagado</p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#5FB49C" }}
                        >
                          {formatCurrency(totalPagado)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Saldo</p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: saldo > 0 ? "#E76F51" : "#5FB49C" }}
                        >
                          {formatCurrency(Math.abs(saldo))}
                        </p>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleVerDetalle(doc)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition"
                        style={{
                          backgroundColor: "#e3edf7",
                          color: "#1F3A5F",
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalle
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/clientes?id=${doc.clienteId}`)
                        }
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition border border-gray-300 hover:bg-gray-50"
                        style={{ color: "#6B7280" }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver cliente
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleOrdenar("cliente")}
                  >
                    <div className="flex items-center gap-2">
                      Cliente
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                    Empresa
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleOrdenar("factura")}
                  >
                    <div className="flex items-center gap-2">
                      Factura
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleOrdenar("fecha")}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleOrdenar("monto")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Monto Total
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                    Total Pagado
                  </th>
                  <th
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleOrdenar("saldo")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Saldo
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documentosOrdenados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <p className="text-sm mb-1">No se encontraron facturas</p>
                      <p className="text-xs">Intenta ajustando los filtros</p>
                    </td>
                  </tr>
                ) : (
                  documentosOrdenados.map((doc) => {
                    const cliente = getClienteInfo(doc.clienteId);
                    const totalPagado = calcularTotalPagado(doc.id);
                    const saldo = doc.monto - totalPagado;
                    const badge = getEstadoBadge(saldo, doc.monto);

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {cliente.nombre}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {cliente.empresa}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">
                            {doc.tipo} {doc.numero}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(doc.fecha)}
                        </td>
                        <td
                          className="px-6 py-4 text-right font-semibold"
                          style={{ color: "#1F3A5F" }}
                        >
                          {formatCurrency(doc.monto)}
                        </td>
                        <td
                          className="px-6 py-4 text-right font-semibold"
                          style={{ color: "#5FB49C" }}
                        >
                          {formatCurrency(totalPagado)}
                        </td>
                        <td
                          className="px-6 py-4 text-right font-semibold"
                          style={{ color: saldo > 0 ? "#E76F51" : "#5FB49C" }}
                        >
                          {formatCurrency(Math.abs(saldo))}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: badge.bgColor,
                              color: badge.textColor,
                            }}
                          >
                            {badge.texto}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleVerDetalle(doc)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition hover:bg-blue-50"
                              style={{ color: "#1F3A5F" }}
                              title="Ver detalle de factura"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/clientes?id=${doc.clienteId}`)
                              }
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition hover:bg-gray-100"
                              style={{ color: "#6B7280" }}
                              title="Ir a cliente"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {showDetalleModal && documentoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Detalle de Factura
              </h3>
              <button
                onClick={() => setShowDetalleModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" style={{ color: "#1F3A5F" }} />
                  Información del Cliente
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Nombre:</p>
                    <p className="font-medium">
                      {getClienteInfo(documentoSeleccionado.clienteId).nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Empresa:</p>
                    <p className="font-medium">
                      {getClienteInfo(documentoSeleccionado.clienteId).empresa}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Factura */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: "#1F3A5F" }} />
                  Información de la Factura
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Tipo y Número:</p>
                    <p className="font-medium">
                      {documentoSeleccionado.tipo}{" "}
                      {documentoSeleccionado.numero}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha:</p>
                    <p className="font-medium">
                      {formatDate(documentoSeleccionado.fecha)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monto Total:</p>
                    <p className="font-semibold" style={{ color: "#1F3A5F" }}>
                      {formatCurrency(documentoSeleccionado.monto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Pagado:</p>
                    <p className="font-semibold" style={{ color: "#5FB49C" }}>
                      {formatCurrency(
                        calcularTotalPagado(documentoSeleccionado.id),
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Historial de Pagos */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign
                    className="w-5 h-5"
                    style={{ color: "#5FB49C" }}
                  />
                  Historial de Pagos ({pagosDocumento.length})
                </h4>

                {pagosDocumento.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay pagos registrados para esta factura
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pagosDocumento.map((pago) => {
                      // Calcular correctamente el monto aplicado a este documento
                      let montoPago = 0;
                      if (pago.detallesPago && pago.detallesPago.length > 0) {
                        // Pago multi-factura: buscar el detalle de esta factura
                        const detalle = pago.detallesPago.find(
                          (d) => d.documentoId === documentoSeleccionado.id,
                        );
                        montoPago = detalle?.monto || 0;
                      } else {
                        // Pago simple: si el pago es para este documento, usar el monto completo
                        if (pago.documentoId === documentoSeleccionado.id) {
                          montoPago = pago.monto || 0;
                        }
                      }

                      return (
                        <div
                          key={pago.id}
                          className="bg-gray-50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">
                              {formatDate(pago.fecha)}
                            </span>
                            <span
                              className="font-bold"
                              style={{ color: "#5FB49C" }}
                            >
                              {formatCurrency(montoPago)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {pago.detallesPago &&
                            pago.detallesPago.length > 0 ? (
                              <>
                                <p>
                                  Pago aplicado a {pago.detallesPago.length}{" "}
                                  factura{pago.detallesPago.length !== 1 && "s"}
                                </p>
                                {pago.detallesPago.find(
                                  (d) =>
                                    d.documentoId === documentoSeleccionado.id,
                                )?.formaPago && (
                                  <p>
                                    Forma:{" "}
                                    {
                                      pago.detallesPago.find(
                                        (d) =>
                                          d.documentoId ===
                                          documentoSeleccionado.id,
                                      ).formaPago
                                    }
                                  </p>
                                )}
                              </>
                            ) : (
                              <p>Forma: {pago.formaPago}</p>
                            )}
                            {pago.descripcion && (
                              <p>Nota: {pago.descripcion}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
