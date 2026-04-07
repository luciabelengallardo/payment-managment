import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  type = "danger",
  isLoading = false,
  requireTextConfirmation = null,
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const isConfirmationValid = requireTextConfirmation
    ? confirmationText === requireTextConfirmation
    : true;

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: "#FEE2E2",
      border: "#EF4444",
      icon: "#DC2626",
      button: "#DC2626",
      buttonHover: "#B91C1C",
    },
    warning: {
      bg: "#FEF3C7",
      border: "#F59E0B",
      icon: "#D97706",
      button: "#D97706",
      buttonHover: "#B45309",
    },
  };

  const color = colors[type];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl animate-fadeIn">
        <div
          className="border-b-2 p-4 flex items-center justify-between"
          style={{ borderColor: color.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: color.bg }}
            >
              <AlertTriangle
                className="w-6 h-6"
                style={{ color: color.icon }}
              />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>

          {requireTextConfirmation && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escribe{" "}
                <span className="font-bold text-gray-900">
                  {requireTextConfirmation}
                </span>{" "}
                para confirmar:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={isLoading}
                placeholder={requireTextConfirmation}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 flex gap-3 justify-end rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || !isConfirmationValid}
            className="px-4 py-2 rounded-lg font-medium text-white transition disabled:opacity-50 flex items-center gap-2"
            style={{
              backgroundColor:
                isLoading || !isConfirmationValid ? "#9CA3AF" : color.button,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = color.buttonHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = color.button;
              }
            }}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            {isLoading ? "Eliminando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
