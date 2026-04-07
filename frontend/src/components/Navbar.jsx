import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Sesión cerrada exitosamente");
    navigate("/login");
  };

  const handleNavClick = (path) => {
    if (location.pathname === path) {
      // Si ya estamos en la misma ruta, forzar recarga
      window.location.reload();
    } else {
      // Si es una ruta diferente, navegar normalmente
      navigate(path);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logopm.png"
              alt="Payment Manager"
              className="h-10 md:h-12 w-auto"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleNavClick("/dashboard")}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => handleNavClick("/pagos")}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium"
            >
              Pagos
            </button>
            <button
              onClick={() => handleNavClick("/clientes")}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium"
            >
              Clientes
            </button>
            <button
              onClick={() => handleNavClick("/facturas")}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium"
            >
              Facturas
            </button>
            {user.role === "admin" && (
              <button
                onClick={() => handleNavClick("/usuarios")}
                className="text-gray-600 hover:text-[#1F3A5F] font-medium"
              >
                Usuarios
              </button>
            )}

            {/* User Info & Logout */}
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: "#1F3A5F" }}
                >
                  {user.name?.charAt(0) || <User className="w-4 h-4" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    Vista:{" "}
                    <span className="font-semibold">
                      {user.tenant || "cliente"}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition hover:bg-red-50"
                style={{ color: "#E76F51" }}
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-primary"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-3">
            {/* User Info Mobile */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: "#1F3A5F" }}
              >
                {user.name?.charAt(0) || <User className="w-4 h-4" />}
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-medium text-gray-700">
                  {user.name}
                </span>
                <span className="text-xs text-gray-500">
                  <span className="capitalize">{user.role}</span> • Vista:{" "}
                  <span className="font-semibold capitalize">
                    {user.tenant || "cliente"}
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                handleNavClick("/dashboard");
                setIsMenuOpen(false);
              }}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium py-2 px-3 rounded-lg hover:bg-gray-100 text-left"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                handleNavClick("/pagos");
                setIsMenuOpen(false);
              }}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium py-2 px-3 rounded-lg hover:bg-gray-100 text-left"
            >
              Pagos
            </button>
            <button
              onClick={() => {
                handleNavClick("/clientes");
                setIsMenuOpen(false);
              }}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium py-2 px-3 rounded-lg hover:bg-gray-100 text-left"
            >
              Clientes
            </button>
            <button
              onClick={() => {
                handleNavClick("/facturas");
                setIsMenuOpen(false);
              }}
              className="text-gray-600 hover:text-[#1F3A5F] font-medium py-2 px-3 rounded-lg hover:bg-gray-100 text-left"
            >
              Facturas
            </button>

            {user.role === "admin" && (
              <button
                onClick={() => {
                  handleNavClick("/usuarios");
                  setIsMenuOpen(false);
                }}
                className="text-gray-600 hover:text-[#1F3A5F] font-medium py-2 px-3 rounded-lg hover:bg-gray-100 text-left"
              >
                Usuarios
              </button>
            )}

            <button
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 hover:bg-red-50 font-medium py-2 px-3 rounded-lg transition mt-2"
              style={{ color: "#E76F51" }}
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
