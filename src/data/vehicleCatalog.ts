export interface VehicleCatalogEntry {
  brand: string;
  models: Array<{ name: string; versions: string[] }>;
}

export interface VehicleCatalogProvider {
  searchBrands(query: string): string[];
  searchModels(brand: string, query: string): string[];
  searchVersions(brand: string, model: string, query: string): string[];
}

const catalog: VehicleCatalogEntry[] = [
  { brand: "Audi", models: [{ name: "A3", versions: ["1.4 TFSI", "2.0 TFSI"] }, { name: "Q3", versions: ["1.4 TFSI", "2.0 TFSI Quattro"] }] },
  { brand: "BMW", models: [{ name: "Série 3", versions: ["320i", "330e"] }, { name: "X1", versions: ["sDrive20i", "xDrive25i"] }, { name: "X3", versions: ["sDrive20i", "xDrive30e", "M40i"] }, { name: "X5", versions: ["xDrive40i", "xDrive50e"] }] },
  { brand: "Chevrolet", models: [{ name: "Onix", versions: ["1.0", "LT 1.0", "Premier Turbo"] }, { name: "Prisma", versions: ["LT 1.4", "LTZ 1.4"] }, { name: "S10", versions: ["LT 2.8 Diesel", "High Country 2.8 Diesel"] }, { name: "Tracker", versions: ["LT 1.0 Turbo", "Premier 1.2 Turbo"] }] },
  { brand: "Citroën", models: [{ name: "C3", versions: ["Live 1.0", "Feel 1.6"] }, { name: "C4 Cactus", versions: ["Feel 1.6", "Shine THP"] }] },
  { brand: "Fiat", models: [{ name: "Argo", versions: ["1.0", "Drive 1.3", "Trekking 1.3"] }, { name: "Strada", versions: ["Endurance 1.3", "Freedom 1.3", "Volcano 1.3"] }, { name: "Toro", versions: ["Freedom Turbo", "Volcano Diesel"] }, { name: "Uno", versions: ["Mille", "Way 1.0"] }] },
  { brand: "Ford", models: [{ name: "Fiesta", versions: ["SE 1.6", "Titanium 1.6"] }, { name: "Focus", versions: ["SE 1.6", "Titanium 2.0"] }, { name: "Ka", versions: ["SE 1.0", "SE Plus 1.5"] }, { name: "Ranger", versions: ["XLS 2.2 Diesel", "Limited 3.2 Diesel"] }] },
  { brand: "Honda", models: [{ name: "City", versions: ["LX 1.5", "EXL 1.5", "Touring 1.5 Turbo"] }, { name: "Civic", versions: ["LXS 1.8", "EX 2.0 Flex", "Touring 1.5 Turbo"] }, { name: "Fit", versions: ["LX 1.5", "EXL 1.5"] }, { name: "HR-V", versions: ["EX 1.8", "Touring 1.5 Turbo"] }] },
  { brand: "Hyundai", models: [{ name: "Creta", versions: ["Action 1.6", "Platinum 1.0 Turbo", "Ultimate 2.0"] }, { name: "HB20", versions: ["Comfort 1.0", "Evolution 1.0 Turbo", "Platinum 1.0 Turbo"] }, { name: "Tucson", versions: ["GLS 2.0", "Limited 1.6 Turbo"] }] },
  { brand: "Jeep", models: [{ name: "Commander", versions: ["Limited T270", "Overland TD380"] }, { name: "Compass", versions: ["Longitude T270", "Limited TD350"] }, { name: "Renegade", versions: ["Sport T270", "Longitude T270"] }] },
  { brand: "Mercedes-Benz", models: [{ name: "Classe A", versions: ["A 200", "AMG A 35"] }, { name: "GLA", versions: ["GLA 200", "AMG GLA 35"] }] },
  { brand: "Nissan", models: [{ name: "Frontier", versions: ["Attack 2.3 Diesel", "Platinum 2.3 Diesel"] }, { name: "Kicks", versions: ["Sense 1.6", "Advance 1.6", "Exclusive 1.6"] }, { name: "March", versions: ["S 1.0", "SV 1.6"] }, { name: "Versa", versions: ["Sense 1.6", "Exclusive 1.6"] }] },
  { brand: "Peugeot", models: [{ name: "208", versions: ["Like 1.0", "Allure 1.6", "GT Turbo"] }, { name: "2008", versions: ["Allure 1.6", "Griffe THP"] }] },
  { brand: "Renault", models: [{ name: "Duster", versions: ["Zen 1.6", "Iconic 1.3 Turbo"] }, { name: "Kwid", versions: ["Zen 1.0", "Intense 1.0"] }, { name: "Logan", versions: ["Life 1.0", "Zen 1.6"] }, { name: "Sandero", versions: ["Life 1.0", "Stepway 1.6"] }] },
  { brand: "Toyota", models: [{ name: "Corolla", versions: ["GLi 1.8", "XEi 2.0", "Altis Hybrid"] }, { name: "Etios", versions: ["X 1.3", "Platinum 1.5"] }, { name: "Hilux", versions: ["SRV 2.8 Diesel", "SRX 2.8 Diesel"] }, { name: "Yaris", versions: ["XL 1.3", "XS 1.5"] }] },
  { brand: "Volkswagen", models: [{ name: "Gol", versions: ["1.0 MPI", "1.6 MSI"] }, { name: "Golf", versions: ["Comfortline 1.4 TSI", "GTI 2.0 TSI"] }, { name: "Nivus", versions: ["Comfortline 200 TSI", "Highline 200 TSI"] }, { name: "Polo", versions: ["MPI 1.0", "Comfortline 200 TSI"] }, { name: "T-Cross", versions: ["Comfortline 200 TSI", "Highline 250 TSI"] }, { name: "Virtus", versions: ["MPI 1.0", "Comfortline 200 TSI", "Highline 250 TSI", "Exclusive 250 TSI"] }] },
];

const matches = (value: string, query: string) => value.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));

export const localVehicleCatalog: VehicleCatalogProvider = {
  searchBrands: (query) => catalog.map((entry) => entry.brand).filter((brand) => matches(brand, query)),
  searchModels: (brand, query) => catalog.find((entry) => entry.brand === brand)?.models.map((model) => model.name).filter((model) => matches(model, query)) ?? [],
  searchVersions: (brand, model, query) => catalog.find((entry) => entry.brand === brand)?.models.find((entry) => entry.name === model)?.versions.filter((version) => matches(version, query)) ?? [],
};
