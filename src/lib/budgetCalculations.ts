import type { Budget, ServiceOrderPart } from "./types";

export const isCustomerSuppliedPart = (part: ServiceOrderPart) => part.responsibility === "Cliente";

export const partBaseCost = (part: ServiceOrderPart) => isCustomerSuppliedPart(part) ? 0 : part.quantity * part.unitCost;
export const partAdditionalCost = (part: ServiceOrderPart) => isCustomerSuppliedPart(part) ? 0 : part.additionalCosts.reduce((sum, cost) => sum + cost.value, 0);
export const partRealCost = (part: ServiceOrderPart) => partBaseCost(part) + partAdditionalCost(part);
export const partCustomerTotal = (part: ServiceOrderPart) => isCustomerSuppliedPart(part) ? 0 : part.quantity * part.unitPrice;
export const partProfit = (part: ServiceOrderPart) => partCustomerTotal(part) - partRealCost(part);
export const partMargin = (part: ServiceOrderPart) => {
  const customerTotal = partCustomerTotal(part);
  return customerTotal > 0 ? (partProfit(part) / customerTotal) * 100 : 0;
};

export const orderPartsCustomerTotal = (order: Pick<Budget, "parts">) => order.parts.reduce((sum, part) => sum + partCustomerTotal(part), 0);
export const orderLaborTotal = (order: Pick<Budget, "labor">) => order.labor.reduce((sum, labor) => sum + labor.price, 0);
export const orderCustomerTotal = (order: Pick<Budget, "parts" | "labor">) => orderPartsCustomerTotal(order) + orderLaborTotal(order);
export const orderRealCost = (order: Pick<Budget, "parts">) => order.parts.reduce((sum, part) => sum + partRealCost(part), 0);
export const orderEstimatedProfit = (order: Pick<Budget, "parts" | "labor">) => orderCustomerTotal(order) - orderRealCost(order);
export const hasCustomerSuppliedParts = (order: Pick<Budget, "parts">) => order.parts.some(isCustomerSuppliedPart);
