import { AnchorItem } from "../api/account"
import { formatLong } from "./check"

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c])

/**
 * A self-contained, print-ready page: shown in an iframe preview and printed from
 * there ("Save as PDF"). Plain HTML on purpose, so the paper look never depends on
 * the app theme or on the print CSS of the surrounding page.
 */
export function receiptHtml(item: AnchorItem, verifyUrl: string): string {
  const r = item.receipt!
  const when = formatLong(new Date(item.anchoredAt ?? item.createdAt))
  const demo = r.network === "mock"
  const row = (k: string, v: string, mono = false) =>
    `<tr><th>${esc(k)}</th><td${mono ? ' class="mono"' : ""}>${esc(v)}</td></tr>`
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>Квитанція ${esc(item.id)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font: 14px/1.5 "Segoe UI", Arial, sans-serif; color: #1e2328; margin: 0; padding: 24px; background: #fff; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px; }
  .mark { width: 16px; height: 16px; border: 2px solid #d9480f; border-radius: 3px; }
  h1 { font-size: 24px; margin: 18px 0 4px; }
  .lede { color: #5c6770; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th { text-align: left; width: 34%; color: #5c6770; font-weight: 500; vertical-align: top; padding: 7px 12px 7px 0; border-bottom: 1px solid #e9ecef; }
  td { padding: 7px 0; border-bottom: 1px solid #e9ecef; word-break: break-all; }
  .mono, pre { font-family: Consolas, "Courier New", monospace; font-size: 12px; }
  .stamp { display: inline-block; border: 2px solid #2c7a4c; color: #2c7a4c; border-radius: 4px; padding: 4px 12px; font-weight: 600; letter-spacing: .08em; margin-bottom: 18px; }
  h2 { font-size: 15px; margin: 20px 0 6px; }
  ol { margin: 0; padding-left: 20px; }
  .demo { border: 1px dashed #d9480f; background: #fff4e6; padding: 10px 12px; border-radius: 6px; margin: 16px 0; }
  pre { background: #f4f6f3; padding: 10px; border-radius: 6px; white-space: pre-wrap; word-break: break-all; margin: 6px 0 0; }
  .foot { color: #8a95a0; font-size: 12px; margin-top: 18px; }
</style></head><body>
  <div class="brand"><span class="mark"></span>AnchorProof</div>
  <h1>Квитанція про фіксацію документа</h1>
  <p class="lede">Підтверджує, що документ існував у такому вигляді не пізніше зазначеної дати.</p>
  <div class="stamp">ДОКУМЕНТ ЗАФІКСОВАНО</div>
  <table>
    ${row("Документ", item.label || "без назви")}
    ${row("Дата фіксації", when)}
    ${row("Номер квитанції", item.id, true)}
    ${row("Цифровий відбиток файлу (SHA-256)", r.sha256, true)}
    ${row("Партія (епоха)", String(r.epoch))}
    ${row("Реєстр", demo ? "Демонстраційний реєстр" : r.network)}
    ${row("Номер транзакції", r.txHash, true)}
  </table>
  <p>Цифровий відбиток обчислюється з вмісту файлу. Зміна навіть одного символу в документі дає інший відбиток, тому збіг відбитків доводить, що файл не змінювали.</p>
  ${demo ? '<div class="demo"><b>Демонстраційна версія.</b> Реєстр імітується на сервері й не є публічним блокчейном. Така квитанція придатна для перевірки роботи сервісу, але не як доказ у справі.</div>' : ""}
  <h2>Як перевірити</h2>
  <ol>
    <li>Відкрийте сторінку перевірки: <b>${esc(verifyUrl)}</b> (вхід не потрібен).</li>
    <li>Завантажте оригінальний файл документа. Він нікуди не передається.</li>
    <li>Вставте технічні дані нижче або завантажте файл квитанції .json.</li>
  </ol>
  <h2>Технічні дані для перевірки</h2>
  <pre>${esc(JSON.stringify(r))}</pre>
  <p class="foot">Збережіть цю квитанцію разом з оригіналом документа: одне без іншого нічого не доводить.</p>
</body></html>`
}
