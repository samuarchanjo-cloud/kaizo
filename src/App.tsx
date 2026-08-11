import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { BudgetEditor } from "@/components/BudgetEditor";
import {
  ClientEvidenceGallery,
  EvidenceManager,
} from "@/components/EvidenceGallery";
import { Icon } from "@/components/Icon";
import { NewEntryModal } from "@/components/NewOrderModal";
import {
  hasCustomerSuppliedParts,
  isCustomerSuppliedPart,
  orderCustomerTotal,
  orderEstimatedProfit,
  orderLaborTotal,
  orderPartsCustomerTotal,
  partCustomerTotal,
} from "@/lib/budgetCalculations";
import {
  appointmentService,
  budgetService,
  createId,
  entryService,
  financeService,
  notificationService,
  paymentService,
  postSaleService,
  reportService,
  serviceOrderService,
  type DateRange,
  type PeriodKey,
} from "@/lib/domainServices";
import {
  customerService,
  localRepository,
  settingsService,
  vehicleService,
} from "@/lib/repository";
import type {
  Appointment,
  Budget,
  BudgetStatus,
  Customer,
  EntityKind,
  EvidenceRecord,
  KaizoData,
  PaymentMethod,
  PostSaleFollowUp,
  ServiceEntry,
  ServiceOrder,
  ServiceOrderStatus,
  Vehicle,
} from "@/lib/types";
import { openQuoteInWhatsApp } from "@/lib/whatsappService";

type Page =
  | "dashboard"
  | "entries"
  | "budgets"
  | "orders"
  | "customers"
  | "vehicles"
  | "agenda"
  | "post-sale"
  | "finance"
  | "reports"
  | "settings"
  | "more";
type Selection = { kind: "entry" | "budget" | "order"; id: string } | null;
type ModalName = "entry" | "appointment" | "customer" | "vehicle" | null;

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const shortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
const todayKey = () => {
  const value = new Date();
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
};
const sameLocalDay = (value: string) => {
  const date = new Date(value);
  return (
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === todayKey()
  );
};
const dateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const defaultCustomRange = (): DateRange => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { start: dateInputValue(start), end: dateInputValue(end) };
};
const toLocalInput = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};
const statusClass = (status: string) =>
  `status status-${status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-")}`;
const localDashboardDate = () => {
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const desktopNavigation: Array<{ id: Page; label: string; icon: string }> = [
  { id: "dashboard", label: "Visão geral", icon: "dashboard" },
  { id: "entries", label: "Atendimentos", icon: "entries" },
  { id: "budgets", label: "Orçamentos", icon: "budgets" },
  { id: "orders", label: "Ordens de Serviço", icon: "orders" },
  { id: "customers", label: "Clientes", icon: "customers" },
  { id: "vehicles", label: "Veículos", icon: "vehicles" },
  { id: "agenda", label: "Agenda", icon: "agenda" },
  { id: "post-sale", label: "Pós-venda", icon: "post-sale" },
  { id: "finance", label: "Financeiro", icon: "finance" },
  { id: "reports", label: "Relatórios", icon: "reports" },
  { id: "settings", label: "Configurações", icon: "settings" },
];
const mobileNavigation: Array<{ id: Page; label: string; icon: string }> = [
  { id: "dashboard", label: "Início", icon: "dashboard" },
  { id: "budgets", label: "Orçamentos", icon: "budgets" },
  { id: "orders", label: "OS", icon: "orders" },
  { id: "customers", label: "Clientes", icon: "customers" },
  { id: "more", label: "Mais", icon: "more" },
];
const moreNavigation = desktopNavigation.filter((item) =>
  [
    "vehicles",
    "agenda",
    "post-sale",
    "finance",
    "reports",
    "settings",
    "entries",
  ].includes(item.id),
);

function StatusBadge({ status }: { status: string }) {
  return <span className={statusClass(status)}>{status}</span>;
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Field({
  label,
  children,
  span = false,
}: {
  label: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <label className={`field ${span ? "field-span" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="card empty-state">
      <span className="empty-symbol">
        <Icon name="spark" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search-box standalone">
      <Icon name="search" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
function PeriodFilter({
  value,
  onChange,
  includeYesterday = true,
  includeCustom = false,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
  includeYesterday?: boolean;
  includeCustom?: boolean;
}) {
  const options: Array<[PeriodKey, string]> = [
    ["today", "Hoje"],
    ...(includeYesterday
      ? [["yesterday", "Ontem"] as [PeriodKey, string]]
      : []),
    ["7d", "7 dias"],
    ["30d", "30 dias"],
    ["month", "Este mês"],
    ...(includeCustom
      ? [["custom", "Personalizado"] as [PeriodKey, string]]
      : []),
  ];
  return (
    <div className="period-filter">
      {options.map(([id, label]) => (
        <button
          key={id}
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function CustomPeriodFields({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
}) {
  return (
    <div className="custom-period-fields">
      <label>
        De
        <input
          type="date"
          value={value.start}
          max={value.end}
          onChange={(event) =>
            onChange({ ...value, start: event.target.value })
          }
        />
      </label>
      <label>
        Até
        <input
          type="date"
          value={value.end}
          min={value.start}
          max={dateInputValue(new Date())}
          onChange={(event) => onChange({ ...value, end: event.target.value })}
        />
      </label>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<KaizoData>(() => localRepository.load());
  const [page, setPage] = useState<Page>("dashboard");
  const [selection, setSelection] = useState<Selection>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", "#2563EB");
  }, []);
  const commit = (next: KaizoData, message?: string) => {
    setData(next);
    localRepository.save(next);
    if (message) {
      setToast(message);
      window.setTimeout(() => setToast(""), 2600);
    }
  };
  const navigate = (next: Page) => {
    setPage(next);
    setSelection(null);
    setNotificationsOpen(false);
  };
  const openEntity = (kind: "entry" | "budget" | "order", id: string) => {
    setSelection({ kind, id });
    setPage(
      kind === "entry" ? "entries" : kind === "budget" ? "budgets" : "orders",
    );
    setNotificationsOpen(false);
  };
  const selectedEntry =
    selection?.kind === "entry"
      ? data.entries.find((item) => item.id === selection.id)
      : undefined;
  const selectedBudget =
    selection?.kind === "budget"
      ? data.budgets.find((item) => item.id === selection.id)
      : undefined;
  const selectedOrder =
    selection?.kind === "order"
      ? data.orders.find((item) => item.id === selection.id)
      : undefined;
  const unread = data.notifications.filter((item) => !item.read).length;

  const handleNotification = (
    id: string,
    kind?: EntityKind,
    entityId?: string,
  ) => {
    commit(notificationService.markRead(data, id));
    if (entityId && (kind === "entry" || kind === "budget" || kind === "order"))
      openEntity(kind, entityId);
    else if (kind === "post-sale") navigate("post-sale");
  };

  return (
    <div
      className="app-shell"
      style={{ "--accent": "#2563EB" } as CSSProperties}
    >
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("dashboard")}>
          <img src="/kaizo-logo.png" alt="" />
          <div>
            <strong>KAIZO</strong>
            <span>GESTÃO AUTOMOTIVA</span>
          </div>
        </button>
        <div className="workspace-card">
          <span className="workspace-icon">K</span>
          <div>
            <strong>{data.company.name}</strong>
            <small>{data.company.businessType}</small>
          </div>
          <Icon name="check" className="verified" />
        </div>
        <nav>
          {desktopNavigation.map((item) => (
            <button
              key={item.id}
              className={page === item.id && !selection ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "budgets" && (
                <em>
                  {
                    data.budgets.filter(
                      (budget) => budget.status === "Aguardando aprovação",
                    ).length
                  }
                </em>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="offline-dot" />
          <span>Dados locais · modo offline</span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">KAIZO</div>
          <div className="top-actions">
            <span className="save-state">
              <i /> salvo localmente
            </span>
            <button
              className="notification-button"
              onClick={() => setNotificationsOpen((current) => !current)}
              aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
            >
              <Icon name="bell" />
              {unread > 0 && <b>{unread}</b>}
            </button>
            <button
              className="primary-button compact"
              onClick={() => setModal("entry")}
            >
              <Icon name="plus" /> Novo atendimento
            </button>
            <div className="avatar">OD</div>
          </div>
          {notificationsOpen && (
            <NotificationPanel
              data={data}
              onClose={() => setNotificationsOpen(false)}
              onRead={handleNotification}
              onReadAll={() =>
                commit(
                  notificationService.markAllRead(data),
                  "Notificações marcadas como lidas.",
                )
              }
            />
          )}
        </header>
        <div className="content">
          {selectedEntry ? (
            <EntryDetail
              data={data}
              entry={selectedEntry}
              onBack={() => setSelection(null)}
              onCommit={commit}
              onOpenBudget={(id) => openEntity("budget", id)}
            />
          ) : selectedBudget ? (
            <BudgetDetail
              data={data}
              budget={selectedBudget}
              onBack={() => setSelection(null)}
              onCommit={commit}
              onOpenOrder={(id) => openEntity("order", id)}
            />
          ) : selectedOrder ? (
            <OrderDetail
              data={data}
              order={selectedOrder}
              onBack={() => setSelection(null)}
              onCommit={commit}
            />
          ) : (
            <>
              {page === "dashboard" && (
                <Dashboard
                  data={data}
                  onEntry={() => setModal("entry")}
                  onAppointment={() => {
                    setEditingAppointment(null);
                    setModal("appointment");
                  }}
                  onNavigate={navigate}
                  onOpen={openEntity}
                />
              )}
              {page === "entries" && (
                <EntriesPage
                  data={data}
                  onOpen={(id) => openEntity("entry", id)}
                  onNew={() => setModal("entry")}
                />
              )}
              {page === "budgets" && (
                <BudgetsPage
                  data={data}
                  onOpen={(id) => openEntity("budget", id)}
                />
              )}
              {page === "orders" && (
                <OrdersPage
                  data={data}
                  onOpen={(id) => openEntity("order", id)}
                />
              )}
              {page === "customers" && (
                <CustomersPage
                  data={data}
                  onNew={() => {
                    setEditingCustomer(null);
                    setModal("customer");
                  }}
                  onEdit={(customer) => {
                    setEditingCustomer(customer);
                    setModal("customer");
                  }}
                  onOpen={openEntity}
                />
              )}
              {page === "vehicles" && (
                <VehiclesPage
                  data={data}
                  onNew={() => {
                    setEditingVehicle(null);
                    setModal("vehicle");
                  }}
                  onEdit={(vehicle) => {
                    setEditingVehicle(vehicle);
                    setModal("vehicle");
                  }}
                  onOpen={openEntity}
                />
              )}
              {page === "agenda" && (
                <AgendaPage
                  data={data}
                  onNew={() => {
                    setEditingAppointment(null);
                    setModal("appointment");
                  }}
                  onEdit={(appointment) => {
                    setEditingAppointment(appointment);
                    setModal("appointment");
                  }}
                  onCommit={commit}
                />
              )}
              {page === "post-sale" && (
                <PostSalePage
                  data={data}
                  onCommit={commit}
                  onOpenOrder={(id) => openEntity("order", id)}
                />
              )}
              {page === "finance" && (
                <FinancePage
                  data={data}
                  onOpenOrder={(id) => openEntity("order", id)}
                />
              )}
              {page === "reports" && <ReportsPage data={data} />}
              {page === "settings" && (
                <SettingsPage data={data} onCommit={commit} />
              )}
              {page === "more" && <MorePage onNavigate={navigate} />}
            </>
          )}
        </div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Navegação principal">
        {mobileNavigation.map((item) => {
          const active = selection
            ? page === item.id
            : page === item.id ||
              (item.id === "more" &&
                moreNavigation.some((more) => more.id === page));
          return (
            <button
              key={item.id}
              className={active ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {modal === "entry" && (
        <NewEntryModal
          data={data}
          onClose={() => setModal(null)}
          onSave={(entry, preparedData) => {
            const next = entryService.upsert(preparedData, entry);
            commit(next, `Atendimento #${entry.number} criado.`);
            setModal(null);
            openEntity("entry", entry.id);
          }}
        />
      )}
      {modal === "appointment" && (
        <AppointmentModal
          data={data}
          appointment={editingAppointment}
          onClose={() => setModal(null)}
          onSave={(appointment) => {
            commit(
              appointmentService.upsert(data, appointment),
              editingAppointment
                ? "Agendamento atualizado."
                : "Agendamento criado.",
            );
            setModal(null);
          }}
        />
      )}
      {modal === "customer" && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => setModal(null)}
          onSave={(customer) => {
            commit(
              customerService.upsert(data, customer),
              editingCustomer ? "Cliente atualizado." : "Cliente cadastrado.",
            );
            setModal(null);
          }}
        />
      )}
      {modal === "vehicle" && (
        <VehicleModal
          vehicle={editingVehicle}
          customers={data.customers}
          onClose={() => setModal(null)}
          onSave={(vehicle) => {
            commit(
              vehicleService.upsert(data, vehicle),
              editingVehicle ? "Veículo atualizado." : "Veículo cadastrado.",
            );
            setModal(null);
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" /> {toast}
        </div>
      )}
    </div>
  );
}

function Dashboard({
  data,
  onEntry,
  onAppointment,
  onNavigate,
  onOpen,
}: {
  data: KaizoData;
  onEntry: () => void;
  onAppointment: () => void;
  onNavigate: (page: Page) => void;
  onOpen: (kind: "entry" | "budget" | "order", id: string) => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("today");
  const revenue = financeService.revenue(data, period);
  const entriesToday = data.entries.filter((entry) =>
    sameLocalDay(entry.createdAt),
  );
  const waiting = data.budgets.filter(
    (budget) => budget.status === "Aguardando aprovação",
  );
  const running = data.orders.filter((order) => order.status === "Em serviço");
  const ready = data.orders.filter((order) => order.status === "Finalizado");
  const recentEntry = data.entries[0];
  const recentBudget = data.budgets[0];
  const recentOrder = data.orders[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{localDashboardDate()}</span>
          <h1>Visão geral</h1>
          <p>Decisões operacionais e receita em um só lugar.</p>
        </div>
      </div>
      <section className="revenue-hero card">
        <div>
          <span>Faturamento</span>
          <strong>{currency(revenue)}</strong>
          <small>Recebimentos confirmados no período</small>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </section>
      <section className="dashboard-shortcuts">
        <button className="primary-button" onClick={onEntry}>
          <Icon name="plus" /> Novo atendimento
        </button>
        <button className="secondary-button" onClick={onAppointment}>
          <Icon name="agenda" /> Novo agendamento
        </button>
        <button
          className="secondary-button"
          onClick={() => onNavigate("budgets")}
        >
          <Icon name="budgets" /> Ver orçamentos
        </button>
      </section>
      <div className="section-heading">
        <div>
          <h2>Operação hoje</h2>
          <p>O que precisa da sua atenção agora.</p>
        </div>
      </div>
      <section className="operation-grid">
        <OperationCard
          label="Veículos em atendimento"
          value={entriesToday.length}
          tone="neutral"
          onClick={() => onNavigate("entries")}
        />
        <OperationCard
          label="Aguardando aprovação"
          value={waiting.length}
          tone="waiting"
          onClick={() => onNavigate("budgets")}
        />
        <OperationCard
          label="Em serviço"
          value={running.length}
          tone="process"
          onClick={() => onNavigate("orders")}
        />
        <OperationCard
          label="Prontos para entrega"
          value={ready.length}
          tone="success"
          onClick={() => onNavigate("orders")}
        />
      </section>
      <section className="dashboard-grid new-dashboard-grid">
        <div className="card service-today">
          <div className="card-head">
            <div>
              <h2>Em serviço hoje</h2>
              <p>Execuções em andamento.</p>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("orders")}
            >
              Ver todos <Icon name="arrow" />
            </button>
          </div>
          {running.slice(0, 3).map((order) => {
            const entry = data.entries.find(
              (item) => item.id === order.entryId,
            );
            const vehicle = data.vehicles.find(
              (item) => item.id === entry?.vehicleId,
            );
            const customer = data.customers.find(
              (item) => item.id === entry?.customerId,
            );
            const budget = data.budgets.find(
              (item) => item.id === order.budgetId,
            );
            return (
              <button
                className="compact-service-row"
                key={order.id}
                onClick={() => onOpen("order", order.id)}
              >
                <span className="vehicle-mark">
                  <Icon name="car" />
                </span>
                <span>
                  <strong>
                    {vehicle?.brand} {vehicle?.model}
                  </strong>
                  <small>
                    {vehicle?.plate} · {customer?.name}
                  </small>
                  <em>{budget?.labor[0]?.name ?? "Serviço autorizado"}</em>
                </span>
                <span>
                  <StatusBadge status={order.status} />
                  <small>
                    {budget ? dateTime(budget.dueDate) : "Sem previsão"}
                  </small>
                </span>
              </button>
            );
          })}
          {running.length === 0 && (
            <p className="muted padded-copy">
              Nenhum veículo em serviço neste momento.
            </p>
          )}
        </div>
        <div className="card recent-flow">
          <div className="card-head">
            <div>
              <h2>Fluxo recente</h2>
              <p>Cada etapa identificada corretamente.</p>
            </div>
          </div>
          {recentEntry && (
            <button onClick={() => onOpen("entry", recentEntry.id)}>
              <Icon name="entries" />
              <span>
                <small>ATENDIMENTO #{recentEntry.number}</small>
                <strong>{recentEntry.reportedProblem}</strong>
              </span>
              <Icon name="arrow" />
            </button>
          )}
          {recentBudget && (
            <button onClick={() => onOpen("budget", recentBudget.id)}>
              <Icon name="budgets" />
              <span>
                <small>ORÇAMENTO #{recentBudget.number}</small>
                <strong>
                  {currency(orderCustomerTotal(recentBudget))} ·{" "}
                  {recentBudget.status}
                </strong>
              </span>
              <Icon name="arrow" />
            </button>
          )}
          {recentOrder && (
            <button onClick={() => onOpen("order", recentOrder.id)}>
              <Icon name="orders" />
              <span>
                <small>OS #{recentOrder.number}</small>
                <strong>{recentOrder.status}</strong>
              </span>
              <Icon name="arrow" />
            </button>
          )}
        </div>
      </section>
    </>
  );
}
function OperationCard({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button className={`operation-card ${tone}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        Abrir lista <Icon name="arrow" />
      </small>
    </button>
  );
}

function EntriesPage({
  data,
  onOpen,
  onNew,
}: {
  data: KaizoData;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const shown = data.entries.filter((entry) => {
    const customer = data.customers.find(
      (item) => item.id === entry.customerId,
    );
    const vehicle = data.vehicles.find((item) => item.id === entry.vehicleId);
    return `${entry.number} ${customer?.name} ${vehicle?.brand} ${vehicle?.model} ${vehicle?.plate}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Atendimentos</h1>
          <p>Entradas, diagnóstico e preparação do orçamento.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Icon name="plus" /> Novo atendimento
        </button>
      </div>
      <Search
        value={search}
        onChange={setSearch}
        placeholder="Buscar por atendimento, cliente, placa ou veículo"
      />
      <div className="record-list">
        {shown.map((entry) => (
          <RecordRow
            key={entry.id}
            icon="entries"
            number={`Atendimento #${entry.number}`}
            data={data}
            entry={entry}
            status={entry.status}
            value={entry.initialDueDate}
            onClick={() => onOpen(entry.id)}
          />
        ))}
      </div>
    </>
  );
}

function BudgetsPage({
  data,
  onOpen,
}: {
  data: KaizoData;
  onOpen: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Todos" | BudgetStatus>("Todos");
  const statuses: Array<"Todos" | BudgetStatus> = [
    "Todos",
    "Rascunho",
    "Aguardando aprovação",
    "Aprovado",
    "Recusado",
  ];
  const shown = data.budgets.filter((budget) => {
    const entry = data.entries.find((item) => item.id === budget.entryId);
    const customer = data.customers.find(
      (item) => item.id === entry?.customerId,
    );
    const vehicle = data.vehicles.find((item) => item.id === entry?.vehicleId);
    return (
      (filter === "Todos" || budget.status === filter) &&
      `${budget.number} ${customer?.name} ${vehicle?.brand} ${vehicle?.model} ${vehicle?.plate}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Orçamentos</h1>
          <p>Propostas separadas da execução dos serviços.</p>
        </div>
      </div>
      <div className="toolbar">
        <Search
          value={search}
          onChange={setSearch}
          placeholder="Buscar número, cliente, placa ou veículo"
        />
        <div className="filter-pills">
          {statuses.map((status) => (
            <button
              key={status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div className="record-list">
        {shown.map((budget) => {
          const entry = data.entries.find((item) => item.id === budget.entryId);
          return (
            <RecordRow
              key={budget.id}
              icon="budgets"
              number={`Orçamento #${budget.number}`}
              data={data}
              entry={entry}
              status={budget.status}
              value={`${currency(orderCustomerTotal(budget))} · ${dateTime(budget.dueDate)}`}
              onClick={() => onOpen(budget.id)}
            />
          );
        })}
      </div>
      {shown.length === 0 && (
        <EmptyState
          title="Nenhum orçamento encontrado"
          text="Ajuste os filtros ou crie um orçamento a partir de um atendimento."
        />
      )}
    </>
  );
}

function OrdersPage({
  data,
  onOpen,
}: {
  data: KaizoData;
  onOpen: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const shown = data.orders.filter((order) => {
    const entry = data.entries.find((item) => item.id === order.entryId);
    const customer = data.customers.find(
      (item) => item.id === entry?.customerId,
    );
    const vehicle = data.vehicles.find((item) => item.id === entry?.vehicleId);
    return `${order.number} ${customer?.name} ${vehicle?.brand} ${vehicle?.model} ${vehicle?.plate}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Ordens de Serviço</h1>
          <p>Somente serviços autorizados aparecem aqui.</p>
        </div>
      </div>
      <Search
        value={search}
        onChange={setSearch}
        placeholder="Buscar OS, cliente, placa ou veículo"
      />
      <div className="record-list">
        {shown.map((order) => {
          const entry = data.entries.find((item) => item.id === order.entryId);
          const budget = data.budgets.find(
            (item) => item.id === order.budgetId,
          );
          return (
            <RecordRow
              key={order.id}
              icon="orders"
              number={`OS #${order.number}`}
              data={data}
              entry={entry}
              status={order.status}
              secondStatus={budget?.status}
              value={budget ? currency(orderCustomerTotal(budget)) : ""}
              onClick={() => onOpen(order.id)}
            />
          );
        })}
      </div>
    </>
  );
}

function RecordRow({
  icon,
  number,
  data,
  entry,
  status,
  secondStatus,
  value,
  onClick,
}: {
  icon: string;
  number: string;
  data: KaizoData;
  entry?: ServiceEntry;
  status: string;
  secondStatus?: string;
  value: string;
  onClick: () => void;
}) {
  const customer = data.customers.find((item) => item.id === entry?.customerId);
  const vehicle = data.vehicles.find((item) => item.id === entry?.vehicleId);
  return (
    <button className="record-row" onClick={onClick}>
      <span className="record-icon">
        <Icon name={icon} />
      </span>
      <span className="record-main">
        <small>{number}</small>
        <strong>
          {vehicle?.brand} {vehicle?.model}
        </strong>
        <em>
          {customer?.name} · {vehicle?.plate}
        </em>
      </span>
      <span className="record-status">
        {secondStatus && <small>Orçamento: {secondStatus}</small>}
        <StatusBadge status={status} />
      </span>
      <span className="record-value">{value}</span>
      <Icon name="arrow" />
    </button>
  );
}

function EntryDetail({
  data,
  entry,
  onBack,
  onCommit,
  onOpenBudget,
}: {
  data: KaizoData;
  entry: ServiceEntry;
  onBack: () => void;
  onCommit: (data: KaizoData, message?: string) => void;
  onOpenBudget: (id: string) => void;
}) {
  const [tab, setTab] = useState<
    "summary" | "diagnosis" | "evidence" | "history"
  >("summary");
  const [draft, setDraft] = useState(entry);
  const budget = data.budgets.find((item) => item.entryId === entry.id);
  const customer = data.customers.find((item) => item.id === entry.customerId);
  const vehicle = data.vehicles.find((item) => item.id === entry.vehicleId);
  const save = (next: ServiceEntry, message: string) => {
    setDraft(next);
    onCommit(entryService.upsert(data, next), message);
  };
  const createBudget = () => {
    const result = budgetService.createFromEntry(data, draft);
    onCommit(result.data, `Orçamento #${result.budget.number} criado.`);
    onOpenBudget(result.budget.id);
  };
  const evidenceRecord: EvidenceRecord = {
    id: draft.id,
    parts: budget?.parts ?? [],
    labor: budget?.labor ?? [],
    evidences: draft.evidences,
    updatedAt: draft.updatedAt,
    timeline: draft.timeline,
  };
  return (
    <>
      <button className="back-button" onClick={onBack}>
        ← Voltar para atendimentos
      </button>
      <DetailHero
        eyebrow="ATENDIMENTO"
        number={draft.number}
        status={draft.status}
        vehicle={vehicle}
        totalLabel="ENTRADA"
        totalValue={dateTime(draft.createdAt)}
      />
      <ContextGrid customer={customer} entry={draft} />
      <div className="tabs">
        {[
          ["summary", "Resumo"],
          ["diagnosis", "Diagnóstico"],
          [
            "evidence",
            `Evidências${draft.evidences.length ? ` (${draft.evidences.length})` : ""}`,
          ],
          ["history", "Histórico"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "summary" && (
        <div className="detail-grid">
          <section className="card detail-card">
            <h2>Problema relatado</h2>
            <p className="detail-copy">{draft.reportedProblem}</p>
            <h3>Observações técnicas</h3>
            <p className="detail-copy muted-copy">
              {draft.technicalNotes || "Diagnóstico ainda não registrado."}
            </p>
          </section>
          <aside className="card detail-card stage-card">
            <h2>Próxima etapa</h2>
            {budget ? (
              <>
                <StatusBadge status={budget.status} />
                <p>
                  O orçamento #{budget.number} já está vinculado a este
                  atendimento.
                </p>
                <button
                  className="primary-button full"
                  onClick={() => onOpenBudget(budget.id)}
                >
                  Abrir orçamento
                </button>
              </>
            ) : (
              <>
                <p>
                  Conclua o diagnóstico e inicie uma proposta comercial
                  separada.
                </p>
                <button className="primary-button full" onClick={createBudget}>
                  Criar orçamento
                </button>
              </>
            )}
          </aside>
        </div>
      )}
      {tab === "diagnosis" && (
        <form
          className="card editor-card"
          onSubmit={(event) => {
            event.preventDefault();
            save(
              {
                ...draft,
                updatedAt: new Date().toISOString(),
                timeline: [
                  ...draft.timeline,
                  {
                    id: createId("event"),
                    date: new Date().toISOString(),
                    action: "Diagnóstico registrado",
                    description:
                      "Informações técnicas e recomendações atualizadas.",
                  },
                ],
              },
              "Diagnóstico salvo.",
            );
          }}
        >
          <div className="form-grid">
            <Field label="Problema relatado" span>
              <textarea
                rows={4}
                value={draft.reportedProblem}
                onChange={(event) =>
                  setDraft({ ...draft, reportedProblem: event.target.value })
                }
              />
            </Field>
            <Field label="Observações técnicas" span>
              <textarea
                rows={5}
                value={draft.technicalNotes}
                onChange={(event) =>
                  setDraft({ ...draft, technicalNotes: event.target.value })
                }
              />
            </Field>
            <Field label="Recomendações" span>
              <textarea
                rows={4}
                value={draft.recommendations}
                onChange={(event) =>
                  setDraft({ ...draft, recommendations: event.target.value })
                }
              />
            </Field>
          </div>
          <div className="form-footer">
            <button className="primary-button">Salvar diagnóstico</button>
          </div>
        </form>
      )}
      {tab === "evidence" && (
        <EvidenceManager
          order={evidenceRecord}
          onSave={(record, message) =>
            save(
              {
                ...draft,
                evidences: record.evidences,
                updatedAt: record.updatedAt,
                timeline: record.timeline,
              },
              message,
            )
          }
        />
      )}
      {tab === "history" && <TimelineCard events={draft.timeline} />}
    </>
  );
}

function BudgetDetail({
  data,
  budget,
  onBack,
  onCommit,
  onOpenOrder,
}: {
  data: KaizoData;
  budget: Budget;
  onBack: () => void;
  onCommit: (data: KaizoData, message?: string) => void;
  onOpenOrder: (id: string) => void;
}) {
  const [draft, setDraft] = useState(budget);
  const [preview, setPreview] = useState(false);
  const entry = data.entries.find((item) => item.id === budget.entryId)!;
  const customer = data.customers.find((item) => item.id === entry.customerId);
  const vehicle = data.vehicles.find((item) => item.id === entry.vehicleId);
  const order = data.orders.find((item) => item.budgetId === budget.id);
  const total = orderCustomerTotal(draft);
  const profit = orderEstimatedProfit(draft);
  const save = (next: Budget, message: string) => {
    setDraft(next);
    onCommit(budgetService.upsert(data, next), message);
  };
  const changeStatus = (status: BudgetStatus) => {
    const next = budgetService.changeStatus(data, draft, status);
    const updated = next.budgets.find((item) => item.id === draft.id)!;
    setDraft(updated);
    onCommit(next, `Orçamento ${status.toLowerCase()}.`);
  };
  const sendWhatsApp = () => {
    if (!customer || !vehicle) return;
    if (
      !openQuoteInWhatsApp({
        company: data.company,
        customer,
        vehicle,
        order: draft,
      })
    )
      return window.alert("Telefone inválido para WhatsApp.");
    changeStatus("Aguardando aprovação");
  };
  const generate = () => {
    const result = serviceOrderService.generate(data, draft);
    if (!result.order) return;
    onCommit(result.data, `OS #${result.order.number} gerada.`);
    onOpenOrder(result.order.id);
  };
  return (
    <>
      <button className="back-button" onClick={onBack}>
        ← Voltar para orçamentos
      </button>
      <DetailHero
        eyebrow="ORÇAMENTO"
        number={draft.number}
        status={draft.status}
        vehicle={vehicle}
        totalLabel="VALOR TOTAL"
        totalValue={currency(total)}
      />
      <div className="dual-status card">
        <div>
          <small>Orçamento</small>
          <StatusBadge status={draft.status} />
        </div>
        <Icon name="arrow" />
        <div>
          <small>Execução</small>
          {order ? (
            <StatusBadge status={order.status} />
          ) : (
            <span className="neutral-state">OS ainda não gerada</span>
          )}
        </div>
      </div>
      <BudgetEditor
        draft={draft}
        setDraft={setDraft}
        total={total}
        profit={profit}
        onSave={(message) =>
          save(
            {
              ...draft,
              updatedAt: new Date().toISOString(),
              timeline: [
                ...draft.timeline,
                {
                  id: createId("event"),
                  date: new Date().toISOString(),
                  action: "Orçamento atualizado",
                  description: "Itens e valores foram salvos.",
                },
              ],
            },
            message,
          )
        }
        onPreview={() => {
          save(draft, "Prévia atualizada.");
          setPreview(true);
        }}
        onFinalize={() => changeStatus("Aguardando aprovação")}
        onWhatsApp={sendWhatsApp}
      />
      {draft.status === "Aprovado" && !order && (
        <div className="conversion-cta card">
          <div>
            <Icon name="check" />
            <span>
              <strong>Orçamento aprovado</strong>
              <small>
                Os dados serão referenciados pela OS sem duplicação
                desnecessária.
              </small>
            </span>
          </div>
          <button className="primary-button" onClick={generate}>
            Gerar Ordem de Serviço
          </button>
        </div>
      )}
      {order && (
        <button
          className="secondary-button open-generated-order"
          onClick={() => onOpenOrder(order.id)}
        >
          Abrir OS #{order.number} <Icon name="arrow" />
        </button>
      )}
      {preview && (
        <QuoteModal
          data={data}
          entry={entry}
          budget={draft}
          onClose={() => setPreview(false)}
          onDecision={(status) => {
            changeStatus(status);
            setPreview(false);
          }}
        />
      )}
    </>
  );
}

function OrderDetail({
  data,
  order,
  onBack,
  onCommit,
}: {
  data: KaizoData;
  order: ServiceOrder;
  onBack: () => void;
  onCommit: (data: KaizoData, message?: string) => void;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [postSaleOpen, setPostSaleOpen] = useState(false);
  const entry = data.entries.find((item) => item.id === order.entryId)!;
  const budget = data.budgets.find((item) => item.id === order.budgetId)!;
  const customer = data.customers.find((item) => item.id === entry.customerId);
  const vehicle = data.vehicles.find((item) => item.id === entry.vehicleId);
  const paid = financeService.paidForOrder(data, order.id);
  const total = orderCustomerTotal(budget);
  const changeStatus = (status: ServiceOrderStatus) =>
    onCommit(
      serviceOrderService.changeStatus(data, order, status),
      `OS atualizada para ${status}.`,
    );
  return (
    <>
      <button className="back-button" onClick={onBack}>
        ← Voltar para ordens
      </button>
      <DetailHero
        eyebrow="ORDEM DE SERVIÇO"
        number={order.number}
        status={order.status}
        vehicle={vehicle}
        totalLabel="TOTAL AUTORIZADO"
        totalValue={currency(total)}
      />
      <div className="dual-status card">
        <div>
          <small>Orçamento</small>
          <StatusBadge status={budget.status} />
        </div>
        <Icon name="arrow" />
        <div>
          <small>Serviço</small>
          <StatusBadge status={order.status} />
        </div>
      </div>
      <ContextGrid customer={customer} entry={entry} />
      <div className="detail-grid order-execution-grid">
        <section className="card detail-card">
          <div className="card-head">
            <div>
              <h2>Execução</h2>
              <p>Controle operacional da OS autorizada.</p>
            </div>
            <select
              className="status-control"
              value={order.status}
              onChange={(event) =>
                changeStatus(event.target.value as ServiceOrderStatus)
              }
            >
              {[
                "Aguardando início",
                "Em serviço",
                "Finalizado",
                "Entregue",
                "Cancelado",
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <h3>Serviços autorizados</h3>
          {budget.labor.map((labor) => (
            <div className="summary-line" key={labor.id}>
              <span>
                {labor.name}
                <small>
                  {labor.estimatedHours.toLocaleString("pt-BR")}h estimada(s)
                </small>
              </span>
              <strong>{currency(labor.price)}</strong>
            </div>
          ))}
          <h3>Peças</h3>
          {budget.parts.map((part) => (
            <div className="summary-line" key={part.id}>
              <span>
                {part.name}
                <small>
                  {part.responsibility === "Cliente"
                    ? "Fornecida pelo cliente"
                    : `Qtd. ${part.quantity}`}
                </small>
              </span>
              <strong>
                {part.responsibility === "Cliente"
                  ? "—"
                  : currency(partCustomerTotal(part))}
              </strong>
            </div>
          ))}
        </section>
        <aside className="card detail-card payment-summary">
          <h2>Pagamento</h2>
          <div className="payment-progress">
            <span
              style={{
                width: `${total ? Math.min(100, (paid / total) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="summary-line">
            <span>Recebido</span>
            <strong>{currency(paid)}</strong>
          </div>
          <div className="summary-line">
            <span>Pendente</span>
            <strong>{currency(Math.max(0, total - paid))}</strong>
          </div>
          <button
            className="primary-button full"
            onClick={() => setPaymentOpen(true)}
          >
            Registrar pagamento
          </button>
          {["Finalizado", "Entregue"].includes(order.status) && (
            <button
              className="secondary-button full"
              onClick={() => setPostSaleOpen(true)}
            >
              Programar acompanhamento
            </button>
          )}
        </aside>
      </div>
      <TimelineCard
        events={[...entry.timeline, ...budget.timeline, ...order.timeline].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )}
      />
      {paymentOpen && (
        <PaymentModal
          data={data}
          order={order}
          budget={budget}
          onClose={() => setPaymentOpen(false)}
          onSave={(payment) => {
            let next = paymentService.upsert(data, payment);
            const updatedOrder = {
              ...order,
              timeline: [
                ...order.timeline,
                {
                  id: createId("event"),
                  date: new Date().toISOString(),
                  action: "Pagamento registrado",
                  description: `${currency(payment.amount)} via ${payment.method}.`,
                },
              ],
            };
            next = serviceOrderService.upsert(next, updatedOrder);
            onCommit(next, "Pagamento registrado.");
            setPaymentOpen(false);
          }}
        />
      )}
      {postSaleOpen && (
        <PostSaleModal
          data={data}
          order={order}
          onClose={() => setPostSaleOpen(false)}
          onSave={(followUp) => {
            onCommit(
              postSaleService.upsert(data, followUp),
              "Pós-venda agendado.",
            );
            setPostSaleOpen(false);
          }}
        />
      )}
    </>
  );
}

function DetailHero({
  eyebrow,
  number,
  status,
  vehicle,
  totalLabel,
  totalValue,
}: {
  eyebrow: string;
  number: number;
  status: string;
  vehicle?: Vehicle;
  totalLabel: string;
  totalValue: string;
}) {
  return (
    <div className="order-hero">
      <div>
        <div className="order-kicker">
          <span>{eyebrow}</span>
          <StatusBadge status={status} />
        </div>
        <h1>
          {eyebrow === "ATENDIMENTO"
            ? "Atendimento"
            : eyebrow === "ORÇAMENTO"
              ? "Orçamento"
              : "OS"}{" "}
          #{number}
        </h1>
        <p>
          {vehicle?.brand} {vehicle?.model} {vehicle?.version} ·{" "}
          <b>{vehicle?.plate}</b>
        </p>
      </div>
      <div className="hero-total">
        <small>{totalLabel}</small>
        <strong>{totalValue}</strong>
      </div>
    </div>
  );
}
function ContextGrid({
  customer,
  entry,
}: {
  customer?: Customer;
  entry: ServiceEntry;
}) {
  return (
    <div className="order-context">
      <div>
        <small>Cliente</small>
        <strong>{customer?.name}</strong>
        <span>{customer?.phone}</span>
      </div>
      <div>
        <small>Quilometragem</small>
        <strong>{entry.mileageIn.toLocaleString("pt-BR")} km</strong>
        <span>na entrada</span>
      </div>
      <div>
        <small>Prioridade</small>
        <strong>{entry.priority}</strong>
        <span>atendimento</span>
      </div>
      <div>
        <small>Previsão</small>
        <strong>{dateTime(entry.initialDueDate)}</strong>
        <span>estimativa inicial</span>
      </div>
    </div>
  );
}
function TimelineCard({ events }: { events: ServiceEntry["timeline"] }) {
  return (
    <section className="card history-card">
      <div className="card-head">
        <div>
          <h2>Linha do tempo</h2>
          <p>Rastreabilidade completa do fluxo.</p>
        </div>
      </div>
      <div className="timeline large-timeline">
        {[...events].reverse().map((item) => (
          <div className="timeline-item" key={item.id}>
            <i />
            <div>
              <span>{dateTime(item.date)}</span>
              <strong>{item.action}</strong>
              <small>{item.description}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteModal({
  data,
  entry,
  budget,
  onClose,
  onDecision,
}: {
  data: KaizoData;
  entry: ServiceEntry;
  budget: Budget;
  onClose: () => void;
  onDecision: (status: "Aprovado" | "Recusado") => void;
}) {
  const customer = data.customers.find((item) => item.id === entry.customerId);
  const vehicle = data.vehicles.find((item) => item.id === entry.vehicleId);
  const evidenceRecord: EvidenceRecord = {
    id: entry.id,
    parts: budget.parts,
    labor: budget.labor,
    evidences: entry.evidences,
    updatedAt: entry.updatedAt,
    timeline: entry.timeline,
  };
  return (
    <Modal
      title="Visualização do orçamento"
      subtitle="Experiência local simulada do cliente."
      onClose={onClose}
      wide
    >
      <div className="quote-preview">
        <header>
          <div className="quote-company">
            <img src="/kaizo-logo.png" alt="" />
            <div>
              <strong>{data.company.name}</strong>
              <small>
                {data.company.businessType} · {data.company.whatsapp}
              </small>
            </div>
          </div>
          <StatusBadge status={budget.status} />
        </header>
        <div className="quote-title">
          <span>ORÇAMENTO #{budget.number}</span>
          <h2>
            {vehicle?.brand} {vehicle?.model} {vehicle?.version}
          </h2>
          <p>
            {customer?.name} · {vehicle?.plate}
          </p>
        </div>
        <section className="client-diagnosis">
          <h3>Diagnóstico</h3>
          <p>{entry.technicalNotes || entry.reportedProblem}</p>
        </section>
        <div className="quote-columns">
          <section>
            <h3>Peças</h3>
            {budget.parts.map((part) => (
              <div
                className={`quote-line ${isCustomerSuppliedPart(part) ? "quote-client-supplied" : ""}`}
                key={part.id}
              >
                <span>
                  <strong>{part.name}</strong>
                  <small>Quantidade: {part.quantity}</small>
                </span>
                {isCustomerSuppliedPart(part) ? (
                  <em>Peça fornecida pelo cliente</em>
                ) : (
                  <strong>{currency(partCustomerTotal(part))}</strong>
                )}
              </div>
            ))}
            {budget.parts.length === 0 && (
              <p className="muted">Nenhuma peça.</p>
            )}
            {hasCustomerSuppliedParts(budget) && (
              <p className="quote-supplied-note">
                Itens fornecidos pelo cliente não estão incluídos no total.
              </p>
            )}
          </section>
          <section>
            <h3>Mão de obra</h3>
            {budget.labor.map((labor) => (
              <div className="quote-line" key={labor.id}>
                <span>
                  <strong>{labor.name}</strong>
                  <small>
                    {labor.estimatedHours.toLocaleString("pt-BR")}h estimada(s)
                  </small>
                </span>
                <strong>{currency(labor.price)}</strong>
              </div>
            ))}
          </section>
        </div>
        <ClientEvidenceGallery order={evidenceRecord} />
        <div className="quote-summary">
          <div className="quote-summary-line">
            <span>Peças</span>
            <strong>{currency(orderPartsCustomerTotal(budget))}</strong>
          </div>
          <div className="quote-summary-line">
            <span>Mão de obra</span>
            <strong>{currency(orderLaborTotal(budget))}</strong>
          </div>
          <div className="quote-summary-line quote-summary-total">
            <span>Total</span>
            <strong>{currency(orderCustomerTotal(budget))}</strong>
          </div>
          <div className="quote-deadline">
            <Icon name="clock" />
            <span>
              <small>Previsão de conclusão</small>
              <strong>{dateTime(budget.dueDate)}</strong>
            </span>
          </div>
        </div>
        <p className="quote-message">
          “{budget.quoteMessage || data.company.quoteMessage}”
        </p>
        <div className="quote-actions">
          <button
            className="approve-button"
            onClick={() => onDecision("Aprovado")}
          >
            <Icon name="check" /> Aprovar orçamento
          </button>
          <button
            className="reject-button"
            onClick={() => onDecision("Recusado")}
          >
            <Icon name="close" /> Recusar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CustomersPage({
  data,
  onNew,
  onEdit,
  onOpen,
}: {
  data: KaizoData;
  onNew: () => void;
  onEdit: (customer: Customer) => void;
  onOpen: (kind: "entry" | "budget" | "order", id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const selected = data.customers.find((item) => item.id === selectedId);
  const shown = data.customers.filter((item) =>
    `${item.name} ${item.phone} ${item.cpf ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const entries = data.entries.filter((item) => item.customerId === selectedId);
  const entryIds = new Set(entries.map((item) => item.id));
  const budgets = data.budgets.filter((item) => entryIds.has(item.entryId));
  const orders = data.orders.filter((item) => entryIds.has(item.entryId));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Clientes</h1>
          <p>Dados e histórico separados por etapa.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Icon name="plus" /> Novo cliente
        </button>
      </div>
      <div className={`master-detail ${selected ? "has-detail" : ""}`}>
        <div>
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Buscar cliente"
          />
          <div className="contact-list card">
            {shown.map((customer) => (
              <button
                className="contact-row"
                key={customer.id}
                onClick={() => setSelectedId(customer.id)}
              >
                <span className="contact-avatar">
                  {customer.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  <strong>{customer.name}</strong>
                  <small>{customer.phone}</small>
                </span>
                <span className="count-pill">
                  {
                    data.vehicles.filter(
                      (vehicle) => vehicle.customerId === customer.id,
                    ).length
                  }{" "}
                  veículo(s)
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </div>
        {selected && (
          <aside className="detail-panel">
            <button className="panel-close" onClick={() => setSelectedId(null)}>
              <Icon name="close" />
            </button>
            <span className="contact-avatar large">
              {selected.name.slice(0, 2)}
            </span>
            <h2>{selected.name}</h2>
            <p>{selected.phone}</p>
            <div className="detail-actions">
              <button onClick={() => onEdit(selected)}>
                <Icon name="edit" /> Editar
              </button>
            </div>
            <h3>Veículos</h3>
            {data.vehicles
              .filter((vehicle) => vehicle.customerId === selected.id)
              .map((vehicle) => (
                <div className="mini-card" key={vehicle.id}>
                  <strong>
                    {vehicle.brand} {vehicle.model}
                  </strong>
                  <span>{vehicle.plate}</span>
                </div>
              ))}
            <h3>Atendimentos</h3>
            {entries.slice(0, 3).map((entry) => (
              <button
                className="mini-card clickable"
                key={entry.id}
                onClick={() => onOpen("entry", entry.id)}
              >
                <strong>#{entry.number}</strong>
                <StatusBadge status={entry.status} />
              </button>
            ))}
            <h3>Orçamentos</h3>
            {budgets.slice(0, 3).map((budget) => (
              <button
                className="mini-card clickable"
                key={budget.id}
                onClick={() => onOpen("budget", budget.id)}
              >
                <strong>#{budget.number}</strong>
                <StatusBadge status={budget.status} />
              </button>
            ))}
            <h3>Ordens de serviço</h3>
            {orders.slice(0, 3).map((order) => (
              <button
                className="mini-card clickable"
                key={order.id}
                onClick={() => onOpen("order", order.id)}
              >
                <strong>OS #{order.number}</strong>
                <StatusBadge status={order.status} />
              </button>
            ))}
          </aside>
        )}
      </div>
    </>
  );
}

function VehiclesPage({
  data,
  onNew,
  onEdit,
  onOpen,
}: {
  data: KaizoData;
  onNew: () => void;
  onEdit: (vehicle: Vehicle) => void;
  onOpen: (kind: "entry" | "budget" | "order", id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const selected = data.vehicles.find((item) => item.id === selectedId);
  const selectedCustomer = data.customers.find(
    (item) => item.id === selected?.customerId,
  );
  const entries = data.entries.filter((item) => item.vehicleId === selectedId);
  const entryIds = new Set(entries.map((item) => item.id));
  const budgets = data.budgets.filter((item) => entryIds.has(item.entryId));
  const budgetIds = new Set(budgets.map((item) => item.id));
  const orders = data.orders.filter((item) => budgetIds.has(item.budgetId));
  const shown = data.vehicles.filter((vehicle) => {
    const customer = data.customers.find(
      (item) => item.id === vehicle.customerId,
    );
    return `${vehicle.brand} ${vehicle.model} ${vehicle.plate} ${customer?.name}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Veículos</h1>
          <p>Histórico completo de entradas e serviços.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Icon name="plus" /> Novo veículo
        </button>
      </div>
      <div className={`master-detail ${selected ? "has-detail" : ""}`}>
        <div>
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Buscar veículo, placa ou cliente"
          />
          <div className="vehicle-grid">
            {shown.map((vehicle) => (
              <button
                className="vehicle-card"
                key={vehicle.id}
                onClick={() => setSelectedId(vehicle.id)}
              >
                <div className="vehicle-visual">
                  <Icon name="car" />
                  <span>{vehicle.year}</span>
                </div>
                <strong>
                  {vehicle.brand} {vehicle.model}
                </strong>
                <small>{vehicle.version}</small>
                <div>
                  <b>{vehicle.plate}</b>
                  <span>{vehicle.mileage.toLocaleString("pt-BR")} km</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        {selected && (
          <aside className="detail-panel vehicle-history">
            <button className="panel-close" onClick={() => setSelectedId(null)}>
              <Icon name="close" />
            </button>
            <h2>
              {selected.brand} {selected.model}
            </h2>
            <p>
              {selected.version} · {selected.year}
            </p>
            <div className="vehicle-summary">
              <div>
                <small>Cliente</small>
                <strong>{selectedCustomer?.name}</strong>
              </div>
              <div>
                <small>Placa</small>
                <strong>{selected.plate}</strong>
              </div>
              <div>
                <small>Quilometragem</small>
                <strong>{selected.mileage.toLocaleString("pt-BR")} km</strong>
              </div>
              <div>
                <small>Cor</small>
                <strong>{selected.color}</strong>
              </div>
            </div>
            <div className="detail-actions">
              <button onClick={() => onEdit(selected)}>
                <Icon name="edit" /> Editar
              </button>
            </div>
            <h3>Atendimentos anteriores</h3>
            {entries.map((entry) => (
              <button
                className="timeline-item clickable"
                key={entry.id}
                onClick={() => onOpen("entry", entry.id)}
              >
                <i />
                <div>
                  <span>
                    {shortDate(entry.createdAt)} · Atendimento #{entry.number}
                  </span>
                  <strong>{entry.reportedProblem}</strong>
                  <small>{entry.status}</small>
                </div>
              </button>
            ))}
            <h3>Orçamentos</h3>
            {budgets.length ? (
              budgets.map((budget) => (
                <button
                  className="timeline-item clickable"
                  key={budget.id}
                  onClick={() => onOpen("budget", budget.id)}
                >
                  <i />
                  <div>
                    <span>
                      {shortDate(budget.createdAt)} · Orçamento #{budget.number}
                    </span>
                    <strong>{currency(orderCustomerTotal(budget))}</strong>
                    <small>{budget.status}</small>
                  </div>
                </button>
              ))
            ) : (
              <p className="muted">Nenhum orçamento para este veículo.</p>
            )}
            <h3>Serviços anteriores</h3>
            {orders.length ? (
              orders.map((order) => {
                const budget = data.budgets.find(
                  (item) => item.id === order.budgetId,
                );
                return (
                  <button
                    className="timeline-item clickable"
                    key={order.id}
                    onClick={() => onOpen("order", order.id)}
                  >
                    <i />
                    <div>
                      <span>
                        {shortDate(order.createdAt)} · OS #{order.number}
                      </span>
                      <strong>
                        {budget ? currency(orderCustomerTotal(budget)) : "—"}
                      </strong>
                      <small>{order.status}</small>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="muted">Nenhuma OS autorizada para este veículo.</p>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

function AgendaPage({
  data,
  onNew,
  onEdit,
  onCommit,
}: {
  data: KaizoData;
  onNew: () => void;
  onEdit: (appointment: Appointment) => void;
  onCommit: (data: KaizoData, message?: string) => void;
}) {
  const [view, setView] = useState<"today" | "upcoming">("today");
  const shown = data.appointments
    .filter((item) =>
      view === "today"
        ? sameLocalDay(item.scheduledAt)
        : new Date(item.scheduledAt) >= new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Agenda</h1>
          <p>Compromissos operacionais futuros.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Icon name="plus" /> Novo agendamento
        </button>
      </div>
      <div className="filter-pills page-filters">
        <button
          className={view === "today" ? "active" : ""}
          onClick={() => setView("today")}
        >
          Hoje
        </button>
        <button
          className={view === "upcoming" ? "active" : ""}
          onClick={() => setView("upcoming")}
        >
          Próximos
        </button>
      </div>
      <div className="agenda-list">
        {shown.map((appointment) => {
          const customer = data.customers.find(
            (item) => item.id === appointment.customerId,
          );
          const vehicle = data.vehicles.find(
            (item) => item.id === appointment.vehicleId,
          );
          return (
            <article className="card agenda-card" key={appointment.id}>
              <time>{dateTime(appointment.scheduledAt)}</time>
              <div>
                <strong>{appointment.service}</strong>
                <span>
                  {vehicle?.brand} {vehicle?.model} · {vehicle?.plate}
                </span>
                <small>
                  {customer?.name} · {appointment.notes}
                </small>
              </div>
              <StatusBadge status={appointment.status} />
              <div className="row-actions">
                <button onClick={() => onEdit(appointment)}>
                  <Icon name="edit" />
                </button>
                <button
                  onClick={() =>
                    onCommit(
                      appointmentService.remove(data, appointment.id),
                      "Agendamento removido.",
                    )
                  }
                >
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {shown.length === 0 && (
        <EmptyState
          title="Agenda livre"
          text="Nenhum compromisso encontrado neste período."
        />
      )}
    </>
  );
}

function PostSalePage({
  data,
  onCommit,
  onOpenOrder,
}: {
  data: KaizoData;
  onCommit: (data: KaizoData, message?: string) => void;
  onOpenOrder: (id: string) => void;
}) {
  const openWhatsApp = (followUp: PostSaleFollowUp) => {
    const customer = data.customers.find(
      (item) => item.id === followUp.customerId,
    );
    if (!customer) return;
    const phone = customer.phone.replace(/\D/g, "");
    const normalized = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(
      `https://wa.me/${normalized}?text=${encodeURIComponent(`Olá, ${customer.name}! Tudo bem após o serviço de ${followUp.service}?`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pós-venda</h1>
          <p>Acompanhamentos simples, sem transformar o KAIZO em CRM.</p>
        </div>
      </div>
      <div className="post-sale-list">
        {[...data.postSales]
          .sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() -
              new Date(b.scheduledAt).getTime(),
          )
          .map((followUp) => {
            const customer = data.customers.find(
              (item) => item.id === followUp.customerId,
            );
            const vehicle = data.vehicles.find(
              (item) => item.id === followUp.vehicleId,
            );
            return (
              <article className="card post-sale-card" key={followUp.id}>
                <div>
                  <small>{dateTime(followUp.scheduledAt)}</small>
                  <strong>
                    {customer?.name} · {vehicle?.brand} {vehicle?.model}
                  </strong>
                  <span>{followUp.service}</span>
                  <p>{followUp.notes}</p>
                </div>
                <StatusBadge status={followUp.status} />
                <div className="post-actions">
                  <button
                    className="secondary-button"
                    onClick={() => openWhatsApp(followUp)}
                  >
                    Abrir WhatsApp
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => onOpenOrder(followUp.orderId)}
                  >
                    Abrir OS
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      onCommit(
                        postSaleService.postpone(data, followUp),
                        "Pós-venda adiado por 7 dias.",
                      )
                    }
                  >
                    Adiar
                  </button>
                  <button
                    className="primary-button"
                    onClick={() =>
                      onCommit(
                        postSaleService.complete(data, followUp),
                        "Pós-venda concluído.",
                      )
                    }
                  >
                    Concluir
                  </button>
                </div>
              </article>
            );
          })}
      </div>
    </>
  );
}

function FinancePage({
  data,
  onOpenOrder,
}: {
  data: KaizoData;
  onOpenOrder: (id: string) => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustomRange);
  const chartDays =
    period === "30d"
      ? 30
      : period === "month"
        ? Math.max(1, new Date().getDate())
        : 7;
  const chart =
    period === "custom"
      ? financeService.chartRange(data, customRange)
      : financeService.chart(data, chartDays);
  const max = Math.max(1, ...chart.map((item) => item.value));
  const received = data.payments.reduce((sum, item) => sum + item.amount, 0);
  const activeBudgets = data.budgets.filter(
    (budget) => budget.status !== "Recusado",
  );
  const totalBudgeted = activeBudgets.reduce(
    (sum, budget) => sum + orderCustomerTotal(budget),
    0,
  );
  const pending = Math.max(0, totalBudgeted - received);
  const avg = activeBudgets.length ? totalBudgeted / activeBudgets.length : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Financeiro</h1>
          <p>Receita recebida e valores pendentes.</p>
        </div>
      </div>
      <section className="metrics-grid">
        <Metric
          label="Total recebido"
          value={currency(received)}
          tone="success"
        />
        <Metric
          label="Total pendente"
          value={currency(pending)}
          tone="waiting"
        />
        <Metric
          label="Total orçado"
          value={currency(totalBudgeted)}
          tone="neutral"
        />
        <Metric label="Ticket médio" value={currency(avg)} tone="process" />
      </section>
      <section className="card finance-chart-card">
        <div className="card-head">
          <div>
            <h2>Faturamento</h2>
            <p>Receita confirmada ao longo do período.</p>
          </div>
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            includeYesterday={false}
            includeCustom
          />
        </div>
        {period === "custom" && (
          <CustomPeriodFields value={customRange} onChange={setCustomRange} />
        )}
        <div className="revenue-chart">
          {chart.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              <span
                style={{ height: `${Math.max(3, (item.value / max) * 100)}%` }}
                title={`${item.label}: ${currency(item.value)}`}
              />
              <small>
                {chart.length <= 10 || index % Math.ceil(chart.length / 8) === 0
                  ? item.label
                  : ""}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="card receipt-history">
        <div className="card-head">
          <div>
            <h2>Histórico de recebimentos</h2>
            <p>Pagamentos registrados localmente.</p>
          </div>
        </div>
        {[...data.payments]
          .sort(
            (a, b) =>
              new Date(b.paidAt ?? 0).getTime() -
              new Date(a.paidAt ?? 0).getTime(),
          )
          .map((payment) => {
            const order = data.orders.find(
              (item) => item.id === payment.orderId,
            );
            const entry = data.entries.find(
              (item) => item.id === order?.entryId,
            );
            const customer = data.customers.find(
              (item) => item.id === entry?.customerId,
            );
            return (
              <button
                className="receipt-row"
                key={payment.id}
                onClick={() => order && onOpenOrder(order.id)}
              >
                <span>
                  {payment.paidAt ? dateTime(payment.paidAt) : "Pendente"}
                </span>
                <span>
                  <strong>{customer?.name}</strong>
                  <small>OS #{order?.number}</small>
                </span>
                <strong>{currency(payment.amount)}</strong>
                <span>{payment.method}</span>
                <StatusBadge status={payment.status} />
              </button>
            );
          })}
      </section>
    </>
  );
}
function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Dados locais atualizados</small>
    </article>
  );
}

function ReportsPage({ data }: { data: KaizoData }) {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustomRange);
  const summary = reportService.summary(data, period, customRange);
  const ranking = reportService.serviceRanking(data, period, customRange);
  const profitable = [...ranking].sort((a, b) => b.profit - a.profit);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Relatórios</h1>
          <p>Indicadores operacionais antes das exportações.</p>
        </div>
      </div>
      <PeriodFilter value={period} onChange={setPeriod} includeCustom />
      {period === "custom" && (
        <CustomPeriodFields value={customRange} onChange={setCustomRange} />
      )}
      <section className="report-metrics">
        <Metric
          label="Faturamento"
          value={currency(summary.revenue)}
          tone="success"
        />
        <Metric
          label="Serviços realizados"
          value={String(summary.services)}
          tone="process"
        />
        <Metric
          label="Ticket médio"
          value={currency(summary.ticket)}
          tone="neutral"
        />
        <Metric
          label="Taxa de aprovação"
          value={`${summary.approvalRate.toFixed(0)}%`}
          tone="waiting"
        />
      </section>
      <section className="report-grid">
        <div className="card report-card">
          <div className="card-head">
            <div>
              <h2>Serviços mais realizados</h2>
              <p>Ranking por quantidade.</p>
            </div>
          </div>
          {ranking.slice(0, 6).map((item, index) => (
            <div className="ranking-row" key={item.name}>
              <b>{index + 1}</b>
              <span>
                <strong>{item.name}</strong>
                <small>{item.quantity} realização(ões)</small>
              </span>
              <em>{item.quantity}</em>
            </div>
          ))}
          {ranking.length === 0 && (
            <p className="muted">Sem dados no período.</p>
          )}
        </div>
        <div className="card report-card">
          <div className="card-head">
            <div>
              <h2>Serviços mais lucrativos</h2>
              <p>Estimativa com os custos registrados.</p>
            </div>
          </div>
          {profitable.slice(0, 6).map((item) => (
            <div className="profit-row" key={item.name}>
              <span>
                <strong>{item.name}</strong>
                <small>{item.quantity} venda(s)</small>
              </span>
              <span>
                <small>Faturamento</small>
                <strong>{currency(item.revenue)}</strong>
              </span>
              <span>
                <small>Lucro estimado</small>
                <strong>{currency(item.profit)}</strong>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="card approval-card">
        <div>
          <h2>Taxa de aprovação</h2>
          <strong>{summary.approvalRate.toFixed(0)}%</strong>
        </div>
        <div>
          <span>
            Aprovados <b>{summary.approved}</b>
          </span>
          <span>
            Recusados <b>{summary.rejected}</b>
          </span>
          <span>
            Aguardando <b>{summary.waiting}</b>
          </span>
        </div>
      </section>
    </>
  );
}

function SettingsPage({
  data,
  onCommit,
}: {
  data: KaizoData;
  onCommit: (data: KaizoData, message?: string) => void;
}) {
  const [form, setForm] = useState(data.company);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Configurações</h1>
          <p>Dados da empresa e personalização do orçamento.</p>
        </div>
      </div>
      <form
        className="card settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCommit(settingsService.update(data, form), "Configurações salvas.");
        }}
      >
        <div className="form-grid">
          <Field label="Nome da empresa">
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </Field>
          <Field label="Tipo de negócio">
            <input
              value={form.businessType}
              onChange={(event) =>
                setForm({ ...form, businessType: event.target.value })
              }
            />
          </Field>
          <Field label="WhatsApp">
            <input
              value={form.whatsapp}
              onChange={(event) =>
                setForm({ ...form, whatsapp: event.target.value })
              }
            />
          </Field>
          <Field label="Endereço">
            <input
              value={form.address}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
            />
          </Field>
          <Field label="Mensagem padrão do orçamento" span>
            <textarea
              rows={5}
              value={form.quoteMessage}
              onChange={(event) =>
                setForm({ ...form, quoteMessage: event.target.value })
              }
            />
          </Field>
        </div>
        <div className="identity-note">
          <span className="blue-swatch" />
          <div>
            <strong>Identidade oficial KAIZO</strong>
            <small>Dark Navy + Electric Blue · #2563EB</small>
          </div>
        </div>
        <div className="form-footer">
          <button
            type="button"
            className="danger-button"
            onClick={() => {
              if (window.confirm("Restaurar os dados de demonstração?"))
                onCommit(
                  localRepository.reset(),
                  "Dados de demonstração restaurados.",
                );
            }}
          >
            Restaurar demonstração
          </button>
          <button className="primary-button">Salvar configurações</button>
        </div>
      </form>
    </>
  );
}

function MorePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Mais</h1>
          <p>Outros módulos operacionais do KAIZO.</p>
        </div>
      </div>
      <div className="more-grid">
        {moreNavigation.map((item) => (
          <button
            className="card more-card"
            key={item.id}
            onClick={() => onNavigate(item.id)}
          >
            <span>
              <Icon name={item.icon} />
            </span>
            <strong>{item.label}</strong>
            <Icon name="arrow" />
          </button>
        ))}
      </div>
    </>
  );
}

function NotificationPanel({
  data,
  onClose,
  onRead,
  onReadAll,
}: {
  data: KaizoData;
  onClose: () => void;
  onRead: (id: string, kind?: EntityKind, entityId?: string) => void;
  onReadAll: () => void;
}) {
  return (
    <aside className="notification-panel">
      <div className="notification-head">
        <div>
          <strong>Notificações</strong>
          <small>
            {data.notifications.filter((item) => !item.read).length} não lida(s)
          </small>
        </div>
        <button onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <button className="mark-read" onClick={onReadAll}>
        Marcar todas como lidas
      </button>
      <div>
        {data.notifications.map((item) => (
          <button
            className={`notification-item ${item.read ? "read" : ""}`}
            key={item.id}
            onClick={() => onRead(item.id, item.entityKind, item.entityId)}
          >
            <i />
            <span>
              <strong>{item.title}</strong>
              <small>{item.message}</small>
              <em>{dateTime(item.createdAt)}</em>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function CustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}) {
  return (
    <Modal
      title={customer ? "Editar cliente" : "Novo cliente"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            id: customer?.id ?? createId("customer"),
            name: String(form.get("name")),
            phone: String(form.get("phone")),
            cpf: String(form.get("cpf")) || undefined,
            notes: String(form.get("notes")) || undefined,
            createdAt: customer?.createdAt ?? new Date().toISOString(),
          });
        }}
      >
        <div className="form-grid">
          <Field label="Nome" span>
            <input name="name" defaultValue={customer?.name} required />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input
              name="phone"
              inputMode="tel"
              defaultValue={customer?.phone}
              required
            />
          </Field>
          <Field label="CPF">
            <input name="cpf" defaultValue={customer?.cpf} />
          </Field>
          <Field label="Observações" span>
            <textarea name="notes" rows={4} defaultValue={customer?.notes} />
          </Field>
        </div>
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button">Salvar cliente</button>
        </div>
      </form>
    </Modal>
  );
}
function VehicleModal({
  vehicle,
  customers,
  onClose,
  onSave,
}: {
  vehicle: Vehicle | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (vehicle: Vehicle) => void;
}) {
  return (
    <Modal
      title={vehicle ? "Editar veículo" : "Novo veículo"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            id: vehicle?.id ?? createId("vehicle"),
            customerId: String(form.get("customerId")),
            plate: String(form.get("plate")).replace(/\W/g, "").toUpperCase(),
            brand: String(form.get("brand")),
            model: String(form.get("model")),
            version: String(form.get("version")),
            year: Number(form.get("year")),
            color: String(form.get("color")),
            mileage: Number(form.get("mileage")),
            fuel: String(form.get("fuel")) || undefined,
          });
        }}
      >
        <div className="form-grid">
          <Field label="Cliente" span>
            <select
              name="customerId"
              defaultValue={vehicle?.customerId}
              required
            >
              <option value="">Selecione</option>
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marca">
            <input name="brand" defaultValue={vehicle?.brand} required />
          </Field>
          <Field label="Modelo">
            <input name="model" defaultValue={vehicle?.model} required />
          </Field>
          <Field label="Versão">
            <input name="version" defaultValue={vehicle?.version} />
          </Field>
          <Field label="Ano">
            <input
              name="year"
              type="number"
              inputMode="numeric"
              min="1950"
              max="2035"
              defaultValue={vehicle?.year ?? new Date().getFullYear()}
              required
            />
          </Field>
          <Field label="Placa">
            <input
              name="plate"
              defaultValue={vehicle?.plate}
              maxLength={7}
              required
            />
          </Field>
          <Field label="Cor">
            <input name="color" defaultValue={vehicle?.color} />
          </Field>
          <Field label="Quilometragem">
            <input
              name="mileage"
              type="number"
              inputMode="numeric"
              min="0"
              defaultValue={vehicle?.mileage ?? 0}
              required
            />
          </Field>
          <Field label="Combustível">
            <select name="fuel" defaultValue={vehicle?.fuel}>
              <option>Flex</option>
              <option>Gasolina</option>
              <option>Etanol</option>
              <option>Diesel</option>
              <option>Elétrico</option>
              <option>Híbrido</option>
            </select>
          </Field>
        </div>
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button">Salvar veículo</button>
        </div>
      </form>
    </Modal>
  );
}
function AppointmentModal({
  data,
  appointment,
  onClose,
  onSave,
}: {
  data: KaizoData;
  appointment: Appointment | null;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
}) {
  const [customerId, setCustomerId] = useState(
    appointment?.customerId ?? data.customers[0]?.id ?? "",
  );
  const vehicles = data.vehicles.filter(
    (item) => item.customerId === customerId,
  );
  return (
    <Modal
      title={appointment ? "Editar agendamento" : "Novo agendamento"}
      subtitle="Registro local, sem lembretes automáticos."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const current = new Date().toISOString();
          onSave({
            id: appointment?.id ?? createId("appointment"),
            customerId,
            vehicleId: String(form.get("vehicleId")),
            service: String(form.get("service")),
            scheduledAt: new Date(
              String(form.get("scheduledAt")),
            ).toISOString(),
            notes: String(form.get("notes")),
            status: String(form.get("status")) as Appointment["status"],
            createdAt: appointment?.createdAt ?? current,
            updatedAt: current,
          });
        }}
      >
        <div className="form-grid">
          <Field label="Cliente" span>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              {data.customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Veículo" span>
            <select
              name="vehicleId"
              defaultValue={appointment?.vehicleId}
              required
            >
              {vehicles.map((vehicle) => (
                <option value={vehicle.id} key={vehicle.id}>
                  {vehicle.brand} {vehicle.model} · {vehicle.plate}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Serviço" span>
            <input
              name="service"
              defaultValue={appointment?.service}
              required
            />
          </Field>
          <Field label="Data e hora">
            <input
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toLocalInput(appointment?.scheduledAt)}
              required
            />
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={appointment?.status ?? "Agendado"}
            >
              <option>Agendado</option>
              <option>Confirmado</option>
              <option>Concluído</option>
              <option>Cancelado</option>
            </select>
          </Field>
          <Field label="Observação" span>
            <textarea name="notes" rows={3} defaultValue={appointment?.notes} />
          </Field>
        </div>
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button">Salvar agendamento</button>
        </div>
      </form>
    </Modal>
  );
}
function PaymentModal({
  data,
  order,
  budget,
  onClose,
  onSave,
}: {
  data: KaizoData;
  order: ServiceOrder;
  budget: Budget;
  onClose: () => void;
  onSave: (payment: KaizoData["payments"][number]) => void;
}) {
  const paid = financeService.paidForOrder(data, order.id);
  const remaining = Math.max(0, orderCustomerTotal(budget) - paid);
  return (
    <Modal
      title={`Pagamento · OS #${order.number}`}
      subtitle={`Saldo pendente: ${currency(remaining)}`}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const amount = Number(form.get("amount"));
          onSave({
            id: createId("payment"),
            orderId: order.id,
            amount,
            method: String(form.get("method")) as PaymentMethod,
            status: amount >= remaining ? "Pago" : "Pago parcialmente",
            paidAt: new Date().toISOString(),
          });
        }}
      >
        <div className="form-grid">
          <Field label="Valor recebido" span>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={remaining || undefined}
              defaultValue={remaining || undefined}
              required
            />
          </Field>
          <Field label="Forma de pagamento" span>
            <select name="method">
              <option>PIX</option>
              <option>Dinheiro</option>
              <option>Débito</option>
              <option>Crédito</option>
              <option>Transferência</option>
              <option>Outro</option>
            </select>
          </Field>
        </div>
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button">Registrar pagamento</button>
        </div>
      </form>
    </Modal>
  );
}
function PostSaleModal({
  data,
  order,
  onClose,
  onSave,
}: {
  data: KaizoData;
  order: ServiceOrder;
  onClose: () => void;
  onSave: (followUp: PostSaleFollowUp) => void;
}) {
  const entry = data.entries.find((item) => item.id === order.entryId)!;
  const budget = data.budgets.find((item) => item.id === order.budgetId)!;
  const choose = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toLocalInput(date.toISOString());
  };
  return (
    <Modal
      title="Programar pós-venda"
      subtitle={`OS #${order.number} · acompanhamento local`}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            id: createId("post-sale"),
            orderId: order.id,
            customerId: entry.customerId,
            vehicleId: entry.vehicleId,
            service:
              budget.labor.map((item) => item.name).join(", ") ||
              "Serviço realizado",
            scheduledAt: new Date(
              String(form.get("scheduledAt")),
            ).toISOString(),
            notes: String(form.get("notes")),
            status: "Pendente",
            createdAt: new Date().toISOString(),
          });
        }}
      >
        <div className="quick-dates">
          <button
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form!;
              (
                form.elements.namedItem("scheduledAt") as HTMLInputElement
              ).value = choose(3);
            }}
          >
            3 dias
          </button>
          <button
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form!;
              (
                form.elements.namedItem("scheduledAt") as HTMLInputElement
              ).value = choose(7);
            }}
          >
            7 dias
          </button>
          <button
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form!;
              (
                form.elements.namedItem("scheduledAt") as HTMLInputElement
              ).value = choose(15);
            }}
          >
            15 dias
          </button>
          <button
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form!;
              (
                form.elements.namedItem("scheduledAt") as HTMLInputElement
              ).value = choose(30);
            }}
          >
            30 dias
          </button>
        </div>
        <div className="form-grid">
          <Field label="Data do acompanhamento" span>
            <input
              name="scheduledAt"
              type="datetime-local"
              defaultValue={choose(7)}
              required
            />
          </Field>
          <Field label="Observação" span>
            <textarea
              name="notes"
              rows={4}
              placeholder="Ex.: perguntar se o ruído foi resolvido."
              required
            />
          </Field>
        </div>
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button">Agendar pós-venda</button>
        </div>
      </form>
    </Modal>
  );
}
