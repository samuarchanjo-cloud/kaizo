export type Priority = "Normal" | "Alta" | "Urgente";
export type EntryStatus =
  "Em avaliação" | "Diagnóstico registrado" | "Orçamento criado" | "Encerrado";
export type BudgetStatus =
  "Rascunho" | "Aguardando aprovação" | "Aprovado" | "Recusado";
export type BudgetRejectionReason =
  | "Preço geral"
  | "Peças"
  | "Mão de obra"
  | "Prazo"
  | "Desistência"
  | "Outro";
export type ServiceOrderStatus =
  "Em serviço" | "Finalizado" | "Entregue" | "Cancelado";
export type PaymentStatus = "Pendente" | "Pago parcialmente" | "Pago";
export type PaymentMethod =
  "PIX" | "Dinheiro" | "Débito" | "Crédito" | "Transferência" | "Outro";
export type AppointmentStatus =
  "Agendado" | "Confirmado" | "Concluído" | "Cancelado";
export type PostSaleStatus = "Pendente" | "Concluído" | "Adiado";
export type NotificationKind =
  | "budget-approved"
  | "budget-rejected"
  | "order-finished"
  | "post-sale"
  | "general";
export type EntityKind =
  "entry" | "budget" | "order" | "appointment" | "post-sale";
export type VehicleCategory =
  "compact" | "hatch" | "sedan" | "suv" | "pickup" | "van" | "other";
export type PricingMode =
  "fixed" | "by_vehicle_category" | "starting_from" | "evaluation_required";
export type DurationMode = "fixed" | "by_vehicle_category" | "estimated";

export interface CompanySettings {
  id: string;
  name: string;
  businessType: string;
  whatsapp: string;
  address: string;
  quoteMessage: string;
  accent: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  cpf?: string;
  notes?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  color: string;
  vehicleCategory: VehicleCategory;
  vehiclePhoto?: string;
  mileage: number;
  fuel?: string;
  notes?: string;
}

export interface VehicleCategoryServiceRule {
  price?: number;
  durationMinutes?: number;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  pricingMode: PricingMode;
  durationMode: DurationMode;
  basePrice?: number;
  startingPrice?: number;
  baseDurationMinutes?: number;
  categoryRules?: Partial<Record<VehicleCategory, VehicleCategoryServiceRule>>;
}

export interface PartAdditionalCost {
  id: string;
  description: string;
  value: number;
}

export interface ServiceOrderPart {
  id: string;
  name: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  responsibility: "Oficina" | "Cliente";
  additionalCosts: PartAdditionalCost[];
}

export interface ServiceOrderLabor {
  id: string;
  name: string;
  estimatedHours: number;
  hourlyRate: number;
  price: number;
}

export type EvidenceType = "Antes do serviço" | "Depois do serviço";
export type EvidenceLinkedItemType = "Diagnóstico" | "Peça" | "Serviço";

export interface ServiceOrderEvidence {
  id: string;
  orderId: string;
  mediaId: string;
  description: string;
  type: EvidenceType;
  linkedItemType: EvidenceLinkedItemType;
  linkedItemId?: string;
  linkedItemLabel: string;
  showToCustomer: boolean;
  oldPartSeparated: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  action: string;
  description: string;
}

export interface ServiceEntry {
  id: string;
  number: number;
  customerId: string;
  vehicleId: string;
  mileageIn: number;
  reportedProblem: string;
  technicalNotes: string;
  recommendations: string;
  tags: string[];
  priority: Priority;
  initialDueDate: string;
  notes: string;
  status: EntryStatus;
  evidences: ServiceOrderEvidence[];
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
}

export interface Budget {
  id: string;
  number: number;
  entryId: string;
  status: BudgetStatus;
  rejectionReason?: BudgetRejectionReason;
  parts: ServiceOrderPart[];
  labor: ServiceOrderLabor[];
  quoteMessage: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
}

export interface ServiceOrder {
  id: string;
  number: number;
  entryId: string;
  budgetId: string;
  status: ServiceOrderStatus;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
}

export interface EvidenceRecord {
  id: string;
  parts: ServiceOrderPart[];
  labor: ServiceOrderLabor[];
  evidences: ServiceOrderEvidence[];
  updatedAt: string;
  timeline: TimelineEvent[];
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  vehicleId: string;
  service: string;
  scheduledAt: string;
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PostSaleFollowUp {
  id: string;
  orderId: string;
  customerId: string;
  vehicleId: string;
  service: string;
  scheduledAt: string;
  notes: string;
  status: PostSaleStatus;
  createdAt: string;
  completedAt?: string;
}

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  entityKind?: EntityKind;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

export interface KaizoData {
  company: CompanySettings;
  customers: Customer[];
  vehicles: Vehicle[];
  entries: ServiceEntry[];
  budgets: Budget[];
  orders: ServiceOrder[];
  payments: Payment[];
  appointments: Appointment[];
  postSales: PostSaleFollowUp[];
  notifications: Notification[];
}
