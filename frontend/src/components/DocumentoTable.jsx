import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "../utils/axios";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export default function DocumentoTable({
  documentos,
  clienteId,
  onDocumentoEliminado,
}) {
  const [pagos, setPagos] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [documentoAEliminar, setDocumentoAEliminar] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (documentos.length > 0 && clienteId) {
      fetchPagos();
    }
  }, [documentos, clienteId]);

  const fetchPagos = async () => {
    try {
      const response = await axios.get(`${API_URL}/pagos`);
      const todosPagos = response.data.data || [];
      // Filtrar solo los pagos del cliente actual
      const pagosFiltrados = clienteId
        ? todosPagos.filter((p) => p.clienteId === clienteId)
        : todosPagos;
      setPagos(pagosFiltrados);
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
    let total = 0;

    pagos.forEach((pago) => {
      if (pago.detallesPago && pago.detallesPago.length > 0) {
        pago.detallesPago.forEach((detalle) => {
          if (detalle.documentoId === documentoId) {
            total += detalle.monto || 0;
          }
        });
      } else {
        // Si no tiene detalles, contar el pago completo si fue aplicado a este documento
        if (pago.documentoId === documentoId) {
          total += pago.monto || 0;
        }
      }
    });

    return total;
  };

  const calcularTotalesGenerales = () => {
    const montoTotal = documentos.reduce(
      (sum, doc) => sum + (doc.monto || 0),
      0,
    );
    const totalPagado = documentos.reduce((sum, doc) => {
      return sum + calcularTotalPagado(doc.id);
    }, 0);

    // Calcular saldo pendiente real basado en monto - pagos
    const saldoPendiente = documentos.reduce((sum, doc) => {
      const pagadoDoc = calcularTotalPagado(doc.id);
      const saldo = doc.monto - pagadoDoc;
      return sum + Math.max(0, saldo);
    }, 0);

    const saldoAFavor = documentos.reduce((sum, doc) => {
      const pagadoDoc = calcularTotalPagado(doc.id);
      const saldo = doc.monto - pagadoDoc;
      return sum + (saldo < 0 ? Math.abs(saldo) : 0);
    }, 0);

    return { montoTotal, totalPagado, saldoPendiente, saldoAFavor };
  };

  const totales = calcularTotalesGenerales();

  const handleDelete = (doc) => {
    setDocumentoAEliminar(doc);
    setShowConfirmModal(true);
  };

  const confirmarEliminacion = async () => {
    if (!documentoAEliminar) return;

    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/documentos/${documentoAEliminar.id}`);
      toast.success("Documento eliminado");
      onDocumentoEliminado(documentoAEliminar.id);
      setShowConfirmModal(false);
      setDocumentoAEliminar(null);
    } catch (error) {
      const message =
        error.response?.data?.message || "Error al eliminar documento";
      toast.error(message);
      setShowConfirmModal(false);
      setDocumentoAEliminar(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (documentos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center text-gray-500 text-sm md:text-base">
        No hay facturas/remitos
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="lg:hidden space-y-3">
        {documentos.map((doc) => {
          const totalPagado = calcularTotalPagado(doc.id);
          const saldoPendiente = doc.monto - totalPagado;
          return (
            <div
              key={doc.id}
              className="bg-white rounded-lg shadow p-4 border border-gray-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {doc.tipo} {doc.numero}
                  </h3>
                  <p className="text-xs text-gray-500">{doc.empresa}</p>
                </div>
                <button
                  onClick={() => handleDelete(doc)}
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
                  <span className="font-bold" style={{ color: "#1F3A5F" }}>
                    {formatCurrency(doc.monto)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pagado:</span>
                  <span className="font-bold" style={{ color: "#5FB49C" }}>
                    {formatCurrency(totalPagado)}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">
                    {saldoPendiente < 0 ? "Saldo a Favor:" : "Saldo Pendiente:"}
                  </span>
                  <span
                    className="font-bold"
                    style={{
                      color:
                        saldoPendiente < 0
                          ? "#5FB49C"
                          : saldoPendiente > 0
                            ? "#E76F51"
                            : "#6B7280",
                    }}
                  >
                    {saldoPendiente < 0
                      ? formatCurrency(Math.abs(saldoPendiente))
                      : formatCurrency(saldoPendiente)}
                  </span>
                </div>
                {saldoPendiente < 0 && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                    ✓ Factura con crédito - Usar en próximos pagos
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Totales en Mobile */}
        <div
          className="rounded-lg p-4 border-2 space-y-2"
          style={{
            background: "linear-gradient(to right, #e8f2f7, #dce9f2)",
            borderColor: "#1F3A5F",
          }}
        >
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Monto Total:</span>
            <span className="font-bold" style={{ color: "#1F3A5F" }}>
              {formatCurrency(totales.montoTotal)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Total Pagado:</span>
            <span className="font-bold" style={{ color: "#5FB49C" }}>
              {formatCurrency(totales.totalPagado)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-2">
            <span className="font-bold text-gray-900">Saldo Pendiente:</span>
            <span className="font-bold text-lg" style={{ color: "#E76F51" }}>
              {formatCurrency(totales.saldoPendiente)}
            </span>
          </div>
          {totales.saldoAFavor > 0 && (
            <div className="flex justify-between items-center text-sm border-t border-green-200 pt-2 mt-2">
              <span className="font-bold text-gray-900">Saldo a Favor:</span>
              <span className="font-bold text-lg" style={{ color: "#5FB49C" }}>
                {formatCurrency(totales.saldoAFavor)}
              </span>
            </div>
          )}
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
                const saldoPendiente = doc.monto - totalPagado;
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
                    <td
                      className="px-6 py-4 font-semibold"
                      style={{ color: "#1F3A5F" }}
                    >
                      {formatCurrency(doc.monto)}
                    </td>
                    <td
                      className="px-6 py-4 font-semibold"
                      style={{ color: "#5FB49C" }}
                    >
                      {formatCurrency(totalPagado)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              saldoPendiente < 0
                                ? "#5FB49C"
                                : saldoPendiente > 0
                                  ? "#E76F51"
                                  : "#6B7280",
                          }}
                        >
                          {saldoPendiente < 0
                            ? formatCurrency(Math.abs(saldoPendiente))
                            : formatCurrency(saldoPendiente)}
                        </span>
                        {saldoPendiente < 0 && (
                          <span
                            className="text-xs font-medium"
                            style={{ color: "#5FB49C" }}
                          >
                            (Saldo a Favor)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleDelete(doc)}
                          className="text-red-600 hover:text-red-800 p-1 transition"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                  <div
                    className="font-bold text-base"
                    style={{ color: "#1F3A5F" }}
                  >
                    {formatCurrency(totales.montoTotal)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Monto Total</div>
                </td>
                <td className="px-6 py-4">
                  <div
                    className="font-bold text-base"
                    style={{ color: "#5FB49C" }}
                  >
                    {formatCurrency(totales.totalPagado)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Pagado</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div>
                      <div
                        className="font-bold text-base"
                        style={{ color: "#E76F51" }}
                      >
                        {formatCurrency(totales.saldoPendiente)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Saldo Pendiente
                      </div>
                    </div>
                    {totales.saldoAFavor > 0 && (
                      <div className="pt-1 border-t border-gray-300">
                        <div
                          className="font-bold text-base"
                          style={{ color: "#5FB49C" }}
                        >
                          {formatCurrency(totales.saldoAFavor)}
                        </div>
                        <div className="text-xs" style={{ color: "#5FB49C" }}>
                          Saldo a Favor
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setDocumentoAEliminar(null);
        }}
        onConfirm={confirmarEliminacion}
        title="Eliminar Documento"
        message={
          documentoAEliminar
            ? `¿Estás seguro de que deseas eliminar ${documentoAEliminar.tipo} ${documentoAEliminar.numero}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        type="danger"
        isLoading={isDeleting}
        requireTextConfirmation="ELIMINAR"
      />
    </div>
  );
}
