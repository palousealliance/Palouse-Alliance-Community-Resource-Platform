import React from "react";
import { getHistoryPdfUrl } from "../lib/supabase";
import "../styles/History.css";

const HISTORY_PDF_URL = getHistoryPdfUrl();

export default function History() {
  return (
    <div className="history-page page-root">
      <div className="page-shell history-shell">
        <header className="page-hero history-hero">
          <div className="org-location-chip legacy-chip">Since 1984</div>
          <h1 className="page-title">The story of the <span>Palouse Alliance</span></h1>
          <p className="page-description">
            Discover the people, partnerships, and milestones behind a regional network built to strengthen health and human services across the Palouse.
          </p>
        </header>

        <section className="history-document" aria-labelledby="history-document-title">
          <div className="history-document-header">
            <div>
              <p className="history-eyebrow">Our history</p>
              <h2 id="history-document-title">Palouse Alliance: A History</h2>
            </div>
            <div className="history-document-actions">
              <a className="btn-outline history-open-link" href={HISTORY_PDF_URL} target="_blank" rel="noopener noreferrer">
                <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                Open in new tab
              </a>
              <a className="btn-primary history-download-link" href={HISTORY_PDF_URL} download="Palouse-Alliance-History.pdf">
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                Download PDF
              </a>
            </div>
          </div>
          <iframe
            className="history-pdf-viewer"
            src={`${HISTORY_PDF_URL}#view=FitH`}
            title="Palouse Alliance history PDF"
          />
          <p className="history-pdf-fallback">
            If the document does not display in your browser, <a href={HISTORY_PDF_URL} target="_blank" rel="noopener noreferrer">open the history PDF directly</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
