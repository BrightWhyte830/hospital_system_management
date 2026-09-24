const ROLE_DEFINITIONS = {
  hospital_manager: {
    label: 'Hospital Manager',
    permissions: ['view_appointments', 'manage_requests', 'manage_complaints', 'manage_messages', 'view_it'],
  },
  doctor: {
    label: 'Doctor',
    permissions: ['view_appointments', 'manage_requests', 'manage_complaints'],
  },
  nurse: {
    label: 'Nurse',
    permissions: ['view_appointments', 'manage_requests', 'manage_complaints'],
  },
  nurse_manager: {
    label: 'Nurse Manager',
    permissions: ['view_appointments', 'manage_requests', 'manage_complaints', 'manage_messages'],
  },
  receptionist: {
    label: 'Receptionist',
    permissions: ['view_appointments', 'manage_messages'],
  },
  mortuary_officer: {
    label: 'Mortuary Officer',
    permissions: ['view_appointments', 'manage_requests'],
  },
  lab_technician: {
    label: 'Laboratory Technician',
    permissions: ['view_appointments', 'manage_requests'],
  },
  pharmacist: {
    label: 'Pharmacist',
    permissions: ['view_appointments', 'manage_requests'],
  },
  radiographer: {
    label: 'Radiographer',
    permissions: ['view_appointments', 'manage_requests'],
  },
  physiotherapist: {
    label: 'Physiotherapist',
    permissions: ['view_appointments', 'manage_requests'],
  },
  records_officer: {
    label: 'Medical Records Officer',
    permissions: ['view_appointments', 'manage_messages'],
  },
  billing_officer: {
    label: 'Billing Officer',
    permissions: ['view_appointments', 'manage_messages'],
  },
  health_information_officer: {
    label: 'Health Information Officer',
    permissions: ['view_appointments', 'manage_messages', 'view_it'],
  },
  infection_control_specialist: {
    label: 'Infection Control Specialist',
    permissions: ['view_appointments', 'manage_requests', 'manage_complaints'],
  },
  clinical_auditor: {
    label: 'Clinical Auditor',
    permissions: ['view_appointments', 'manage_complaints', 'manage_messages'],
  },
  telehealth_coordinator: {
    label: 'Telehealth Coordinator',
    permissions: ['view_appointments', 'manage_messages'],
  },
  it_support: {
    label: 'IT Support',
    permissions: ['view_it', 'manage_it'],
  },
  facility_it_manager: {
    label: 'Facility IT Manager',
    permissions: ['view_it', 'manage_it', 'manage_messages'],
  },
  security_officer: {
    label: 'Security Officer',
    permissions: ['view_appointments'],
  },
};

function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'staff' && !user.jobRole) return true;
  return Boolean(ROLE_DEFINITIONS[user.jobRole]?.permissions.includes(permission));
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ error: `Your hospital role does not permit: ${permission.replaceAll('_', ' ')}.` });
    }
    next();
  };
}

function roleCatalog() {
  return Object.entries(ROLE_DEFINITIONS).map(([value, definition]) => ({
    value,
    label: definition.label,
    permissions: definition.permissions,
  }));
}

module.exports = { ROLE_DEFINITIONS, hasPermission, requirePermission, roleCatalog };
