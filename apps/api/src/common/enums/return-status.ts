/**
 * Processing state of a buyer return request.
 */
export enum ReturnStatus {
  REQUESTED = "requested",
  APPROVED = "approved",
  IN_TRANSIT = "in_transit",
  RECEIVED = "received",
  REJECTED = "rejected",
}
