export type OrderStatus =
  | "Em diagnóstico"
  | "Orçamento enviado"
  | "Aguardando aprovação"
  | "Aprovado"
  | "Recusado"
  | "Em serviço"
  | "Finalizado"
  | "Cancelado"
  | "Entregue";

export type PaymentStatus = "Pendente" | "Pago parcialmente" | "Pago";
export type PaymentMethod = "PIX" | "Dinheiro" | "Débito" | "Crédito" | "Transferência" | "Outro";
export type Priority = "Normal" | "Alta" | "Urgente";

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
  mileage: number;
  fuel?: string;
  notes?: string;
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

export interface PartAdditionalCost {
  id: string;
  description: string;
  value: number;
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

export interface ServiceOrder {
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
  dueDate: string;
  notes: string;
  status: OrderStatus;
  parts: ServiceOrderPart[];
  labor: ServiceOrderLabor[];
  evidences: ServiceOrderEvidence[];
  quoteMessage: string;
  createdAt: string;
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

export interface KaizoData {
  company: CompanySettings;
  customers: Customer[];
  vehicles: Vehicle[];
  orders: ServiceOrder[];
  payments: Payment[];
}
