import { seedData } from "./seed";
import type { KaizoData } from "./types";

const STORAGE_KEY = "kaizo.local.v1";

export interface DataRepository {
  load(): KaizoData;
  save(data: KaizoData): void;
  reset(): KaizoData;
}

const normalizeData = (data: KaizoData): KaizoData => ({
  ...data,
  orders: data.orders.map((order) => ({ ...order, evidences: order.evidences ?? [] })),
});

const cloneSeed = (): KaizoData => normalizeData(JSON.parse(JSON.stringify(seedData)) as KaizoData);

export const localRepository: DataRepository = {
  load() {
    if (typeof window === "undefined") return cloneSeed();
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeData(JSON.parse(saved) as KaizoData) : cloneSeed();
    } catch {
      return cloneSeed();
    }
  },
  save(data) {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  reset() {
    const data = cloneSeed();
    this.save(data);
    return data;
  },
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

export const serviceOrderService = {
  upsert: (data: KaizoData, order: KaizoData["orders"][number]) => ({ ...data, orders: data.orders.some((item) => item.id === order.id) ? data.orders.map((item) => item.id === order.id ? order : item) : [order, ...data.orders] }),
};

export const paymentService = {
  upsert: (data: KaizoData, payment: KaizoData["payments"][number]) => ({ ...data, payments: data.payments.some((item) => item.id === payment.id) ? data.payments.map((item) => item.id === payment.id ? payment : item) : [payment, ...data.payments] }),
};

export const settingsService = {
  update: (data: KaizoData, company: KaizoData["company"]) => ({ ...data, company }),
};
