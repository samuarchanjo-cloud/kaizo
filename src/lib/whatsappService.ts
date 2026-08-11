import type { Budget, CompanySettings, Customer, Vehicle } from "./types";
import { hasCustomerSuppliedParts, orderCustomerTotal, orderLaborTotal, orderPartsCustomerTotal } from "./budgetCalculations";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const normalizeBrazilianPhone = (phone: string): string => {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length > 11) digits = digits.slice(1);
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  return digits;
};

export const buildQuoteWhatsAppMessage = ({ company, customer, vehicle, order }: { company: CompanySettings; customer: Customer; vehicle: Vehicle; order: Budget }) => {
  const parts = orderPartsCustomerTotal(order);
  const labor = orderLaborTotal(order);
  const deadline = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(order.dueDate));
  const customerSuppliedNote = hasCustomerSuppliedParts(order) ? "\n\nExistem itens neste orçamento que serão fornecidos pelo cliente e não estão incluídos no valor total." : "";

  return `Olá, ${customer.name}! 👋\n\nSeu orçamento referente ao ${vehicle.brand} ${vehicle.model}, placa ${vehicle.plate}, está pronto.\n\nOrçamento #${order.number}\n\nPeças: ${currency(parts)}\nMão de obra: ${currency(labor)}\nTotal: ${currency(orderCustomerTotal(order))}\n\nPrevisão de conclusão: ${deadline}\n\nConfira abaixo os valores enviados pela ${company.name}.${customerSuppliedNote}`;
};

export const openQuoteInWhatsApp = (details: { company: CompanySettings; customer: Customer; vehicle: Vehicle; order: Budget }) => {
  const phone = normalizeBrazilianPhone(details.customer.phone);
  if (!/^55\d{10,11}$/.test(phone)) return false;
  const message = buildQuoteWhatsAppMessage(details);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  return true;
};
