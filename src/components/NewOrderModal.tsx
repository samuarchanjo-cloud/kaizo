import { useState } from "react";
import { Icon } from "@/components/Icon";
import { localVehicleCatalog } from "@/data/vehicleCatalog";
import { customerService, vehicleService } from "@/lib/repository";
import type { Customer, KaizoData, Priority, ServiceEntry, Vehicle } from "@/lib/types";

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const formatMileage = (value: string) => value ? new Intl.NumberFormat("pt-BR").format(Number(digitsOnly(value))) : "";
const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const addDays = (amount: number) => { const date = new Date(); date.setDate(date.getDate() + amount); return localDate(date); };
const addBusinessDays = (amount: number) => {
  const date = new Date();
  let added = 0;
  while (added < amount) { date.setDate(date.getDate() + 1); if (date.getDay() !== 0 && date.getDay() !== 6) added += 1; }
  return localDate(date);
};

type DeliveryOption = "today" | "tomorrow" | "2" | "3" | "5" | "custom";

const deliveryOptions: Array<{ id: DeliveryOption; label: string }> = [
  { id: "today", label: "Hoje" }, { id: "tomorrow", label: "Amanhã" }, { id: "2", label: "2 dias úteis" },
  { id: "3", label: "3 dias úteis" }, { id: "5", label: "5 dias úteis" }, { id: "custom", label: "Escolher data" },
];

function Field({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <label className={`field ${span ? "field-span" : ""}`}><span>{label}</span>{children}</label>;
}

function MileageInput({ value, onChange, required = false }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  return <div className="mileage-input"><input aria-label="Quilometragem" inputMode="numeric" pattern="[0-9.]*" placeholder="Ex.: 97.450" value={formatMileage(value)} onChange={(event) => onChange(digitsOnly(event.target.value))} required={required} /><span>km</span></div>;
}

function AutocompleteField({ label, value, options, onChange, disabled = false, placeholder }: { label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean; placeholder: string }) {
  const [open, setOpen] = useState(false);
  return <label className="field catalog-field"><span>{label}</span><input value={value} disabled={disabled} placeholder={placeholder} autoComplete="off" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { onChange(event.target.value); setOpen(true); }} />{open && !disabled && options.length > 0 && <div className="catalog-options" role="listbox">{options.slice(0, 8).map((option) => <button key={option} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); }}>{option}</button>)}</div>}</label>;
}

function CustomerPicker({ customers, selectedId, query, onQuery, onSelect, onCreate }: { customers: Customer[]; selectedId: string; query: string; onQuery: (value: string) => void; onSelect: (customer: Customer) => void; onCreate: () => void }) {
  const [open, setOpen] = useState(false);
  const normalized = query.toLocaleLowerCase("pt-BR");
  const matches = customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.cpf ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalized));
  return <div className="customer-picker"><label className="field"><span>Buscar cliente por nome, telefone ou CPF</span><div className={`combobox-input ${selectedId ? "has-value" : ""}`}><Icon name="search" /><input value={query} placeholder="Digite para localizar um cliente" autoComplete="off" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { onQuery(event.target.value); setOpen(true); }} /></div></label>{open && <div className="combobox-menu" role="listbox">{matches.slice(0, 7).map((customer) => <button type="button" key={customer.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(customer); setOpen(false); }}><strong>{customer.name}</strong><small>{customer.phone}{customer.cpf ? ` · ${customer.cpf}` : ""}</small></button>)}{matches.length === 0 && <><p>Nenhum cliente encontrado.</p><button type="button" className="combobox-create" onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen(false); onCreate(); }}>+ Cadastrar novo cliente</button></>}</div>}</div>;
}

export function NewEntryModal({ data, onClose, onSave }: { data: KaizoData; onClose: () => void; onSave: (entry: ServiceEntry, preparedData: KaizoData) => void }) {
  const [workingData, setWorkingData] = useState(data);
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({ name: "", phone: "", cpf: "", notes: "" });
  const [manualVehicle, setManualVehicle] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState({ plate: "", brand: "", model: "", version: "", year: "", color: "", mileage: "", fuel: "" });
  const [mileage, setMileage] = useState("");
  const [problem, setProblem] = useState("");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [notes, setNotes] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>("2");
  const [deliveryDate, setDeliveryDate] = useState(() => addBusinessDays(2));
  const [deliveryTime, setDeliveryTime] = useState("");
  const [error, setError] = useState("");

  const customerVehicles = workingData.vehicles.filter((vehicle) => vehicle.customerId === customerId);
  const selectedVehicle = workingData.vehicles.find((vehicle) => vehicle.id === vehicleId);
  const brandOptions = localVehicleCatalog.searchBrands(vehicleDraft.brand);
  const modelOptions = localVehicleCatalog.searchModels(vehicleDraft.brand, vehicleDraft.model);
  const versionOptions = localVehicleCatalog.searchVersions(vehicleDraft.brand, vehicleDraft.model, vehicleDraft.version);

  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id); setCustomerQuery(customer.name); setVehicleId(""); setMileage(""); setShowCustomerForm(false); setShowVehicleForm(false); setError("");
  };
  const selectVehicle = (vehicle: Vehicle) => { setVehicleId(vehicle.id); setMileage(String(vehicle.mileage || "")); setShowVehicleForm(false); setError(""); };
  const saveCustomer = () => {
    if (!customerDraft.name.trim() || !customerDraft.phone.trim()) return setError("Informe nome e telefone para cadastrar o cliente.");
    const customer: Customer = { id: createId("customer"), name: customerDraft.name.trim(), phone: customerDraft.phone.trim(), cpf: customerDraft.cpf.trim() || undefined, notes: customerDraft.notes.trim() || undefined, createdAt: new Date().toISOString() };
    setWorkingData((current) => customerService.upsert(current, customer)); selectCustomer(customer);
  };
  const saveVehicle = () => {
    const year = Number(vehicleDraft.year);
    const vehicleMileage = Number(digitsOnly(vehicleDraft.mileage));
    if (!customerId || !vehicleDraft.plate.trim() || !vehicleDraft.brand.trim() || !vehicleDraft.model.trim() || !Number.isInteger(year) || year < 1950) return setError("Preencha placa, marca, modelo e um ano válido para cadastrar o veículo.");
    const vehicle: Vehicle = { id: createId("vehicle"), customerId, plate: vehicleDraft.plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(), brand: vehicleDraft.brand.trim(), model: vehicleDraft.model.trim(), version: vehicleDraft.version.trim(), year, color: vehicleDraft.color.trim(), mileage: vehicleMileage, fuel: vehicleDraft.fuel || undefined };
    setWorkingData((current) => vehicleService.upsert(current, vehicle)); selectVehicle(vehicle);
  };
  const chooseDelivery = (option: DeliveryOption) => {
    setDeliveryOption(option);
    if (option === "today") setDeliveryDate(addDays(0));
    else if (option === "tomorrow") setDeliveryDate(addDays(1));
    else if (option !== "custom") setDeliveryDate(addBusinessDays(Number(option)));
  };
  const submit = () => {
    if (!customerId) return setError("Selecione ou cadastre um cliente.");
    if (!vehicleId) return setError("Selecione ou cadastre um veículo deste cliente.");
    if (!mileage || Number(mileage) < 0) return setError("Informe uma quilometragem de entrada válida.");
    if (!problem.trim()) return setError("Descreva o problema relatado ou o serviço solicitado.");
    if (!deliveryDate) return setError("Escolha uma previsão de entrega.");
    const now = new Date().toISOString();
    const number = Math.max(...workingData.entries.map((entry) => entry.number), 2000) + 1;
    onSave({ id: createId("entry"), number, customerId, vehicleId, mileageIn: Number(mileage), reportedProblem: problem.trim(), technicalNotes: "", recommendations: "", tags: [], priority, initialDueDate: `${deliveryDate}T${deliveryTime || "17:00"}`, notes: notes.trim(), status: "Em diagnóstico", evidences: [], createdAt: now, updatedAt: now, timeline: [{ id: createId("event"), date: now, action: "Atendimento criado", description: `Veículo ${selectedVehicle?.plate} recebido e relato inicial registrado.` }] }, workingData);
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal modal-wide new-order-modal" role="dialog" aria-modal="true" aria-label="Novo atendimento"><div className="modal-head"><div><h2>Novo atendimento</h2><p>Cliente, veículo e entrada em um único fluxo.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></div><div className="new-order-flow">
    <section className="flow-step"><div className="step-label"><b>1</b><span>Cliente</span>{customerId && <em>Concluído</em>}</div><CustomerPicker customers={workingData.customers} selectedId={customerId} query={customerQuery} onQuery={(value) => { setCustomerQuery(value); if (customerId) { setCustomerId(""); setVehicleId(""); setMileage(""); } }} onSelect={selectCustomer} onCreate={() => { setCustomerDraft((current) => ({ ...current, name: customerQuery })); setShowCustomerForm(true); }} />{showCustomerForm && <div className="inline-register"><div className="inline-register-head"><div><strong>Novo cliente</strong><small>Cadastre sem sair do atendimento.</small></div><button type="button" onClick={() => setShowCustomerForm(false)} aria-label="Fechar cadastro"><Icon name="close" /></button></div><div className="form-grid"><Field label="Nome completo" span><input value={customerDraft.name} onChange={(event) => setCustomerDraft({ ...customerDraft, name: event.target.value })} /></Field><Field label="Telefone / WhatsApp"><input inputMode="tel" value={customerDraft.phone} onChange={(event) => setCustomerDraft({ ...customerDraft, phone: event.target.value })} /></Field><Field label="CPF (opcional)"><input inputMode="numeric" value={customerDraft.cpf} onChange={(event) => setCustomerDraft({ ...customerDraft, cpf: event.target.value })} /></Field><Field label="Observações" span><textarea rows={2} value={customerDraft.notes} onChange={(event) => setCustomerDraft({ ...customerDraft, notes: event.target.value })} /></Field></div><div className="inline-register-actions"><button type="button" className="secondary-button" onClick={() => setShowCustomerForm(false)}>Cancelar</button><button type="button" className="primary-button" onClick={saveCustomer}>Cadastrar e selecionar</button></div></div>}</section>

    {customerId && <section className="flow-step"><div className="step-label"><b>2</b><span>Veículo do cliente</span>{vehicleId && <em>Concluído</em>}</div>{customerVehicles.length > 0 && <div className="vehicle-choice-list">{customerVehicles.map((vehicle) => <button type="button" className={vehicleId === vehicle.id ? "selected" : ""} key={vehicle.id} onClick={() => selectVehicle(vehicle)}><span aria-hidden="true"><Icon name="car" /></span><span><strong>{vehicle.brand} {vehicle.model}</strong><small>{vehicle.version || "Versão não informada"} · {vehicle.plate}</small></span><em>{vehicle.mileage.toLocaleString("pt-BR")} km</em></button>)}</div>}{customerVehicles.length === 0 && !showVehicleForm && <p className="flow-empty">Este cliente ainda não possui veículos cadastrados.</p>}<button className="text-button inline-link" type="button" onClick={() => setShowVehicleForm(true)}>+ {customerVehicles.length ? "Cadastrar outro veículo" : "Cadastrar veículo"}</button>{showVehicleForm && <div className="inline-register vehicle-register"><div className="inline-register-head"><div><strong>Novo veículo</strong><small>Catálogo inteligente com preenchimento manual disponível.</small></div><button type="button" onClick={() => setShowVehicleForm(false)} aria-label="Fechar cadastro"><Icon name="close" /></button></div><button type="button" className="manual-toggle" onClick={() => setManualVehicle((current) => !current)}>{manualVehicle ? "Usar catálogo de veículos" : "Não encontrou? Preencher manualmente"}</button><div className="form-grid"><Field label="Placa"><input value={vehicleDraft.plate} maxLength={7} autoCapitalize="characters" onChange={(event) => setVehicleDraft({ ...vehicleDraft, plate: event.target.value.toUpperCase() })} /></Field>{manualVehicle ? <><Field label="Marca"><input value={vehicleDraft.brand} onChange={(event) => setVehicleDraft({ ...vehicleDraft, brand: event.target.value })} /></Field><Field label="Modelo"><input value={vehicleDraft.model} onChange={(event) => setVehicleDraft({ ...vehicleDraft, model: event.target.value })} /></Field><Field label="Versão"><input value={vehicleDraft.version} onChange={(event) => setVehicleDraft({ ...vehicleDraft, version: event.target.value })} /></Field></> : <><AutocompleteField label="Marca" value={vehicleDraft.brand} options={brandOptions} placeholder="Comece pela marca" onChange={(value) => setVehicleDraft({ ...vehicleDraft, brand: value, model: "", version: "" })} /><AutocompleteField label="Modelo" value={vehicleDraft.model} options={modelOptions} disabled={!vehicleDraft.brand} placeholder="Depois, escolha o modelo" onChange={(value) => setVehicleDraft({ ...vehicleDraft, model: value, version: "" })} /><AutocompleteField label="Versão" value={vehicleDraft.version} options={versionOptions} disabled={!vehicleDraft.model} placeholder="Por fim, a versão" onChange={(value) => setVehicleDraft({ ...vehicleDraft, version: value })} /></>}<Field label="Ano"><input inputMode="numeric" type="number" min="1950" max="2035" placeholder="Ex.: 2020" value={vehicleDraft.year} onChange={(event) => setVehicleDraft({ ...vehicleDraft, year: event.target.value })} /></Field><Field label="Cor"><input value={vehicleDraft.color} onChange={(event) => setVehicleDraft({ ...vehicleDraft, color: event.target.value })} /></Field><Field label="Quilometragem"><MileageInput value={vehicleDraft.mileage} onChange={(value) => setVehicleDraft({ ...vehicleDraft, mileage: value })} /></Field><Field label="Combustível (opcional)"><select value={vehicleDraft.fuel} onChange={(event) => setVehicleDraft({ ...vehicleDraft, fuel: event.target.value })}><option value="">Não informado</option><option>Flex</option><option>Gasolina</option><option>Etanol</option><option>Diesel</option><option>Elétrico</option><option>Híbrido</option></select></Field></div><div className="inline-register-actions"><button type="button" className="secondary-button" onClick={() => setShowVehicleForm(false)}>Cancelar</button><button type="button" className="primary-button" onClick={saveVehicle}>Cadastrar e selecionar</button></div></div>}</section>}

    {vehicleId && !showVehicleForm && <section className="flow-step"><div className="step-label"><b>3</b><span>Entrada e diagnóstico inicial</span></div><div className="form-grid"><Field label="Quilometragem de entrada"><MileageInput value={mileage} onChange={setMileage} required /></Field><Field label="Prioridade"><select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option>Normal</option><option>Alta</option><option>Urgente</option></select></Field><Field label="Problema relatado / descrição" span><textarea rows={4} value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Descreva o que o cliente relatou e os sintomas observados..." required /></Field><div className="field field-span"><span>Previsão de entrega</span><div className="delivery-options">{deliveryOptions.map((option) => <button type="button" key={option.id} className={deliveryOption === option.id ? "selected" : ""} onClick={() => chooseDelivery(option.id)}>{option.label}</button>)}</div></div><Field label="Data da entrega"><input type="date" min={localDate(new Date())} value={deliveryDate} onChange={(event) => { setDeliveryDate(event.target.value); setDeliveryOption("custom"); }} required /></Field><Field label="Horário (opcional)"><input type="time" value={deliveryTime} onChange={(event) => setDeliveryTime(event.target.value)} /></Field><Field label="Observações" span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: cliente aguarda retorno por WhatsApp" /></Field></div></section>}
    {error && <p className="form-error new-order-error" role="alert">{error}</p>}<div className="form-footer sticky-order-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" disabled={!vehicleId} onClick={submit}>CRIAR ATENDIMENTO</button></div>
  </div></section></div>;
}
