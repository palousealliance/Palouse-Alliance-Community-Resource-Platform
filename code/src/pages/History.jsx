import React, { useEffect, useRef, useState } from "react";
import Popup from "../components/Popup";
import {
  fetchCurrentHistoryPdf,
  getHistoryPdfUrl,
  replaceHistoryPdf,
  validateHistoryPdfFile,
  supabase,
} from "../lib/supabase";
import "../styles/History.css";

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function History({ session: sessionProp, isAdmin: isAdminProp }) {
  const [isAdmin, setIsAdmin] = useState(() => Boolean(isAdminProp));
  const [pdfUrl, setPdfUrl] = useState(() => getHistoryPdfUrl());
  const [activeFileName, setActiveFileName] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef(null);

  // Sync or resolve admin status
  useEffect(() => {
    if (typeof isAdminProp === "boolean") {
      setIsAdmin(isAdminProp);
      return;
    }

    let isMounted = true;
    const checkAdminStatus = async () => {
      try {
        let currentSession = sessionProp;
        if (!currentSession) {
          const { data } = await supabase.auth.getSession();
          currentSession = data?.session;
        }

        if (!currentSession?.user?.id) {
          if (isMounted) setIsAdmin(false);
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (isMounted) {
          setIsAdmin(!error && data?.role === "admin");
        }
      } catch {
        if (isMounted) setIsAdmin(false);
      }
    };

    checkAdminStatus();
    return () => {
      isMounted = false;
    };
  }, [isAdminProp, sessionProp]);

  // Load the active file from storage bucket on page open
  useEffect(() => {
    let isMounted = true;

    const loadHistoryPdf = async () => {
      const activeDoc = await fetchCurrentHistoryPdf();
      if (isMounted && activeDoc?.url) {
        setPdfUrl(activeDoc.url);
        setActiveFileName(activeDoc.fileName);
      }
    };

    loadHistoryPdf();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenDialog = () => {
    setSelectedFile(null);
    setDialogError("");
    setIsDragging(false);
    setIsEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isReplacing) return; // Prevent closing mid-replacement
    setIsEditDialogOpen(false);
    setSelectedFile(null);
    setDialogError("");
    setIsDragging(false);
  };

  const handleFileChange = (file) => {
    setDialogError("");
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateHistoryPdfFile(file);
    if (validationError) {
      setDialogError(validationError);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleUploadAndReplace = async (e) => {
    e?.preventDefault();
    if (!selectedFile || isReplacing) return;

    setDialogError("");
    setIsReplacing(true);

    try {
      // Atomic replacement: list old files, delete them first.
      // If cleanup fails, new file will NOT be uploaded.
      const result = await replaceHistoryPdf(selectedFile);

      setPdfUrl(result.url);
      setActiveFileName(result.fileName);
      setIsEditDialogOpen(false);
      setSelectedFile(null);
      setSuccessMessage("History PDF has been successfully replaced.");

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (err) {
      console.error("Replacement error:", err);
      setDialogError(err.message || "Failed to replace history PDF.");
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="history-page page-root">
      <div className="page-shell history-shell">
        <header className="page-hero history-hero">
          <div className="org-location-chip legacy-chip">Since 1984</div>
          <h1 className="page-title">
            The story of the <span>Palouse Alliance</span>
          </h1>
          <p className="page-description">
            Discover the people, partnerships, and milestones behind a regional network built to
            strengthen health and human services across the Palouse.
          </p>
        </header>

        {successMessage ? (
          <div className="history-alert history-alert-success" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            <span>{successMessage}</span>
            <button
              type="button"
              className="history-alert-dismiss"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss message"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        ) : null}

        <section className="history-document" aria-labelledby="history-document-title">
          <div className="history-document-header">
            <div>
              <p className="history-eyebrow">Our history</p>
              <h2 id="history-document-title">Palouse Alliance: A History</h2>
            </div>
            <div className="history-document-actions">
              {isAdmin && (
                <button
                  type="button"
                  className="btn-outline history-replace-btn"
                  onClick={handleOpenDialog}
                  aria-label="Replace PDF"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    edit_document
                  </span>
                  Replace PDF
                </button>
              )}
              <a
                className="btn-outline history-open-link"
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  open_in_new
                </span>
                Open in new tab
              </a>
              <a
                className="btn-primary history-download-link"
                href={pdfUrl}
                download={activeFileName || "Palouse-Alliance-History.pdf"}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  download
                </span>
                Download PDF
              </a>
            </div>
          </div>

          <iframe
            key={pdfUrl}
            className="history-pdf-viewer"
            src={`${pdfUrl}#view=FitH`}
            title="Palouse Alliance history PDF"
          />
          <p className="history-pdf-fallback">
            If the document does not display in your browser,{" "}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              open the history PDF directly
            </a>
            .
          </p>
        </section>

        {isEditDialogOpen && (
          <Popup
            title="Replace History Document"
            description="Upload a new PDF to replace the current history document. The previous file will be removed from Supabase storage in an atomic cleanup."
            onClose={handleCloseDialog}
            className="dialog-popup history-popup"
            ariaLabel="Replace History Document Dialog"
            actions={
              <div className="history-dialog-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseDialog}
                  disabled={isReplacing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleUploadAndReplace}
                  disabled={!selectedFile || isReplacing}
                >
                  {isReplacing ? "Replacing..." : "Upload and Replace"}
                </button>
              </div>
            }
          >
            <div className="history-dialog-body">
              {dialogError ? (
                <div className="history-alert history-alert-error" role="alert">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    error
                  </span>
                  <span>{dialogError}</span>
                </div>
              ) : null}

              <div
                className={`file-upload history-dropzone ${isDragging ? "drag-over" : ""} ${
                  selectedFile ? "has-file" : ""
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Upload History PDF"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  id="history-file-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleFileChange(file);
                  }}
                />

                <span
                  className="material-symbols-outlined upload-icon"
                  aria-hidden="true"
                >
                  {selectedFile ? "picture_as_pdf" : "cloud_upload"}
                </span>

                {selectedFile ? (
                  <div className="history-selected-preview">
                    <p className="upload-text history-selected-filename">{selectedFile.name}</p>
                    <p className="upload-subtext">{formatFileSize(selectedFile.size)}</p>
                    <button
                      type="button"
                      className="btn-outline history-change-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setDialogError("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Choose a different file
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="upload-text">Click to upload or drag and drop</p>
                    <p className="upload-subtext">PDF only • 5 MB max</p>
                  </>
                )}
              </div>

              {isReplacing && (
                <p className="history-replacing-note" role="status">
                  Removing previous document and uploading new file...
                </p>
              )}
            </div>
          </Popup>
        )}
      </div>
    </div>
  );
}
