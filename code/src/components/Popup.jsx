import React, { useEffect } from "react";
import { X } from "lucide-react";
import "../styles/Popup.css";

const Popup = ({
  title,
  description,
  children,
  actions,
  onClose,
  className = "",
  ariaLabel,
}) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || "Popup"}
      onClick={onClose}
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div className={`popup-content ${className}`} onClick={(event) => event.stopPropagation()}>
        <div className="popup-header">
          <div>
            <h2>{title}</h2>
            {description ? <p className="popup-description">{description}</p> : null}
          </div>
          <button
            type="button"
            className="popup-close"
            onClick={onClose}
            aria-label="Close popup"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="popup-body">{children}</div>
        {actions ? <div className="popup-actions">{actions}</div> : null}
      </div>
    </div>
  );
};

export default Popup;
