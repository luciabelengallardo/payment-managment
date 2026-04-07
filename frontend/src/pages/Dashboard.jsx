import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import toast from "react-hot-toast";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  History,
  ArrowRight,
  AlertCircle,
  FileText,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function Dashboard() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [mostrarDeudas, setMostrarDeudas] = useState(false);
  const [mostrarMonto, setMostrarMonto] = useState(false);

  // Auto-seleccionar últimos 7 días al cargar
  useEffect(() => {
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);

    const formatearFecha = (fecha) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    setFiltroFechaInicio(formatearFecha(hace7Dias));
    setFiltroFechaFin(formatearFecha(hoy));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pagosRes, clientesRes, documentosRes] = await Promise.all([
        axios.get(`${API_URL}/pagos`),
        axios.get(`${API_URL}/clientes`),
        axios.get(`${API_URL}/documentos`),
      ]);
      setPagos(pagosRes.data.data || []);
      setClientes(clientesRes.data.data || []);
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

  // Filtrar pagos por período actual
  const pagosPeriodoActual = pagos.filter((pago) => {
    let fechaPago = pago.fecha;
    if (fechaPago.includes("T")) {
      fechaPago = fechaPago.split("T")[0];
    }
    if (filtroFechaInicio && fechaPago < filtroFechaInicio) return false;
    if (filtroFechaFin && fechaPago > filtroFechaFin) return false;
    return true;
  });

  // Calcular período anterior (misma duración)
  const calcularPeriodoAnterior = () => {
    if (!filtroFechaInicio || !filtroFechaFin) return [];

    const inicio = new Date(filtroFechaInicio);
    const fin = new Date(filtroFechaFin);
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));

    const inicioAnterior = new Date(inicio);
    inicioAnterior.setDate(inicio.getDate() - dias - 1);

    const finAnterior = new Date(fin);
    finAnterior.setDate(fin.getDate() - dias - 1);

    const formatearFecha = (fecha) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return pagos.filter((pago) => {
      let fechaPago = pago.fecha;
      if (fechaPago.includes("T")) {
        fechaPago = fechaPago.split("T")[0];
      }
      return (
        fechaPago >= formatearFecha(inicioAnterior) &&
        fechaPago <= formatearFecha(finAnterior)
      );
    });
  };

  const pagosPeriodoAnterior = calcularPeriodoAnterior();

  // Total efectivo período actual (incluye detallesPago)
  const totalEfectivo = pagosPeriodoActual.reduce((sum, pago) => {
    if (pago.detallesPago && pago.detallesPago.length > 0) {
      // Sumar solo los detalles que sean Efectivo
      return (
        sum +
        pago.detallesPago
          .filter((d) => d.formaPago === "Efectivo")
          .reduce((detSum, det) => detSum + (det.monto || 0), 0)
      );
    } else {
      // Pago simple
      return sum + (pago.formaPago === "Efectivo" ? pago.monto : 0);
    }
  }, 0);

  // Total efectivo período anterior (incluye detallesPago)
  const totalEfectivoAnterior = pagosPeriodoAnterior.reduce((sum, pago) => {
    if (pago.detallesPago && pago.detallesPago.length > 0) {
      return (
        sum +
        pago.detallesPago
          .filter((d) => d.formaPago === "Efectivo")
          .reduce((detSum, det) => detSum + (det.monto || 0), 0)
      );
    } else {
      return sum + (pago.formaPago === "Efectivo" ? pago.monto : 0);
    }
  }, 0);

  // Contar pagos con efectivo (incluyendo detalles)
  const cantidadPagosEfectivo = pagosPeriodoActual.filter((pago) => {
    if (pago.detallesPago && pago.detallesPago.length > 0) {
      return pago.detallesPago.some((d) => d.formaPago === "Efectivo");
    }
    return pago.formaPago === "Efectivo";
  }).length;

  // Porcentaje de cambio
  const porcentajeCambio =
    totalEfectivoAnterior > 0
      ? ((totalEfectivo - totalEfectivoAnterior) / totalEfectivoAnterior) * 100
      : totalEfectivo > 0
        ? 100
        : 0;

  // Total general del período
  const totalPeriodo = pagosPeriodoActual.reduce((sum, p) => sum + p.monto, 0);

  // Breakdown por forma de pago (solo período actual)
  const pagosPorFormaPago = pagosPeriodoActual.reduce((acc, pago) => {
    if (pago.detallesPago && pago.detallesPago.length > 0) {
      // Si tiene múltiples formas de pago, sumar cada una
      pago.detallesPago.forEach((detalle) => {
        acc[detalle.formaPago] =
          (acc[detalle.formaPago] || 0) + (detalle.monto || 0);
      });
    } else {
      // Pago simple
      acc[pago.formaPago] = (acc[pago.formaPago] || 0) + pago.monto;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Seguimiento de efectivo y formas de pago
        </p>
      </div>

      {/* HERO - Total Efectivo */}
      <div
        className="rounded-xl p-4 md:p-6 text-white shadow-lg cursor-pointer transition-all hover:shadow-xl"
        style={{
          background: "linear-gradient(135deg, #5FB49C 0%, #4da08a 100%)",
        }}
        onClick={() => setMostrarMonto(!mostrarMonto)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white/90" />
              <p className="text-white/90 text-xs md:text-sm font-medium uppercase tracking-wide">
                Efectivo Recibido
              </p>
            </div>
            <p className="text-3xl md:text-4xl font-bold mb-2">
              {mostrarMonto ? formatCurrency(totalEfectivo) : "$ ••••••"}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/80 text-xs">
                {cantidadPagosEfectivo} pago{cantidadPagosEfectivo !== 1 && "s"}
              </span>
              {totalEfectivoAnterior > 0 && mostrarMonto && (
                <>
                  <span className="text-white/60">•</span>
                  <div className="flex items-center gap-1">
                    {porcentajeCambio >= 0 ? (
                      <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                    ) : (
                      <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />
                    )}
                    <span className="text-xs font-semibold">
                      {porcentajeCambio >= 0 ? "+" : ""}
                      {porcentajeCambio.toFixed(1)}%
                    </span>
                    <span className="text-white/80 text-xs">
                      vs período anterior
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex md:flex-col md:items-center md:gap-1">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <span className="text-white/60 text-xs mt-1">
              {mostrarMonto ? "Ocultar" : "Mostrar"}
            </span>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#1F3A5F" }}>
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/clientes")}
            className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition"
                  style={{ backgroundColor: "#E8EFF7" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#D1E3F5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#E8EFF7";
                  }}
                >
                  <Users className="w-5 h-5" style={{ color: "#1F3A5F" }} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-600">Gestionar</p>
                  <p className="text-base font-bold text-gray-900">Clientes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
          </button>

          <button
            onClick={() => navigate("/pagos")}
            className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition"
                  style={{ backgroundColor: "#E8F5F1" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#D1EBE5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#E8F5F1";
                  }}
                >
                  <DollarSign
                    className="w-5 h-5"
                    style={{ color: "#5FB49C" }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-600">Historial</p>
                  <p className="text-base font-bold text-gray-900">Pagos</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition" />
            </div>
          </button>

          <button
            onClick={() => navigate("/facturas")}
            className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition"
                  style={{ backgroundColor: "#FEF5ED" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#FDECD6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#FEF5ED";
                  }}
                >
                  <FileText className="w-5 h-5" style={{ color: "#F4A261" }} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-600">Historial</p>
                  <p className="text-base font-bold text-gray-900">Facturas</p>
                  {documentos.filter((d) => d.saldoPendiente > 0).length >
                    0 && (
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "#F4A261" }}
                    >
                      {documentos.filter((d) => d.saldoPendiente > 0).length}{" "}
                      pendientes
                    </p>
                  )}
                </div>
              </div>
              <ArrowRight
                className="w-4 h-4 text-gray-400 transition"
                style={{ color: "#F4A261" }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Filtros de Período - Compact */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4" style={{ color: "#1F3A5F" }} />
          <h2 className="text-sm font-semibold" style={{ color: "#1F3A5F" }}>
            Período de Análisis
          </h2>
          {totalEfectivoAnterior > 0 && mostrarMonto && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="text-gray-600">vs anterior:</span>
              <span
                className="font-bold"
                style={{
                  color:
                    totalEfectivo >= totalEfectivoAnterior
                      ? "#5FB49C"
                      : "#E76F51",
                }}
              >
                {totalEfectivo >= totalEfectivoAnterior ? "+" : ""}
                {formatCurrency(totalEfectivo - totalEfectivoAnterior)}
              </span>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => {
              const hoy = new Date();
              const formatearFecha = (fecha) => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, "0");
                const day = String(fecha.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
              };
              setFiltroFechaInicio(formatearFecha(hoy));
              setFiltroFechaFin(formatearFecha(hoy));
            }}
            className="px-3 py-1.5 text-xs rounded-lg border transition"
            style={{
              borderColor: "#1F3A5F",
              color: "#1F3A5F",
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E8EFF7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Hoy
          </button>
          <button
            onClick={() => {
              const hoy = new Date();
              const hace7Dias = new Date();
              hace7Dias.setDate(hoy.getDate() - 7);
              const formatearFecha = (fecha) => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, "0");
                const day = String(fecha.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
              };
              setFiltroFechaInicio(formatearFecha(hace7Dias));
              setFiltroFechaFin(formatearFecha(hoy));
            }}
            className="px-3 py-1.5 text-xs rounded-lg border transition"
            style={{
              borderColor: "#1F3A5F",
              color: "#1F3A5F",
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E8EFF7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            7 días
          </button>
          <button
            onClick={() => {
              const hoy = new Date();
              const hace30Dias = new Date();
              hace30Dias.setDate(hoy.getDate() - 30);
              const formatearFecha = (fecha) => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, "0");
                const day = String(fecha.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
              };
              setFiltroFechaInicio(formatearFecha(hace30Dias));
              setFiltroFechaFin(formatearFecha(hoy));
            }}
            className="px-3 py-1.5 text-xs rounded-lg border transition"
            style={{
              borderColor: "#1F3A5F",
              color: "#1F3A5F",
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E8EFF7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            30 días
          </button>
          <button
            onClick={() => {
              const hoy = new Date();
              const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
              const formatearFecha = (fecha) => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, "0");
                const day = String(fecha.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
              };
              setFiltroFechaInicio(formatearFecha(primerDia));
              setFiltroFechaFin(formatearFecha(hoy));
            }}
            className="px-3 py-1.5 text-xs rounded-lg border transition"
            style={{
              borderColor: "#1F3A5F",
              color: "#1F3A5F",
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E8EFF7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Este mes
          </button>
        </div>

        {/* Custom Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              onClick={(e) => e.target.showPicker?.()}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 text-sm"
              style={{ focusRingColor: "#1F3A5F" }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              onClick={(e) => e.target.showPicker?.()}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 text-sm"
              style={{ focusRingColor: "#1F3A5F" }}
            />
          </div>
        </div>
      </div>

      {/* Análisis de Deudas - Separated Section */}
      <div className="border-t-2 pt-4" style={{ borderTopColor: "#E5E7EB" }}>
        <button
          onClick={() => setMostrarDeudas(!mostrarDeudas)}
          className="w-full rounded-lg shadow p-4 transition-all group"
          style={{
            background: mostrarDeudas
              ? "linear-gradient(135deg, #FEF5ED 0%, #FDECD6 100%)"
              : "white",
            border: mostrarDeudas ? "2px solid #F4A261" : "none",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center transition"
                style={{
                  backgroundColor: mostrarDeudas ? "#F4A261" : "#FEF5ED",
                }}
              >
                <AlertCircle
                  className="w-6 h-6"
                  style={{ color: mostrarDeudas ? "white" : "#F4A261" }}
                />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-600">Análisis de Deudas</p>
                <p className="text-lg font-bold" style={{ color: "#1F3A5F" }}>
                  {mostrarDeudas ? "Ocultar" : "Ver"} Clientes con Saldo
                  Pendiente
                </p>
              </div>
            </div>
            <ArrowRight
              className={`w-5 h-5 transition-all ${
                mostrarDeudas ? "rotate-90" : ""
              }`}
              style={{ color: "#F4A261" }}
            />
          </div>
        </button>
      </div>

      {/* Resumen de Deudas - Expandible */}
      {mostrarDeudas && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                Clientes con Deuda Pendiente
              </h2>
            </div>
            <button
              onClick={() => setMostrarDeudas(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {(() => {
            const clientesConDeuda = clientes
              .map((cliente) => {
                const documentosCliente = documentos.filter(
                  (d) => d.clienteId === cliente.id,
                );
                const deudaTotal = documentosCliente.reduce(
                  (sum, doc) =>
                    sum + (doc.saldoPendiente > 0 ? doc.saldoPendiente : 0),
                  0,
                );
                const cantidadFacturas = documentosCliente.filter(
                  (d) => d.saldoPendiente > 0,
                ).length;
                return { ...cliente, deudaTotal, cantidadFacturas };
              })
              .filter((c) => c.deudaTotal > 0)
              .sort((a, b) => b.deudaTotal - a.deudaTotal);

            const totalDeuda = clientesConDeuda.reduce(
              (sum, c) => sum + c.deudaTotal,
              0,
            );

            if (clientesConDeuda.length === 0) {
              return (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">
                    ¡Excelente trabajo!
                  </p>
                  <p className="text-gray-600">
                    No hay clientes con deuda pendiente
                  </p>
                </div>
              );
            }

            return (
              <>
                {/* Resumen Total */}
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total Deuda Pendiente
                      </p>
                      <p
                        className="text-3xl font-bold"
                        style={{ color: "#E76F51" }}
                      >
                        {formatCurrency(totalDeuda)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">
                        Clientes con deuda
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {clientesConDeuda.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de Clientes */}
                <div className="space-y-3">
                  {clientesConDeuda.map((cliente, index) => (
                    <div
                      key={cliente.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition cursor-pointer"
                      onClick={() => navigate(`/clientes?id=${cliente.id}`)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-600 font-bold text-sm">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {cliente.nombre}
                          </p>
                          <p className="text-sm text-gray-600">
                            {cliente.empresa} • {cliente.cantidadFacturas}{" "}
                            factura{cliente.cantidadFacturas !== 1 && "s"}{" "}
                            pendiente{cliente.cantidadFacturas !== 1 && "s"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p
                          className="text-lg font-bold"
                          style={{ color: "#E76F51" }}
                        >
                          {formatCurrency(cliente.deudaTotal)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 justify-end mt-1">
                          <span>Ver detalles</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Porcentajes visuales */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Distribución de deuda
                  </p>
                  <div className="space-y-2">
                    {clientesConDeuda.slice(0, 5).map((cliente) => {
                      const porcentaje =
                        (cliente.deudaTotal / totalDeuda) * 100;
                      return (
                        <div
                          key={cliente.id}
                          className="flex items-center gap-3"
                        >
                          <div className="w-32 text-sm text-gray-600 truncate">
                            {cliente.nombre}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full transition-all"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                          <div className="w-16 text-sm font-semibold text-gray-900 text-right">
                            {porcentaje.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Resumen por Forma de Pago */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Formas de Pago
          </h2>
          <button
            onClick={() => navigate("/pagos")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            Ver todos los pagos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Total del Período:</span>
            <span className="text-xl font-bold" style={{ color: "#1F3A5F" }}>
              {formatCurrency(totalPeriodo)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
            <span>
              {pagosPeriodoActual.length} pago
              {pagosPeriodoActual.length !== 1 && "s"} registrado
              {pagosPeriodoActual.length !== 1 && "s"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Efectivo destacado primero */}
          {pagosPorFormaPago["Efectivo"] !== undefined && (
            <div
              className="rounded-lg p-4 border-2 shadow-md cursor-pointer hover:shadow-lg transition"
              onClick={() => navigate("/pagos")}
              style={{
                background: "linear-gradient(135deg, #e8f7f3 0%, #d4f1e9 100%)",
                borderColor: "#5FB49C",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wide mb-1"
                style={{ color: "#3d8a77" }}
              >
                💵 Efectivo
              </p>
              <p
                className="text-xl md:text-2xl font-bold"
                style={{ color: "#2d6a5a" }}
              >
                {formatCurrency(pagosPorFormaPago["Efectivo"])}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {Math.round(
                  (pagosPorFormaPago["Efectivo"] / totalPeriodo) * 100,
                )}
                % del total
              </p>
            </div>
          )}

          {/* Otras formas de pago */}
          {Object.entries(pagosPorFormaPago)
            .filter(([forma]) => forma !== "Efectivo")
            .sort((a, b) => b[1] - a[1])
            .map(([forma, total]) => (
              <div
                key={forma}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 cursor-pointer hover:shadow-md transition"
                onClick={() => navigate("/pagos")}
              >
                <p className="text-xs text-gray-600 font-medium uppercase truncate mb-1">
                  {forma}
                </p>
                <p
                  className="text-lg md:text-xl font-bold"
                  style={{ color: "#1F3A5F" }}
                >
                  {formatCurrency(total)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {Math.round((total / totalPeriodo) * 100)}% del total
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
