const getStatusColor = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-green-500 hover:bg-green-600";
    case "Pending":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "Shipped":
      return "bg-blue-500 hover:bg-blue-600";
    case "Cancelled":
      return "bg-red-500 hover:bg-red-600";
    default:
      return "bg-gray-500";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "Paid":
      return "Payée";
    case "Pending":
      return "En attente";
    case "Shipped":
      return "Expédiée";
    case "Cancelled":
      return "Annulée";
    default:
      return status;
  }
};

export { getStatusColor, getStatusLabel };
