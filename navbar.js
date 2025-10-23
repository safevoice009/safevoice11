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
        // Use a slight delay to ensure script.js has loaded
        setTimeout(() => {
            const savedUser = localStorage.getItem('safeVoiceUser');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                this.tokenBalance = this.currentUser?.tokenBalance || 0;
            }
            this.render(); // Re-render with loaded data
        }, 100);
    }

    setupEventListeners() {
        // Wait for the shadow DOM to be ready
        if (this.shadowRoot) {
            this.shadowRoot.addEventListener('click', (event) => {
                // Theme toggle
                if (event.target.closest('#themeToggle')) {
                    this.toggleTheme();
                }
                
                // --- FIX: Mobile menu toggle logic ---
                const mobileMenuBtn = this.shadowRoot.getElementById('mobileMenuBtn');
                const navLinks = this.shadowRoot.querySelector('.nav-links');
                
                if (event.target.closest('#mobileMenuBtn')) {
                    navLinks.classList.toggle('mobile-open');
                    
                    // Toggle icon
                    const menuIcon = mobileMenuBtn.querySelector('i');
                    if (navLinks.classList.contains('mobile-open')) {
                        menuIcon.setAttribute('data-feather', 'x'); // Close icon
                    } else {
                        menuIcon.setAttribute('data-feather', 'menu'); // Menu icon
                    }
                    // Re-render feather icons in shadow DOM
                    feather.replace({ parent: this.shadowRoot }); 
                }
            });
        }

        // Listen for custom event from script.js to update token balance
        window.addEventListener('safeVoiceTokenUpdate', (e) => {
            this.tokenBalance = e.detail.newBalance;
            this.render(); // Re-render to reflect new token balance
        });
        window.addEventListener('safeVoiceUserUpdate', (e) => {
            this.currentUser = e.detail.currentUser;
            this.render(); // Re-render if user changes (e.g., wallet connected)
        });
    }

    render() {
        // Determine current theme for icon
        const currentTheme = localStorage.getItem('theme') || 'light';
        const themeIcon = currentTheme === 'dark' ? 'sun' : 'moon';

        // Check if links are open for icon state
        const linksOpen = this.shadowRoot && this.shadowRoot.querySelector('.nav-links.mobile-open');
        const menuIcon = linksOpen ? 'x' : 'menu';

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
                        top: 100%; /* Position below navbar */
                        left: 0;
                        right: 0;
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                        flex-direction: column;
                        padding: 1rem;
                        gap: 1rem;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
                    <a href="./index.html" class="logo">
                        Safe<span style="color: #fbbf24">Voice</span>
                    </a>
                    
                    <ul class="nav-links">
                        <li><a href="./feed.html"><i data-feather="home"></i> Feed</a></li>
                        <li><a href="./create.html"><i data-feather="edit-3"></i> Create</a></li>
                        <li><a href="./memorials.html"><i data-feather="heart"></i> Memorials</a></li>
                        <li><a href="./resources.html"><i data-feather="life-buoy"></i> Resources</a></li>
                        <li><a href="./profile.html"><i data-feather="user"></i> Profile</a></li>
                    </ul>
                    
                    <div class="nav-actions">
                        <div class="token-display">
                            <i data-feather="award"></i>
                            <span class="token-balance">${this.tokenBalance.toLocaleString()}</span>
                        </div>
                        
                        <button class="theme-toggle" id="themeToggle">
                            <i data-feather="${themeIcon}"></i>
                        </button>
                        
                        <button class="mobile-menu-btn" id="mobileMenuBtn">
                            <i data-feather="${menuIcon}"></i>
                        </button>
                    </div>
                </div>
            </nav>
        `;
        
        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            setTimeout(() => {
                feather.replace({ parent: this.shadowRoot });
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
}

customElements.define('custom-navbar', CustomNavbar);

