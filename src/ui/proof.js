import { esc } from "./escape.js";

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

export function renderProofPanel(proof, payment) {
  const files = Array.isArray(proof) ? proof : [];
  const hasFiles = files.length > 0;
  const dropTitle = hasFiles ? "Attach another receipt (JPG or PDF)" : "Attach receipt (JPG or PDF)";
  const dropSub = hasFiles ? `${files.length} of 6 attached · up to 10 MB each` : "Up to 6 files · 10 MB each · 30 MB total";
  const rows = files.map((file, index) => `
    <div class="proof-file">
      <span class="proof-file-name">${esc(file.name)}</span>
      <span class="proof-file-size">${esc(formatBytes(file.size))}</span>
      <button type="button" class="btn tiny ghost danger" data-proof-remove data-proof-index="${index}">Remove</button>
    </div>`).join("");
  return `
    <section class="panel proof-panel" aria-labelledby="proof-heading" data-proof-panel>
      <header class="panel-head">
        <div>
          <h2 id="proof-heading">Proof of payment</h2>
          <p class="panel-sub">Attach one file for the whole registration, or several if you paid separately</p>
        </div>
      </header>
      <div class="panel-body">
        <div class="proof-pay">
          <p>Please transfer your fees to:</p>
          <ul class="proof-pay-details">
            <li><strong>Bank:</strong> ${esc(payment.bank)}</li>
            <li><strong>Account number:</strong> ${esc(payment.account)}</li>
            <li><strong>Account name:</strong> ${esc(payment.accountName)}</li>
            <li><strong>Reference:</strong> ${esc(payment.reference)}</li>
          </ul>
          <p>${esc(payment.note)}</p>
        </div>
        <label class="proof-drop" data-proof-pick>
          <span class="proof-drop-title" data-proof-title>${esc(dropTitle)}</span>
          <span class="proof-drop-sub" data-proof-sub>${esc(dropSub)}</span>
          <input type="file" class="proof-input" data-proof-input multiple
            accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf" tabindex="0"
            aria-label="Proof of payment files, JPG or PDF, up to 10 MB each, maximum 6 files">
        </label>
        <div class="proof-list" data-proof-list${hasFiles ? "" : " hidden"}>${rows}</div>
        <p class="field-error" data-error="proof" role="status"></p>
      </div>
    </section>`;
}
