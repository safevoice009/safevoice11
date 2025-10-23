class CustomNavbar extends HTMLElement {
    constructor() {
        super();
        this.currentUser = null;
        this.tokenBalance = 0;
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.render();
        this.loadUserData();
        this.setupEventListeners();
    }

    loadUserData() {
        const savedUser = localStorage.getItem('safeVoiceUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.tokenBalance = this.currentUser?.tokenBalance || 0;
        }
        // Re-render to show updated token balance if loaded
        this.render();
    }

    setupEventListeners() {
        // Theme toggle
        this.shadowRoot.addEventListener('click', (event) => {
            if (event.target.closest('#themeToggle')) {
                this.toggleTheme();
            }
            
            if (event.target.closest('#walletConnect')) {
                this.connectWallet();
            }

            // Mobile menu toggle
            const mobileMenuBtn = this.shadowRoot.getElementById('mobileMenuBtn');
            const navLinks = this.shadowRoot.querySelector('.nav-links');
            if (event.target.closest('#mobileMenuBtn')) {
                navLinks.classList.toggle('mobile-open');
            }
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                nav {
                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                
                .nav-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .logo {
                    color: white;
                    font-weight: bold;
                    font-size: 1.5rem;
                    text-decoration: none;
                }
                
                .nav-links {
                    display: flex;
                    gap: 2rem;
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                
                .nav-links a {
                    color: white;
                    text-decoration: none;
                    font-weight: 500;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .nav-links a:hover {
                    opacity: 0.8;
                }
                
                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .token-display {
                    background: rgba(255, 255, 255, 0.2);
                    color: white; /* Ensure text is visible */
                    padding: 0.5rem 1rem;
                    border-radius: 1rem;
                    font-weight: 600;
                    display: flex; /* For icon alignment */
                    align-items: center;
                    gap: 0.5rem; /* Space between icon and text */
                }
                
                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                }
                
                .theme-toggle {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    transition: background 0.2s;
                }
                
                .theme-toggle:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                @media (max-width: 768px) {
                    nav {
                        padding: 1rem;
                    }
                    
                    .nav-links {
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                        flex-direction: column;
                        padding: 1rem;
                        gap: 1rem;
                    }
                    
                    .nav-links.mobile-open {
                        display: flex;
                    }
                    
                    .mobile-menu-btn {
                        display: block;
                    }
                }
            </style>
            
            <nav>
                <div class="nav-content">
                    <!-- Corrected relative path -->
                    <a href="./index.html" class="logo">
                        Safe<span style="color: #fbbf24">Voice</span>
                    </a>
                    
                    <ul class="nav-links">
                        <!-- Corrected relative paths -->
                        <li><a href="./feed.html"><i data-feather="home"></i> Feed</a></li>
                        <li><a href="./create.html"><i data-feather="edit-3"></i> Create</a></li>
                        <li><a href="./memorials.html"><i data-feather="heart"></i> Memorials</a></li>
                        <li><a href="./resources.html"><i data-feather="life-buoy"></i> Resources</a></li>
                        <!-- <li><a href="./profile.html"><i data-feather="user"></i> Profile</a></li> --> <!-- Profile page doesn't exist in repo -->
                    </ul>
                    
                    <div class="nav-actions">
                        <div class="token-display">
                            <i data-feather="award"></i>
                            <span class="token-balance">${this.tokenBalance.toLocaleString()}</span>
                        </div>
                        
                        <button class="theme-toggle" id="themeToggle">
                            <i data-feather="moon"></i>
                        </button>
                        
                        <button class="mobile-menu-btn" id="mobileMenuBtn">
                            <i data-feather="menu"></i>
                        </button>
                    </div>
                </div>
            </nav>
        `;
        
        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            // Use setTimeout to ensure the shadow DOM is ready
            setTimeout(() => {
                feather.replace();
            }, 0);
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        this.render(); // Re-render to update icons
    }

    connectWallet() {
        // Simulate wallet connection
        if (window.safeVoiceApp) {
            window.safeVoiceApp.connectWallet().then(success => {
                if (success) {
                    this.loadUserData(); // This will re-load and re-render
                }
            });
        }
    }
}

customElements.define('custom-navbar', CustomNavbar);
