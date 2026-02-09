import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function DocumentoForm({
  clienteId,
  clienteNombre,
  clienteEmpresa,
  onDocumentoAgregado,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    tipo: "Factura",
    numero: "",
    empresa: clienteEmpresa || "Piamontesa",
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "monto" ? (value === "" ? "" : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.numero.trim() || !formData.monto) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    // Redondear el monto a 2 decimales
    const montoRedondeado = Math.round(parseFloat(formData.monto) * 100) / 100;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/documentos`, {
        clienteId,
        tipo: formData.tipo,
        numero: formData.numero,
        empresa: clienteEmpresa,
        monto: montoRedondeado,
        fecha: formData.fecha,
      });

      toast.success("Factura/Remito agregado exitosamente");
      onDocumentoAgregado(response.data.data);
      setFormData({
        tipo: "Factura",
        numero: "",
        empresa: clienteEmpresa || "Piamontesa",
        monto: "",
        fecha: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      const message =
        error.response?.data?.message || "Error al agregar documento";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
        Agregar Factura/Remito a {clienteNombre}
      </h3>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo *
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          >
            <option value="Factura">Factura</option>
            <option value="Remito">Remito</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número *
          </label>
          <input
            type="text"
            name="numero"
            value={formData.numero}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            placeholder="Ej: 001, 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa
          </label>
          <input
            type="text"
            value={clienteEmpresa}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto *
          </label>
          <input
            type="number"
            name="monto"
            value={formData.monto}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            placeholder="0.00"
            step="0.01"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha *
          </label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            onClick={(e) => e.target.showPicker?.()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          />
        </div>

        <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition"
          >
            {loading ? "Guardando..." : "Agregar Documento"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
