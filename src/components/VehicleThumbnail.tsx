import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { Vehicle } from "@/lib/types";
import {
  vehicleCategoryLabel,
  vehicleColorOptions,
} from "@/lib/vehiclePresentation";

export function VehicleThumbnail({
  vehicle,
  className = "",
}: {
  vehicle?: Pick<
    Vehicle,
    "brand" | "model" | "color" | "vehicleCategory" | "vehiclePhoto"
  >;
  className?: string;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [failedCategoryImage, setFailedCategoryImage] = useState(false);

  const category = vehicle?.vehicleCategory;
  const label = vehicle
    ? `${vehicle.brand} ${vehicle.model}, ${vehicleCategoryLabel(category)}, cor ${vehicle.color || "não informada"}`
    : "Veículo sem identificação";

  if (vehicle?.vehiclePhoto && failedPhoto !== vehicle.vehiclePhoto) {
    return (
      <span
        className={`vehicle-thumbnail ${className}`}
        role="img"
        aria-label={label}
      >
        <img
          src={vehicle.vehiclePhoto}
          alt=""
          onError={() => setFailedPhoto(vehicle.vehiclePhoto ?? null)}
        />
      </span>
    );
  }

  if (!vehicle || !category) {
    return (
      <span
        className={`vehicle-thumbnail vehicle-thumbnail-fallback ${className}`}
        role="img"
        aria-label={label}
      >
        <Icon name="car" />
      </span>
    );
  }

  if (!failedCategoryImage) {
    return (
      <span
        className={`vehicle-thumbnail vehicle-category-thumbnail ${className}`}
        role="img"
        aria-label={label}
      >
        <img
          className={`vehicle-category-sprite category-${category}`}
          src="/vehicle-category-studio.png"
          alt=""
          onError={() => setFailedCategoryImage(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`vehicle-thumbnail vehicle-thumbnail-fallback ${className}`}
      role="img"
      aria-label={label}
    >
      <Icon name="car" />
    </span>
  );
}

export function VehiclePreview({
  vehicle,
}: {
  vehicle: Pick<
    Vehicle,
    "brand" | "model" | "color" | "vehicleCategory" | "vehiclePhoto"
  >;
}) {
  return (
    <div className="vehicle-preview">
      <VehicleThumbnail vehicle={vehicle} />
      <div>
        <strong>
          {vehicle.brand || "Marca"} {vehicle.model || "Modelo"}
        </strong>
        <span>
          {vehicleCategoryLabel(vehicle.vehicleCategory)} ·{" "}
          {vehicle.color || "Cor não informada"}
        </span>
      </div>
    </div>
  );
}

export function VehicleColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="vehicle-color-picker" aria-label="Cores rápidas do veículo">
      {vehicleColorOptions.map((color) => (
        <button
          type="button"
          key={color.label}
          className={value === color.label ? "selected" : ""}
          onClick={() => onChange(color.label)}
          aria-label={color.label}
          title={color.label}
        >
          <span style={{ background: color.hex }} />
        </button>
      ))}
    </div>
  );
}
