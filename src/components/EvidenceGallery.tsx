import { type FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { evidenceService } from "@/lib/evidenceService";
import type { EvidenceLinkedItemType, EvidenceRecord, EvidenceType, ServiceOrderEvidence } from "@/lib/types";

const formatEvidenceDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function EvidencePhoto({ evidence, clientView = false }: { evidence: ServiceOrderEvidence; clientView?: boolean }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;
    evidenceService.getPhotoUrl(evidence).then((url) => {
      currentUrl = url;
      if (!active) {
        if (url) evidenceService.releasePhotoUrl(url);
        return;
      }
      setPhotoUrl(url);
      setMissing(!url);
    }).catch(() => active && setMissing(true));
    return () => {
      active = false;
      if (currentUrl) evidenceService.releasePhotoUrl(currentUrl);
    };
  }, [evidence]);

  if (missing) return <div className={`evidence-photo missing ${clientView ? "client" : ""}`}><span>Foto indisponível</span></div>;
  if (!photoUrl) return <div className={`evidence-photo loading ${clientView ? "client" : ""}`}><span>Carregando foto…</span></div>;
  return <img className={`evidence-photo ${clientView ? "client" : ""}`} src={photoUrl} alt={evidence.description} />;
}

export function EvidenceManager({ order, onSave }: { order: EvidenceRecord; onSave: (order: EvidenceRecord, message: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("photo");
    if (!(file instanceof File) || file.size === 0) return setError("Selecione uma foto para continuar.");

    const [linkKind, linkedItemId = ""] = String(values.get("linkedItem")).split(":");
    const linkedItemType: EvidenceLinkedItemType = linkKind === "part" ? "Peça" : linkKind === "labor" ? "Serviço" : "Diagnóstico";
    const linkedItemLabel = linkedItemType === "Peça"
      ? order.parts.find((item) => item.id === linkedItemId)?.name ?? "Peça removida do orçamento"
      : linkedItemType === "Serviço"
        ? order.labor.find((item) => item.id === linkedItemId)?.name ?? "Serviço removido do orçamento"
        : "Diagnóstico geral";

    setSaving(true);
    try {
      const withEvidence = await evidenceService.add(order, {
        file,
        description: String(values.get("description")),
        type: String(values.get("type")) as EvidenceType,
        linkedItemType,
        linkedItemId: linkedItemId || undefined,
        linkedItemLabel,
        showToCustomer: values.get("showToCustomer") === "on",
        oldPartSeparated: values.get("oldPartSeparated") === "on",
      });
      const updated = {
        ...withEvidence,
        updatedAt: new Date().toISOString(),
        timeline: [...withEvidence.timeline, {
          id: `event-${Date.now()}`,
          date: new Date().toISOString(),
          action: "Evidência adicionada",
          description: `${String(values.get("type"))} vinculada a ${linkedItemLabel}.`,
        }],
      };
      onSave(updated, "Evidência salva no dispositivo.");
      form.reset();
      setShowForm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a evidência.");
    } finally {
      setSaving(false);
    }
  };

  const removeEvidence = async (evidence: ServiceOrderEvidence) => {
    if (!window.confirm("Excluir esta evidência e remover a foto do dispositivo?")) return;
    setError("");
    try {
      const withoutEvidence = await evidenceService.remove(order, evidence.id);
      const updated = {
        ...withoutEvidence,
        updatedAt: new Date().toISOString(),
        timeline: [...withoutEvidence.timeline, {
          id: `event-${Date.now()}`,
          date: new Date().toISOString(),
          action: "Evidência removida",
          description: `Registro “${evidence.description}” removido da OS.`,
        }],
      };
      onSave(updated, "Evidência e foto removidas.");
    } catch {
      setError("Não foi possível remover a foto do armazenamento local.");
    }
  };

  return <div className="evidence-section">
    <div className="card evidence-intro">
      <div><span className="section-label">REGISTRO VISUAL</span><h2>Evidências do diagnóstico e do serviço</h2><p>Documente o antes e depois, vincule ao item correto e escolha o que o cliente poderá ver.</p></div>
      <button className={showForm ? "secondary-button" : "primary-button"} onClick={() => { setShowForm(!showForm); setError(""); }}>{showForm ? "Cancelar" : "+ Adicionar evidência"}</button>
    </div>

    {showForm && <form className="card evidence-form" onSubmit={addEvidence}>
      <label className="evidence-upload field field-span"><span>Foto da evidência</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required /><small>A imagem será redimensionada e comprimida antes de ser salva no dispositivo.</small></label>
      <div className="form-grid">
        <label className="field field-span"><span>Descrição</span><textarea name="description" rows={3} required placeholder="Descreva o problema encontrado ou o resultado do serviço…" /></label>
        <label className="field"><span>Momento</span><select name="type" defaultValue="Antes do serviço"><option>Antes do serviço</option><option>Depois do serviço</option></select></label>
        <label className="field"><span>Vincular a</span><select name="linkedItem" defaultValue="diagnosis:"><option value="diagnosis:">Diagnóstico geral</option><optgroup label="Peças">{order.parts.map((part) => <option key={part.id} value={`part:${part.id}`}>{part.name}</option>)}</optgroup><optgroup label="Serviços">{order.labor.map((labor) => <option key={labor.id} value={`labor:${labor.id}`}>{labor.name}</option>)}</optgroup></select></label>
      </div>
      <div className="evidence-options">
        <div><input id="evidence-show-to-customer" name="showToCustomer" type="checkbox" defaultChecked /><label htmlFor="evidence-show-to-customer"><strong>Exibir ao cliente</strong><small>Aparece de forma discreta na visualização do orçamento.</small></label></div>
        <div><input id="evidence-old-part" name="oldPartSeparated" type="checkbox" /><label htmlFor="evidence-old-part"><strong>Peça antiga separada para conferência na retirada</strong><small>Registra a informação junto à evidência.</small></label></div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-footer"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Processando foto…" : "Salvar evidência"}</button></div>
    </form>}

    {!showForm && error && <p className="form-error standalone-error" role="alert">{error}</p>}
    {order.evidences.length === 0 ? <div className="card evidence-empty"><span><Icon name="camera" /></span><h3>Nenhuma evidência registrada</h3><p>Adicione uma foto para documentar o diagnóstico ou o resultado do serviço.</p></div> : <div className="evidence-grid">{order.evidences.map((evidence) => <article className="card evidence-card" key={evidence.id}><div className="evidence-media"><EvidencePhoto evidence={evidence} /><span className={`evidence-type ${evidence.type === "Depois do serviço" ? "after" : "before"}`}>{evidence.type}</span></div><div className="evidence-content"><div className="evidence-meta"><span>{evidence.linkedItemType} · {evidence.linkedItemLabel}</span><time>{formatEvidenceDate(evidence.createdAt)}</time></div><h3>{evidence.description}</h3><div className="evidence-flags">{evidence.showToCustomer && <span>✓ Visível ao cliente</span>}{evidence.oldPartSeparated && <span>Peça antiga separada</span>}</div><button className="evidence-delete" onClick={() => removeEvidence(evidence)}>Excluir evidência</button></div></article>)}</div>}
  </div>;
}

export function ClientEvidenceGallery({ order }: { order: EvidenceRecord }) {
  const visibleEvidence = order.evidences.filter((evidence) => evidence.showToCustomer);
  if (visibleEvidence.length === 0) return null;

  return <section className="client-evidence-section"><div className="client-evidence-heading"><div><span>EVIDÊNCIAS DA OFICINA</span><h3>O que encontramos no seu veículo</h3></div><small>{visibleEvidence.length} registro(s)</small></div><div className="client-evidence-grid">{visibleEvidence.map((evidence) => <article className="client-evidence-card" key={evidence.id}><EvidencePhoto evidence={evidence} clientView /><div><span className={evidence.type === "Depois do serviço" ? "after" : "before"}>{evidence.type}</span><strong>{evidence.description}</strong><small>{evidence.linkedItemLabel}</small>{evidence.oldPartSeparated && <p>Peça antiga separada para conferência na retirada.</p>}</div></article>)}</div></section>;
}
