class CustomFooter extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                footer {
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    color: white;
                    padding: 3rem 2rem;
                    margin-top: auto;
                }
                
                .footer-content {
                    max-width: 1400px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                    gap: 3rem;
                }
                
                .footer-section h3 {
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: #f1f5f9;
                }
                
                .footer-links {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .footer-links li {
                    margin-bottom: 0.5rem;
                }
                
                .footer-links a {
                    color: #cbd5e1;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                
                .footer-links a:hover {
                    color: #fbbf24;
                }
                
                .footer-bottom {
                    border-top: 1px solid #334155;
                    padding-top: 2rem;
                    margin-top: 2rem;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 0.875rem;
                }
                
                .crisis-notice {
                    background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
                    margin: 2rem auto 0;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    margin-bottom: 2rem;
                }
                
                @media (max-width: 768px) {
                    footer {
                        padding: 2rem 1rem;
                    }
                    
                    .footer-content {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            
            <footer>
                <div class="footer-content">
                    <div class="footer-section">
                        <h3>SafeVoice</h3>
                        <p style="color: #cbd5e1; line-height: 1.6;">
                        Your anonymous sanctuary for mental health support, social issues, and student tributes. Speak freely, earn tokens, build generational wealth.
                        </p>
                        <div class="crisis-notice">
                            <strong>🚨 Crisis Support:</strong> If you're in immediate danger, call your local emergency services or suicide prevention hotline.
                        </div>
                    </div>
                    
                    <div class="footer-section">
                        <h3>Platform</h3>
                        <ul class="footer-links">
                            <!-- Corrected relative paths -->
                            <li><a href="./feed.html">Home Feed</a></li>
                            <li><a href="./create.html">Create Post</a></li>
                            <li><a href="./memorials.html">Memorials</a></li>
                            <li><a href="./resources.html">Resources</a></li>
                            <li><a href="#">Community Guidelines</a></li> <!-- No guidelines.html exists -->
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h3>Support</h3>
                        <ul class="footer-links">
                            <!-- Corrected relative paths (for pages that don't exist yet) -->
                            <li><a href="#">Help Center</a></li>
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Terms of Service</a></li>
                            <li><a href="#">Contact Us</a></li>
                            <li><a href="#">About SafeVoice</a></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h3>Connect</h3>
                        <ul class="footer-links">
                            <li><a href="https://twitter.com/safevoicesocial">Twitter</a></li>
                            <li><a href="https://discord.gg/safevoice">Discord</a></li>
                            <li><a href="https://github.com/safevoice">GitHub</a></li>
                            <li><a href="#">Token Economics</a></li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer-bottom">
                    <p>&copy; 2024 SafeVoice Social Platform. Built with ❤️ for student mental health.</p>
                </div>
            </footer>
        `;
        
        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            // Use setTimeout to ensure the shadow DOM is ready
            setTimeout(() => {
                feather.replace();
            }, 0);
        }
    }
}

customElements.define('custom-footer', CustomFooter);
