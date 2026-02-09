import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Payment Manager"
              className="h-8 md:h-10 w-auto"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-primary font-medium"
            >
              Dashboard
            </Link>
            <Link
              to="/pagos"
              className="text-gray-600 hover:text-primary font-medium"
            >
              Pagos
            </Link>
            <Link
              to="/clientes"
              className="text-gray-600 hover:text-primary font-medium"
            >
              Clientes
            </Link>
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
            <Link
              to="/"
              className="text-gray-600 hover:text-primary font-medium py-2 px-3 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/pagos"
              className="text-gray-600 hover:text-primary font-medium py-2 px-3 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              Pagos
            </Link>
            <Link
              to="/clientes"
              className="text-gray-600 hover:text-primary font-medium py-2 px-3 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              Clientes
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
