import type { KaizoData, ServiceOrder } from "./types";

const event = (id: string, date: string, action: string, description: string) => ({ id, date, action, description });

export const seedData: KaizoData = {
  company: {
    id: "company-1",
    name: "Oficina Demo",
    businessType: "Mecânica",
    whatsapp: "(11) 99999-0000",
    address: "Av. das Oficinas, 240 · São Paulo, SP",
    quoteMessage: "Detectamos os itens que precisam de atenção e selecionamos as melhores soluções para seu veículo. Conte com a gente.",
    accent: "#f5c400",
  },
  customers: [
    { id: "c1", name: "João da Silva", phone: "(11) 99999-9999", cpf: "123.456.789-00", notes: "Prefere contato por WhatsApp.", createdAt: "2026-05-11T10:00:00.000Z" },
    { id: "c2", name: "Maria Oliveira", phone: "(11) 98888-1212", createdAt: "2026-06-04T14:00:00.000Z" },
    { id: "c3", name: "Carlos Santos", phone: "(11) 97777-3434", notes: "Cliente desde 2024.", createdAt: "2026-06-20T09:30:00.000Z" },
  ],
  vehicles: [
    { id: "v1", customerId: "c1", plate: "ABC1D23", brand: "Honda", model: "Civic", version: "EX 2.0 Flex", year: 2018, color: "Prata", mileage: 78650, fuel: "Flex" },
    { id: "v2", customerId: "c2", plate: "BRA2E19", brand: "Volkswagen", model: "Gol", version: "1.0", year: 2019, color: "Branco", mileage: 62300, fuel: "Flex" },
    { id: "v3", customerId: "c3", plate: "KZO2A20", brand: "Chevrolet", model: "Onix", version: "LT", year: 2020, color: "Preto", mileage: 47980, fuel: "Flex" },
  ],
  orders: [],
  payments: [
    { id: "pay-1", orderId: "o3", amount: 820, method: "PIX", status: "Pago", paidAt: "2026-08-10T13:10:00.000Z" },
  ],
};

const orders: ServiceOrder[] = [
  {
    id: "o1", number: 1247, customerId: "c1", vehicleId: "v1", mileageIn: 78650,
    reportedProblem: "Luz de injeção acesa, perda de potência em subidas e consumo elevado.",
    technicalNotes: "Falha intermitente no cilindro 2. Bobina com resistência fora da especificação e bicos com vazão irregular.",
    recommendations: "Substituir bobina e velas, realizar limpeza de bicos e nova leitura do sistema após o serviço.",
    tags: ["Falha de ignição", "Injeção eletrônica", "Consumo"], priority: "Alta", dueDate: "2026-08-11T17:00", notes: "Cliente precisa do carro para viagem.",
    status: "Aguardando aprovação",
    parts: [
      { id: "p1", name: "Jogo de velas de ignição", supplier: "NGK", quantity: 1, unitCost: 260, unitPrice: 390 },
      { id: "p2", name: "Bobina de ignição", supplier: "Bosch", quantity: 1, unitCost: 220, unitPrice: 340 },
      { id: "p3", name: "Filtro de ar", supplier: "Mann", quantity: 1, unitCost: 48, unitPrice: 85 },
    ],
    labor: [
      { id: "l1", name: "Diagnóstico eletrônico", estimatedHours: 1.5, hourlyRate: 80, price: 180 },
      { id: "l2", name: "Limpeza de bicos", estimatedHours: 1, hourlyRate: 80, price: 250 },
      { id: "l3", name: "Revisão do sistema", estimatedHours: 1, hourlyRate: 80, price: 295 },
    ],
    quoteMessage: "Detectamos falhas na ignição que causavam perda de potência e consumo elevado. O orçamento contempla peças e serviços recomendados.",
    createdAt: "2026-08-10T10:30:00.000Z", updatedAt: "2026-08-10T12:25:00.000Z",
    timeline: [
      event("e1", "2026-08-10T10:30:00.000Z", "OS criada", "Veículo recebido e relato inicial registrado."),
      event("e2", "2026-08-10T11:20:00.000Z", "Diagnóstico concluído", "Falha de ignição confirmada no cilindro 2."),
      event("e3", "2026-08-10T12:25:00.000Z", "Orçamento enviado", "Orçamento disponibilizado para aprovação do cliente."),
    ],
  },
  {
    id: "o2", number: 1246, customerId: "c2", vehicleId: "v2", mileageIn: 62300,
    reportedProblem: "Revisão periódica e ruído ao frear.", technicalNotes: "Pastilhas dianteiras no limite de desgaste.", recommendations: "Substituir pastilhas e revisar fluido.", tags: ["Revisão periódica", "Freio"], priority: "Normal", dueDate: "2026-08-10T18:00", notes: "",
    status: "Em serviço", parts: [{ id: "p4", name: "Pastilhas de freio dianteiras", supplier: "Cobreq", quantity: 1, unitCost: 185, unitPrice: 290 }], labor: [{ id: "l4", name: "Troca de pastilhas e revisão", estimatedHours: 1.5, hourlyRate: 90, price: 280 }], quoteMessage: "Serviço aprovado e em execução.", createdAt: "2026-08-09T13:20:00.000Z", updatedAt: "2026-08-10T09:10:00.000Z", timeline: [event("e4", "2026-08-09T13:20:00.000Z", "OS criada", "Revisão periódica registrada."), event("e5", "2026-08-10T09:10:00.000Z", "Serviço iniciado", "Veículo direcionado para execução.")]
  },
  {
    id: "o3", number: 1245, customerId: "c3", vehicleId: "v3", mileageIn: 47600,
    reportedProblem: "Higienização interna e polimento técnico.", technicalNotes: "Pintura com micro riscos e bancos com manchas leves.", recommendations: "Manutenção da proteção a cada seis meses.", tags: ["Estética"], priority: "Normal", dueDate: "2026-08-10T15:00", notes: "",
    status: "Finalizado", parts: [], labor: [{ id: "l5", name: "Polimento técnico", estimatedHours: 4, hourlyRate: 80, price: 520 }, { id: "l6", name: "Higienização interna", estimatedHours: 3, hourlyRate: 70, price: 300 }], quoteMessage: "Seu veículo está pronto.", createdAt: "2026-08-08T08:00:00.000Z", updatedAt: "2026-08-10T13:00:00.000Z", timeline: [event("e6", "2026-08-08T08:00:00.000Z", "OS criada", "Serviços estéticos registrados."), event("e7", "2026-08-10T13:00:00.000Z", "Serviço finalizado", "Qualidade final conferida."), event("e8", "2026-08-10T13:10:00.000Z", "Pagamento registrado", "Pagamento integral via PIX.")]
  },
  {
    id: "o4", number: 1244, customerId: "c1", vehicleId: "v1", mileageIn: 77120,
    reportedProblem: "Alinhamento e balanceamento.", technicalNotes: "Pneu dianteiro direito com desgaste irregular.", recommendations: "Reavaliar em 10 mil km.", tags: ["Suspensão"], priority: "Normal", dueDate: "2026-07-25T16:00", notes: "",
    status: "Cancelado", parts: [], labor: [{ id: "l7", name: "Alinhamento e balanceamento", estimatedHours: 1, hourlyRate: 60, price: 180 }], quoteMessage: "", createdAt: "2026-07-24T09:00:00.000Z", updatedAt: "2026-07-24T11:00:00.000Z", timeline: [event("e9", "2026-07-24T09:00:00.000Z", "OS criada", "Solicitação registrada."), event("e10", "2026-07-24T11:00:00.000Z", "OS cancelada", "Cancelamento solicitado pelo cliente.")]
  },
];

seedData.orders = orders;

