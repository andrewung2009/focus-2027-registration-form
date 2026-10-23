import { esc } from "./escape.js";

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

export function renderProofPanel(proof, payment) {
  return `
    <section class="panel proof-panel" aria-labelledby="proof-heading" data-proof-panel>
      <header class="panel-head">
        <div>
          <h2 id="proof-heading">Proof of payment</h2>
          <p class="panel-sub">Attach one file for the whole registration</p>
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
          <span class="proof-drop-title">Attach receipt (JPG or PDF)</span>
          <span class="proof-drop-sub">One file only &middot; up to 10 MB</span>
          <input type="file" class="proof-input" data-proof-input
            accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf" tabindex="0"
            aria-label="Proof of payment file, JPG or PDF, up to 10 MB">
        </label>
        <div class="proof-file" data-proof-file hidden>
          <span class="proof-file-name" data-proof-file-name></span>
          <span class="proof-file-size" data-proof-file-size></span>
          <button type="button" class="btn tiny ghost danger" data-proof-remove>Remove</button>
        </div>
        <p class="field-error" data-error="proof" role="status"></p>
      </div>
    </section>`;
}
