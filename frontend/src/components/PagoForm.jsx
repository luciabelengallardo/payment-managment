import { useState, useEffect } from "react";
import axios from "../utils/axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function PagoForm({ clientes, onSave, onCancel }) {
  const [pasoActual, setPasoActual] = useState(1);
  const [clienteId, setClienteId] = useState("");
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
  const [showBorradorRecuperacion, setShowBorradorRecuperacion] = useState(false);

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

  const desformatearMonto = (valorFormateado) => {
    if (!valorFormateado) return "";
    const sinFormato = valorFormateado
      .replace(/[^0-9,]/g, "")
      .replace(",", ".");
    return sinFormato ? parseFloat(sinFormato) : "";
  };

  const validarSoloNumeros = (valor) => {
    return valor.replace(/[^0-9.,\s]/g, "");
  };

  useEffect(() => {
    const borrador = localStorage.getItem('pagoFormBorrador');
    if (borrador) {
      setShowBorradorRecuperacion(true);
    }
  }, []);

  useEffect(() => {
    if (pasoActual > 1) {
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
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('pagoFormBorrador', JSON.stringify(borrador));
    }
  }, [clienteId, montoTotalPago, facturasSeleccionadas, detallesPago, fecha, observacion, usarSaldoFavor, pasoActual]);

  const recuperarBorrador = () => {
    const borrador = localStorage.getItem('pagoFormBorrador');
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
    localStorage.removeItem('pagoFormBorrador');
    setShowBorradorRecuperacion(false);
  };

  const limpiarBorrador = () => {
    localStorage.removeItem('pagoFormBorrador');
  };

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
    
    if (!forma.monto || parseFloat(forma.monto) <= 0) {
      errors.push("El monto es requerido");
    }
    
    const montoNum = parseFloat(forma.monto) || 0;
    const montoTotal = parseFloat(montoTotalPago) || 0;
    if (montoNum > montoTotal * 2) {
      errors.push("Monto sospechosamente alto");
    }
    
    if (forma.formaPago === "Cheque" || forma.formaPago === "E-Cheq") {
      if (!forma.numeroCheque?.trim()) {
        errors.push("Número de cheque requerido");
      } else {
        const duplicados = detallesPago.filter(d => 
          d.numeroCheque === forma.numeroCheque && 
          (d.formaPago === "Cheque" || d.formaPago === "E-Cheq")
        );
        if (duplicados.length > 1) {
          errors.push("Número de cheque duplicado");
        }
      }
      
      if (!forma.fechaCobro) {
        errors.push("Fecha de cobro requerida");
      } else {
        const fechaCobro = new Date(forma.fechaCobro);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fechaCobro < hoy) {
          errors.push("La fecha de cobro ya pasó");
        }
      }
      
      if (!forma.banco?.trim()) {
        errors.push("Banco requerido");
      }
    }
    
    if (forma.formaPago === "Transferencia" || forma.formaPago === "Deposito") {
      if (!forma.banco?.trim()) {
        errors.push("Banco requerido");
      }
      if (!forma.fecha) {
        errors.push("Fecha requerida");
      }
    }
    
    return errors;
  };

  const validarTodasLasFormas = () => {
    const nuevosErrores = {};
    detallesPago.forEach((forma, index) => {
      const errores = validarForma(forma);
      if (errores.length > 0) {
        nuevosErrores[index] = errores;
      }
    });
    setValidationErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const agregarDetallePago = () => {
    if (detallesPago.length > 0) {
      const ultimaForma = detallesPago[0];
      const errores = validarForma(ultimaForma);
      if (errores.length > 0) {
        alert("Completa la forma de pago actual antes de agregar otra");
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
    setFormasColapsadas(prev => {
      const nuevo = new Set(prev);
      nuevo.delete(index);
      return nuevo;
    });
    const nuevosErrores = { ...validationErrors };
    delete nuevosErrores[index];
    setValidationErrors(nuevosErrores);
  };

  const duplicarDetallePago = (index) => {
    const original = detallesPago[index];
    const duplicado = {
      ...original,
      numeroCheque: "",
      monto: "",
    };
    setDetallesPago([duplicado, ...detallesPago]);
  };

  const toggleColapsar = (index) => {
    setFormasColapsadas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(index)) {
        nuevo.delete(index);
      } else {
        nuevo.add(index);
      }
      return nuevo;
    });
  };

  const handleDetalleChange = (index, field, value) => {
    const nuevosDetalles = [...detallesPago];
    if (field === "monto") {
      nuevosDetalles[index][field] = value;
    } else {
      nuevosDetalles[index][field] = value;
    }
    setDetallesPago(nuevosDetalles);
    
    const nuevosErrores = { ...validationErrors };
    const errores = validarForma(nuevosDetalles[index]);
    if (errores.length > 0) {
      nuevosErrores[index] = errores;
    } else {
      delete nuevosErrores[index];
    }
    setValidationErrors(nuevosErrores);
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

  const irPaso2 = () => {
    if (!clienteId) {
      alert("Debes seleccionar un cliente");
      return;
    }
    if (!montoTotalPago || parseFloat(montoTotalPago) <= 0) {
      alert("Debes ingresar el monto total del pago");
      return;
    }
    setPasoActual(2);
  };

  const irPaso3 = () => {
    if (facturasSeleccionadas.length === 0) {
      alert("Debes seleccionar al menos una factura");
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
        }
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
      alert(
        "El total de las formas de pago debe coincidir con el monto total ingresado",
      );
      return;
    }

    if (!validarTodasLasFormas()) {
      alert("Por favor corrige los errores en las formas de pago");
      return;
    }

    setShowResumenModal(true);
  };

  const handleSubmit = async () => {
    const montoTotal = parseFloat(montoTotalPago) || 0;
    const totalConSaldoFavor = calcularTotalConSaldoFavor();

    if (Math.abs(totalConSaldoFavor - montoTotal) > 0.01) {
      alert(
        "El total de las formas de pago debe coincidir con el monto total ingresado",
      );
      return;
    }

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
      await onSave(datosPago);
      limpiarBorrador();
    } catch (error) {
      console.error("Error al guardar pagos:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clienteSeleccionado = clientes.find(c => c.id === clienteId);

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      {showBorradorRecuperacion && (
        <div className="mb-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💾</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">Pago sin terminar</h3>
              <p className="text-sm text-gray-700 mb-3">Tienes un pago guardado que no completaste. ¿Deseas recuperarlo?</p>
              <div className="flex gap-2">
                <button
                  onClick={recuperarBorrador}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
                >
                  Recuperar
                </button>
                <button
                  onClick={descartarBorrador}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium text-sm transition"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Nuevo Pago</h2>

      <div className="mb-6 flex items-center justify-center gap-2 md:gap-4">
        <div
          className={`flex items-center gap-1 md:gap-2 ${pasoActual >= 1 ? "text-blue-600 font-semibold" : "text-gray-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${pasoActual >= 1 ? "text-white" : "bg-gray-300 text-gray-600"}`}
            style={pasoActual >= 1 ? { backgroundColor: "#1F3A5F" } : {}}
          >
            1
          </div>
          <span className="text-xs md:text-base">Monto</span>
        </div>
        <div className="w-8 md:w-12 h-1 bg-gray-300"></div>
        <div
          className={`flex items-center gap-1 md:gap-2 ${pasoActual >= 2 ? "text-blue-600 font-semibold" : "text-gray-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${pasoActual >= 2 ? "text-white" : "bg-gray-300 text-gray-600"}`}
            style={pasoActual >= 2 ? { backgroundColor: "#1F3A5F" } : {}}
          >
            2
          </div>
          <span className="text-xs md:text-base">Facturas</span>
        </div>
        <div className="w-8 md:w-12 h-1 bg-gray-300"></div>
        <div
          className={`flex items-center gap-1 md:gap-2 ${pasoActual >= 3 ? "text-blue-600 font-semibold" : "text-gray-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${pasoActual >= 3 ? "text-white" : "bg-gray-300 text-gray-600"}`}
            style={pasoActual >= 3 ? { backgroundColor: "#1F3A5F" } : {}}
          >
            3
          </div>
          <span className="text-xs md:text-base">Formas de Pago</span>
        </div>
      </div>

      {pasoActual === 1 && (
        <div className="space-y-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscar cliente por nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            {showDropdown && searchTerm && (
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
                          <p className="font-medium text-gray-900">
                            {cliente.nombre}
                          </p>
                          <p className="text-sm text-gray-500">
                            {cliente.empresa}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-center text-gray-500 text-sm">
                    No se encontraron clientes
                  </div>
                )}
              </div>
            )}
          </div>

          {clienteId && saldoFavor > 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usarSaldoFavor"
                    checked={usarSaldoFavor}
                    onChange={(e) => setUsarSaldoFavor(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label
                    htmlFor="usarSaldoFavor"
                    className="font-semibold text-green-800 cursor-pointer"
                  >
                    Usar Saldo a Favor Disponible
                  </label>
                </div>
                <span className="text-green-700 font-bold text-lg">
                  {formatearMonto(saldoFavor)}
                </span>
              </div>
            </div>
          )}

          {clienteId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Total que Paga el Cliente *
              </label>
              <input
                type="text"
                value={
                  montoInputActivo === "montoTotalPago"
                    ? montoTotalPago
                    : formatearMonto(montoTotalPago)
                }
                onFocus={() => setMontoInputActivo("montoTotalPago")}
                onChange={(e) => {
                  const valor = validarSoloNumeros(e.target.value);
                  setMontoTotalPago(valor);
                }}
                onBlur={() => {
                  setMontoInputActivo(null);
                  const montoNumerico = desformatearMonto(montoTotalPago);
                  if (!isNaN(montoNumerico) && montoNumerico !== "") {
                    setMontoTotalPago(montoNumerico);
                  }
                }}
                placeholder="0,00"
                className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-2xl bg-blue-50 text-blue-700"
              />
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
              onClick={irPaso2}
              className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition"
              style={{ backgroundColor: "#1F3A5F" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#3E6BA8")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#1F3A5F")
              }
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {pasoActual === 2 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">
                Monto Total a Aplicar:
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {formatearMonto(montoTotalPago)}
              </span>
            </div>
            {usarSaldoFavor && (
              <div className="text-sm text-green-600 mt-2">
                + Saldo a Favor: {formatearMonto(saldoFavor)}
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
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      facturasSeleccionadas.includes(doc.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={facturasSeleccionadas.includes(doc.id)}
                          onChange={() => {}}
                          className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
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
                        <div className="text-lg font-bold text-red-600">
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
              onClick={() => volverPaso(1)}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={irPaso3}
              className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition"
              style={{ backgroundColor: "#1F3A5F" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#3E6BA8")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#1F3A5F")
              }
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {pasoActual === 3 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-2 font-medium">
              💡 Ya viene cargado con Efectivo por el total. Puedes modificarlo si necesitas otro método de pago.
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">
                Monto Total a Desglosar:
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {formatearMonto(montoTotalPago)}
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Formas de Pago ({detallesPago.length})
              </label>
              <button
                type="button"
                onClick={agregarDetallePago}
                className="text-white px-3 py-1 rounded text-sm font-medium transition"
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

            {calcularTotalPagos() > 0 && (
              <div className="mb-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Progreso del desglose:</span>
                  <span className="text-sm font-bold text-purple-600">
                    {formatearMonto(calcularTotalPagos())} / {formatearMonto(montoTotalPago)}
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (calcularTotalPagos() / parseFloat(montoTotalPago || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
                {calcularTotalPagos() < parseFloat(montoTotalPago) && (
                  <p className="text-xs text-gray-600 mt-1">
                    Faltan {formatearMonto(parseFloat(montoTotalPago) - calcularTotalPagos())} por desglosar
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {detallesPago.map((detalle, index) => {
                const isColapsado = formasColapsadas.has(index);
                const errors = validationErrors[index] || [];
                const isCompleto = errors.length === 0 && detalle.monto && parseFloat(detalle.monto) > 0;

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-lg transition ${
                      errors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {isColapsado && isCompleto ? (
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-green-600">✓</span>
                          <span className="font-medium text-gray-900">{detalle.formaPago}</span>
                          {(detalle.formaPago === "Cheque" || detalle.formaPago === "E-Cheq") && detalle.numeroCheque && (
                            <span className="text-sm text-gray-600">#{detalle.numeroCheque}</span>
                          )}
                          {detalle.banco && (
                            <span className="text-sm text-gray-600">- {detalle.banco}</span>
                          )}
                          <span className="text-sm font-bold text-blue-600 ml-auto">
                            {formatearMonto(detalle.monto)}
                          </span>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button
                            type="button"
                            onClick={() => toggleColapsar(index)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicarDetallePago(index)}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
                            title="Duplicar esta forma"
                          >
                            📋
                          </button>
                          {detallesPago.length > 1 && (
                            <button
                              type="button"
                              onClick={() => eliminarDetallePago(index)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        {isCompleto && (
                          <div className="flex justify-end mb-2">
                            <button
                              type="button"
                              onClick={() => toggleColapsar(index)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              ↑ Colapsar
                            </button>
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
                        <option value="Transferencia">Transferencia</option>
                        <option value="Deposito">Depósito</option>
                        <option value="Cheque">Cheque</option>
                        <option value="E-Cheq">E-Cheq</option>
                        <option value="Ret Ganancias">Ret Ganancias</option>
                        <option value="Ret IIBB">Ret IIBB</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => duplicarDetallePago(index)}
                        className="text-white px-3 py-2 rounded-lg transition mt-5"
                        style={{ backgroundColor: "#9333EA" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#7E22CE")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#9333EA")
                        }
                        title="Duplicar esta forma"
                      >
                        📋
                      </button>
                      {detallesPago.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarDetallePago(index)}
                          className="text-white px-3 py-2 rounded-lg transition mt-5"
                          style={{ backgroundColor: "#E76F51" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#e45539")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "#E76F51")
                          }
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <div className="mb-3 bg-red-100 border border-red-300 rounded p-2">
                      <p className="text-xs font-medium text-red-700 mb-1">⚠️ Errores:</p>
                      <ul className="text-xs text-red-600 list-disc list-inside">
                        {errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                            handleDetalleChange(index, "banco", e.target.value)
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
                          onFocus={() => setMontoInputActivo(`${index}-monto`)}
                          onChange={(e) => {
                            const valor = validarSoloNumeros(e.target.value);
                            handleDetalleChange(index, "monto", valor);
                          }}
                          onBlur={() => {
                            setMontoInputActivo(null);
                            const montoNumerico = desformatearMonto(
                              detalle.monto,
                            );
                            if (!isNaN(montoNumerico) && montoNumerico !== "") {
                              handleDetalleChange(
                                index,
                                "monto",
                                montoNumerico,
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
                            handleDetalleChange(index, "fecha", e.target.value)
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
                            handleDetalleChange(index, "banco", e.target.value)
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
                          onFocus={() => setMontoInputActivo(`${index}-monto`)}
                          onChange={(e) => {
                            const valor = validarSoloNumeros(e.target.value);
                            handleDetalleChange(index, "monto", valor);
                          }}
                          onBlur={() => {
                            setMontoInputActivo(null);
                            const montoNumerico = desformatearMonto(
                              detalle.monto,
                            );
                            if (!isNaN(montoNumerico) && montoNumerico !== "") {
                              handleDetalleChange(
                                index,
                                "monto",
                                montoNumerico,
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
                            handleDetalleChange(index, "fecha", e.target.value)
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
                            handleDetalleChange(index, "banco", e.target.value)
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
                          onFocus={() => setMontoInputActivo(`${index}-monto`)}
                          onChange={(e) => {
                            const valor = validarSoloNumeros(e.target.value);
                            handleDetalleChange(index, "monto", valor);
                          }}
                          onBlur={() => {
                            setMontoInputActivo(null);
                            const montoNumerico = desformatearMonto(
                              detalle.monto,
                            );
                            if (!isNaN(montoNumerico) && montoNumerico !== "") {
                              handleDetalleChange(
                                index,
                                "monto",
                                montoNumerico,
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
                  {!["Cheque", "E-Cheq", "Transferencia", "Deposito"].includes(
                    detalle.formaPago,
                  ) && (
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
                        onFocus={() => setMontoInputActivo(`${index}-monto`)}
                        onChange={(e) => {
                          const valor = validarSoloNumeros(e.target.value);
                          handleDetalleChange(index, "monto", valor);
                        }}
                        onBlur={() => {
                          setMontoInputActivo(null);
                          const montoNumerico = desformatearMonto(
                            detalle.monto,
                          );
                          if (!isNaN(montoNumerico) && montoNumerico !== "") {
                            handleDetalleChange(index, "monto", montoNumerico);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                      />
                    </div>
                  )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border-2 border-gray-300 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Formas de Pago:</span>
              <span className="text-lg font-bold text-blue-600">
                {formatearMonto(calcularTotalPagos())}
              </span>
            </div>
            {usarSaldoFavor && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">+ Saldo a Favor:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatearMonto(saldoFavor)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
              <span className="text-gray-900 font-semibold">Total:</span>
              <span className="text-2xl font-bold text-purple-600">
                {formatearMonto(calcularTotalConSaldoFavor())}
              </span>
            </div>
            {Math.abs(
              calcularTotalConSaldoFavor() - parseFloat(montoTotalPago || 0),
            ) > 0.01 ? (
              <div className="bg-red-50 border border-red-300 rounded p-2 text-red-700 text-sm">
                ⚠ El total debe coincidir con el monto ingresado (
                {formatearMonto(montoTotalPago)})
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-lg font-bold">¡Listo para guardar!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">Los montos coinciden perfectamente</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              onClick={(e) => e.target.showPicker?.()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex gap-3 pt-4 pb-20">
            <button
              type="button"
              onClick={() => volverPaso(2)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition disabled:opacity-50"
            >
              ← Volver
            </button>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl z-50 px-4 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-gray-600">Total a pagar:</span>
                <span className="text-2xl font-bold text-purple-600">
                  {formatearMonto(montoTotalPago)}
                </span>
              </div>
              {Math.abs(calcularTotalConSaldoFavor() - parseFloat(montoTotalPago || 0)) <= 0.01 && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Listo</span>
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
                className="px-6 py-3 text-white rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                style={{ backgroundColor: isSubmitting ? "#6B7280" : "#5FB49C" }}
                onMouseEnter={(e) =>
                  !isSubmitting &&
                  (e.currentTarget.style.backgroundColor = "#4da08a")
                }
                onMouseLeave={(e) =>
                  !isSubmitting &&
                  (e.currentTarget.style.backgroundColor = "#5FB49C")
                }
              >
                {isSubmitting ? "Guardando..." : "Revisar y Guardar →"}
              </button>
            </div>
          </div>
                !habilitarFinalizar &&
                !isSubmitting &&
                (e.currentTarget.style.backgroundColor = "#4da08a")
              }
              onMouseLeave={(e) =>
                !habilitarFinalizar &&
                !isSubmitting &&
                (e.currentTarget.style.backgroundColor = "#5FB49C")
              }
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              {isSubmitting ? "Guardando..." : "Guardar Pago"}
            </button>
          </div>
        </div>
      )}

      {showResumenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold mb-2">Resumen del Pago</h2>
              <p className="text-purple-100 text-sm">Verifica que toda la información sea correcta antes de guardar</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">👤</span> Cliente
                </h3>
                <p className="text-lg font-semibold text-gray-800">{clienteSeleccionado?.nombre}</p>
                <p className="text-sm text-gray-600">{clienteSeleccionado?.empresa}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">📄</span> Facturas a Pagar ({facturasSeleccionadas.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {facturasSeleccionadas.map(facturaId => {
                    const factura = documentos.find(d => d.id === facturaId);
                    return factura ? (
                      <div key={facturaId} className="flex justify-between items-center bg-white p-2 rounded border border-green-200">
                        <span className="font-medium text-gray-800">{factura.tipo} {factura.numero}</span>
                        <span className="text-red-600 font-bold">{formatearMonto(factura.saldoPendiente)}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-purple-600">💳</span> Formas de Pago ({detallesPago.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {detallesPago.map((detalle, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-purple-200">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-900">{detalle.formaPago}</span>
                        <span className="text-lg font-bold text-purple-600">{formatearMonto(detalle.monto)}</span>
                      </div>
                      {(detalle.formaPago === "Cheque" || detalle.formaPago === "E-Cheq") && (
                        <div className="text-xs text-gray-600 mt-1">
                          {detalle.numeroCheque && <span>Cheque #{detalle.numeroCheque}</span>}
                          {detalle.fechaCobro && <span> • Cobro: {new Date(detalle.fechaCobro).toLocaleDateString()}</span>}
                          {detalle.banco && <span> • {detalle.banco}</span>}
                        </div>
                      )}
                      {(detalle.formaPago === "Transferencia" || detalle.formaPago === "Deposito") && detalle.banco && (
                        <div className="text-xs text-gray-600 mt-1">
                          <span>{detalle.banco}</span>
                          {detalle.fecha && <span> • {new Date(detalle.fecha).toLocaleDateString()}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {usarSaldoFavor && saldoFavor > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">+ Saldo a Favor aplicado:</span>
                    <span className="text-lg font-bold text-green-600">{formatearMonto(saldoFavor)}</span>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">Total Formas de Pago:</span>
                  <span className="text-xl font-bold text-blue-600">{formatearMonto(calcularTotalPagos())}</span>
                </div>
                {usarSaldoFavor && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">+ Saldo a Favor:</span>
                    <span className="text-xl font-bold text-green-600">{formatearMonto(saldoFavor)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t-2 border-purple-300">
                  <span className="text-gray-900 font-bold">TOTAL:</span>
                  <span className="text-3xl font-bold text-purple-600">{formatearMonto(calcularTotalConSaldoFavor())}</span>
                </div>
              </div>

              {observacion && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">Observación:</h3>
                  <p className="text-sm text-gray-700">{observacion}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-300 p-4 flex gap-3 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowResumenModal(false)}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold transition disabled:opacity-50"
              >
                ← Volver a editar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: isSubmitting ? "#6B7280" : "#10B981" }}
                onMouseEnter={(e) =>
                  !isSubmitting &&
                  (e.currentTarget.style.backgroundColor = "#059669")
                }
                onMouseLeave={(e) =>
                  !isSubmitting &&
                  (e.currentTarget.style.backgroundColor = "#10B981")
                }
              >
                {isSubmitting && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                {isSubmitting ? "Guardando..." : "✓ Confirmar y Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
