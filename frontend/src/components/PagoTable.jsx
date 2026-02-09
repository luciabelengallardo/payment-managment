import { Trash2 } from "lucide-react";

export default function PagoTable({ pagos, onDelete }) {
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

  const totalPagado = pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);

  // Calcular totales únicos por documento
  const calcularTotales = () => {
    const documentosUnicos = new Map();

    pagos.forEach((pago) => {
      if (pago.documentoId) {
        // Obtener el monto original del documento (antes de pagos)
        // Necesitamos calcular basándonos en saldoPendiente + pagos realizados
        const key = pago.documentoId;
        if (!documentosUnicos.has(key)) {
          documentosUnicos.set(key, {
            id: pago.documentoId,
            tipo: pago.documentoTipo,
            numero: pago.documentoNumero,
            empresa: pago.documentoEmpresa,
            pagosRealizados: 0,
          });
        }
        const doc = documentosUnicos.get(key);
        doc.pagosRealizados += pago.monto || 0;
      }
    });

    return {
      totalPagado: totalPagado,
      cantidadDocumentos: documentosUnicos.size,
      documentos: Array.from(documentosUnicos.values()),
    };
  };

  const totales = calcularTotales();

  if (pagos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm md:text-base">
        No hay pagos registrados
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vista Mobile - Cards */}
      <div className="lg:hidden space-y-3">
        {pagos.map((pago) => (
          <div
            key={pago.id}
            className="bg-white rounded-lg shadow p-4 border border-gray-200"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {pago.clienteNombre}
                </h3>
                <p className="text-xs text-gray-500">
                  {pago.documentoEmpresa || "-"}
                </p>
              </div>
              <button
                onClick={() => onDelete(pago.id)}
                className="text-red-600 hover:text-red-800 p-1 transition"
                title="Eliminar pago"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Documento:</span>
                <span className="font-medium">
                  {pago.documentoTipo && pago.documentoNumero
                    ? `${pago.documentoTipo} ${pago.documentoNumero}`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Monto:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(pago.monto)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Forma de Pago:</span>
                <span className="font-medium">
                  {pago.detallesPago && pago.detallesPago.length > 0 ? (
                    <div className="text-right">
                      {pago.detallesPago.map((detalle, idx) => (
                        <div key={idx} className="text-xs">
                          {detalle.formaPago}: {formatCurrency(detalle.monto)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    pago.formaPago
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium">{formatDate(pago.fecha)}</span>
              </div>

              {pago.descripcion && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">Descripción:</p>
                  <p className="text-xs text-gray-800 mt-1">
                    {pago.descripcion}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Total en Mobile */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-300 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">TOTAL PAGADO:</span>
            <span className="font-bold text-green-700 text-xl">
              {formatCurrency(totales.totalPagado)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-green-200 pt-2">
            <span className="text-gray-700">Documentos con pagos:</span>
            <span className="font-semibold text-gray-900">
              {totales.cantidadDocumentos}
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
                  Cliente
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Factura/Remito
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Monto
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Forma de Pago
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Descripción
                </th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {pago.clienteNombre}
                  </td>
                  <td className="px-6 py-4">
                    {pago.documentoTipo && pago.documentoNumero
                      ? `${pago.documentoTipo} ${pago.documentoNumero}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4">{pago.documentoEmpresa || "-"}</td>
                  <td className="px-6 py-4 font-semibold text-green-600">
                    {formatCurrency(pago.monto)}
                  </td>
                  <td className="px-6 py-4">
                    {pago.detallesPago && pago.detallesPago.length > 0 ? (
                      <div className="space-y-1">
                        {pago.detallesPago.map((detalle, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">
                              {detalle.formaPago}
                            </span>
                            :{" "}
                            <span className="text-green-600">
                              {formatCurrency(detalle.monto)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      pago.formaPago
                    )}
                  </td>
                  <td className="px-6 py-4">{formatDate(pago.fecha)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {pago.descripcion || "-"}
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button
                      onClick={() => onDelete(pago.id)}
                      className="text-red-600 hover:text-red-800 p-1 transition"
                      title="Eliminar pago"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td
                  colSpan="3"
                  className="px-6 py-4 text-right font-bold text-gray-900"
                >
                  TOTALES:
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-green-700 text-base">
                    {formatCurrency(totales.totalPagado)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Pagado</div>
                </td>
                <td colSpan="2" className="px-6 py-4">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Documentos con pagos:
                      </span>
                      <span className="font-semibold">
                        {totales.cantidadDocumentos}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-600">Total de pagos:</span>
                      <span className="font-semibold">{pagos.length}</span>
                    </div>
                  </div>
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
