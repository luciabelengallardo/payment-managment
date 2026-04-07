// Middleware para filtrar datos por tenant
// Admin ve solo datos del tenant 'cliente' (juliogallardo)
// Demo ve solo sus propios datos y está completamente aislado
// Cliente ve solo sus propios datos

export function filterByTenant(req, res, next) {
  req.userTenant = req.user.tenant;
  req.isAdmin = req.user.role === "admin";
  next();
}

// Helper para construir condiciones WHERE con tenant
export function getTenantCondition(req, baseWhere = "") {
  // Todos los usuarios (admin, cliente, demo) ven solo su tenant
  // Admin tiene tenant 'cliente', entonces ve los datos de cliente
  // Demo tiene tenant 'demo', entonces ve solo datos de demo
  const tenantWhere = `tenant = '${req.userTenant}'`;

  if (baseWhere) {
    return `${baseWhere} AND ${tenantWhere}`;
  }

  return `WHERE ${tenantWhere}`;
}

// Helper para agregar tenant a datos nuevos
export function addTenantToData(req, data) {
  // Todos siempre usan su propio tenant
  // Esto asegura que demo nunca cree datos en tenant 'cliente'
  return {
    ...data,
    tenant: req.userTenant,
  };
}

export default filterByTenant;
