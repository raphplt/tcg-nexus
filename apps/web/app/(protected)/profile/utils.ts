const getUserInitials = (firstName: string, lastName: string) => {
  return (
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() ||
    "U"
  );
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-red-500 text-white";
    case "moderator":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case "admin":
      return "Administrateur";
    case "moderator":
      return "Modérateur";
    default:
      return "Utilisateur";
  }
};

export { getUserInitials, getRoleBadgeColor, getRoleLabel };
