import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/PalouseTextLogo.png";
import { supabase } from "../lib/supabase";
import "../styles/Navbar.css";

const Navbar = ({ session, isAdmin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileMenuOpen]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();

        if (!error) {
            setMobileMenuOpen(false);
            navigate("/", { replace: true });
        }
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen((currentState) => !currentState);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 12);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <nav className={`site-navbar${isScrolled ? " site-navbar--scrolled" : ""}`}>
                <Link to="/" className="navbar-logo-link" aria-label="Palouse Alliance home">
                    <img
                        src={logo}
                        alt="Palouse Alliance Logo"
                        className="navbar-logo"
                        draggable="false"
                    />
                </Link>

                <div className="navbar-desktop-links">
                    <div className="navbar-link-group">
                        <Link to="/" className="navbar-link navbar-link-text">Home</Link>
                        <a
                            href="https://palouseresources.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="navbar-link navbar-link-text"
                            aria-label="Palouse Resource Guide — opens in a new tab"
                            title="Opens in a new tab"
                        >
                            Palouse Resource Guide
                            <span className="navbar-external-icon material-symbols-outlined" aria-hidden="true">open_in_new</span>
                        </a>
                        <a
                            href="https://wsu.givepulse.com/group/244255-palouse-alliance-for-healthy-individuals-families-communities"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="navbar-link navbar-link-text"
                            aria-label="GivePulse — opens in a new tab"
                            title="Opens in a new tab"
                        >
                            GivePulse
                            <span className="navbar-external-icon material-symbols-outlined" aria-hidden="true">open_in_new</span>
                        </a>

                        <Link to="/events" className="navbar-link navbar-link-text">Member Events</Link>
                        <Link to="/organizations" className="navbar-link navbar-link-text">Organizations</Link>
                        <Link to="/history" className="navbar-link navbar-link-text">Our History</Link>
                    </div>

                    <div className="navbar-action-group">
                        {isAdmin ? (
                            <Link to="/admin" className="navbar-link navbar-link-primary btn-primary">Admin Dashboard</Link>
                        ) : null}
                        {session ? (
                            <button
                                onClick={handleLogout}
                                className="navbar-link navbar-link-secondary navbar-button btn-secondary"
                                type="button"
                            >
                                Logout
                            </button>
                        ) : (
                            <Link to="/login" className="navbar-link navbar-link-primary btn-primary">Login</Link>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    className="navbar-menu-toggle"
                    onClick={toggleMobileMenu}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation"
                    aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                >
                    <span className="material-symbols-outlined navbar-menu-icon" aria-hidden="true">
                        menu
                    </span>
                </button>
            </nav>

            <div
                className={`navbar-overlay ${mobileMenuOpen ? "is-open" : ""}`}
                onClick={closeMobileMenu}
                aria-hidden="true"
            />

            <aside
                id="mobile-navigation"
                className={`navbar-mobile-drawer ${mobileMenuOpen ? "is-open" : ""}`}
                aria-hidden={!mobileMenuOpen}
            >
                <div className="navbar-mobile-header">
                    <img
                        src={logo}
                        alt="Palouse Alliance Logo"
                        className="navbar-mobile-logo"
                        draggable="false"
                    />
                    <button
                        type="button"
                        className="navbar-mobile-close"
                        onClick={closeMobileMenu}
                        aria-label="Close navigation menu"
                    >
                        <span className="material-symbols-outlined navbar-close-icon" aria-hidden="true">
                            close
                        </span>
                    </button>
                </div>

                <div className="navbar-mobile-links">
                    <Link to="/" className="navbar-mobile-link">Home</Link>
                    <a
                        href="https://palouseresources.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="navbar-mobile-link"
                        aria-label="Palouse Resource Guide — opens in a new tab"
                        title="Opens in a new tab"
                    >
                        Palouse Resource Guide
                        <span className="navbar-external-icon material-symbols-outlined" aria-hidden="true">open_in_new</span>
                    </a>
                    <a
                        href="https://wsu.givepulse.com/group/244255-palouse-alliance-for-healthy-individuals-families-communities"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="navbar-mobile-link"
                        aria-label="GivePulse — opens in a new tab"
                        title="Opens in a new tab"
                    >
                        GivePulse
                        <span className="navbar-external-icon material-symbols-outlined" aria-hidden="true">open_in_new</span>
                    </a>
                    <Link to="/events" className="navbar-mobile-link">Member Events</Link>
                    <Link to="/organizations" className="navbar-mobile-link">Organizations</Link>
                    <Link to="/history" className="navbar-mobile-link">Our History</Link>
                    {isAdmin ? (
                        <Link to="/admin" className="navbar-mobile-link navbar-link-primary btn-primary">Admin Dashboard</Link>
                    ) : null}
                    {session ? (
                        <button
                            onClick={handleLogout}
                            className="navbar-mobile-link navbar-link-secondary navbar-mobile-button btn-secondary"
                            type="button"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link to="/login" className="navbar-mobile-link navbar-link-primary btn-primary">Login</Link>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Navbar;
