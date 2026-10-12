import seed from "../../data/local-database.json";
import { db } from "./database";
import { Product } from "../contracts/domain";
export function prepareDemoCatalog() {
  if (
    typeof localStorage === "undefined" ||
    localStorage.getItem("elan_catalog_v2")
  )
    return;
  const oldIds = ["PRD001", "PRD002", "ELAN_ARLO", "ELAN_SOL", "ELAN_MIRA"];
  const current = db.products.map((p) =>
    oldIds.includes(p.id) ? { ...p, isDeleted: true } : p,
  );
  const additions = (seed.products as Product[]).filter(
    (p) => !current.some((c) => c.id === p.id || c.sku === p.sku),
  );
  db.setProducts([...current, ...additions]);
  localStorage.setItem("elan_catalog_v2", "2");
}
