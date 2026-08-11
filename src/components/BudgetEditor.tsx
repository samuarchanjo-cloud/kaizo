import { type FormEvent, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Icon } from "@/components/Icon";
import { orderLaborTotal, orderPartsCustomerTotal, orderRealCost, partAdditionalCost, partBaseCost, partCustomerTotal, partMargin, partProfit, partRealCost } from "@/lib/budgetCalculations";
import type { Budget, PartAdditionalCost, ServiceOrderPart } from "@/lib/types";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function PartAddForm({ onAdd }: { onAdd: (part: ServiceOrderPart) => void }) {
  const [responsibility, setResponsibility] = useState<"Oficina" | "Cliente">("Oficina");
  const [additionalCosts, setAdditionalCosts] = useState<PartAdditionalCost[]>([]);
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [additionalValue, setAdditionalValue] = useState(0);
  const [formResetKey, setFormResetKey] = useState(0);
  const [additionalResetKey, setAdditionalResetKey] = useState(0);

  const addAdditionalCost = () => {
    if (!additionalDescription.trim() || additionalValue <= 0) return;
    setAdditionalCosts((current) => [...current, { id: id("cost"), description: additionalDescription.trim(), value: additionalValue }]);
    setAdditionalDescription(""); setAdditionalValue(0); setAdditionalResetKey((current) => current + 1);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const officeSupplied = responsibility === "Oficina";
    onAdd({ id: id("part"), name: String(form.get("name")).trim(), supplier: officeSupplied ? String(form.get("supplier")).trim() : "", quantity: Number(form.get("quantity")), unitCost: officeSupplied ? Number(form.get("cost")) : 0, unitPrice: officeSupplied ? Number(form.get("price")) : 0, responsibility, additionalCosts: officeSupplied ? additionalCosts : [] });
    event.currentTarget.reset(); setResponsibility("Oficina"); setAdditionalCosts([]); setAdditionalDescription(""); setAdditionalValue(0); setFormResetKey((current) => current + 1); setAdditionalResetKey((current) => current + 1);
  };

  return <form className="part-add-form" onSubmit={submit}>
    <div className="part-form-grid">
      <label><span>Nome da peça</span><input name="name" required placeholder="Ex.: Bomba d'água" /></label>
      <label><span>Quantidade</span><input name="quantity" inputMode="numeric" type="number" min="1" step="1" defaultValue="1" required /></label>
      <label><span>Responsável pela peça</span><select value={responsibility} onChange={(event) => { setResponsibility(event.target.value as "Oficina" | "Cliente"); if (event.target.value === "Cliente") setAdditionalCosts([]); }}><option>Oficina</option><option>Cliente</option></select></label>
      {responsibility === "Oficina" && <>
        <label><span>Fornecedor</span><input name="supplier" placeholder="Opcional" /></label>
        <div className="part-field"><span>Custo da peça</span><CurrencyInput key={`cost-${formResetKey}`} name="cost" label="Custo da peça" required /></div>
        <div className="part-field"><span>Valor da peça para o cliente</span><CurrencyInput key={`price-${formResetKey}`} name="price" label="Valor da peça para o cliente" required /></div>
      </>}
    </div>
    {responsibility === "Cliente" ? <div className="customer-supplied-hint"><Icon name="customers" /><div><strong>Peça fornecida pelo cliente</strong><span>Ela continuará visível no orçamento, mas não será somada ao total.</span></div></div> : <div className="additional-cost-builder"><div><strong>Custos adicionais</strong><small>Entrega, motoboy, frete, taxa ou outro gasto necessário.</small></div><div className="additional-cost-fields"><input aria-label="Descrição do custo adicional" value={additionalDescription} onChange={(event) => setAdditionalDescription(event.target.value)} placeholder="Descrição do custo" /><CurrencyInput key={`additional-${additionalResetKey}`} name="additionalCostDraft" label="Valor do custo adicional" onValueChange={setAdditionalValue} /><button type="button" className="secondary-button" disabled={!additionalDescription.trim() || additionalValue <= 0} onClick={addAdditionalCost}><Icon name="plus" /> Incluir custo</button></div>{additionalCosts.length > 0 && <div className="additional-cost-list">{additionalCosts.map((cost) => <div key={cost.id}><span>{cost.description}</span><strong>{currency(cost.value)}</strong><button type="button" aria-label={`Remover ${cost.description}`} onClick={() => setAdditionalCosts((current) => current.filter((item) => item.id !== cost.id))}><Icon name="close" /></button></div>)}</div>}</div>}
    <button className="primary-button part-submit" type="submit"><Icon name="plus" /> Adicionar peça</button>
  </form>;
}

function LaborAddForm({ onAdd }: { onAdd: (labor: Budget["labor"][number]) => void }) {
  const [resetKey, setResetKey] = useState(0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    onAdd({ id: id("labor"), name: String(form.get("name")).trim(), estimatedHours: Number(form.get("hours")), hourlyRate: 0, price: Number(form.get("price")) });
    event.currentTarget.reset(); setResetKey((current) => current + 1);
  };
  return <form className="labor-add-form" onSubmit={submit}><label><span>Nome do serviço</span><input name="name" placeholder="Ex.: Troca da bomba d'água" required /></label><label><span>Tempo estimado</span><div className="hours-input"><input name="hours" inputMode="decimal" type="number" min="0.25" step="0.25" placeholder="1,5" required /><span>h</span></div></label><div className="part-field"><span>Valor da mão de obra</span><CurrencyInput key={resetKey} name="price" label="Valor da mão de obra" required /></div><button className="secondary-button" type="submit"><Icon name="plus" /> Adicionar serviço</button></form>;
}

export function BudgetEditor({ draft, setDraft, total, profit, onSave, onPreview, onFinalize, onWhatsApp }: { draft: Budget; setDraft: (order: Budget) => void; total: number; profit: number; onSave: (message: string) => void; onPreview: () => void; onFinalize: () => void; onWhatsApp: () => void }) {
  const partsTotal = orderPartsCustomerTotal(draft);
  const laborTotal = orderLaborTotal(draft);
  const realCost = orderRealCost(draft);
  return <div className="budget-layout"><div className="budget-main">
    <section className="card budget-section"><div className="card-head"><div><span className="section-label">A · PEÇAS</span><h2>Peças e materiais</h2></div></div>
      <div className="part-internal-list">{draft.parts.map((part) => <article className={`part-internal-card ${part.responsibility === "Cliente" ? "customer-supplied" : ""}`} key={part.id}><header><div><strong>{part.name}</strong><small>{part.responsibility === "Cliente" ? "Peça fornecida pelo cliente" : part.supplier || "Fornecedor não informado"}</small></div><span>{part.responsibility}</span><button type="button" aria-label={`Excluir ${part.name}`} onClick={() => setDraft({ ...draft, parts: draft.parts.filter((item) => item.id !== part.id) })}><Icon name="trash" /></button></header>{part.responsibility === "Cliente" ? <div className="customer-supplied-summary"><span>Quantidade</span><strong>{part.quantity}</strong><p>Sem custo ou valor de peça incluído no orçamento.</p></div> : <><div className="part-metrics"><div><span>Custo unitário</span><strong>{currency(part.unitCost)}</strong></div><div><span>Quantidade</span><strong>{part.quantity}</strong></div><div><span>Custo base total</span><strong>{currency(partBaseCost(part))}</strong></div><div><span>Custos adicionais</span><strong>{currency(partAdditionalCost(part))}</strong></div><div><span>Custo total real</span><strong>{currency(partRealCost(part))}</strong></div><div><span>Valor para o cliente</span><strong>{currency(partCustomerTotal(part))}</strong></div><div className="positive-metric"><span>Lucro estimado</span><strong>{currency(partProfit(part))}</strong></div><div className="positive-metric"><span>Margem</span><strong>{partMargin(part).toFixed(2).replace(".", ",")}%</strong></div></div>{part.additionalCosts.length > 0 && <div className="saved-additional-costs">{part.additionalCosts.map((cost) => <span key={cost.id}>{cost.description}: <b>{currency(cost.value)}</b></span>)}</div>}</>}</article>)}</div>
      {draft.parts.length === 0 && <p className="budget-empty-copy">Nenhuma peça adicionada ao orçamento.</p>}
      <PartAddForm onAdd={(part) => setDraft({ ...draft, parts: [...draft.parts, part] })} />
    </section>
    <section className="card budget-section"><div className="card-head"><div><span className="section-label">B · MÃO DE OBRA</span><h2>Serviços</h2></div></div><div className="labor-list">{draft.labor.map((labor) => <div key={labor.id}><span><strong>{labor.name}</strong><small>{labor.estimatedHours.toLocaleString("pt-BR")}h estimada(s)</small></span><strong>{currency(labor.price)}</strong><button type="button" aria-label={`Excluir ${labor.name}`} onClick={() => setDraft({ ...draft, labor: draft.labor.filter((item) => item.id !== labor.id) })}><Icon name="trash" /></button></div>)}</div>{draft.labor.length === 0 && <p className="budget-empty-copy">Nenhum serviço adicionado ao orçamento.</p>}<LaborAddForm onAdd={(labor) => setDraft({ ...draft, labor: [...draft.labor, labor] })} /></section>
    <section className="card budget-section"><label className="field"><span>Mensagem da oficina</span><textarea rows={4} value={draft.quoteMessage} onChange={(event) => setDraft({ ...draft, quoteMessage: event.target.value })} /></label></section>
  </div><aside className="card budget-summary"><span className="section-label">C · RESUMO FINANCEIRO</span><h2>Totais do orçamento</h2><div className="summary-line"><span>Custo real das peças</span><strong>{currency(realCost)}</strong></div><div className="summary-line"><span>Peças para o cliente</span><strong>{currency(partsTotal)}</strong></div><div className="summary-line"><span>Mão de obra</span><strong>{currency(laborTotal)}</strong></div><div className="summary-line total"><span>Total do orçamento</span><strong>{currency(total)}</strong></div><div className="profit-box"><span>Lucro estimado</span><strong>{currency(profit)}</strong><small>{total > 0 ? `${((profit / total) * 100).toFixed(1)}% de margem` : "0% de margem"}</small></div><div className="deadline"><Icon name="clock" /><div><small>Prazo estimado</small><strong>{formatDate(draft.dueDate)}</strong></div></div><button className="secondary-button full" onClick={() => onSave("Rascunho salvo.")}>Salvar rascunho</button><button className="secondary-button full" onClick={onPreview}>Visualizar como cliente</button><button className="secondary-button full" onClick={onFinalize}>Finalizar orçamento</button><button className="primary-button full whatsapp-button" onClick={onWhatsApp}>Enviar pelo WhatsApp</button></aside></div>;
}
