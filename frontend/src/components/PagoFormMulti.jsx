import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "../utils/axios";
import ConfirmModal from "./ConfirmModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function PagoFormMulti({
  clientes,
  onSave,
  onCancel,
  clienteIdPreseleccionado = null,
}) {
  const [pasoActual, setPasoActual] = useState(2);
  const [clienteId, setClienteId] = useState(clienteIdPreseleccionado || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [montoTotalPago, setMontoTotalPago] = useState("");
  const [montoInputActivo, setMontoInputActivo] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [saldoFavor, setSaldoFavor] = useState(0);
  const [usarSaldoFavor, setUsarSaldoFavor] = useState(false);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [detallesPago, setDetallesPago] = useState([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [observacion, setObservacion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showResumenModal, setShowResumenModal] = useState(false);
  const [formasColapsadas, setFormasColapsadas] = useState(new Set());
  const [validationErrors, setValidationErrors] = useState({});
  const [showBorradorRecuperacion, setShowBorradorRecuperacion] =
    useState(false);
  const [showConfirmCobrosPasados, setShowConfirmCobrosPasados] =
    useState(false);

  const formatearMonto = (valor) => {
    if (!valor) return "";
    const numero =
      typeof valor === "string"
        ? parseFloat(valor.replace(/[^0-9,-]/g, "").replace(",", "."))
        : valor;
    if (isNaN(numero)) return "";
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
  };

  useEffect(() => {
    const borrador = localStorage.getItem("pagoFormMultiBorrador");
    if (borrador) {
      try {
        const datos = JSON.parse(borrador);
        // Solo mostrar si hay datos significativos guardados
        if (
          datos.clienteId ||
          datos.montoTotalPago ||
          datos.facturasSeleccionadas?.length > 0 ||
          datos.detallesPago?.length > 0
        ) {
          setShowBorradorRecuperacion(true);
        } else {
          // Si no hay datos significativos, limpiar el borrador
          localStorage.removeItem("pagoFormMultiBorrador");
        }
      } catch (e) {
        localStorage.removeItem("pagoFormMultiBorrador");
      }
    }
  }, []);

  useEffect(() => {
    // Solo guardar borrador si hay datos significativos
    if (
      pasoActual > 1 &&
      (montoTotalPago ||
        facturasSeleccionadas.length > 0 ||
        detallesPago.length > 0)
    ) {
      const borrador = {
        clienteId,
        searchTerm,
        montoTotalPago,
        facturasSeleccionadas,
        detallesPago,
        fecha,
        observacion,
        usarSaldoFavor,
        pasoActual,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("pagoFormMultiBorrador", JSON.stringify(borrador));
    }
  }, [
    clienteId,
    montoTotalPago,
    facturasSeleccionadas,
    detallesPago,
    fecha,
    observacion,
    usarSaldoFavor,
    pasoActual,
  ]);

  const recuperarBorrador = () => {
    const borrador = localStorage.getItem("pagoFormMultiBorrador");
    if (borrador) {
      const datos = JSON.parse(borrador);
      setClienteId(datos.clienteId || "");
      setSearchTerm(datos.searchTerm || "");
      setMontoTotalPago(datos.montoTotalPago || "");
      setFacturasSeleccionadas(datos.facturasSeleccionadas || []);
      setDetallesPago(datos.detallesPago || []);
      setFecha(datos.fecha || new Date().toISOString().split("T")[0]);
      setObservacion(datos.observacion || "");
      setUsarSaldoFavor(datos.usarSaldoFavor || false);
      setPasoActual(datos.pasoActual || 1);
      setShowBorradorRecuperacion(false);
    }
  };

  const descartarBorrador = () => {
    localStorage.removeItem("pagoFormMultiBorrador");
    setShowBorradorRecuperacion(false);
  };

  const limpiarBorrador = () => {
    localStorage.removeItem("pagoFormMultiBorrador");
  };

  useEffect(() => {
    if (clienteIdPreseleccionado && clientes.length > 0) {
      const cliente = clientes.find((c) => c.id === clienteIdPreseleccionado);
      if (cliente) {
        setSearchTerm(`${cliente.nombre} - ${cliente.empresa}`);
      }
    }
  }, [clienteIdPreseleccionado, clientes]);

  useEffect(() => {
    if (clienteId) {
      fetchDocumentos(clienteId);
      fetchSaldoFavor(clienteId);
    } else {
      setDocumentos([]);
      setSaldoFavor(0);
      setFacturasSeleccionadas([]);
    }
  }, [clienteId]);

  const fetchDocumentos = async (clienteId) => {
    try {
      const response = await axios.get(
        `${API_URL}/documentos/cliente/${clienteId}`,
      );
      const documentosConDeuda = (response.data.data || []).filter(
        (doc) => doc.saldoPendiente > 0,
      );
      // Ordenar por fecha de más vieja a más nueva
      documentosConDeuda.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setDocumentos(documentosConDeuda);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      setDocumentos([]);
    }
  };

  const fetchSaldoFavor = async (clienteId) => {
    try {
      const response = await axios.get(
        `${API_URL}/documentos/cliente/${clienteId}/saldo-favor`,
      );
      setSaldoFavor(response.data.data.saldoFavorTotal || 0);
    } catch (error) {
      console.error("Error al cargar saldo a favor:", error);
      setSaldoFavor(0);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (!e.target.value.trim()) {
      setClienteId("");
    }
  };

  const handleSelectCliente = (cliente) => {
    setClienteId(cliente.id);
    setSearchTerm(`${cliente.nombre} - ${cliente.empresa}`);
    setShowDropdown(false);
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.empresa.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleFacturaSeleccionada = (facturaId) => {
    setFacturasSeleccionadas((prev) => {
      if (prev.includes(facturaId)) {
        return prev.filter((id) => id !== facturaId);
      } else {
        return [...prev, facturaId];
      }
    });
  };

  const calcularTotalFacturasSeleccionadas = () => {
    return facturasSeleccionadas.reduce((total, facturaId) => {
      const factura = documentos.find((doc) => doc.id === facturaId);
      return total + (factura?.saldoPendiente || 0);
    }, 0);
  };

  const validarForma = (forma) => {
    const errors = [];
    if (!forma.monto || parseFloat(forma.monto) <= 0)
      errors.push("El monto es requerido");
    const montoNum = parseFloat(forma.monto) || 0;
    const montoTotal = parseFloat(montoTotalPago) || 0;
    if (montoNum > montoTotal * 2) errors.push("Monto sospechosamente alto");
    if (forma.formaPago === "Cheque" || forma.formaPago === "E-Cheq") {
      if (!forma.numeroCheque?.trim())
        errors.push("Número de cheque requerido");
      else {
        const duplicados = detallesPago.filter(
          (d) =>
            d.numeroCheque === forma.numeroCheque &&
            (d.formaPago === "Cheque" || d.formaPago === "E-Cheq"),
        );
        if (duplicados.length > 1) errors.push("Número de cheque duplicado");
      }
      if (!forma.fechaCobro) errors.push("Fecha de cobro requerida");
      if (!forma.banco?.trim()) errors.push("Banco requerido");
    }
    if (forma.formaPago === "Transferencia" || forma.formaPago === "Deposito") {
      if (!forma.banco?.trim()) errors.push("Banco requerido");
      if (!forma.fecha) errors.push("Fecha requerida");
    }
    return errors;
  };

  const validarTodasLasFormas = () => {
    const nuevosErrores = {};
    detallesPago.forEach((forma, index) => {
      const errores = validarForma(forma);
      if (errores.length > 0) nuevosErrores[index] = errores;
    });
    setValidationErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const agregarDetallePago = () => {
    if (detallesPago.length > 0) {
      const ultimaForma = detallesPago[0];
      const errores = validarForma(ultimaForma);
      if (errores.length > 0) {
        toast.error(
          "Por favor, completa todos los campos de la forma de pago actual antes de agregar una nueva",
          {
            duration: 4000,
            icon: "⚠️",
          },
        );
        return;
      }
    }
    const totalYaPagado = calcularTotalPagos();
    const montoSaldoFavorAplicar = usarSaldoFavor ? saldoFavor : 0;
    const montoTotal = parseFloat(montoTotalPago) || 0;
    const saldoRestante = Math.max(
      0,
      montoTotal - totalYaPagado - montoSaldoFavorAplicar,
    );

    setDetallesPago([
      {
        formaPago: "Efectivo",
        monto: saldoRestante > 0 ? saldoRestante.toString() : "",
        numeroCheque: "",
        fechaCobro: "",
        banco: "",
        fecha: new Date().toISOString().split("T")[0],
      },
      ...detallesPago,
    ]);
  };

  const eliminarDetallePago = (index) => {
    setDetallesPago(detallesPago.filter((_, i) => i !== index));
    const nuevasColapsadas = new Set(formasColapsadas);
    nuevasColapsadas.delete(index);
    const ajustadas = new Set();
    nuevasColapsadas.forEach((i) => {
      if (i > index) ajustadas.add(i - 1);
      else ajustadas.add(i);
    });
    setFormasColapsadas(ajustadas);
    const nuevosErrores = { ...validationErrors };
    delete nuevosErrores[index];
    const ajustadosErrores = {};
    Object.keys(nuevosErrores).forEach((k) => {
      const idx = parseInt(k);
      if (idx > index) ajustadosErrores[idx - 1] = nuevosErrores[k];
      else ajustadosErrores[k] = nuevosErrores[k];
    });
    setValidationErrors(ajustadosErrores);
  };

  const duplicarDetallePago = (index) => {
    const formaDuplicar = detallesPago[index];
    const nuevaForma = { ...formaDuplicar, numeroCheque: "", monto: "" };
    const nuevosDetalles = [...detallesPago];
    nuevosDetalles.splice(index + 1, 0, nuevaForma);
    setDetallesPago(nuevosDetalles);
  };

  const toggleColapsar = (index) => {
    const nuevas = new Set(formasColapsadas);
    if (nuevas.has(index)) nuevas.delete(index);
    else nuevas.add(index);
    setFormasColapsadas(nuevas);
  };

  const handleDetalleChange = (index, field, value) => {
    const nuevosDetalles = [...detallesPago];
    if (field === "monto") {
      nuevosDetalles[index][field] = value;
    } else {
      nuevosDetalles[index][field] = value;
    }
    setDetallesPago(nuevosDetalles);
    setTimeout(() => {
      const errores = validarForma(nuevosDetalles[index]);
      const nuevosErrores = { ...validationErrors };
      if (errores.length > 0) nuevosErrores[index] = errores;
      else delete nuevosErrores[index];
      setValidationErrors(nuevosErrores);
    }, 300);
  };

  const calcularTotalPagos = () => {
    const total = detallesPago.reduce((sum, detalle) => {
      const monto = parseFloat(detalle.monto) || 0;
      return sum + monto;
    }, 0);
    return Math.round(total * 100) / 100;
  };

  const calcularTotalConSaldoFavor = () => {
    const totalPagos = calcularTotalPagos();
    const montoSaldoFavor = usarSaldoFavor ? saldoFavor : 0;
    return Math.round((totalPagos + montoSaldoFavor) * 100) / 100;
  };

  const irPaso3 = () => {
    if (facturasSeleccionadas.length === 0) {
      toast.error("Debes seleccionar al menos una factura", {
        duration: 3000,
        icon: "📋",
      });
      return;
    }

    const montoTotal = parseFloat(montoTotalPago) || 0;
    const montoSaldoFavorAplicar = usarSaldoFavor ? saldoFavor : 0;
    const montoAPagar = Math.max(0, montoTotal - montoSaldoFavorAplicar);

    if (detallesPago.length === 0) {
      setDetallesPago([
        {
          formaPago: "Efectivo",
          monto: montoAPagar.toString(),
          numeroCheque: "",
          fechaCobro: "",
          banco: "",
          fecha: new Date().toISOString().split("T")[0],
        },
      ]);
    }

    setPasoActual(3);
  };

  const volverPaso = (paso) => {
    setPasoActual(paso);
  };

  const abrirResumenModal = () => {
    const montoTotal = parseFloat(montoTotalPago) || 0;
    const totalConSaldoFavor = calcularTotalConSaldoFavor();
    if (Math.abs(totalConSaldoFavor - montoTotal) > 0.01) {
      toast.error(
        "Los montos no coinciden. Verifica que el total de las formas de pago sea igual al monto ingresado",
        {
          duration: 4000,
          icon: "💰",
        },
      );
      return;
    }
    if (!validarTodasLasFormas()) {
      toast.error(
        "Revisa los campos marcados en rojo. Todos los datos son necesarios para continuar",
        {
          duration: 4000,
          icon: "📝",
        },
      );
      return;
    }
    setShowResumenModal(true);
  };

  const handleSubmit = async () => {
    setShowResumenModal(false);
    const montoTotal = parseFloat(montoTotalPago) || 0;
    const totalConSaldoFavor = calcularTotalConSaldoFavor();

    if (Math.abs(totalConSaldoFavor - montoTotal) > 0.01) {
      alert(
        "El total de las formas de pago debe coincidir con el monto total ingresado",
      );
      return;
    }

    // Verificar si hay fechas de cobro pasadas
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const tieneCobrosPasados = detallesPago.some((detalle) => {
      if (
        (detalle.formaPago === "Cheque" || detalle.formaPago === "E-Cheq") &&
        detalle.fechaCobro
      ) {
        const fechaCobro = new Date(detalle.fechaCobro);
        return fechaCobro < hoy;
      }
      return false;
    });

    if (tieneCobrosPasados) {
      setShowConfirmCobrosPasados(true);
      return;
    }

    await procesarPago();
  };

  const procesarPago = async () => {
    try {
      const detallesFinales = [];
      const saldosTemporales = new Map();

      facturasSeleccionadas.forEach((facturaId) => {
        const factura = documentos.find((d) => d.id === facturaId);
        if (factura) {
          saldosTemporales.set(facturaId, factura.saldoPendiente);
        }
      });

      const facturasOrdenadas = facturasSeleccionadas
        .map((id) => documentos.find((d) => d.id === id))
        .filter((f) => f);

      for (const detalle of detallesPago) {
        let montoRestanteDetalle = parseFloat(detalle.monto) || 0;

        for (const factura of facturasOrdenadas) {
          if (montoRestanteDetalle <= 0) break;

          const saldoActual = saldosTemporales.get(factura.id);
          if (saldoActual <= 0) continue;

          const montoAAplicar = Math.min(saldoActual, montoRestanteDetalle);

          if (montoAAplicar > 0) {
            detallesFinales.push({
              ...detalle,
              documentoId: factura.id,
              monto: Math.round(montoAAplicar * 100) / 100,
            });

            saldosTemporales.set(
              factura.id,
              Math.round((saldoActual - montoAAplicar) * 100) / 100,
            );
            montoRestanteDetalle =
              Math.round((montoRestanteDetalle - montoAAplicar) * 100) / 100;
          }
        }
      }

      if (usarSaldoFavor && saldoFavor > 0) {
        detallesFinales.push({
          formaPago: "Saldo a Favor",
          monto: saldoFavor,
          fecha: new Date().toISOString().split("T")[0],
        });
      }

      const montoTotalDetalles = detallesFinales
        .filter((d) => d.formaPago !== "Saldo a Favor")
        .reduce((sum, d) => sum + (d.monto || 0), 0);

      const datosPago = {
        clienteId,
        documentoId: facturasSeleccionadas[0] || null,
        monto: Math.round(montoTotalDetalles * 100) / 100,
        fecha,
        descripcion: observacion,
        detallesPago: detallesFinales,
      };

      setIsSubmitting(true);
      limpiarBorrador();
      await onSave(datosPago);
    } catch (error) {
      console.error("Error al guardar pagos:", error);
      toast.error("Error al guardar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Nuevo Pago</h2>

      {/* Indicador de pasos */}
      <div className="mb-6 flex items-center justify-center gap-2 md:gap-4">
        <div
          className={`flex items-center gap-1 md:gap-2 ${pasoActual >= 1 ? "font-semibold" : "text-gray-400"}`}
          style={{ color: pasoActual >= 1 ? "#1F3A5F" : undefined }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{
              backgroundColor: pasoActual >= 1 ? "#1F3A5F" : "#d1d5db",
              color: pasoActual >= 1 ? "white" : "#4b5563",
            }}
          >
            1
          </div>
          <span className="text-xs md:text-base">Monto</span>
        </div>
        <div className="w-8 md:w-12 h-1 bg-gray-300"></div>
        <div
          className={`flex items-center gap-1 md:gap-2 ${pasoActual >= 2 ? "font-semibold" : "text-gray-400"}`}
          style={{ color: pasoActual >= 2 ? "#1F3A5F" : undefined }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{
              backgroundColor: pasoActual >= 2 ? "#1F3A5F" : "#d1d5db",
              color: pasoActual >= 2 ? "white" : "#4b5563",
            }}
          >
            2
          </div>
          <span className="text-xs md:text-base">Selección</span>
        </div>
        <div className="w-8 md:w-12 h-1 bg-gray-300"></div>
        <div
          className={`flex items-center gap-1 md:gap-2 ${pasoActual >= 3 ? "font-semibold" : "text-gray-400"}`}
          style={{ color: pasoActual >= 3 ? "#1F3A5F" : undefined }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{
              backgroundColor: pasoActual >= 3 ? "#1F3A5F" : "#d1d5db",
              color: pasoActual >= 3 ? "white" : "#4b5563",
            }}
          >
            2
          </div>
          <span className="text-xs md:text-base">Pago</span>
        </div>
      </div>

      {showBorradorRecuperacion && (
        <div
          className="mb-4 p-4 rounded-lg"
          style={{
            backgroundColor: "#FEF3C7",
            borderLeft: "4px solid #F59E0B",
            color: "#92400E",
          }}
        >
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold mb-2">Tienes un pago sin guardar</p>
              <p className="text-sm mb-3">
                Recupera el borrador guardado automáticamente
              </p>
              <div className="flex gap-2">
                <button
                  onClick={recuperarBorrador}
                  className="px-3 py-1.5 text-white rounded text-sm font-medium transition"
                  style={{ backgroundColor: "#F59E0B" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#D97706")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#F59E0B")
                  }
                >
                  Recuperar
                </button>
                <button
                  onClick={descartarBorrador}
                  className="px-3 py-1.5 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm font-medium"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASO 1 (ahora 2 en el código): Seleccionar Facturas */}
      {pasoActual === 2 && (
        <div className="space-y-6">
          {/* Selector de Cliente - Solo si no viene preseleccionado */}
          {!clienteIdPreseleccionado && (
            <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cliente
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar cliente por nombre o empresa..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showDropdown && clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.id}
                        onClick={() => handleSelectCliente(cliente)}
                        className="px-4 py-3 cursor-pointer border-b last:border-b-0 transition hover:opacity-80"
                        style={{ backgroundColor: "#ffffff" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#E8EFF7")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#ffffff")
                        }
                      >
                        <div className="font-medium text-gray-900">
                          {cliente.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cliente.empresa}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {clienteId && (
                <div
                  className="mt-2 text-sm font-medium"
                  style={{ color: "#5FB49C" }}
                >
                  ✓ Cliente seleccionado
                </div>
              )}
            </div>
          )}

          {/* Campo de Monto Total que Paga el Cliente */}
          <div
            className="rounded-xl p-6 shadow-sm"
            style={{
              background: "linear-gradient(to right, #E8EFF7, #F5F8FA)",
              border: "2px solid #1F3A5F",
            }}
          >
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              💰 Monto Total que Paga el Cliente
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold"
                    style={{ color: "#1F3A5F" }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    value={
                      montoInputActivo === "total"
                        ? montoTotalPago
                        : formatearMonto(montoTotalPago)
                    }
                    onChange={(e) => {
                      const valor = e.target.value;
                      // Solo permitir números, punto y coma
                      const valorLimpio = valor.replace(/[^0-9.,]/g, "");
                      setMontoTotalPago(valorLimpio);
                    }}
                    onFocus={(e) => {
                      setMontoInputActivo("total");
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px rgba(31, 58, 95, 0.1)";
                    }}
                    onBlur={(e) => {
                      setMontoInputActivo(null);
                      e.currentTarget.style.boxShadow = "none";
                      // Normalizar el formato al perder foco
                      if (montoTotalPago) {
                        const valorNormalizado = montoTotalPago
                          .replace(/\./g, "")
                          .replace(",", ".");
                        setMontoTotalPago(valorNormalizado);
                      }
                    }}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-4 text-3xl font-bold rounded-lg focus:outline-none text-right"
                    style={{ border: "2px solid #1F3A5F", color: "#1F3A5F" }}
                  />
                </div>
              </div>
              {saldoFavor > 0 && (
                <div className="flex-shrink-0">
                  <label
                    className="flex items-center gap-2 rounded-lg px-4 py-3 cursor-pointer transition"
                    style={{
                      backgroundColor: "#E5F5F1",
                      border: "2px solid #5FB49C",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#D1EBE3")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#E5F5F1")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={usarSaldoFavor}
                      onChange={(e) => setUsarSaldoFavor(e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "#5FB49C" }}
                    />
                    <div className="text-left">
                      <div className="text-xs font-medium text-gray-600">
                        Aplicar Saldo a Favor
                      </div>
                      <div
                        className="text-lg font-bold"
                        style={{ color: "#5FB49C" }}
                      >
                        {formatearMonto(saldoFavor)}
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
            {montoTotalPago && (
              <div className="mt-3 text-sm text-gray-600">
                {usarSaldoFavor && saldoFavor > 0 ? (
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                    <span>Monto a Pagar (con saldo a favor):</span>
                    <span
                      className="font-bold text-lg"
                      style={{ color: "#1F3A5F" }}
                    >
                      {formatearMonto(
                        Math.max(0, parseFloat(montoTotalPago) - saldoFavor),
                      )}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecciona las Facturas a Pagar ({facturasSeleccionadas.length}{" "}
              seleccionadas)
            </label>
            {documentos.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documentos.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => toggleFacturaSeleccionada(doc.id)}
                    className={`p-4 rounded-lg cursor-pointer transition ${
                      facturasSeleccionadas.includes(doc.id)
                        ? ""
                        : "border-2 border-gray-200"
                    }`}
                    style={{
                      border: facturasSeleccionadas.includes(doc.id)
                        ? "2px solid #1F3A5F"
                        : undefined,
                      backgroundColor: facturasSeleccionadas.includes(doc.id)
                        ? "#E8EFF7"
                        : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={facturasSeleccionadas.includes(doc.id)}
                          onChange={() => {}}
                          className="mt-1 w-5 h-5 rounded"
                          style={{ accentColor: "#1F3A5F" }}
                        />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {doc.tipo} {doc.numero}
                          </div>
                          <div className="text-sm text-gray-600">
                            {doc.empresa}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Fecha:{" "}
                            {doc.fecha
                              ? (() => {
                                  const [year, month, day] = doc.fecha
                                    .split("T")[0]
                                    .split("-");
                                  return `${day}/${month}/${year}`;
                                })()
                              : "-"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Saldo Pendiente
                        </div>
                        <div
                          className="text-lg font-bold"
                          style={{ color: "#E76F51" }}
                        >
                          {formatearMonto(doc.saldoPendiente)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay facturas pendientes para este cliente
              </div>
            )}
          </div>

          {facturasSeleccionadas.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">
                  Total Facturas Seleccionadas:
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {formatearMonto(calcularTotalFacturasSeleccionadas())}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={irPaso3}
              disabled={
                !clienteId ||
                !montoTotalPago ||
                facturasSeleccionadas.length === 0
              }
              className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#1F3A5F" }}
              onMouseEnter={(e) =>
                !e.currentTarget.disabled &&
                (e.currentTarget.style.backgroundColor = "#3E6BA8")
              }
              onMouseLeave={(e) =>
                !e.currentTarget.disabled &&
                (e.currentTarget.style.backgroundColor = "#1F3A5F")
              }
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {pasoActual === 3 && (
        <div className="pb-32">
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              background: "linear-gradient(to right, #E5F5F1, #E8EFF7)",
              border: "2px solid #5FB49C",
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Progreso del Desglose
              </span>
              <span className="text-sm font-bold" style={{ color: "#5FB49C" }}>
                {formatearMonto(calcularTotalPagos())} /{" "}
                {formatearMonto(montoTotalPago)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  background: "linear-gradient(to right, #5FB49C, #1F3A5F)",
                  width: `${Math.min(
                    100,
                    (calcularTotalPagos() / parseFloat(montoTotalPago || 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>
            {calcularTotalPagos() < parseFloat(montoTotalPago) && (
              <p className="text-xs text-gray-600 mt-1">
                Faltan{" "}
                {formatearMonto(
                  parseFloat(montoTotalPago) - calcularTotalPagos(),
                )}{" "}
                por desglosar
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Facturas Seleccionadas */}
            <div>
              <div
                className="rounded-lg p-4 sticky top-4"
                style={{
                  backgroundColor: "#E8EFF7",
                  border: "2px solid #1F3A5F",
                }}
              >
                <h3
                  className="font-bold text-lg mb-3"
                  style={{ color: "#1F3A5F" }}
                >
                  📋 Facturas a Pagar
                </h3>

                {facturasSeleccionadas.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                    {facturasSeleccionadas.map((facturaId) => {
                      const factura = documentos.find(
                        (d) => d.id === facturaId,
                      );
                      return (
                        <div
                          key={facturaId}
                          className="p-3 bg-white rounded-lg"
                          style={{ border: "2px solid #1F3A5F" }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {factura?.tipo} {factura?.numero}
                              </div>
                              <div className="text-sm text-gray-600">
                                {factura?.empresa}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-600">
                                {formatearMonto(factura?.saldoPendiente)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No hay facturas seleccionadas
                  </p>
                )}

                <div className="pt-4 border-t-2 border-blue-300">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700">
                      Total a Pagar:
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatearMonto(montoTotalPago)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => volverPaso(2)}
                  className="w-full mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
                >
                  ← Cambiar Facturas
                </button>
              </div>
            </div>

            {/* Columna Derecha: Formas de Pago */}
            <div>
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: "#E5F5F1",
                  border: "2px solid #5FB49C",
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3
                    className="font-bold text-lg"
                    style={{ color: "#5FB49C" }}
                  >
                    💳 Formas de Pago
                  </h3>
                  <button
                    type="button"
                    onClick={agregarDetallePago}
                    className="text-white px-4 py-2 rounded-lg font-semibold transition"
                    style={{ backgroundColor: "#5FB49C" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#4da08a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#5FB49C")
                    }
                  >
                    + Agregar
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {detallesPago.map((detalle, index) => {
                    const isColapsado = formasColapsadas.has(index);
                    const isCompleto =
                      detalle.monto &&
                      parseFloat(detalle.monto) > 0 &&
                      ((detalle.formaPago !== "Cheque" &&
                        detalle.formaPago !== "E-Cheq") ||
                        (detalle.numeroCheque &&
                          detalle.fechaCobro &&
                          detalle.banco)) &&
                      ((detalle.formaPago !== "Transferencia" &&
                        detalle.formaPago !== "Deposito") ||
                        (detalle.banco && detalle.fecha));
                    const hayErrores = validationErrors[index];

                    if (isColapsado && isCompleto) {
                      return (
                        <div
                          key={index}
                          className="p-3 rounded-lg flex items-center justify-between gap-3"
                          style={{
                            border: "2px solid #5FB49C",
                            backgroundColor: "#E5F5F1",
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg
                              className="w-5 h-5 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              style={{ color: "#5FB49C" }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="font-semibold text-gray-900 truncate">
                              {detalle.formaPago}
                              {detalle.numeroCheque &&
                                ` #${detalle.numeroCheque}`}
                              {detalle.banco && ` - ${detalle.banco}`}
                            </span>
                            <span
                              className="text-lg font-bold flex-shrink-0"
                              style={{ color: "#5FB49C" }}
                            >
                              {formatearMonto(detalle.monto)}
                            </span>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleColapsar(index)}
                              className="px-3 py-1.5 text-sm rounded-md transition font-medium"
                              style={{
                                backgroundColor: "#E8EFF7",
                                color: "#1F3A5F",
                                border: "1px solid #1F3A5F",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#D1DFE8")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#E8EFF7")
                              }
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicarDetallePago(index)}
                              className="p-1.5 rounded-md transition"
                              style={{
                                backgroundColor: "#E8EFF7",
                                color: "#1F3A5F",
                                border: "1px solid #1F3A5F",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#D1DFE8")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#E8EFF7")
                              }
                              title="Duplicar forma de pago"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarDetallePago(index)}
                              className="p-1.5 rounded-md transition"
                              style={{
                                backgroundColor: "#FEF2F0",
                                color: "#E76F51",
                                border: "1px solid #E76F51",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FDD8CE";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FEF2F0";
                              }}
                              title="Eliminar"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className="p-4 border-2 rounded-lg"
                        style={{
                          borderColor: hayErrores ? "#E76F51" : "#d1d5db",
                          backgroundColor: hayErrores ? "#FEF2F0" : "#f9fafb",
                        }}
                      >
                        {isCompleto && (
                          <div className="flex justify-end mb-2">
                            <button
                              type="button"
                              onClick={() => toggleColapsar(index)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md transition border border-gray-300 font-medium flex items-center gap-1"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Minimizar
                            </button>
                          </div>
                        )}

                        {hayErrores && (
                          <div
                            className="mb-3 p-2 rounded text-xs"
                            style={{
                              backgroundColor: "#FEF2F0",
                              border: "1px solid #E76F51",
                              color: "#E76F51",
                            }}
                          >
                            <ul className="list-disc list-inside">
                              {hayErrores.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-2 items-start mb-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Forma de Pago
                            </label>
                            <select
                              value={detalle.formaPago}
                              onChange={(e) =>
                                handleDetalleChange(
                                  index,
                                  "formaPago",
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Efectivo">Efectivo</option>
                              <option value="Transferencia">
                                Transferencia
                              </option>
                              <option value="Deposito">Depósito</option>
                              <option value="Cheque">Cheque</option>
                              <option value="E-Cheq">E-Cheq</option>
                              <option value="Ret Ganancias">
                                Ret Ganancias
                              </option>
                              <option value="Ret IIBB">Ret IIBB</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            {detallesPago.length > 1 && (
                              <button
                                type="button"
                                onClick={() => eliminarDetallePago(index)}
                                className="px-3 py-2 rounded-lg transition mt-5 font-medium flex items-center gap-1.5"
                                style={{
                                  backgroundColor: "#FEF2F0",
                                  color: "#E76F51",
                                  border: "1px solid #E76F51",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#FDD8CE")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#FEF2F0")
                                }
                                title="Eliminar forma de pago"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Eliminar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => duplicarDetallePago(index)}
                              className="px-3 py-2 rounded-lg transition mt-5 font-medium flex items-center gap-1.5"
                              style={{
                                backgroundColor: "#E8EFF7",
                                color: "#1F3A5F",
                                border: "1px solid #1F3A5F",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#D1E0F5")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#E8EFF7")
                              }
                              title="Duplicar forma de pago con los mismos datos"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                              </svg>
                              Duplicar
                            </button>
                          </div>
                        </div>

                        {/* Campos específicos para Cheque */}
                        {(detalle.formaPago === "Cheque" ||
                          detalle.formaPago === "E-Cheq") && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Número de Cheque
                              </label>
                              <input
                                type="text"
                                value={detalle.numeroCheque || ""}
                                onChange={(e) =>
                                  handleDetalleChange(
                                    index,
                                    "numeroCheque",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Número"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Fecha de Cobro
                                <span
                                  className="ml-1 text-gray-500"
                                  title="Puedes seleccionar fechas pasadas para registrar pagos históricos"
                                >
                                  💡
                                </span>
                              </label>
                              <input
                                type="date"
                                value={detalle.fechaCobro || ""}
                                onChange={(e) =>
                                  handleDetalleChange(
                                    index,
                                    "fechaCobro",
                                    e.target.value,
                                  )
                                }
                                onClick={(e) => e.target.showPicker?.()}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Puedes seleccionar fechas pasadas para pagos históricos"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Banco
                              </label>
                              <input
                                type="text"
                                value={detalle.banco || ""}
                                onChange={(e) =>
                                  handleDetalleChange(
                                    index,
                                    "banco",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Banco"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Monto
                              </label>
                              <input
                                type="text"
                                value={
                                  montoInputActivo === `${index}-monto`
                                    ? detalle.monto
                                    : formatearMonto(detalle.monto)
                                }
                                onFocus={() =>
                                  setMontoInputActivo(`${index}-monto`)
                                }
                                onChange={(e) => {
                                  const valor = e.target.value;
                                  const valorLimpio = valor.replace(
                                    /[^0-9.,]/g,
                                    "",
                                  );
                                  handleDetalleChange(
                                    index,
                                    "monto",
                                    valorLimpio,
                                  );
                                }}
                                onBlur={() => {
                                  setMontoInputActivo(null);
                                  if (detalle.monto) {
                                    const valorNormalizado = detalle.monto
                                      .replace(/\./g, "")
                                      .replace(",", ".");
                                    handleDetalleChange(
                                      index,
                                      "monto",
                                      valorNormalizado,
                                    );
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        )}

                        {/* Campos específicos para Transferencia */}
                        {detalle.formaPago === "Transferencia" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Fecha
                              </label>
                              <input
                                type="date"
                                value={detalle.fecha || ""}
                                onChange={(e) =>
                                  handleDetalleChange(
                                    index,
                                    "fecha",
                                    e.target.value,
                                  )
                                }
                                onClick={(e) => e.target.showPicker?.()}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Banco
                              </label>
                              <input
                                type="text"
                                value={detalle.banco || ""}
                                onChange={(e) =>
                                  handleDetalleChange(
                                    index,
                                    "banco",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Banco"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Monto
                              </label>
                              <input
                                type="text"
                                value={
                                  montoInputActivo === `${index}-monto`
                                    ? detalle.monto
                                    : formatearMonto(detalle.monto)
                                }
                                onFocus={() =>
                                  setMontoInputActivo(`${index}-monto`)
                                }
                                onChange={(e) => {
                                  const valor = e.target.value;
                                  const valorLimpio = valor.replace(
                                    /[^0-9.,]/g,
                                    "",
                                  );
                                  handleDetalleChange(
                                    index,
                                    "monto",
                                    valorLimpio,
                                  );
                                }}
                                onBlur={() => {
                                  setMontoInputActivo(null);
                                  if (detalle.monto) {
                                    const valorNormalizado = detalle.monto
                                      .replace(/\./g, "")
                                      .replace(",", ".");
                                    handleDetalleChange(
                                      index,
                                      "monto",
                                      valorNormalizado,
                                    );
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        )}

                        {/* Campos específicos para Depósito */}
                        {detalle.formaPago === "Deposito" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Fecha
                              </label>
                              <input
                                type="date"
                                value={detalle.fecha || ""}
                                onChange={(e) =>
                                  handleDetalleChange(
                                    index,
                                    "fecha",
                                    e.target.value,
                                  )
                                }
                                onClick={(e) => e.target.showPicker?.()}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Banco
                              </label>
                              <input
                                type="text"
                                value={detalle.banco || ""}
                                onChange={(e) =>
                                  handleDetalleChange(
                                    index,
                                    "banco",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Banco"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Monto
                              </label>
                              <input
                                type="text"
                                value={
                                  montoInputActivo === `${index}-monto`
                                    ? detalle.monto
                                    : formatearMonto(detalle.monto)
                                }
                                onFocus={() =>
                                  setMontoInputActivo(`${index}-monto`)
                                }
                                onChange={(e) => {
                                  const valor = e.target.value;
                                  const valorLimpio = valor.replace(
                                    /[^0-9.,]/g,
                                    "",
                                  );
                                  handleDetalleChange(
                                    index,
                                    "monto",
                                    valorLimpio,
                                  );
                                }}
                                onBlur={() => {
                                  setMontoInputActivo(null);
                                  if (detalle.monto) {
                                    const valorNormalizado = detalle.monto
                                      .replace(/\./g, "")
                                      .replace(",", ".");
                                    handleDetalleChange(
                                      index,
                                      "monto",
                                      valorNormalizado,
                                    );
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        )}

                        {/* Campos para otras formas de pago (solo monto) */}

                        {/* Campos para otras formas de pago (solo monto) */}
                        {![
                          "Cheque",
                          "E-Cheq",
                          "Transferencia",
                          "Deposito",
                        ].includes(detalle.formaPago) && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Monto
                            </label>
                            <input
                              type="text"
                              value={
                                montoInputActivo === `${index}-monto`
                                  ? detalle.monto
                                  : formatearMonto(detalle.monto)
                              }
                              onFocus={() =>
                                setMontoInputActivo(`${index}-monto`)
                              }
                              onChange={(e) => {
                                const valor = e.target.value;
                                const valorLimpio = valor.replace(
                                  /[^0-9.,]/g,
                                  "",
                                );
                                handleDetalleChange(
                                  index,
                                  "monto",
                                  valorLimpio,
                                );
                              }}
                              onBlur={() => {
                                setMontoInputActivo(null);
                                if (detalle.monto) {
                                  const valorNormalizado = detalle.monto
                                    .replace(/\./g, "")
                                    .replace(",", ".");
                                  handleDetalleChange(
                                    index,
                                    "monto",
                                    valorNormalizado,
                                  );
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0,00"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {detallesPago.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      Click "+ Agregar" para comenzar
                    </p>
                  )}
                </div>

                {/* Total de formas de pago */}
                {detallesPago.length > 0 && (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: "2px solid #5FB49C" }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-700">
                        Total Formas:
                      </span>
                      <span
                        className="text-2xl font-bold"
                        style={{ color: "#5FB49C" }}
                      >
                        {formatearMonto(calcularTotalPagos())}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Indicador de coincidencia */}
          {facturasSeleccionadas.length > 0 && detallesPago.length > 0 && (
            <div
              className="rounded-lg p-4 mt-6"
              style={{
                backgroundColor:
                  Math.abs(
                    calcularTotalConSaldoFavor() -
                      parseFloat(montoTotalPago || 0),
                  ) <= 0.01
                    ? "#E5F5F1"
                    : "#FEF2F0",
                border: `2px solid ${Math.abs(calcularTotalConSaldoFavor() - parseFloat(montoTotalPago || 0)) <= 0.01 ? "#5FB49C" : "#E76F51"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {Math.abs(
                    calcularTotalConSaldoFavor() -
                      parseFloat(montoTotalPago || 0),
                  ) <= 0.01 ? (
                    <>
                      <svg
                        className="w-8 h-8"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        style={{ color: "#5FB49C" }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span
                        className="font-bold text-lg"
                        style={{ color: "#5FB49C" }}
                      >
                        ¡Perfecto! Los montos coinciden
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-8 h-8"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        style={{ color: "#E76F51" }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <span
                          className="font-bold text-lg block"
                          style={{ color: "#E76F51" }}
                        >
                          Los montos no coinciden
                        </span>
                        <span className="text-sm" style={{ color: "#E76F51" }}>
                          Diferencia:{" "}
                          {formatearMonto(
                            Math.abs(
                              calcularTotalConSaldoFavor() -
                                parseFloat(montoTotalPago || 0),
                            ),
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Observación y fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {/* Barra flotante se renderiza más abajo */}

          <div
            className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-50"
            style={{ borderTop: "4px solid #1F3A5F" }}
          >
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Total a pagar</p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "#1F3A5F" }}
                  >
                    {formatearMonto(montoTotalPago)}
                  </p>
                </div>
                {Math.abs(
                  calcularTotalConSaldoFavor() -
                    parseFloat(montoTotalPago || 0),
                ) <= 0.01 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-semibold">Listo</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={abrirResumenModal}
                  disabled={
                    isSubmitting ||
                    Math.abs(
                      calcularTotalConSaldoFavor() -
                        parseFloat(montoTotalPago || 0),
                    ) > 0.01
                  }
                  className="px-6 py-3 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  style={{
                    backgroundColor: isSubmitting ? "#6B7280" : "#5FB49C",
                  }}
                  onMouseEnter={(e) =>
                    !e.currentTarget.disabled &&
                    !isSubmitting &&
                    (e.currentTarget.style.backgroundColor = "#4da08a")
                  }
                  onMouseLeave={(e) =>
                    !e.currentTarget.disabled &&
                    !isSubmitting &&
                    (e.currentTarget.style.backgroundColor = "#5FB49C")
                  }
                >
                  Revisar y Guardar →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResumenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div
              className="sticky top-0 text-white p-6 rounded-t-xl z-10"
              style={{
                background: "linear-gradient(to right, #1F3A5F, #3E6BA8)",
              }}
            >
              <h3 className="text-2xl font-bold">Resumen del Pago</h3>
              <p
                className="text-sm mt-1"
                style={{ color: "rgba(255, 255, 255, 0.8)" }}
              >
                Revisa la información antes de confirmar
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Cliente
                </h4>
                <p className="text-gray-800 font-medium">
                  {clientes.find((c) => c.id === clienteId)?.nombre || "N/A"}
                </p>
                <p className="text-sm text-gray-600">
                  {clientes.find((c) => c.id === clienteId)?.empresa || ""}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Facturas Seleccionadas ({facturasSeleccionadas.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {facturasSeleccionadas.map((facturaId) => {
                    const factura = documentos.find((d) => d.id === facturaId);
                    return (
                      <div
                        key={facturaId}
                        className="flex justify-between items-center py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {factura?.tipo} {factura?.numero}
                          </p>
                          <p className="text-xs text-gray-600">
                            {factura?.empresa}
                          </p>
                        </div>
                        <span
                          className="font-bold"
                          style={{ color: "#1F3A5F" }}
                        >
                          {formatearMonto(factura?.saldoPendiente)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path
                      fillRule="evenodd"
                      d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Formas de Pago
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {detallesPago.map((detalle, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded p-3 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-900">
                          {detalle.formaPago}
                        </span>
                        <span className="font-bold text-lg text-blue-600">
                          {formatearMonto(detalle.monto)}
                        </span>
                      </div>
                      {detalle.numeroCheque && (
                        <p className="text-xs text-gray-600">
                          Nro: {detalle.numeroCheque}
                        </p>
                      )}
                      {detalle.banco && (
                        <p className="text-xs text-gray-600">
                          Banco: {detalle.banco}
                        </p>
                      )}
                      {detalle.fechaCobro && (
                        <p className="text-xs text-gray-600">
                          Fecha Cobro: {detalle.fechaCobro}
                        </p>
                      )}
                      {detalle.fecha && !detalle.fechaCobro && (
                        <p className="text-xs text-gray-600">
                          Fecha: {detalle.fecha}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {usarSaldoFavor && (
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Saldo a Favor Aplicado
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatearMonto(saldoFavor)}
                  </p>
                </div>
              )}

              <div
                className="rounded-lg p-4"
                style={{
                  background: "linear-gradient(to right, #E8EFF7, #E5F5F1)",
                  border: "2px solid #1F3A5F",
                }}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Formas de Pago:</span>
                    <span className="font-semibold">
                      {formatearMonto(calcularTotalPagos())}
                    </span>
                  </div>
                  {usarSaldoFavor && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span>+ Saldo a Favor:</span>
                      <span className="font-semibold">
                        {formatearMonto(saldoFavor)}
                      </span>
                    </div>
                  )}
                  <div
                    className="flex justify-between items-center pt-2"
                    style={{ borderTop: "2px solid #1F3A5F" }}
                  >
                    <span className="text-lg font-bold text-gray-900">
                      Total:
                    </span>
                    <span
                      className="text-3xl font-bold"
                      style={{ color: "#1F3A5F" }}
                    >
                      {formatearMonto(calcularTotalConSaldoFavor())}
                    </span>
                  </div>
                </div>
              </div>

              {observacion && (
                <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Observación
                  </h4>
                  <p className="text-gray-700 text-sm">{observacion}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t-2 border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => setShowResumenModal(false)}
                className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
              >
                ← Volver a editar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                {isSubmitting ? "Guardando..." : "✓ Confirmar y Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para fechas pasadas */}
      <ConfirmModal
        isOpen={showConfirmCobrosPasados}
        onClose={() => setShowConfirmCobrosPasados(false)}
        onConfirm={async () => {
          setShowConfirmCobrosPasados(false);
          await procesarPago();
        }}
        title="Fechas de Cobro Pasadas"
        message="Has ingresado una o más fechas de cobro pasadas. Esto es útil para registrar pagos históricos, pero verifica que la información sea correcta."
        confirmText="Continuar"
        cancelText="Revisar"
        type="warning"
      />
    </div>
  );
}
