import React, { useState } from "react";
import Popup from "./Popup";
import FormField from "./FormField";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const SubscribePopup = ({ onClose }) => {
  const [step, setStep] = useState("email"); // email | code | done
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const post = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Something went wrong.");
    return data;
  };

  const sendCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await post("/api/subscribe", { email });
      setStep("code");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await post("/api/subscribe/verify", { email, code });
      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popup
      title="Get event updates"
      description={
        step === "email" ? "Enter your email to be notified whenever a new event is posted."
        : step === "code" ? `We sent a 6-digit code to ${email}.`
        : "You're subscribed!"
      }
      onClose={onClose}
      className="regular-popup"
    >
      {step === "email" && (
        <form onSubmit={sendCode}>
          <FormField htmlFor="sub_email" label="Email Address" required>
            <input
              id="sub_email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          {error && <p className="form-error-message">{error}</p>}
          <div className="popup-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Sending..." : "Send Code"}
            </button>
          </div>
        </form>
      )}
      {step === "code" && (
        <form onSubmit={verify}>
          <FormField htmlFor="sub_code" label="Verification Code" required>
            <input id="sub_code" className="form-input" inputMode="numeric" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
          </FormField>
          {error && <p className="form-error-message">{error}</p>}
          <div className="popup-actions">
            <button type="button" className="btn-secondary" onClick={() => setStep("email")}>Back</button>
            <button type="submit" className="btn-primary" disabled={loading || code.length !== 6}>
              {loading ? "Verifying..." : "Verify & Subscribe"}
            </button>
          </div>
        </form>
      )}
      {step === "done" && (
        <div className="popup-actions">
          <button type="button" className="btn-primary" onClick={onClose}>Close</button>
        </div>
      )}
    </Popup>
  );
};

export default SubscribePopup;