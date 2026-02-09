import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function DocumentoTable({
  documentos,
  clienteId,
  onDocumentoEliminado,
}) {
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    if (documentos.length > 0) {
      fetchPagos();
    }
  }, [documentos]);

  const fetchPagos = async () => {
    try {
      const response = await axios.get(`${API_URL}/pagos`);
      setPagos(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar pagos:", error);
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
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const calcularTotalPagado = (documentoId) => {
    return pagos
      .filter((pago) => pago.documentoId === documentoId)
      .reduce((sum, pago) => sum + pago.monto, 0);
  };

  const calcularTotalesGenerales = () => {
    const montoTotal = documentos.reduce(
      (sum, doc) => sum + (doc.monto || 0),
      0,
    );
    const totalPagado = documentos.reduce((sum, doc) => {
      return sum + calcularTotalPagado(doc.id);
    }, 0);
    const saldoPendiente = documentos.reduce(
      (sum, doc) => sum + (doc.saldoPendiente || 0),
      0,
    );

    return { montoTotal, totalPagado, saldoPendiente };
  };

  const totales = calcularTotalesGenerales();

  const handleDelete = async (id) => {
    if (
      window.confirm("¿Estás seguro de que deseas eliminar este documento?")
    ) {
      try {
        await axios.delete(`${API_URL}/documentos/${id}`);
        toast.success("Documento eliminado");
        onDocumentoEliminado(id);
      } catch (error) {
        toast.error("Error al eliminar documento");
      }
    }
  };

  if (documentos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center text-gray-500 text-sm md:text-base">
        No hay facturas/remitos pendientes
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vista Mobile - Cards */}
      <div className="lg:hidden space-y-3">
        {documentos.map((doc) => {
          const totalPagado = calcularTotalPagado(doc.id);
          return (
            <div
              key={doc.id}
              className="bg-white rounded-lg shadow p-4 border border-gray-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {doc.tipo} {doc.numero}
                  </h3>
                  <p className="text-xs text-gray-500">{doc.empresa}</p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-600 hover:text-red-800 p-1 transition"
                  title="Eliminar documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{formatDate(doc.fecha)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Monto Total:</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(doc.monto)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pagado:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(totalPagado)}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Saldo Pendiente:</span>
                  <span
                    className={`font-bold ${
                      doc.saldoPendiente > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(doc.saldoPendiente)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Totales en Mobile */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-300 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Monto Total:</span>
            <span className="font-bold text-blue-600">
              {formatCurrency(totales.montoTotal)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Total Pagado:</span>
            <span className="font-bold text-green-600">
              {formatCurrency(totales.totalPagado)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-2">
            <span className="font-bold text-gray-900">Saldo Pendiente:</span>
            <span className="font-bold text-red-600 text-lg">
              {formatCurrency(totales.saldoPendiente)}
            </span>
          </div>
        </div>
      </div>

      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Número
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Monto Total
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Total Pagado
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Saldo Pendiente
                </th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => {
                const totalPagado = calcularTotalPagado(doc.id);
                return (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {doc.tipo}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{doc.numero}</td>
                    <td className="px-6 py-4 text-gray-600">{doc.empresa}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(doc.fecha)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-600">
                      {formatCurrency(doc.monto)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-600">
                      {formatCurrency(totalPagado)}
                    </td>
                    <td
                      className={`px-6 py-4 font-semibold ${
                        doc.saldoPendiente > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(doc.saldoPendiente)}
                    </td>
                    <td className="px-6 py-4 flex justify-center gap-2">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-800 p-1 transition"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-4 text-right font-bold text-gray-900"
                >
                  TOTALES:
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-blue-600 text-base">
                    {formatCurrency(totales.montoTotal)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Monto Total</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-green-600 text-base">
                    {formatCurrency(totales.totalPagado)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Pagado</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-red-600 text-base">
                    {formatCurrency(totales.saldoPendiente)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Saldo Pendiente
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
