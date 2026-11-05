import React from 'react';
import { Link } from "react-router-dom";
import { AtSign, MapPin, Globe } from "lucide-react";
import logo from "../assets/PalouseSquareLogo.png";
import "../styles/Footer.css";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <div className="footer-logo-row">
                        <img
                            src={logo}
                            alt="Palouse Alliance logo"
                            className="footer-logo"
                            draggable="false"
                        />
                    </div>
                    <p className="footer-copy">
                        Connecting individuals, families, and communities through accessible community resources and events.
                    </p>
                    <p className="footer-copy">
                        Palouse Alliance is a 501(c)(3) organization.
                        <br />Tax ID: 91-2065784
                    </p>
                </div>

                <div className="footer-col">
                    <h4>Quick Links</h4>
                    <ul className="footer-links">
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/events">Community Events</Link></li>
                        <li><Link to="/organizations">Organizations</Link></li>
                        <li><Link to="/history">Our History</Link></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Contact Us</h4>
                    <div className="footer-contact-list">
                        <div className="footer-contact-item">
                            <AtSign className="footer-icon" aria-hidden="true" size={18} />
                            <a className="footer-email-link" href="mailto:palousealliance@gmail.com">palousealliance@gmail.com</a>
                        </div>
                        <div className="footer-contact-item">
                            <MapPin className="footer-icon" aria-hidden="true" size={18} />
                            <div className="footer-address-stack">
                                <span>PO Box 874</span>
                                <span>Pullman, WA 99163</span>
                            </div>
                        </div>
                        <div className="footer-contact-item">
                            <Globe className="footer-icon" aria-hidden="true" size={18} />
                            <span>Palouse Region, ID & WA</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>Copyright © {currentYear} Palouse Alliance. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
