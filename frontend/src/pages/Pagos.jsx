import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Filter } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import PagoTable from "../components/PagoTable";

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
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroFormaPago, setFiltroFormaPago] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchTermCliente, setSearchTermCliente] = useState("");
  const [showDropdownCliente, setShowDropdownCliente] = useState(false);

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
      setShowFilters(true);
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

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar este pago?")) {
      try {
        await axios.delete(`${API_URL}/pagos/${id}`);
        setPagos(pagos.filter((p) => p.id !== id));
        toast.success("Pago eliminado");
        fetchClientes();
      } catch (error) {
        toast.error("Error al eliminar pago");
      }
    }
  };

  const handleClearAllFilters = () => {
    setFiltroClienteId(null);
    setFiltroEmpresa("");
    setFiltroFormaPago("");
    setFiltroFechaInicio("");
    setFiltroFechaFin("");
    setSearchTermCliente("");
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

  const clientesFiltrados = clientes.filter((c) => {
    const searchLower = searchTermCliente.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(searchLower) ||
      c.empresa.toLowerCase().includes(searchLower)
    );
  });

  const empresasUnicas = [
    ...new Set(pagos.map((p) => p.documentoEmpresa).filter(Boolean)),
  ];

  const formasPagoUnicas = [
    ...new Set(pagos.map((p) => p.formaPago).filter(Boolean)),
  ];

  const pagosFiltrados = pagos.filter((pago) => {
    if (filtroClienteId && pago.clienteId !== filtroClienteId) {
      return false;
    }
    if (filtroEmpresa && pago.documentoEmpresa !== filtroEmpresa) {
      return false;
    }
    if (filtroFormaPago && pago.formaPago !== filtroFormaPago) {
      return false;
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
    filtroEmpresa ||
    filtroFormaPago ||
    filtroFechaInicio ||
    filtroFechaFin;

  if (loading)
    return (
      <div className="text-center py-8 text-sm md:text-base">Cargando...</div>
    );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Historial de Pagos
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`${
            showFilters ? "bg-blue-600" : "bg-blue-500"
          } hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm md:text-base w-full sm:w-auto`}
        >
          <Filter className="w-4 h-4 md:w-5 md:h-5" />
          {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Filtros de Búsqueda
            </h3>
            {hayFiltrosActivos && (
              <button
                onClick={handleClearAllFilters}
                className="text-xs md:text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <X className="w-3 h-3 md:w-4 md:h-4" />
                Limpiar todos
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <input
                type="text"
                value={searchTermCliente}
                onChange={handleSearchClienteChange}
                onFocus={() => setShowDropdownCliente(true)}
                placeholder="Buscar por nombre o empresa..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa
              </label>
              <select
                value={filtroEmpresa}
                onChange={(e) => setFiltroEmpresa(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              >
                <option value="">Todas las empresas</option>
                {empresasUnicas.map((empresa) => (
                  <option key={empresa} value={empresa}>
                    {empresa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pago
              </label>
              <select
                value={filtroFormaPago}
                onChange={(e) => setFiltroFormaPago(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filtroFechaInicio}
                onChange={(e) => setFiltroFechaInicio(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filtroFechaFin}
                onChange={(e) => setFiltroFechaFin(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
          </div>

          {hayFiltrosActivos && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs md:text-sm text-gray-700">
                Mostrando{" "}
                <span className="font-semibold">{pagosFiltrados.length}</span>{" "}
                de <span className="font-semibold">{pagos.length}</span> pagos
              </p>
            </div>
          )}
        </div>
      )}

      {filtroClienteId && clienteFiltrado && !showFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs md:text-sm text-gray-600">
              Filtrando pagos de:
            </p>
            <p className="font-semibold text-gray-900 text-sm md:text-base">
              {clienteFiltrado.nombre} - {clienteFiltrado.empresa}
            </p>
          </div>
          <button
            onClick={handleClearAllFilters}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition text-xs md:text-sm w-full sm:w-auto"
          >
            <X className="w-4 h-4" />
            Limpiar filtro
          </button>
        </div>
      )}

      <PagoTable pagos={pagosFiltrados} onDelete={handleDelete} />
    </div>
  );
}
