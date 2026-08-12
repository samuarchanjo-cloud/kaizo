import type { VehicleCategory } from "./types";

export const vehicleCategoryOptions: Array<{
  value: VehicleCategory;
  label: string;
}> = [
  { value: "compact", label: "Compacto" },
  { value: "hatch", label: "Hatch" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV / Crossover" },
  { value: "pickup", label: "Pickup" },
  { value: "van", label: "Utilitário / Van" },
  { value: "other", label: "Esportivo / Outros" },
];

export const vehicleColorOptions = [
  { label: "Branco", hex: "#F4F4F5" },
  { label: "Preto", hex: "#27272A" },
  { label: "Prata", hex: "#A1A1AA" },
  { label: "Cinza", hex: "#52525B" },
  { label: "Vermelho", hex: "#DC2626" },
  { label: "Azul", hex: "#2563EB" },
  { label: "Verde", hex: "#16805A" },
  { label: "Bege / Marrom", hex: "#8B6F55" },
  { label: "Outra", hex: "#71717A" },
] as const;

export const vehicleCategoryLabel = (category?: VehicleCategory) =>
  vehicleCategoryOptions.find((item) => item.value === category)?.label ??
  "Outros";

export const vehicleColorHex = (color?: string) =>
  vehicleColorOptions.find(
    (item) =>
      item.label.toLocaleLowerCase("pt-BR") ===
      color?.toLocaleLowerCase("pt-BR"),
  )?.hex ?? "#71717A";

const knownCategories: Record<string, VehicleCategory> = {
  civic: "sedan",
  corolla: "sedan",
  gol: "hatch",
  onix: "hatch",
  sandero: "hatch",
  renegade: "suv",
  compass: "suv",
  hilux: "pickup",
  ranger: "pickup",
  sprinter: "van",
};

export const inferVehicleCategory = (
  model?: string,
  fallback: VehicleCategory = "other",
) =>
  knownCategories[model?.trim().toLocaleLowerCase("pt-BR") ?? ""] ?? fallback;
