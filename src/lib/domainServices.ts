import {
  orderCustomerTotal,
  orderPartsCustomerTotal,
  orderRealCost,
} from "./budgetCalculations";
import type {
  Appointment,
  Budget,
  BudgetStatus,
  EntryStatus,
  KaizoData,
  Notification,
  Payment,
  PostSaleFollowUp,
  ServiceEntry,
  ServiceOrder,
  ServiceOrderStatus,
} from "./types";

export type PeriodKey =
  "today" | "yesterday" | "7d" | "30d" | "month" | "custom";
export type DateRange = { start: string; end: string };
export const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const event = (action: string, description: string) => ({
  id: createId("event"),
  date: now(),
  action,
  description,
});

const upsert = <T extends { id: string }>(items: T[], item: T) =>
  items.some((current) => current.id === item.id)
    ? items.map((current) => (current.id === item.id ? item : current))
    : [item, ...items];

const notification = (
  input: Omit<Notification, "id" | "read" | "createdAt">,
): Notification => ({
  id: createId("notification"),
  read: false,
  createdAt: now(),
  ...input,
});

const generateApprovedOrder = (data: KaizoData, budget: Budget) => {
  const existing = data.orders.find((order) => order.budgetId === budget.id);
  if (existing) return { data, order: existing };
  const order: ServiceOrder = {
    id: createId("order"),
    number: Math.max(850, ...data.orders.map((item) => item.number)) + 1,
    entryId: budget.entryId,
    budgetId: budget.id,
    status: "Em serviço",
    createdAt: now(),
    updatedAt: now(),
    timeline: [
      event(
        "OS gerada",
        `Ordem criada em serviço após aprovação do orçamento #${budget.number}.`,
      ),
    ],
  };
  const entry = data.entries.find((item) => item.id === budget.entryId);
  const updatedEntry: ServiceEntry | undefined = entry
    ? {
        ...entry,
        status: "Encerrado",
        updatedAt: now(),
        timeline: [
          ...entry.timeline,
          event(
            "OS gerada",
            `OS #${order.number} criada automaticamente após a aprovação.`,
          ),
        ],
      }
    : undefined;
  const entries = updatedEntry
    ? upsert(data.entries, updatedEntry)
    : data.entries;
  return { data: { ...data, orders: [order, ...data.orders], entries }, order };
};

export const entryService = {
  upsert: (data: KaizoData, entry: ServiceEntry) => ({
    ...data,
    entries: upsert(data.entries, entry),
  }),
  findBudget: (data: KaizoData, entryId: string) =>
    data.budgets.find((budget) => budget.entryId === entryId),
};

export const budgetService = {
  upsert: (data: KaizoData, budget: Budget) => ({
    ...data,
    budgets: upsert(data.budgets, budget),
  }),
  createFromEntry(data: KaizoData, entry: ServiceEntry) {
    const existing = data.budgets.find((budget) => budget.entryId === entry.id);
    if (existing) return { data, budget: existing };
    const budget: Budget = {
      id: createId("budget"),
      number: Math.max(3000, ...data.budgets.map((item) => item.number)) + 1,
      entryId: entry.id,
      status: "Aguardando aprovação",
      parts: [],
      labor: [],
      quoteMessage: data.company.quoteMessage,
      dueDate: entry.initialDueDate,
      createdAt: now(),
      updatedAt: now(),
      timeline: [
        event("Orçamento criado", "Proposta criada e incluída na fila de aprovação."),
      ],
    };
    const updatedEntry = {
      ...entry,
      status: "Orçamento criado" as const,
      updatedAt: now(),
      timeline: [
        ...entry.timeline,
        event("Orçamento criado", `Orçamento #${budget.number} iniciado.`),
      ],
    };
    return {
      data: {
        ...data,
        budgets: [budget, ...data.budgets],
        entries: upsert(data.entries, updatedEntry),
      },
      budget,
    };
  },
  changeStatus(data: KaizoData, budget: Budget, status: BudgetStatus) {
    const action =
      status === "Aguardando aprovação"
        ? "Orçamento enviado"
        : status === "Aprovado"
          ? "Orçamento aprovado"
          : status === "Recusado"
            ? "Orçamento recusado"
            : "Orçamento atualizado";
    const updated = {
      ...budget,
      status,
      updatedAt: now(),
      timeline: [
        ...budget.timeline,
        event(action, `Status atualizado para ${status}.`),
      ],
    };
    const entry = data.entries.find((item) => item.id === budget.entryId);
    let entries = data.entries;
    if (entry) {
      const entryStatus: EntryStatus =
        status === "Recusado" ? "Encerrado" : "Orçamento criado";
      entries = upsert(entries, {
        ...entry,
        status: entryStatus,
        updatedAt: now(),
        timeline: [
          ...entry.timeline,
          event(action, `Orçamento #${budget.number}: ${status}.`),
        ],
      });
    }
    let notifications = data.notifications;
    if (status === "Aprovado" || status === "Recusado") {
      const customer =
        entry && data.customers.find((item) => item.id === entry.customerId);
      notifications = [
        notification({
          kind: status === "Aprovado" ? "budget-approved" : "budget-rejected",
          title: action,
          message: `${customer?.name ?? "Cliente"} ${status === "Aprovado" ? "aprovou" : "recusou"} o orçamento #${budget.number}.`,
          entityKind: "budget",
          entityId: budget.id,
        }),
        ...notifications,
      ];
    }
    const result = {
      ...data,
      budgets: upsert(data.budgets, updated),
      entries,
      notifications,
    };
    return status === "Aprovado"
      ? generateApprovedOrder(result, updated).data
      : result;
  },
};

export const serviceOrderService = {
  upsert: (data: KaizoData, order: ServiceOrder) => ({
    ...data,
    orders: upsert(data.orders, order),
  }),
  generate(data: KaizoData, budget: Budget) {
    if (budget.status !== "Aprovado") return { data, order: null };
    return generateApprovedOrder(data, budget);
  },
  changeStatus(
    data: KaizoData,
    order: ServiceOrder,
    status: ServiceOrderStatus,
  ) {
    const action =
      status === "Em serviço"
        ? "Serviço iniciado"
        : status === "Finalizado"
          ? "Serviço finalizado"
          : status === "Entregue"
            ? "Veículo entregue"
            : status === "Cancelado"
              ? "OS cancelada"
              : "Status da OS atualizado";
    const updated = {
      ...order,
      status,
      updatedAt: now(),
      timeline: [
        ...order.timeline,
        event(action, `Status atualizado para ${status}.`),
      ],
    };
    let notifications = data.notifications;
    if (status === "Finalizado")
      notifications = [
        notification({
          kind: "order-finished",
          title: "OS finalizada",
          message: `OS #${order.number} foi marcada como finalizada.`,
          entityKind: "order",
          entityId: order.id,
        }),
        ...notifications,
      ];
    return { ...data, orders: upsert(data.orders, updated), notifications };
  },
};

export const appointmentService = {
  upsert: (data: KaizoData, appointment: Appointment) => ({
    ...data,
    appointments: upsert(data.appointments, appointment),
  }),
  remove: (data: KaizoData, id: string) => ({
    ...data,
    appointments: data.appointments.filter((item) => item.id !== id),
  }),
};

export const postSaleService = {
  upsert: (data: KaizoData, followUp: PostSaleFollowUp) => ({
    ...data,
    postSales: upsert(data.postSales, followUp),
  }),
  complete(data: KaizoData, followUp: PostSaleFollowUp) {
    const updated: PostSaleFollowUp = {
      ...followUp,
      status: "Concluído",
      completedAt: now(),
    };
    return { ...data, postSales: upsert(data.postSales, updated) };
  },
  postpone(data: KaizoData, followUp: PostSaleFollowUp, days = 7) {
    const date = new Date(followUp.scheduledAt);
    date.setDate(date.getDate() + days);
    const updated: PostSaleFollowUp = {
      ...followUp,
      status: "Adiado",
      scheduledAt: date.toISOString(),
    };
    return { ...data, postSales: upsert(data.postSales, updated) };
  },
};

export const paymentService = {
  upsert: (data: KaizoData, payment: Payment) => ({
    ...data,
    payments: upsert(data.payments, payment),
  }),
};

export const notificationService = {
  markRead: (data: KaizoData, id: string) => ({
    ...data,
    notifications: data.notifications.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    ),
  }),
  markAllRead: (data: KaizoData) => ({
    ...data,
    notifications: data.notifications.map((item) => ({ ...item, read: true })),
  }),
  add: (
    data: KaizoData,
    item: Omit<Notification, "id" | "read" | "createdAt">,
  ) => ({
    ...data,
    notifications: [notification(item), ...data.notifications],
  }),
};

const localDate = (value: string, endOfDay = false) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
};

export const periodBounds = (period: PeriodKey, range?: DateRange) => {
  const end = new Date();
  const start = new Date(end);
  if (period === "custom" && range)
    return { start: localDate(range.start), end: localDate(range.end, true) };
  if (period === "today") start.setHours(0, 0, 0, 0);
  if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  }
  if (period === "7d") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  }
  if (period === "30d") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }
  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
};

export const previousPeriodBounds = (period: PeriodKey, range?: DateRange) => {
  const current = periodBounds(period, range);
  if (period === "month") {
    const start = new Date(
      current.start.getFullYear(),
      current.start.getMonth() - 1,
      1,
    );
    const end = new Date(
      start.getFullYear(),
      start.getMonth(),
      Math.min(
        current.end.getDate(),
        new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
      ),
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }
  const end = new Date(current.start.getTime() - 1);
  const start = new Date(end);
  const days =
    period === "today" || period === "yesterday"
      ? 1
      : period === "7d"
        ? 7
        : period === "30d"
          ? 30
          : range
            ? Math.max(
                1,
                Math.round(
                  (localDate(range.end).getTime() -
                    localDate(range.start).getTime()) /
                    86_400_000,
                ) + 1,
              )
            : 1;
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const inPeriod = (
  value: string | undefined,
  period: PeriodKey,
  range?: DateRange,
) => {
  if (!value) return false;
  const { start, end } = periodBounds(period, range);
  const date = new Date(value);
  return date >= start && date <= end;
};

export const financeService = {
  revenue(data: KaizoData, period: PeriodKey, range?: DateRange) {
    return data.payments
      .filter(
        (payment) =>
          payment.status !== "Pendente" &&
          inPeriod(payment.paidAt, period, range),
      )
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
  comparison(data: KaizoData, period: PeriodKey, range?: DateRange) {
    const current = periodBounds(period, range);
    const previous = previousPeriodBounds(period, range);
    const sumBetween = (start: Date, end: Date) =>
      data.payments
        .filter((payment) => {
          if (payment.status === "Pendente" || !payment.paidAt) return false;
          const paidAt = new Date(payment.paidAt);
          return paidAt >= start && paidAt <= end;
        })
        .reduce((sum, payment) => sum + payment.amount, 0);
    const labels: Record<PeriodKey, string> = {
      today: "vs. ontem",
      yesterday: "vs. anteontem",
      "7d": "vs. 7 dias anteriores",
      "30d": "vs. 30 dias anteriores",
      month: "vs. período equivalente anterior",
      custom: "vs. período anterior",
    };
    return {
      current: sumBetween(current.start, current.end),
      previous: sumBetween(previous.start, previous.end),
      label: labels[period],
      previousRange: previous,
    };
  },
  orderTotal(data: KaizoData, order: ServiceOrder) {
    const budget = data.budgets.find((item) => item.id === order.budgetId);
    return budget ? orderCustomerTotal(budget) : 0;
  },
  paidForOrder(data: KaizoData, orderId: string) {
    return data.payments
      .filter((payment) => payment.orderId === orderId)
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
  chart(data: KaizoData, days: number) {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - index));
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const value = data.payments
        .filter((payment) => {
          if (!payment.paidAt) return false;
          const paid = new Date(payment.paidAt);
          return (
            `${paid.getFullYear()}-${paid.getMonth()}-${paid.getDate()}` === key
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0);
      return {
        label: new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }).format(date),
        value,
      };
    });
  },
  chartRange(data: KaizoData, range: DateRange) {
    const start = localDate(range.start);
    const end = localDate(range.end, true);
    const days: Date[] = [];
    for (
      const cursor = new Date(start);
      cursor <= end && days.length < 366;
      cursor.setDate(cursor.getDate() + 1)
    )
      days.push(new Date(cursor));
    return days.map((date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const value = data.payments
        .filter((payment) => {
          if (!payment.paidAt || payment.status === "Pendente") return false;
          const paid = new Date(payment.paidAt);
          return (
            `${paid.getFullYear()}-${paid.getMonth()}-${paid.getDate()}` === key
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0);
      return {
        label: new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }).format(date),
        value,
      };
    });
  },
};

export const reportService = {
  summary(data: KaizoData, period: PeriodKey, range?: DateRange) {
    const completedOrders = data.orders.filter(
      (order) =>
        ["Finalizado", "Entregue"].includes(order.status) &&
        inPeriod(order.updatedAt, period, range),
    );
    const revenue = financeService.revenue(data, period, range);
    const sentBudgets = data.budgets.filter(
      (budget) =>
        ["Aguardando aprovação", "Aprovado", "Recusado"].includes(
          budget.status,
        ) && inPeriod(budget.updatedAt, period, range),
    );
    const approved = sentBudgets.filter(
      (budget) => budget.status === "Aprovado",
    ).length;
    return {
      revenue,
      services: completedOrders.length,
      ticket: completedOrders.length ? revenue / completedOrders.length : 0,
      approvalRate: sentBudgets.length
        ? (approved / sentBudgets.length) * 100
        : 0,
      approved,
      rejected: sentBudgets.filter((budget) => budget.status === "Recusado")
        .length,
      waiting: sentBudgets.filter(
        (budget) => budget.status === "Aguardando aprovação",
      ).length,
    };
  },
  serviceRanking(data: KaizoData, period: PeriodKey, range?: DateRange) {
    const totals = new Map<
      string,
      { name: string; quantity: number; revenue: number; profit: number }
    >();
    data.budgets
      .filter(
        (budget) =>
          budget.status === "Aprovado" &&
          inPeriod(budget.updatedAt, period, range),
      )
      .forEach((budget) => {
        const laborTotal = budget.labor.reduce(
          (sum, item) => sum + item.price,
          0,
        );
        const partsRevenue = orderPartsCustomerTotal(budget);
        const partsProfit = partsRevenue - orderRealCost(budget);
        budget.labor.forEach((labor) => {
          const current = totals.get(labor.name) ?? {
            name: labor.name,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
          const share = laborTotal ? labor.price / laborTotal : 0;
          current.quantity += 1;
          current.revenue += labor.price + partsRevenue * share;
          current.profit += labor.price + partsProfit * share;
          totals.set(labor.name, current);
        });
      });
    return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
  },
  financialComposition(data: KaizoData, period: PeriodKey, range?: DateRange) {
    const budgets = data.budgets.filter(
      (budget) =>
        budget.status === "Aprovado" &&
        inPeriod(budget.updatedAt, period, range),
    );
    const revenue = budgets.reduce(
      (sum, budget) => sum + orderCustomerTotal(budget),
      0,
    );
    const costs = budgets.reduce(
      (sum, budget) => sum + orderRealCost(budget),
      0,
    );
    return { revenue, costs, profit: revenue - costs };
  },
  funnel(data: KaizoData, period: PeriodKey, range?: DateRange) {
    const budgeted = data.budgets
      .filter(
        (budget) =>
          ["Aguardando aprovação", "Aprovado", "Recusado"].includes(
            budget.status,
          ) && inPeriod(budget.updatedAt, period, range),
      )
      .reduce((sum, budget) => sum + orderCustomerTotal(budget), 0);
    const approved = data.budgets
      .filter(
        (budget) =>
          budget.status === "Aprovado" &&
          inPeriod(budget.updatedAt, period, range),
      )
      .reduce((sum, budget) => sum + orderCustomerTotal(budget), 0);
    const executed = data.orders
      .filter(
        (order) =>
          ["Finalizado", "Entregue"].includes(order.status) &&
          inPeriod(order.updatedAt, period, range),
      )
      .reduce((sum, order) => sum + financeService.orderTotal(data, order), 0);
    return {
      budgeted,
      approved,
      executed,
      received: financeService.revenue(data, period, range),
    };
  },
};
