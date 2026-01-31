import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  Calendar,
  Building2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function Dashboard() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientesRes, pagosRes, documentosRes] = await Promise.all([
        axios.get(`${API_URL}/clientes`),
        axios.get(`${API_URL}/pagos`),
        axios.get(`${API_URL}/documentos`),
      ]);
      setClientes(clientesRes.data.data || []);
      setPagos(pagosRes.data.data || []);
      setDocumentos(documentosRes.data.data || []);
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
    let date = dateString;
    if (dateString.includes("T")) {
      date = dateString.split("T")[0];
    }
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  };

  const clientesConDeudaReal = clientes
    .map((cliente) => {
      const documentosCliente = documentos.filter(
        (d) => d.clienteId === cliente.id,
      );
      const deudaTotal = documentosCliente.reduce(
        (sum, doc) => sum + (doc.saldoPendiente || 0),
        0,
      );

      return {
        ...cliente,
        deudaReal: deudaTotal,
      };
    })
    .filter((c) => c.deudaReal > 0);

  const totalDeudaReal = clientesConDeudaReal.reduce(
    (sum, c) => sum + c.deudaReal,
    0,
  );

  const pagosFiltradosPorFecha = pagos.filter((pago) => {
    let fechaPago = pago.fecha;
    if (fechaPago.includes("T")) {
      fechaPago = fechaPago.split("T")[0];
    }

    if (filtroFechaInicio && fechaPago < filtroFechaInicio) return false;
    if (filtroFechaFin && fechaPago > filtroFechaFin) return false;
    if (empresaSeleccionada && pago.documentoEmpresa !== empresaSeleccionada)
      return false;

    return true;
  });

  const totalRecibido = pagos.reduce((sum, p) => sum + p.monto, 0);
  const totalRecibidoFiltrado = pagosFiltradosPorFecha.reduce(
    (sum, p) => sum + p.monto,
    0,
  );

  const pagosPorFormaPago = pagosFiltradosPorFecha.reduce((acc, pago) => {
    acc[pago.formaPago] = (acc[pago.formaPago] || 0) + pago.monto;
    return acc;
  }, {});

  const empresasUnicas = [
    ...new Set(pagos.map((p) => p.documentoEmpresa).filter(Boolean)),
  ];

  const pagosPorEmpresa = pagosFiltradosPorFecha.reduce((acc, pago) => {
    const empresa = pago.documentoEmpresa || "Sin empresa";
    acc[empresa] = (acc[empresa] || 0) + pago.monto;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-base md:text-lg text-gray-600">
            Cargando datos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Resumen general de pagos y clientes
        </p>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs md:text-sm font-medium">
                Total Recibido
              </p>
              <p className="text-xl md:text-3xl font-bold mt-2">
                {formatCurrency(totalRecibido)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 md:w-12 md:h-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs md:text-sm font-medium">
                Total Clientes
              </p>
              <p className="text-xl md:text-3xl font-bold mt-2">
                {clientes.length}
              </p>
            </div>
            <Users className="w-8 h-8 md:w-12 md:h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs md:text-sm font-medium">
                Deuda Total
              </p>
              <p className="text-xl md:text-3xl font-bold mt-2">
                {formatCurrency(totalDeudaReal)}
              </p>
              <p className="text-red-100 text-xs mt-1">
                {clientesConDeudaReal.length} clientes
              </p>
            </div>
            <AlertCircle className="w-8 h-8 md:w-12 md:h-12 text-red-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs md:text-sm font-medium">
                Total Pagos
              </p>
              <p className="text-xl md:text-3xl font-bold mt-2">
                {pagos.length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 md:w-12 md:h-12 text-purple-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Filtros de Análisis */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Análisis de Pagos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <select
              value={empresaSeleccionada}
              onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
            >
              <option value="">Todas las empresas</option>
              {empresasUnicas.map((empresa) => (
                <option key={empresa} value={empresa}>
                  {empresa}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filtroFechaInicio || filtroFechaFin || empresaSeleccionada) && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs md:text-sm text-gray-600">
                  Total en período seleccionado:
                </p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(totalRecibidoFiltrado)}
                </p>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  {pagosFiltradosPorFecha.length} pago
                  {pagosFiltradosPorFecha.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  setFiltroFechaInicio("");
                  setFiltroFechaFin("");
                  setEmpresaSeleccionada("");
                }}
                className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {/* Resumen por Forma de Pago */}
        <div className="mb-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
            Por Forma de Pago
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {Object.entries(pagosPorFormaPago)
              .sort((a, b) => b[1] - a[1])
              .map(([forma, total]) => (
                <div
                  key={forma}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 md:p-4 border border-gray-200"
                >
                  <p className="text-xs text-gray-600 font-medium uppercase truncate">
                    {forma}
                  </p>
                  <p className="text-sm md:text-lg font-bold text-gray-900 mt-1">
                    {formatCurrency(total)}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Resumen por Empresa */}
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 md:w-5 md:h-5" />
            Por Empresa
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {Object.entries(pagosPorEmpresa)
              .sort((a, b) => b[1] - a[1])
              .map(([empresa, total]) => (
                <div
                  key={empresa}
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 md:p-4 border border-indigo-200"
                >
                  <p className="text-xs text-indigo-600 font-medium truncate">
                    {empresa}
                  </p>
                  <p className="text-sm md:text-lg font-bold text-gray-900 mt-1">
                    {formatCurrency(total)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Clientes con Deuda */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Clientes con Deuda Pendiente
            </h2>
          </div>
          <span className="text-xs md:text-sm text-gray-600">
            {clientesConDeudaReal.length} cliente
            {clientesConDeudaReal.length !== 1 ? "s" : ""}
          </span>
        </div>

        {clientesConDeudaReal.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm md:text-base">
            ¡Excelente! No hay clientes con deuda pendiente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-700">
                    Cliente
                  </th>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-700">
                    Empresa
                  </th>
                  <th className="px-3 md:px-4 py-3 text-right font-semibold text-gray-700">
                    Saldo Pendiente
                  </th>
                  <th className="px-3 md:px-4 py-3 text-center font-semibold text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientesConDeudaReal
                  .sort((a, b) => b.deudaReal - a.deudaReal)
                  .map((cliente) => (
                    <tr key={cliente.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 md:px-4 py-3 font-medium text-gray-900">
                        {cliente.nombre}
                      </td>
                      <td className="px-3 md:px-4 py-3 text-gray-600">
                        {cliente.empresa}
                      </td>
                      <td className="px-3 md:px-4 py-3 text-right font-bold text-red-600">
                        {formatCurrency(cliente.deudaReal)}
                      </td>
                      <td className="px-3 md:px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/clientes?id=${cliente.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs md:text-sm"
                        >
                          Ver detalles →
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td
                    colSpan="2"
                    className="px-3 md:px-4 py-3 text-right font-bold text-gray-900"
                  >
                    TOTAL DEUDA:
                  </td>
                  <td className="px-3 md:px-4 py-3 text-right font-bold text-red-700 text-sm md:text-lg">
                    {formatCurrency(totalDeudaReal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Últimos Pagos */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Últimos 10 Pagos
          </h2>
          <button
            onClick={() => navigate("/pagos")}
            className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium text-left sm:text-right"
          >
            Ver todos →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-700">
                  Cliente
                </th>
                <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-700">
                  Empresa
                </th>
                <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-700">
                  Monto
                </th>
                <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-700">
                  Forma de Pago
                </th>
                <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-700">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {pagos.slice(0, 10).map((pago) => (
                <tr key={pago.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 md:px-4 py-3 font-medium text-gray-900">
                    {pago.clienteNombre}
                  </td>
                  <td className="px-3 md:px-4 py-3 text-gray-600">
                    {pago.documentoEmpresa || "-"}
                  </td>
                  <td className="px-3 md:px-4 py-3 font-semibold text-green-600">
                    {formatCurrency(pago.monto)}
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      {pago.formaPago}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3 text-gray-600">
                    {formatDate(pago.fecha)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="block md:hidden mt-3 p-2 bg-blue-50 text-xs text-gray-600 text-center rounded">
          Desliza horizontalmente para ver más →
        </div>
      </div>
    </div>
  );
}
