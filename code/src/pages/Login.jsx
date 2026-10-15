import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Popup from "../components/Popup";
import FormField from "../components/FormField";
import loginLogo from "../assets/PalouseSquareLogo.png";
import "../styles/Login.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const SUPPORT_EMAIL = "palousealliance@gmail.com";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const clearFieldError = (name) => {
    setFieldErrors((current) => {
      const { [name]: _, ...rest } = current;
      return rest;
    });
  };

  const validateLogin = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!isValidEmail(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setCooldownSeconds((current) => {
        if (current <= 1) {
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    if (!validateLogin()) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        if (body?.retry_after && Number(body.retry_after) > 0) {
          setCooldownSeconds(Number(body.retry_after));
        }
        setErrorMessage(body?.message || "Invalid email or password.");
        return;
      }

      setCooldownSeconds(0);

      if (!body?.access_token || !body?.refresh_token) {
        setErrorMessage("Unable to complete login. Please try again.");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });

      if (sessionError) {
        setErrorMessage(sessionError.message || "Unable to complete login.");
        return;
      }

      navigate("/");
    } catch (error) {
      setErrorMessage(error.message || "Unable to complete login.");
    }
  };

  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-card">
          <div className="login-logo">
            <img src={loginLogo} alt="Palouse Alliance Logo" draggable="false" />
          </div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">
            Sign in to your organization account to manage events <br />
            and connect with the community.
          </p>

          <form onSubmit={handleSubmit}>
            <FormField
              htmlFor="email"
              label="Email Address"
              error={fieldErrors.email}
              required
            >
              <input
                className="form-input"
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    clearFieldError("email");
                  }
                }}
                required
                autoComplete="email"
              />
            </FormField>

            <FormField
              htmlFor="password"
              label="Password"
              error={fieldErrors.password}
              required
              labelAction={
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => setIsForgotPasswordOpen(true)}
                >
                  Forgot Password?
                </button>
              }
            >
              <div className="password-input-wrapper">
                <input
                  className="form-input password-input"
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      clearFieldError("password");
                    }
                  }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isPasswordVisible ? "Hide" : "Show"}
                </button>
              </div>
            </FormField>

            <button
              className="login-button"
              type="submit"
              disabled={
                !email.trim() ||
                !isValidEmail(email.trim()) ||
                !password ||
                fieldErrors.email ||
                fieldErrors.password ||
                cooldownSeconds > 0
              }
            >
              {cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s` : 'Sign In'}
            </button>

            {errorMessage && (
              <p className="login-error-message" role="alert">
                {errorMessage}
              </p>
            )}
          </form>

          {isForgotPasswordOpen ? (
            <Popup
              title="Password reset help"
              description={
                <>
                  Contact <a href={`mailto:${SUPPORT_EMAIL}`}>Palouse Alliance</a> to reset your password and regain access to your account.
                </>
              }
              onClose={() => setIsForgotPasswordOpen(false)}
              className="dialog-popup"
              actions={
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setIsForgotPasswordOpen(false)}
                >
                  Close
                </button>
              }
              ariaLabel="Forgot password help"
            >
              <p className="login-forgot-body">
                Please reach out to <a href={`mailto:${SUPPORT_EMAIL}`}>Palouse Alliance</a> to reset your password. They will be able to verify
                your account and walk you through the next steps.
              </p>
            </Popup>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default Login;
