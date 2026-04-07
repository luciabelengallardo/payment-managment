import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  X,
  DollarSign,
  TrendingUp,
  CreditCard,
  ArrowUpDown,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../utils/axios";
import PagoTable from "../components/PagoTable";
import ConfirmModal from "../components/ConfirmModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function Pagos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clienteIdParam = searchParams.get("clienteId");

  const [pagos, setPagos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroClienteId, setFiltroClienteId] = useState(
    clienteIdParam ? parseInt(clienteIdParam) : null,
  );
  const [filtroNumeroDocumento, setFiltroNumeroDocumento] = useState("");
  const [filtroFormaPago, setFiltroFormaPago] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [searchTermCliente, setSearchTermCliente] = useState("");
  const [showDropdownCliente, setShowDropdownCliente] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState("fecha");
  const [ordenDesc, setOrdenDesc] = useState(true);
  const [verTodo, setVerTodo] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pagoAEliminar, setPagoAEliminar] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchPagos();
    fetchClientes();
  }, []);

  useEffect(() => {
    if (clienteIdParam) {
      setFiltroClienteId(parseInt(clienteIdParam));
      const cliente = clientes.find((c) => c.id === parseInt(clienteIdParam));
      if (cliente) {
        setSearchTermCliente(`${cliente.nombre} - ${cliente.empresa}`);
      }
    }
  }, [clienteIdParam, clientes]);

  useEffect(() => {
    if (filtroClienteId) {
      const cliente = clientes.find((c) => c.id === filtroClienteId);
      if (cliente) {
        setSearchTermCliente(`${cliente.nombre} - ${cliente.empresa}`);
      }
    }
  }, [filtroClienteId, clientes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdownCliente(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/pagos`);
      setPagos(response.data.data || []);
    } catch (error) {
      toast.error("Error al cargar pagos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await axios.get(`${API_URL}/clientes`);
      setClientes(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    }
  };

  const handleDelete = (pago) => {
    setPagoAEliminar(pago);
    setShowConfirmModal(true);
  };

  const confirmarEliminacion = async () => {
    if (!pagoAEliminar) return;

    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/pagos/${pagoAEliminar.id}`);
      toast.success("Pago eliminado - Saldos actualizados");

      // Refrescar todos los datos para actualizar saldos
      await fetchPagos();
      await fetchClientes();

      setShowConfirmModal(false);
      setPagoAEliminar(null);
    } catch (error) {
      const message = error.response?.data?.message || "Error al eliminar pago";
      toast.error(message);
      setShowConfirmModal(false);
      setPagoAEliminar(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllFilters = () => {
    setFiltroClienteId(null);
    setFiltroNumeroDocumento("");
    setFiltroFormaPago("");
    setFiltroFechaInicio("");
    setFiltroFechaFin("");
    setSearchTermCliente("");
    setVerTodo(false);
    setSearchParams({});
  };

  const handleSearchClienteChange = (e) => {
    setSearchTermCliente(e.target.value);
    setShowDropdownCliente(true);
    if (!e.target.value.trim()) {
      setFiltroClienteId(null);
    }
  };

  const handleSelectCliente = (cliente) => {
    setFiltroClienteId(cliente.id);
    setSearchTermCliente(`${cliente.nombre} - ${cliente.empresa}`);
    setShowDropdownCliente(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calcularTotales = () => {
    const total = pagosFiltrados.reduce(
      (sum, pago) => sum + (pago.monto || 0),
      0,
    );
    const efectivo = pagosFiltrados.reduce((sum, pago) => {
      if (pago.detallesPago && pago.detallesPago.length > 0) {
        return (
          sum +
          pago.detallesPago
            .filter((d) => d.formaPago === "Efectivo")
            .reduce((s, d) => s + (d.monto || 0), 0)
        );
      }
      return sum + (pago.formaPago === "Efectivo" ? pago.monto || 0 : 0);
    }, 0);
    const otros = total - efectivo;
    return { total, efectivo, otros };
  };

  const handleOrdenar = (campo) => {
    if (ordenarPor === campo) {
      setOrdenDesc(!ordenDesc);
    } else {
      setOrdenarPor(campo);
      setOrdenDesc(true);
    }
  };

  const clientesFiltrados = clientes.filter((c) => {
    const searchLower = searchTermCliente.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(searchLower) ||
      c.empresa.toLowerCase().includes(searchLower)
    );
  });

  const formasPagoUnicas = [
    ...new Set(
      pagos
        .flatMap((p) =>
          p.detallesPago && p.detallesPago.length > 0
            ? p.detallesPago.map((d) => d.formaPago)
            : [p.formaPago],
        )
        .filter(Boolean),
    ),
  ];

  const pagosFiltrados = pagos.filter((pago) => {
    if (filtroClienteId && pago.clienteId !== filtroClienteId) {
      return false;
    }
    if (filtroNumeroDocumento) {
      // Buscar en documentoNumero del pago principal
      const numeroMatch =
        pago.documentoNumero &&
        pago.documentoNumero
          .toString()
          .toLowerCase()
          .includes(filtroNumeroDocumento.toLowerCase());

      // Buscar en detalles de pago si existen
      const detallesMatch =
        pago.detallesPago &&
        pago.detallesPago.length > 0 &&
        pago.detallesPago.some(
          (d) =>
            d.documentoNumero &&
            d.documentoNumero
              .toString()
              .toLowerCase()
              .includes(filtroNumeroDocumento.toLowerCase()),
        );

      if (!numeroMatch && !detallesMatch) {
        return false;
      }
    }
    if (filtroFormaPago) {
      const tieneFormaPago =
        pago.detallesPago && pago.detallesPago.length > 0
          ? pago.detallesPago.some((d) => d.formaPago === filtroFormaPago)
          : pago.formaPago === filtroFormaPago;

      if (!tieneFormaPago) {
        return false;
      }
    }
    if (filtroFechaInicio) {
      const fechaPago = pago.fecha.split("T")[0];
      if (fechaPago < filtroFechaInicio) {
        return false;
      }
    }
    if (filtroFechaFin) {
      const fechaPago = pago.fecha.split("T")[0];
      if (fechaPago > filtroFechaFin) {
        return false;
      }
    }
    return true;
  });

  const clienteFiltrado = filtroClienteId
    ? clientes.find((c) => c.id === filtroClienteId)
    : null;

  const hayFiltrosActivos =
    filtroClienteId ||
    filtroNumeroDocumento ||
    filtroFormaPago ||
    filtroFechaInicio ||
    filtroFechaFin;

  const pagosOrdenados = [...pagosFiltrados].sort((a, b) => {
    let valorA, valorB;

    switch (ordenarPor) {
      case "fecha":
        valorA = new Date(a.fecha);
        valorB = new Date(b.fecha);
        break;
      case "monto":
        valorA = a.monto || 0;
        valorB = b.monto || 0;
        break;
      case "cliente":
        valorA = a.clienteNombre?.toLowerCase() || "";
        valorB = b.clienteNombre?.toLowerCase() || "";
        break;
      default:
        return 0;
    }

    if (valorA < valorB) return ordenDesc ? 1 : -1;
    if (valorA > valorB) return ordenDesc ? -1 : 1;
    return 0;
  });

  const totales = calcularTotales();

  if (loading)
    return (
      <div className="text-center py-8 text-sm md:text-base">Cargando...</div>
    );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Empty State - Selector de Cliente */}
      {!filtroClienteId && !verTodo ? (
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: "#E8EFF7" }}
            >
              <DollarSign className="w-8 h-8" style={{ color: "#1F3A5F" }} />
            </div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "#1F3A5F" }}
            >
              Historial de Pagos
            </h1>
            <p className="text-gray-600">
              Selecciona un cliente para ver su historial de pagos
            </p>
          </div>

          {/* Lista de clientes como cards */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            {/* Buscador grande y visible */}
            <div className="mb-4">
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="🔍 Buscar cliente por nombre o empresa..."
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 transition"
                autoFocus
              />
              {busquedaCliente && (
                <p className="text-xs text-gray-500 mt-2">
                  {
                    clientes.filter((c) => {
                      const search = busquedaCliente.toLowerCase();
                      return (
                        c.nombre.toLowerCase().includes(search) ||
                        c.empresa.toLowerCase().includes(search)
                      );
                    }).length
                  }{" "}
                  {clientes.filter((c) => {
                    const search = busquedaCliente.toLowerCase();
                    return (
                      c.nombre.toLowerCase().includes(search) ||
                      c.empresa.toLowerCase().includes(search)
                    );
                  }).length === 1
                    ? "resultado"
                    : "resultados"}
                </p>
              )}
            </div>

            {/* Grid de clientes con scroll suave */}
            <div className="relative">
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 pb-2"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#1F3A5F #E8EFF7",
                }}
              >
                {clientes.filter((c) => {
                  if (!busquedaCliente) return true;
                  const search = busquedaCliente.toLowerCase();
                  return (
                    c.nombre.toLowerCase().includes(search) ||
                    c.empresa.toLowerCase().includes(search)
                  );
                }).length > 0 ? (
                  clientes
                    .filter((c) => {
                      if (!busquedaCliente) return true;
                      const search = busquedaCliente.toLowerCase();
                      return (
                        c.nombre.toLowerCase().includes(search) ||
                        c.empresa.toLowerCase().includes(search)
                      );
                    })
                    .map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setFiltroClienteId(cliente.id);
                          setSearchTermCliente(
                            `${cliente.nombre} - ${cliente.empresa}`,
                          );
                          setBusquedaCliente("");
                        }}
                        className="text-left p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                      >
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition">
                          {cliente.nombre}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {cliente.empresa}
                        </p>
                      </button>
                    ))
                ) : (
                  <div className="col-span-3 text-center py-12 text-gray-500">
                    {busquedaCliente ? (
                      <>
                        <p className="text-sm mb-1">
                          No se encontraron clientes
                        </p>
                        <p className="text-xs">
                          Intenta con otro término de búsqueda
                        </p>
                      </>
                    ) : (
                      <p className="text-sm">No hay clientes registrados</p>
                    )}
                  </div>
                )}
              </div>
              {/* Gradiente sutil para indicar scroll */}
              {clientes.filter((c) => {
                if (!busquedaCliente) return true;
                const search = busquedaCliente.toLowerCase();
                return (
                  c.nombre.toLowerCase().includes(search) ||
                  c.empresa.toLowerCase().includes(search)
                );
              }).length > 6 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-lg"></div>
              )}
            </div>
          </div>

          {/* Botón para ver historial completo (admin) */}
          <div className="text-center">
            <button
              onClick={() => setVerTodo(true)}
              className="px-6 py-3 rounded-lg border-2 hover:bg-gray-50 transition text-sm font-medium"
              style={{
                borderColor: "#6B7280",
                color: "#6B7280",
              }}
            >
              Ver historial completo (Admin)
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold"
                style={{ color: "#1F3A5F" }}
              >
                Historial de Pagos
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {pagosFiltrados.length}{" "}
                {pagosFiltrados.length === 1 ? "pago" : "pagos"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOrdenar("fecha")}
                className="px-3 py-2 rounded-lg flex items-center gap-2 transition text-sm border"
                style={{
                  backgroundColor: ordenarPor === "fecha" ? "#1F3A5F" : "white",
                  color: ordenarPor === "fecha" ? "white" : "#1F3A5F",
                  borderColor: "#1F3A5F",
                }}
              >
                <ArrowUpDown className="w-4 h-4" />
                Fecha
              </button>
              <button
                onClick={() => handleOrdenar("monto")}
                className="px-3 py-2 rounded-lg flex items-center gap-2 transition text-sm border"
                style={{
                  backgroundColor: ordenarPor === "monto" ? "#1F3A5F" : "white",
                  color: ordenarPor === "monto" ? "white" : "#1F3A5F",
                  borderColor: "#1F3A5F",
                }}
              >
                <ArrowUpDown className="w-4 h-4" />
                Monto
              </button>
            </div>
          </div>

          {/* Summary Cards Globales - Visible cuando verTodo es true y no hay filtros */}
          {verTodo && !hayFiltrosActivos && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className="bg-white rounded-lg shadow-lg p-4 border-l-4"
                style={{ borderLeftColor: "#1F3A5F" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Global</p>
                    <p
                      className="text-2xl font-bold mt-1"
                      style={{ color: "#1F3A5F" }}
                    >
                      {formatCurrency(totales.total)}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-full"
                    style={{ backgroundColor: "#E8EFF7" }}
                  >
                    <DollarSign
                      className="w-6 h-6"
                      style={{ color: "#1F3A5F" }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-lg shadow-lg p-4 border-l-4"
                style={{ borderLeftColor: "#5FB49C" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Efectivo</p>
                    <p
                      className="text-2xl font-bold mt-1"
                      style={{ color: "#5FB49C" }}
                    >
                      {formatCurrency(totales.efectivo)}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-full"
                    style={{ backgroundColor: "#E5F5F1" }}
                  >
                    <DollarSign
                      className="w-6 h-6"
                      style={{ color: "#5FB49C" }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-lg shadow-lg p-4 border-l-4"
                style={{ borderLeftColor: "#E76F51" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cantidad de Pagos</p>
                    <p
                      className="text-2xl font-bold mt-1"
                      style={{ color: "#E76F51" }}
                    >
                      {pagosFiltrados.length}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-full"
                    style={{ backgroundColor: "#FEF2F0" }}
                  >
                    <CreditCard
                      className="w-6 h-6"
                      style={{ color: "#E76F51" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards - Solo visible cuando hay cliente filtrado */}
          {filtroClienteId && clienteFiltrado && (
            <div className="space-y-3">
              {/* Banner informativo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#E8EFF7" }}
                >
                  <DollarSign
                    className="w-4 h-4"
                    style={{ color: "#1F3A5F" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#1F3A5F" }}
                  >
                    Resumen de pagos de {clienteFiltrado.nombre}
                  </p>
                  <p className="text-xs text-gray-600">
                    {clienteFiltrado.empresa}
                  </p>
                </div>
              </div>

              {/* Cards de totales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className="bg-white rounded-lg shadow p-4 border-l-4"
                  style={{ borderLeftColor: "#1F3A5F" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Pagado</p>
                      <p
                        className="text-2xl font-bold mt-1"
                        style={{ color: "#1F3A5F" }}
                      >
                        {formatCurrency(totales.total)}
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-full"
                      style={{ backgroundColor: "#E8EFF7" }}
                    >
                      <DollarSign
                        className="w-6 h-6"
                        style={{ color: "#1F3A5F" }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-lg shadow p-4 border-l-4"
                  style={{ borderLeftColor: "#5FB49C" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Efectivo</p>
                      <p
                        className="text-2xl font-bold mt-1"
                        style={{ color: "#5FB49C" }}
                      >
                        {formatCurrency(totales.efectivo)}
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-full"
                      style={{ backgroundColor: "#E8F5F1" }}
                    >
                      <TrendingUp
                        className="w-6 h-6"
                        style={{ color: "#5FB49C" }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-lg shadow p-4 border-l-4"
                  style={{ borderLeftColor: "#E76F51" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Cantidad de Pagos</p>
                      <p
                        className="text-2xl font-bold mt-1"
                        style={{ color: "#E76F51" }}
                      >
                        {pagosFiltrados.length}
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-full"
                      style={{ backgroundColor: "#FEF2F0" }}
                    >
                      <CreditCard
                        className="w-6 h-6"
                        style={{ color: "#E76F51" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
              {hayFiltrosActivos && (
                <button
                  onClick={handleClearAllFilters}
                  className="text-xs flex items-center gap-1 hover:opacity-80 transition"
                  style={{ color: "#E76F51" }}
                >
                  <X className="w-3 h-3" />
                  Limpiar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={searchTermCliente}
                  onChange={handleSearchClienteChange}
                  onFocus={() => setShowDropdownCliente(true)}
                  placeholder="Buscar..."
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                  style={{ focusRingColor: "#1F3A5F" }}
                  autoComplete="off"
                />
                {showDropdownCliente && searchTermCliente && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientesFiltrados.length > 0 ? (
                      <ul>
                        {clientesFiltrados.map((cliente) => (
                          <li key={cliente.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectCliente(cliente)}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition"
                            >
                              <p className="font-medium text-gray-900 text-sm">
                                {cliente.nombre}
                              </p>
                              <p className="text-xs text-gray-500">
                                {cliente.empresa}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-center text-gray-500 text-xs">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nº Factura/Remito
                </label>
                <input
                  type="text"
                  value={filtroNumeroDocumento}
                  onChange={(e) => setFiltroNumeroDocumento(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Forma de Pago
                </label>
                <select
                  value={filtroFormaPago}
                  onChange={(e) => setFiltroFormaPago(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                >
                  <option value="">Todas</option>
                  {formasPagoUnicas.map((forma) => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={filtroFechaInicio}
                  onChange={(e) => setFiltroFechaInicio(e.target.value)}
                  onClick={(e) => e.target.showPicker?.()}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filtroFechaFin}
                  onChange={(e) => setFiltroFechaFin(e.target.value)}
                  onClick={(e) => e.target.showPicker?.()}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                />
              </div>
            </div>
          </div>

          <PagoTable pagos={pagosOrdenados} onDelete={handleDelete} />
        </>
      )}

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPagoAEliminar(null);
        }}
        onConfirm={confirmarEliminacion}
        title="Eliminar Pago"
        message={
          pagoAEliminar
            ? `¿Estás seguro de que deseas eliminar este pago de ${new Intl.NumberFormat(
                "es-AR",
                {
                  style: "currency",
                  currency: "ARS",
                },
              ).format(pagoAEliminar.monto)}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        type="danger"
        isLoading={isDeleting}
        requireTextConfirmation={
          pagoAEliminar ? Math.round(pagoAEliminar.monto).toString() : null
        }
      />
    </div>
  );
}
