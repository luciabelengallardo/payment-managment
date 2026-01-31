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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clienteId || !formData.monto) {
      alert("Completa todos los campos requeridos");
      return;
    }
    onSave(formData);
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
                Saldo Pendiente
              </label>
              <input
                type="text"
                value={`$${getDocumentoSeleccionado().saldoPendiente.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-semibold"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto *
          </label>
          <input
            type="number"
            name="monto"
            value={formData.monto}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Forma de Pago
          </label>
          <select
            name="formaPago"
            value={formData.formaPago}
            onChange={handleChange}
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
    </div>
  );
}
