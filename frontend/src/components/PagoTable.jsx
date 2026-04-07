import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function PagoTable({ pagos, onDelete }) {
  const [tooltipVisible, setTooltipVisible] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    top: 0,
    left: 0,
    showBelow: false,
  });

  const showTooltip = (e, id) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const showBelow = spaceAbove < 300 || spaceBelow > spaceAbove;

    let leftPosition = rect.left;
    if (viewportWidth < 1024) {
      leftPosition = Math.max(8, Math.min(rect.left, viewportWidth - 320));
    }

    setTooltipPosition({
      top: showBelow ? rect.bottom : rect.top,
      left: leftPosition,
      showBelow,
    });
    setTooltipVisible(id);
  };

  const toggleTooltip = (e, id) => {
    e.stopPropagation();
    if (tooltipVisible === id) {
      setTooltipVisible(null);
    } else {
      showTooltip(e, id);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tooltipVisible &&
        !event.target.closest(".tooltip-trigger") &&
        !event.target.closest(".tooltip-content")
      ) {
        setTooltipVisible(null);
      }
    };

    const handleScroll = () => {
      if (tooltipVisible) {
        setTooltipVisible(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [tooltipVisible]);

  const agruparDetallesPago = (detalles) => {
    if (!detalles || detalles.length === 0) return [];

    const grupos = new Map();

    detalles.forEach((detalle) => {
      let clave = detalle.formaPago;

      if (detalle.formaPago === "Cheque" || detalle.formaPago === "E-Cheq") {
        clave += `_${detalle.numeroCheque || ""}_${detalle.fechaCobro || ""}_${detalle.banco || ""}`;
      } else if (
        detalle.formaPago === "Transferencia" ||
        detalle.formaPago === "Deposito"
      ) {
        clave += `_${detalle.fecha || ""}_${detalle.banco || ""}`;
      }

      if (grupos.has(clave)) {
        const grupo = grupos.get(clave);
        grupo.monto =
          Math.round((grupo.monto + (detalle.monto || 0)) * 100) / 100;
      } else {
        grupos.set(clave, { ...detalle });
      }
    });

    return Array.from(grupos.values());
  };

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

  const formatFacturasAplicadas = (pago) => {
    if (pago.detallesPago && pago.detallesPago.length > 0) {
      const facturasMap = new Map();

      pago.detallesPago
        .filter((d) => d.documentoId)
        .forEach((d) => {
          const key = d.documentoId;
          if (!facturasMap.has(key)) {
            facturasMap.set(key, {
              id: d.documentoId,
              tipo: d.documentoTipo || pago.documentoTipo,
              numero: d.documentoNumero || pago.documentoNumero,
              monto: 0,
            });
          }
          facturasMap.get(key).monto += d.monto || 0;
        });

      const facturasUnicas = Array.from(facturasMap.values());

      if (facturasUnicas.length === 0) {
        if (pago.documentoTipo && pago.documentoNumero) {
          return `${pago.documentoTipo} ${pago.documentoNumero}`;
        }
        return "-";
      }

      if (facturasUnicas.length === 1) {
        return `${facturasUnicas[0].tipo} ${facturasUnicas[0].numero}`;
      }

      const primera = facturasUnicas[0];
      const resto = facturasUnicas.length - 1;
      const tooltipId = `tooltip-facturas-${pago.id}`;

      return (
        <div className="relative inline-block">
          <div
            className="cursor-pointer inline-block tooltip-trigger"
            onClick={(e) => toggleTooltip(e, tooltipId)}
            onMouseEnter={(e) =>
              window.innerWidth >= 1024 && showTooltip(e, tooltipId)
            }
            onMouseLeave={() =>
              window.innerWidth >= 1024 && setTooltipVisible(null)
            }
          >
            {primera.tipo} {primera.numero}
            <span
              className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "#e3edf7", color: "#1F3A5F" }}
            >
              +{resto}
            </span>
          </div>
          {tooltipVisible === tooltipId && (
            <div
              className="fixed z-[9999] tooltip-content"
              style={{
                top: tooltipPosition.showBelow
                  ? tooltipPosition.top + 8
                  : tooltipPosition.top - 8,
                left: tooltipPosition.left,
                transform: tooltipPosition.showBelow
                  ? "translateY(0)"
                  : "translateY(-100%)",
                maxHeight: tooltipPosition.showBelow
                  ? "calc(100vh - " + (tooltipPosition.top + 16) + "px)"
                  : "calc(" + (tooltipPosition.top - 16) + "px)",
              }}
            >
              <div
                className="text-white text-xs rounded-xl py-3 px-4 shadow-2xl border-2 max-w-[calc(100vw-16px)] lg:max-w-md overflow-y-auto"
                style={{
                  background:
                    "linear-gradient(to bottom right, #1F3A5F, #3E6BA8)",
                  borderColor: "#3E6BA8",
                  maxHeight: "inherit",
                }}
              >
                <div className="font-bold mb-2 text-sm text-blue-100 border-b border-blue-400 pb-1 whitespace-nowrap">
                  📋 Facturas Aplicadas
                </div>
                <div className="space-y-1.5 mt-2">
                  {facturasUnicas.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 bg-white/10 rounded-lg px-2 py-1.5 backdrop-blur-sm whitespace-nowrap"
                    >
                      <span className="font-medium text-white">
                        {f.tipo} {f.numero}
                      </span>
                      <span className="font-bold text-blue-200">
                        {formatCurrency(f.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fallback si no hay detalles
    if (pago.documentoTipo && pago.documentoNumero) {
      return `${pago.documentoTipo} ${pago.documentoNumero}`;
    }
    return "-";
  };

  const totalPagado = pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);

  const calcularTotales = () => {
    const documentosUnicos = new Map();

    pagos.forEach((pago) => {
      if (pago.documentoId) {
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
    <div className="space-y-4" style={{ overflow: "visible" }}>
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
                onClick={() => onDelete(pago)}
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
                  {formatFacturasAplicadas(pago)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Monto:</span>
                <span className="font-bold" style={{ color: "#5FB49C" }}>
                  {formatCurrency(pago.monto)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Forma de Pago:</span>
                <span className="font-medium">
                  {pago.detallesPago && pago.detallesPago.length > 0 ? (
                    <div className="text-right space-y-2">
                      {agruparDetallesPago(pago.detallesPago).map(
                        (detalle, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-gray-50 p-2 rounded border border-gray-200"
                          >
                            <div className="font-semibold text-gray-900">
                              {detalle.formaPago}:{" "}
                              {formatCurrency(detalle.monto)}
                            </div>
                            {(detalle.formaPago === "Cheque" ||
                              detalle.formaPago === "E-Cheq") && (
                              <div className="mt-1 space-y-0.5 text-gray-600">
                                {detalle.numeroCheque && (
                                  <div>N°: {detalle.numeroCheque}</div>
                                )}
                                {detalle.fechaCobro && (
                                  <div>
                                    Cobro: {formatDate(detalle.fechaCobro)}
                                  </div>
                                )}
                                {detalle.banco && (
                                  <div>Banco: {detalle.banco}</div>
                                )}
                              </div>
                            )}
                            {detalle.formaPago === "Transferencia" && (
                              <div className="mt-1 space-y-0.5 text-gray-600">
                                {detalle.fecha && (
                                  <div>Fecha: {formatDate(detalle.fecha)}</div>
                                )}
                                {detalle.banco && (
                                  <div>Banco: {detalle.banco}</div>
                                )}
                              </div>
                            )}
                            {detalle.formaPago === "Deposito" && (
                              <div className="mt-1 space-y-0.5 text-gray-600">
                                {detalle.fecha && (
                                  <div>Fecha: {formatDate(detalle.fecha)}</div>
                                )}
                                {detalle.banco && (
                                  <div>Banco: {detalle.banco}</div>
                                )}
                              </div>
                            )}
                          </div>
                        ),
                      )}
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

        <div
          className="rounded-lg p-4 border-2 space-y-2"
          style={{
            background: "linear-gradient(to right, #e6f4f1, #d4ede7)",
            borderColor: "#5FB49C",
          }}
        >
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

      <div className="hidden lg:block mt-24">
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm" style={{ position: "relative" }}>
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
                  Observación
                </th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody
              className="[&_tr]:overflow-visible"
              style={{ position: "relative", zIndex: 2 }}
            >
              {pagos.map((pago) => (
                <tr
                  key={pago.id}
                  className="border-b hover:bg-gray-50 overflow-visible"
                >
                  <td className="px-6 py-5 font-medium">
                    {pago.clienteNombre}
                  </td>
                  <td className="px-6 py-5 relative overflow-visible">
                    {formatFacturasAplicadas(pago)}
                  </td>
                  <td className="px-6 py-5">{pago.documentoEmpresa || "-"}</td>
                  <td
                    className="px-6 py-5 font-semibold"
                    style={{ color: "#5FB49C" }}
                  >
                    {formatCurrency(pago.monto)}
                  </td>
                  <td className="px-6 py-5 relative overflow-visible">
                    {pago.detallesPago && pago.detallesPago.length > 0
                      ? (() => {
                          const detallesAgrupados = agruparDetallesPago(
                            pago.detallesPago,
                          );

                          if (detallesAgrupados.length === 1) {
                            const detalle = detallesAgrupados[0];
                            return (
                              <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                                <div className="font-semibold">
                                  <span className="text-gray-900">
                                    {detalle.formaPago}
                                  </span>
                                  :{" "}
                                  <span style={{ color: "#5FB49C" }}>
                                    {formatCurrency(detalle.monto)}
                                  </span>
                                </div>
                                {(detalle.formaPago === "Cheque" ||
                                  detalle.formaPago === "E-Cheq") && (
                                  <div className="mt-1 space-y-0.5 text-gray-600">
                                    {detalle.numeroCheque && (
                                      <div>N°: {detalle.numeroCheque}</div>
                                    )}
                                    {detalle.fechaCobro && (
                                      <div>
                                        Cobro: {formatDate(detalle.fechaCobro)}
                                      </div>
                                    )}
                                    {detalle.banco && (
                                      <div>Banco: {detalle.banco}</div>
                                    )}
                                  </div>
                                )}
                                {detalle.formaPago === "Transferencia" && (
                                  <div className="mt-1 space-y-0.5 text-gray-600">
                                    {detalle.fecha && (
                                      <div>
                                        Fecha: {formatDate(detalle.fecha)}
                                      </div>
                                    )}
                                    {detalle.banco && (
                                      <div>Banco: {detalle.banco}</div>
                                    )}
                                  </div>
                                )}
                                {detalle.formaPago === "Deposito" && (
                                  <div className="mt-1 space-y-0.5 text-gray-600">
                                    {detalle.fecha && (
                                      <div>
                                        Fecha: {formatDate(detalle.fecha)}
                                      </div>
                                    )}
                                    {detalle.banco && (
                                      <div>Banco: {detalle.banco}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Múltiples formas de pago - mostrar tooltip
                          const primera = detallesAgrupados[0];
                          const resto = detallesAgrupados.length - 1;
                          const tooltipId = `tooltip-formas-${pago.id}`;

                          return (
                            <div className="relative inline-block">
                              <div
                                className="cursor-pointer inline-block text-xs bg-gray-50 p-2 rounded border border-gray-200 tooltip-trigger"
                                onClick={(e) => toggleTooltip(e, tooltipId)}
                                onMouseEnter={(e) =>
                                  window.innerWidth >= 1024 &&
                                  showTooltip(e, tooltipId)
                                }
                                onMouseLeave={() =>
                                  window.innerWidth >= 1024 &&
                                  setTooltipVisible(null)
                                }
                              >
                                <span className="font-semibold text-gray-900">
                                  {primera.formaPago}
                                </span>
                                :{" "}
                                <span
                                  className="font-semibold"
                                  style={{ color: "#5FB49C" }}
                                >
                                  {formatCurrency(primera.monto)}
                                </span>
                                <span
                                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                  style={{
                                    backgroundColor: "#e3edf7",
                                    color: "#1F3A5F",
                                  }}
                                >
                                  +{resto}
                                </span>
                              </div>
                              {tooltipVisible === tooltipId && (
                                <div
                                  className="fixed z-[9999] tooltip-content"
                                  style={{
                                    top: tooltipPosition.showBelow
                                      ? tooltipPosition.top + 8
                                      : tooltipPosition.top - 8,
                                    left: tooltipPosition.left,
                                    transform: tooltipPosition.showBelow
                                      ? "translateY(0)"
                                      : "translateY(-100%)",
                                    maxHeight: tooltipPosition.showBelow
                                      ? "calc(100vh - " +
                                        (tooltipPosition.top + 16) +
                                        "px)"
                                      : "calc(" +
                                        (tooltipPosition.top - 16) +
                                        "px)",
                                  }}
                                >
                                  <div
                                    className="text-white text-xs rounded-xl py-3 px-4 shadow-2xl border-2 max-w-[calc(100vw-16px)] lg:max-w-md overflow-y-auto"
                                    style={{
                                      background:
                                        "linear-gradient(to bottom right, #1F3A5F, #3E6BA8)",
                                      borderColor: "#3E6BA8",
                                      maxHeight: "inherit",
                                    }}
                                  >
                                    <div className="font-bold mb-2 text-sm text-blue-100 border-b border-blue-400 pb-1 whitespace-nowrap">
                                      💳 Formas de Pago
                                    </div>
                                    <div className="space-y-2 mt-2">
                                      {detallesAgrupados.map((detalle, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm"
                                        >
                                          <div className="flex items-center justify-between gap-3 mb-1 whitespace-nowrap">
                                            <span className="font-semibold text-white">
                                              {detalle.formaPago}
                                            </span>
                                            <span className="font-bold text-blue-200">
                                              {formatCurrency(detalle.monto)}
                                            </span>
                                          </div>
                                          {(detalle.formaPago === "Cheque" ||
                                            detalle.formaPago === "E-Cheq") && (
                                            <div className="text-xs text-blue-100 space-y-0.5 mt-1">
                                              {detalle.numeroCheque && (
                                                <div>
                                                  N°: {detalle.numeroCheque}
                                                </div>
                                              )}
                                              {detalle.fechaCobro && (
                                                <div>
                                                  Cobro:{" "}
                                                  {formatDate(
                                                    detalle.fechaCobro,
                                                  )}
                                                </div>
                                              )}
                                              {detalle.banco && (
                                                <div>
                                                  Banco: {detalle.banco}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {(detalle.formaPago ===
                                            "Transferencia" ||
                                            detalle.formaPago ===
                                              "Deposito") && (
                                            <div className="text-xs text-blue-100 space-y-0.5 mt-1">
                                              {detalle.fecha && (
                                                <div>
                                                  Fecha:{" "}
                                                  {formatDate(detalle.fecha)}
                                                </div>
                                              )}
                                              {detalle.banco && (
                                                <div>
                                                  Banco: {detalle.banco}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      : pago.formaPago}
                  </td>
                  <td className="px-6 py-5">{formatDate(pago.fecha)}</td>
                  <td className="px-6 py-5 text-gray-600">
                    {pago.descripcion || "-"}
                  </td>
                  <td className="px-6 py-5 flex justify-center gap-2">
                    <button
                      onClick={() => onDelete(pago)}
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
