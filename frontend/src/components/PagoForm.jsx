import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function PagoForm({
  pago,
  clientes,
  onSave,
  onCancel,
  clientePreseleccionado = false,
}) {
  const [formData, setFormData] = useState(
    pago || {
      clienteId: "",
      documentoId: "",
      monto: "",
      formaPago: "Transferencia",
      fecha: new Date().toISOString().split("T")[0],
      descripcion: "",
    },
  );
  const [documentos, setDocumentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [detallesPago, setDetallesPago] = useState([
    { formaPago: "Transferencia", monto: "" },
  ]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState("");
  const [pendingSubmit, setPendingSubmit] = useState(null);

  useEffect(() => {
    if (formData.clienteId) {
      fetchDocumentos(formData.clienteId);
      const clienteSeleccionado = clientes.find(
        (c) => c.id === formData.clienteId,
      );
      if (clienteSeleccionado) {
        setSearchTerm(
          `${clienteSeleccionado.nombre} - ${clienteSeleccionado.empresa}`,
        );
      }
    } else {
      setDocumentos([]);
      setFormData((prev) => ({ ...prev, documentoId: "" }));
    }
  }, [formData.clienteId, clientes]);

  const fetchDocumentos = async (clienteId) => {
    try {
      const response = await axios.get(
        `${API_URL}/documentos/cliente/${clienteId}`,
      );
      setDocumentos(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      setDocumentos([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "monto"
          ? parseFloat(value) || ""
          : name === "clienteId" || name === "documentoId"
            ? parseInt(value) || ""
            : value,
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (!e.target.value.trim()) {
      setFormData((prev) => ({ ...prev, clienteId: "" }));
    }
  };

  const handleSelectCliente = (cliente) => {
    setFormData((prev) => ({ ...prev, clienteId: cliente.id }));
    setSearchTerm(`${cliente.nombre} - ${cliente.empresa}`);
    setShowDropdown(false);
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.empresa.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getDocumentoSeleccionado = () => {
    if (!formData.documentoId) return null;
    return documentos.find((doc) => doc.id === formData.documentoId);
  };

  const agregarDetallePago = () => {
    setDetallesPago([
      ...detallesPago,
      { formaPago: "Transferencia", monto: "" },
    ]);
  };

  const eliminarDetallePago = (index) => {
    if (detallesPago.length > 1) {
      setDetallesPago(detallesPago.filter((_, i) => i !== index));
    }
  };

  const handleDetalleChange = (index, field, value) => {
    const nuevosDetalles = [...detallesPago];
    if (field === "monto") {
      // Redondear a 2 decimales
      const valorNumerico = parseFloat(value);
      nuevosDetalles[index][field] = isNaN(valorNumerico)
        ? ""
        : Math.round(valorNumerico * 100) / 100;
    } else {
      nuevosDetalles[index][field] = value;
    }
    setDetallesPago(nuevosDetalles);
  };

  const calcularTotalPagos = () => {
    return detallesPago.reduce((total, detalle) => {
      return total + (parseFloat(detalle.monto) || 0);
    }, 0);
  };

  const validarMontos = () => {
    const documentoSeleccionado = getDocumentoSeleccionado();
    if (!documentoSeleccionado) return true; // Si no hay documento, no validamos

    const totalPagos = calcularTotalPagos();
    const saldoPendiente = documentoSeleccionado.saldoPendiente;

    return Math.abs(totalPagos - saldoPendiente) < 0.01; // Tolerancia para decimales
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clienteId) {
      setConfirmModalMessage("Debes seleccionar un cliente");
      setShowConfirmModal(true);
      return;
    }

    const totalPagos = calcularTotalPagos();
    if (totalPagos === 0) {
      setConfirmModalMessage("Debes ingresar al menos un monto");
      setShowConfirmModal(true);
      return;
    }

    const documentoSeleccionado = getDocumentoSeleccionado();
    if (documentoSeleccionado && !validarMontos()) {
      const diferencia = Math.abs(
        documentoSeleccionado.saldoPendiente - totalPagos,
      );
      const tipo =
        totalPagos > documentoSeleccionado.saldoPendiente ? "excede" : "falta";
      setConfirmModalMessage(
        `El total ingresado ($${totalPagos.toFixed(2)}) ${tipo} $${diferencia.toFixed(2)} del saldo pendiente ($${documentoSeleccionado.saldoPendiente.toFixed(2)}). ¿Deseas guardar de todas formas?`,
      );
      setPendingSubmit(() => () => guardarPago(totalPagos));
      setShowConfirmModal(true);
      return;
    }

    guardarPago(totalPagos);
  };

  const guardarPago = (totalPagos) => {
    // Enviamos los datos con los detalles de pago
    const datosParaGuardar = {
      ...formData,
      monto: totalPagos,
      detallesPago: detallesPago.filter((d) => d.monto > 0),
    };

    onSave(datosParaGuardar);
  };

  const handleConfirm = () => {
    if (pendingSubmit) {
      pendingSubmit();
      setPendingSubmit(null);
    }
    setShowConfirmModal(false);
  };

  const handleCancelConfirm = () => {
    setPendingSubmit(null);
    setShowConfirmModal(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">
        {pago ? "Editar Pago" : "Nuevo Pago"}
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente *
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => !clientePreseleccionado && setShowDropdown(true)}
            placeholder="Buscar cliente por nombre..."
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              clientePreseleccionado ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            autoComplete="off"
            disabled={clientePreseleccionado}
          />
          {showDropdown && searchTerm && !clientePreseleccionado && (
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

        {formData.clienteId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factura/Remito a Pagar{" "}
              {documentos.length === 0 && "(Sin documentos pendientes)"}
            </label>
            {documentos.length > 0 ? (
              <select
                name="documentoId"
                value={formData.documentoId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un documento</option>
                {documentos.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.tipo} {doc.numero} - {doc.empresa} ($
                    {doc.saldoPendiente})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                No hay facturas/remitos pendientes para este cliente. Agrégalas
                en la sección de Clientes.
              </div>
            )}
          </div>
        )}

        {getDocumentoSeleccionado() && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <input
                type="text"
                value={getDocumentoSeleccionado().tipo}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número
              </label>
              <input
                type="text"
                value={getDocumentoSeleccionado().numero}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={getDocumentoSeleccionado().empresa}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saldo Pendiente a Pagar *
              </label>
              <input
                type="text"
                value={`$${getDocumentoSeleccionado().saldoPendiente.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 text-blue-700 font-bold text-lg"
              />
            </div>
          </>
        )}

        {/* Sección de detalles de pago */}
        <div className="col-span-2">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Detalles del Pago *
            </label>
            <button
              type="button"
              onClick={agregarDetallePago}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition"
            >
              + Agregar Forma de Pago
            </button>
          </div>

          <div className="space-y-2">
            {detallesPago.map((detalle, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select
                    value={detalle.formaPago}
                    onChange={(e) =>
                      handleDetalleChange(index, "formaPago", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Deposito">Depósito</option>
                    <option value="Cheque">Cheque</option>
                    <option value="E-Cheq">E-Cheq</option>
                    <option value="Ret Ganancias">Ret Ganancias</option>
                    <option value="Ret IIBB">Ret IIBB</option>
                    <option value="A/Cta">A/Cta</option>
                  </select>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={detalle.monto}
                    onChange={(e) =>
                      handleDetalleChange(index, "monto", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Monto"
                    step="0.01"
                  />
                </div>
                {detallesPago.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarDetallePago(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Mostrar total y validación */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Total a Pagar:</span>
              <span className="text-xl font-bold text-blue-600">
                ${calcularTotalPagos().toFixed(2)}
              </span>
            </div>
            {getDocumentoSeleccionado() && (
              <div className="mt-2">
                {validarMontos() ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <span>✓</span>
                    <span>El total coincide con el saldo pendiente</span>
                  </div>
                ) : (
                  <div className="text-red-600 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span>⚠</span>
                      <span className="font-semibold">
                        Los montos no coinciden
                      </span>
                    </div>
                    <div className="ml-5 text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span>Total ingresado:</span>
                        <span className="font-medium">
                          ${calcularTotalPagos().toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Factura a Pagar:</span>
                        <span className="font-medium">
                          $
                          {getDocumentoSeleccionado().saldoPendiente.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-red-300 pt-0.5 mt-0.5">
                        <span className="font-semibold">
                          {calcularTotalPagos() >
                          getDocumentoSeleccionado().saldoPendiente
                            ? "Excedente:"
                            : "Falta:"}
                        </span>
                        <span className="font-bold">
                          $
                          {Math.abs(
                            getDocumentoSeleccionado().saldoPendiente -
                              calcularTotalPagos(),
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha
          </label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            placeholder="Detalle del pago (opcional)"
          />
        </div>

        <div className="col-span-2 flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
          >
            {pago ? "Actualizar" : "Registrar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  pendingSubmit ? "bg-yellow-100" : "bg-red-100"
                }`}
              >
                <span className="text-2xl">{pendingSubmit ? "⚠️" : "❌"}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {pendingSubmit ? "Confirmar Acción" : "Atención"}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {confirmModalMessage}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {pendingSubmit ? (
                <>
                  <button
                    onClick={handleCancelConfirm}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Guardar de todas formas
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCancelConfirm}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
