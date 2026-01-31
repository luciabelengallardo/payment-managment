import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { DollarSign, Plus, X } from "lucide-react";
import DocumentoForm from "../components/DocumentoForm";
import DocumentoTable from "../components/DocumentoTable";
import PagoForm from "../components/PagoForm";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteEmpresa, setNuevoClienteEmpresa] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [showNuevoClienteForm, setShowNuevoClienteForm] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/clientes`);
      setClientes(response.data.data || []);
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
      setDocumentos(response.data.data || []);
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

  const handleDocumentoAgregado = (nuevoDocumento) => {
    setDocumentos((prev) => [nuevoDocumento, ...prev]);
  };

  const handleDocumentoEliminado = (documentoId) => {
    setDocumentos((prev) => prev.filter((d) => d.id !== documentoId));
  };

  const handlePagoGuardado = async (pagoData) => {
    try {
      const response = await axios.post(`${API_URL}/pagos`, pagoData);
      toast.success("Pago registrado exitosamente");
      setShowPagoForm(false);

      // Actualizar documentos para reflejar el nuevo saldo pendiente
      if (pagoData.documentoId) {
        fetchDocumentos(selectedClienteId);
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

  const clienteFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        )}
      </div>

      {!selectedClienteId ? (
        <>
          {/* Formulario de nuevo cliente (expandible) */}
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
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition w-full sm:w-auto"
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

          {/* Sección: Buscar cliente existente */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900">
              Seleccionar Cliente
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />

              {(searchTerm || clientes.length > 0) && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                  {(searchTerm ? clienteFiltrados : clientes).length > 0 ? (
                    <ul className="divide-y">
                      {(searchTerm ? clienteFiltrados : clientes).map(
                        (cliente) => (
                          <li key={cliente.id}>
                            <button
                              onClick={() => handleSelectCliente(cliente.id)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex justify-between items-center"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm md:text-base">
                                  {cliente.nombre}
                                </p>
                                <p className="text-xs md:text-sm text-gray-500">
                                  {cliente.empresa}
                                </p>
                              </div>
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                Ver
                              </span>
                            </button>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No se encontraron clientes
                    </div>
                  )}
                </div>
              )}

              {searchTerm === "" &&
                clientes.length > 0 &&
                !selectedClienteId && (
                  <div className="text-xs md:text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                    Haz clic arriba para ver todos los {clientes.length} cliente
                    {clientes.length !== 1 ? "s" : ""}
                  </div>
                )}

              {clientes.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No hay clientes registrados. ¡Crea uno para comenzar!
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Sección: Documentos del cliente seleccionado */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  {clienteSeleccionado?.nombre}
                </h2>
                <p className="text-sm md:text-base text-gray-600 mt-1">
                  Empresa:{" "}
                  <span className="font-medium">
                    {clienteSeleccionado?.empresa}
                  </span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <button
                  onClick={() =>
                    navigate(`/pagos?clienteId=${selectedClienteId}`)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <DollarSign className="w-5 h-5" />
                  Ver Pagos
                </button>
                <button
                  onClick={() => {
                    setSelectedClienteId(null);
                    setDocumentos([]);
                    setSearchTerm("");
                    setShowDocumentoForm(false);
                    setShowPagoForm(false);
                    setShowNuevoClienteForm(false);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm md:text-base"
                >
                  Volver
                </button>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setShowDocumentoForm(!showDocumentoForm);
                setShowPagoForm(false);
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Plus className="w-5 h-5" />
              {showDocumentoForm
                ? "Cancelar Factura/Remito"
                : "Agregar Factura/Remito"}
            </button>
            <button
              onClick={() => {
                setShowPagoForm(!showPagoForm);
                setShowDocumentoForm(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <DollarSign className="w-5 h-5" />
              {showPagoForm ? "Cancelar Pago" : "Nuevo Pago"}
            </button>
          </div>

          {/* Formulario de documento */}
          {showDocumentoForm && (
            <DocumentoForm
              clienteId={selectedClienteId}
              clienteNombre={clienteSeleccionado?.nombre}
              clienteEmpresa={clienteSeleccionado?.empresa}
              onDocumentoAgregado={handleDocumentoAgregado}
              onCancel={() => setShowDocumentoForm(false)}
            />
          )}

          {/* Formulario de pago */}
          {showPagoForm && (
            <PagoForm
              pago={{
                clienteId: selectedClienteId,
                documentoId: "",
                monto: "",
                formaPago: "Transferencia",
                fecha: new Date().toISOString().split("T")[0],
                descripcion: "",
              }}
              clientes={clientes}
              onSave={handlePagoGuardado}
              onCancel={() => setShowPagoForm(false)}
              clientePreseleccionado={true}
            />
          )}

          {/* Tabla de documentos */}
          <DocumentoTable
            documentos={documentos}
            clienteId={selectedClienteId}
            onDocumentoEliminado={handleDocumentoEliminado}
          />
        </>
      )}
    </div>
  );
}
