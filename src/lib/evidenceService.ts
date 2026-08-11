import { mediaRepository } from "./mediaRepository";
import type { EvidenceLinkedItemType, EvidenceRecord, EvidenceType, ServiceOrderEvidence } from "./types";

const MAX_IMAGE_EDGE = 1600;
const COMPRESSION_THRESHOLD = 900_000;
const JPEG_QUALITY = 0.82;

export interface NewEvidenceInput {
  file: File;
  description: string;
  type: EvidenceType;
  linkedItemType: EvidenceLinkedItemType;
  linkedItemId?: string;
  linkedItemLabel: string;
  showToCustomer: boolean;
  oldPartSeparated: boolean;
}

const toJpegBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível comprimir a foto."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

export async function compressEvidencePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem válido.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Este formato de imagem não é compatível. Use JPEG, PNG ou WebP.");
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= COMPRESSION_THRESHOLD) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível processar a foto neste navegador.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toJpegBlob(canvas);
}

export const evidenceService = {
  async add(order: EvidenceRecord, input: NewEvidenceInput): Promise<EvidenceRecord> {
    const compressedPhoto = await compressEvidencePhoto(input.file);
    const storedMedia = await mediaRepository.save(compressedPhoto);
    const evidence: ServiceOrderEvidence = {
      id: `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orderId: order.id,
      mediaId: storedMedia.id,
      description: input.description.trim(),
      type: input.type,
      linkedItemType: input.linkedItemType,
      linkedItemId: input.linkedItemId,
      linkedItemLabel: input.linkedItemLabel,
      showToCustomer: input.showToCustomer,
      oldPartSeparated: input.oldPartSeparated,
      createdAt: new Date().toISOString(),
    };
    return { ...order, evidences: [evidence, ...order.evidences] };
  },

  async remove(order: EvidenceRecord, evidenceId: string): Promise<EvidenceRecord> {
    const evidence = order.evidences.find((item) => item.id === evidenceId);
    if (!evidence) return order;
    await mediaRepository.remove(evidence.mediaId);
    return { ...order, evidences: order.evidences.filter((item) => item.id !== evidenceId) };
  },

  async getPhotoUrl(evidence: ServiceOrderEvidence): Promise<string | null> {
    const blob = await mediaRepository.get(evidence.mediaId);
    return blob ? URL.createObjectURL(blob) : null;
  },

  releasePhotoUrl(url: string) {
    URL.revokeObjectURL(url);
  },
};
