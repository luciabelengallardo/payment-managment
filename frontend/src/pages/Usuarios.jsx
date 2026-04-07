import { useState, useEffect } from "react";
import axios from "../utils/axios";
import toast from "react-hot-toast";
import {
  Plus,
  Users,
  Mail,
  Shield,
  User,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "cliente",
    tenant: "cliente",
  });

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(response.data.data || []);
    } catch (error) {
      toast.error("Error al cargar usuarios");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success("Usuario creado exitosamente");
        setShowForm(false);
        setFormData({
          username: "",
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          role: "cliente",
          tenant: "cliente",
        });
        fetchUsuarios();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al crear usuario");
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/auth/users/${userId}/toggle`,
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`Usuario ${!isActive ? "activado" : "desactivado"}`);
      fetchUsuarios();
    } catch (error) {
      toast.error("Error al actualizar usuario");
    }
  };

  if (currentUser.role !== "admin") {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso Denegado
        </h2>
        <p className="text-gray-600">
          Solo los administradores pueden acceder a esta página
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-1">
            Administra los usuarios del sistema
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition duration-200"
          style={{ background: "linear-gradient(to right, #1F3A5F, #3E6BA8)" }}
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Formulario de Nuevo Usuario */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-blue-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Crear Nuevo Usuario
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="nombre.usuario"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan"
                />
              </div>

              {/* Apellido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Pérez"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="demo">Demo</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Tenant/Vista */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vista/Tenant *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="tenant"
                    value={formData.tenant}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="cliente">Cliente (Producción)</option>
                    <option value="demo">Demo (Pruebas)</option>
                    <option value="admin">Admin (Todo)</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  El tenant determina qué datos puede ver el usuario
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    username: "",
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    role: "cliente",
                    tenant: "cliente",
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition"
                style={{
                  background: "linear-gradient(to right, #1F3A5F, #3E6BA8)",
                }}
              >
                Crear Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Usuarios */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              className="text-white"
              style={{
                background: "linear-gradient(to right, #1F3A5F, #3E6BA8)",
              }}
            >
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Nombre Completo
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold">
                  Rol
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold">
                  Vista
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold">
                  Estado
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold">
                  Fecha Creación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{
                          background:
                            "linear-gradient(to bottom right, #1F3A5F, #3E6BA8)",
                        }}
                      >
                        {usuario.firstName?.charAt(0)}
                        {usuario.lastName?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">
                        {usuario.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{usuario.email}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {usuario.firstName} {usuario.lastName}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor:
                          usuario.role === "admin"
                            ? "#fce4ec"
                            : usuario.role === "demo"
                              ? "#e8f5f1"
                              : "#e3edf7",
                        color:
                          usuario.role === "admin"
                            ? "#E76F51"
                            : usuario.role === "demo"
                              ? "#5FB49C"
                              : "#1F3A5F",
                      }}
                    >
                      <Shield className="w-3 h-3" />
                      {usuario.role === "admin"
                        ? "Admin"
                        : usuario.role === "demo"
                          ? "Demo"
                          : "Cliente"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor:
                          usuario.tenant === "admin"
                            ? "#fef3e2"
                            : usuario.tenant === "demo"
                              ? "#e8f5f1"
                              : "#e3edf7",
                        color:
                          usuario.tenant === "admin"
                            ? "#F4A261"
                            : usuario.tenant === "demo"
                              ? "#5FB49C"
                              : "#1F3A5F",
                      }}
                    >
                      {usuario.tenant || "cliente"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: usuario.isActive
                          ? "#e8f5f1"
                          : "#f3f4f6",
                        color: usuario.isActive ? "#5FB49C" : "#6b7280",
                      }}
                    >
                      {usuario.isActive ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {usuario.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {new Date(usuario.createdAt).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {usuarios.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-6 text-white shadow-lg"
          style={{
            background: "linear-gradient(to bottom right, #1F3A5F, #3E6BA8)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Total Usuarios</p>
              <p className="text-3xl font-bold">{usuarios.length}</p>
            </div>
            <Users className="w-12 h-12 text-white/80" />
          </div>
        </div>

        <div
          className="rounded-xl p-6 text-white shadow-lg"
          style={{
            background: "linear-gradient(to bottom right, #E76F51, #e45539)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Administradores</p>
              <p className="text-3xl font-bold">
                {usuarios.filter((u) => u.role === "admin").length}
              </p>
            </div>
            <Shield className="w-12 h-12 text-white/80" />
          </div>
        </div>

        <div
          className="rounded-xl p-6 text-white shadow-lg"
          style={{
            background: "linear-gradient(to bottom right, #5FB49C, #4da08a)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Usuarios Activos</p>
              <p className="text-3xl font-bold">
                {usuarios.filter((u) => u.isActive).length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
