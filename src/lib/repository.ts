import { seedData } from "./seed";
import type { Budget, BudgetStatus, EntryStatus, KaizoData, ServiceEntry, ServiceOrder, ServiceOrderStatus } from "./types";

const STORAGE_KEY = "kaizo.local.v1";

export interface DataRepository {
  load(): KaizoData;
  save(data: KaizoData): void;
  reset(): KaizoData;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const normalizeBudget = (budget: Budget): Budget => ({ ...budget, parts: (budget.parts ?? []).map((part) => ({ ...part, responsibility: part.responsibility ?? "Oficina", additionalCosts: part.additionalCosts ?? [] })), labor: budget.labor ?? [], timeline: budget.timeline ?? [] });

const normalizeData = (data: KaizoData): KaizoData => ({
  ...data,
  company: { ...data.company, accent: "#2563EB" },
  entries: (data.entries ?? []).map((entry) => ({ ...entry, evidences: entry.evidences ?? [], timeline: entry.timeline ?? [] })),
  budgets: (data.budgets ?? []).map(normalizeBudget),
  orders: data.orders ?? [],
  payments: data.payments ?? [],
  appointments: data.appointments ?? [],
  postSales: data.postSales ?? [],
  notifications: data.notifications ?? [],
});

type LegacyOrder = Record<string, unknown> & {
  id: string; number: number; customerId: string; vehicleId: string; mileageIn: number; reportedProblem: string;
  technicalNotes: string; recommendations: string; tags: string[]; priority: ServiceEntry["priority"]; dueDate: string;
  notes: string; status: string; parts: Budget["parts"]; labor: Budget["labor"]; evidences?: ServiceEntry["evidences"];
  quoteMessage: string; createdAt: string; updatedAt: string; timeline: ServiceEntry["timeline"];
};

const migrateLegacyData = (raw: Record<string, unknown>): KaizoData => {
  const legacyOrders = (raw.orders as LegacyOrder[] | undefined) ?? [];
  const entries: ServiceEntry[] = [];
  const budgets: Budget[] = [];
  const orders: ServiceOrder[] = [];
  const orderIdMap = new Map<string, string>();

  legacyOrders.forEach((legacy, index) => {
    const entryId = `entry-${legacy.id}`;
    const budgetId = `budget-${legacy.id}`;
    const hasBudget = legacy.status !== "Em diagnóstico";
    const entryStatus: EntryStatus = !hasBudget ? "Em diagnóstico" : ["Recusado", "Cancelado", "Em serviço", "Finalizado", "Entregue"].includes(legacy.status) ? "Encerrado" : "Orçamento criado";
    entries.push({ id: entryId, number: 2000 + legacyOrders.length - index, customerId: legacy.customerId, vehicleId: legacy.vehicleId, mileageIn: legacy.mileageIn, reportedProblem: legacy.reportedProblem, technicalNotes: legacy.technicalNotes ?? "", recommendations: legacy.recommendations ?? "", tags: legacy.tags ?? [], priority: legacy.priority ?? "Normal", initialDueDate: legacy.dueDate, notes: legacy.notes ?? "", status: entryStatus, evidences: (legacy.evidences ?? []).map((evidence) => ({ ...evidence, orderId: entryId })), createdAt: legacy.createdAt, updatedAt: legacy.updatedAt, timeline: legacy.timeline ?? [] });

    if (!hasBudget) return;
    const budgetStatus: BudgetStatus = legacy.status === "Recusado" || legacy.status === "Cancelado" ? "Recusado" : legacy.status === "Aguardando aprovação" || legacy.status === "Orçamento enviado" ? "Aguardando aprovação" : legacy.status === "Aprovado" || ["Em serviço", "Finalizado", "Entregue"].includes(legacy.status) ? "Aprovado" : "Rascunho";
    budgets.push(normalizeBudget({ id: budgetId, number: 3000 + legacyOrders.length - index, entryId, status: budgetStatus, parts: legacy.parts ?? [], labor: legacy.labor ?? [], quoteMessage: legacy.quoteMessage ?? "", dueDate: legacy.dueDate, createdAt: legacy.createdAt, updatedAt: legacy.updatedAt, timeline: legacy.timeline ?? [] }));

    const statusMap: Record<string, ServiceOrderStatus> = { "Em serviço": "Em serviço", Finalizado: "Finalizado", Entregue: "Entregue" };
    if (statusMap[legacy.status]) {
      const orderId = `service-${legacy.id}`;
      orderIdMap.set(legacy.id, orderId);
      orders.push({ id: orderId, number: 850 + orders.length, entryId, budgetId, status: statusMap[legacy.status], createdAt: legacy.createdAt, updatedAt: legacy.updatedAt, timeline: legacy.timeline ?? [] });
    }
  });

  const data: KaizoData = {
    company: raw.company as KaizoData["company"], customers: (raw.customers as KaizoData["customers"]) ?? [], vehicles: (raw.vehicles as KaizoData["vehicles"]) ?? [],
    entries, budgets, orders,
    payments: ((raw.payments as KaizoData["payments"]) ?? []).flatMap((payment) => orderIdMap.has(payment.orderId) ? [{ ...payment, orderId: orderIdMap.get(payment.orderId)! }] : []),
    appointments: [], postSales: [], notifications: [],
  };
  return normalizeData(data);
};

const cloneSeed = (): KaizoData => normalizeData(clone(seedData));

export const localRepository: DataRepository = {
  load() {
    if (typeof window === "undefined") return cloneSeed();
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return cloneSeed();
      const raw = JSON.parse(saved) as Record<string, unknown>;
      return Array.isArray(raw.entries) ? normalizeData(raw as unknown as KaizoData) : migrateLegacyData(raw);
    } catch {
      return cloneSeed();
    }
  },
  save(data) { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); },
  reset() { const data = cloneSeed(); this.save(data); return data; },
};

export const customerService = {
  list: (data: KaizoData) => data.customers,
  upsert: (data: KaizoData, customer: KaizoData["customers"][number]) => ({ ...data, customers: data.customers.some((item) => item.id === customer.id) ? data.customers.map((item) => item.id === customer.id ? customer : item) : [customer, ...data.customers] }),
  remove: (data: KaizoData, id: string) => ({ ...data, customers: data.customers.filter((item) => item.id !== id) }),
};

export const vehicleService = {
  list: (data: KaizoData) => data.vehicles,
  upsert: (data: KaizoData, vehicle: KaizoData["vehicles"][number]) => ({ ...data, vehicles: data.vehicles.some((item) => item.id === vehicle.id) ? data.vehicles.map((item) => item.id === vehicle.id ? vehicle : item) : [vehicle, ...data.vehicles] }),
  remove: (data: KaizoData, id: string) => ({ ...data, vehicles: data.vehicles.filter((item) => item.id !== id) }),
};

export const settingsService = { update: (data: KaizoData, company: KaizoData["company"]) => ({ ...data, company: { ...company, accent: "#2563EB" } }) };
