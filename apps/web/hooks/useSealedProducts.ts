import { useQuery } from "@tanstack/react-query";
import {
  SealedProductFilters,
  sealedProductService,
} from "@/services/sealed-product.service";

export function useSealedProducts(filters: SealedProductFilters = {}) {
  return useQuery({
    queryKey: ["sealed-products", "paginated", filters],
    queryFn: () => sealedProductService.getPaginated(filters),
  });
}

export function useSealedProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["sealed-products", id],
    queryFn: () => sealedProductService.getById(id!),
    enabled: !!id,
  });
}

export function useSealedProductListings(id: string | undefined) {
  return useQuery({
    queryKey: ["sealed-products", id, "listings"],
    queryFn: () => sealedProductService.getListings(id!),
    enabled: !!id,
  });
}
