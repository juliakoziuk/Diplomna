import { PlanId } from "../api/account"
import { tr } from "./index"

/**
 * Plan copy per language. The API returns Ukrainian feature text, so the UI shows its own
 * wording keyed by plan id (the numbers, price and limit still come from the API).
 */
export function planFeatures(id: PlanId): string[] {
  switch (id) {
    case "free":
      return [
        tr("A receipt for every document", "Квитанція на кожен документ"),
        tr("Receipt checks are free", "Перевірка квитанцій безкоштовна"),
        tr("No bank card needed", "Без банківської картки"),
      ]
    case "pro":
      return [
        tr("Connect through the API", "Підключення через API"),
        tr("Receipts in your personal account", "Квитанції в особистому кабінеті"),
        tr("Access keys for your team", "Ключі доступу для команди"),
      ]
    case "business":
      return [tr("99.9% uptime guarantee", "Гарантія доступності 99,9 %"), tr("Activity log for audits", "Журнал дій для аудиту")]
    case "search":
      return [
        tr("Everything in Business", "Усе з Business"),
        tr("Proof that a search was complete", "Підтвердження повноти пошуку"),
        tr("Reports for auditors", "Звіти для аудиторів"),
      ]
  }
}

/** Monthly price in hryvnias: "1 200 грн" / "UAH 1,200". */
export function planPrice(priceUah: number, locale: string): string {
  return tr(`UAH ${priceUah.toLocaleString(locale)}`, `${priceUah.toLocaleString(locale)} грн`)
}

/** "100 documents per month" / "Unlimited documents". */
export function planLimit(anchorsPerMonth: number | null, locale: string): string {
  return anchorsPerMonth === null
    ? tr("Unlimited documents", "Без ліміту документів")
    : tr(`${anchorsPerMonth.toLocaleString(locale)} documents per month`, `${anchorsPerMonth.toLocaleString(locale)} документів на місяць`)
}
