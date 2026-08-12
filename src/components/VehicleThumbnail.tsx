import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { Vehicle, VehicleCategory } from "@/lib/types";
import {
  vehicleCategoryLabel,
  vehicleColorOptions,
  vehicleColorHex,
} from "@/lib/vehiclePresentation";

const bodyPaths: Record<VehicleCategory, string> = {
  compact: "M17 43 22 30Q25 22 38 19L62 18Q73 19 80 29L94 34Q101 36 103 43Z",
  hatch: "M14 43 20 29Q23 21 38 18L66 18Q75 20 83 31L99 35Q104 37 105 43Z",
  sedan: "M11 43 18 32 31 28Q38 18 51 17H70Q78 18 87 29L104 34Q109 36 110 43Z",
  suv: "M10 43 16 27Q19 19 34 17H76Q84 18 91 29L105 33Q111 35 112 43Z",
  pickup: "M8 43 14 29Q18 20 32 18H58Q67 20 73 31H108V43Z",
  van: "M10 43 14 19Q16 14 25 14H82Q90 15 94 23L105 32Q110 35 111 43Z",
  other: "M9 43 18 35 32 31Q40 21 54 20H73Q82 22 91 32L106 36Q111 38 112 43Z",
};

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

  const paint = vehicleColorHex(vehicle.color);
  return (
    <span
      className={`vehicle-thumbnail ${className}`}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 120 64" aria-hidden="true">
        <ellipse cx="61" cy="49" rx="49" ry="5" fill="rgba(0,0,0,.28)" />
        <path
          d={bodyPaths[category]}
          fill={paint}
          stroke="#D4D4D8"
          strokeOpacity=".44"
          strokeWidth="1.4"
        />
        <path
          d={
            category === "pickup"
              ? "M29 20H54Q62 22 68 31H24Q25 24 29 20Z"
              : category === "van"
                ? "M25 17H77Q83 18 89 28H22L23 21Q23 18 25 17Z"
                : "M39 21H66Q73 22 79 30H29Q32 24 39 21Z"
          }
          fill="#20242B"
          stroke="#A1A1AA"
          strokeOpacity=".45"
        />
        <path d="M61 21V30" stroke="#A1A1AA" strokeOpacity=".42" />
        <path d="M18 39H104" stroke="#FFFFFF" strokeOpacity=".2" />
        <circle
          cx="31"
          cy="44"
          r="8"
          fill="#111114"
          stroke="#52525B"
          strokeWidth="2"
        />
        <circle cx="31" cy="44" r="3" fill="#A1A1AA" />
        <circle
          cx="91"
          cy="44"
          r="8"
          fill="#111114"
          stroke="#52525B"
          strokeWidth="2"
        />
        <circle cx="91" cy="44" r="3" fill="#A1A1AA" />
        <path d="M99 35 108 38 106 41H100Z" fill="#FFB4B7" />
      </svg>
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
