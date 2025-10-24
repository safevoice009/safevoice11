// SafeVoice Global JavaScript V5.4 (WalletConnect Defer + Retry Init + More Logging)

class SafeVoiceApp {
    constructor() {
        console.log("SafeVoiceApp constructing...");
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null; // Ethers.js provider (MetaMask OR WalletConnect)
        this.wcProvider = null; // WalletConnect Provider instance
        this.isInitialized = false;
        this._isConnecting = false; // Connection guard flag

        // --- WalletConnect Project ID ---
        this.walletConnectProjectId = 'da4f1e37c13d4c75f45c08c62395981'; // Your Project ID

        this._boundInit = this.init.bind(this);
        // Ensure init runs after DOM is ready AND scripts likely loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this._boundInit);
            console.log("SafeVoiceApp: DOMContentLoaded listener attached for init.");
        } else {
            console.log("SafeVoiceApp: DOM already loaded, scheduling init slightly deferred.");
            setTimeout(this._boundInit, 50); // Increased deferral slightly
        }
    }

    // Helper to check for WalletConnect library with retries
    async checkWalletConnectLibrary(retries = 5, delay = 400) { // Increased retries/delay
        console.log("checkWalletConnectLibrary: Starting check...");
        for (let i = 0; i < retries; i++) {
            const wcLibExists = typeof window.WalletConnectEthereumProvider !== 'undefined' && typeof window.WalletConnectEthereumProvider.EthereumProvider !== 'undefined';
            console.log(`checkWalletConnectLibrary: Attempt ${i + 1}/${retries}. Library exists?`, wcLibExists);
            if (wcLibExists) {
                console.log(`checkWalletConnectLibrary: WalletConnect library found successfully after ${i} retries.`);
                return true; // Library is loaded and ready
            }
            if (i < retries - 1) { // Don't wait after the last retry
                console.warn(`checkWalletConnectLibrary: WalletConnect library not found, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // If loop completes without finding the library
        console.error("checkWalletConnectLibrary: WalletConnectEthereumProvider library failed to load after multiple retries!");
        console.log("checkWalletConnectLibrary: Window keys potentially related:", Object.keys(window).filter(k => k.toLowerCase().includes('walletconnect')));
        this.showNotification("WalletConnect library failed to load. Please check network or refresh.", "error");
        return false; // Indicate failure after all retries
    }


    async initWalletConnectProvider() {
        console.log("initWalletConnectProvider: Attempting initialization...");
        if (!this.walletConnectProjectId) {
            console.error("initWalletConnectProvider: WalletConnect Project ID is missing! Cannot initialize.");
            this.showNotification("WalletConnect setup error (ID missing).", "error");
            return null; // Stop initialization
        }

        // --- ENHANCED CHECK WITH RETRY ---
        const libraryLoaded = await this.checkWalletConnectLibrary();
        if (!libraryLoaded) {
            console.error("initWalletConnectProvider: Stopping initialization because library check failed.");
            // Notification already shown by checkWalletConnectLibrary
            return null; // Stop initialization if library isn't found after retries
        }
        // --- END ENHANCED CHECK ---

        // Proceed with initialization only if library check passed
        try {
            console.log("initWalletConnectProvider: WalletConnectEthereumProvider library confirmed. Initializing...");
            const { EthereumProvider } = window.WalletConnectEthereumProvider;

            // Prevent re-initialization if already successfully initialized
            if (this.wcProvider) {
                 console.log("initWalletConnectProvider: WalletConnect Provider instance already exists. Skipping re-initialization.");
                 return this.wcProvider;
            }

            // Initialize the WalletConnect provider
            console.log("initWalletConnectProvider: Calling EthereumProvider.init()...");
            this.wcProvider = await EthereumProvider.init({
                projectId: this.walletConnectProjectId,
                chains: [1], // Mainnet
                showQrModal: true,
                qrModalOptions: { themeMode: "light" },
                methods: ["eth_requestAccounts", "personal_sign"],
                events: ["connect", "disconnect", "accountsChanged"]
            });
             console.log("initWalletConnectProvider: EthereumProvider.init() completed.");

            // --- Setup Event Listeners ---
            console.log("initWalletConnectProvider: Setting up WC event listeners...");
            this.wcProvider.on("disconnect", () => {
                console.log("WalletConnect Event: 'disconnect' received.");
                this.handleDisconnect();
            });
            this.wcProvider.on("accountsChanged", (accounts) => {
                 console.log("WalletConnect Event: 'accountsChanged' received", accounts);
                 if (accounts && accounts.length > 0) {
                     if (this.currentUser && !this.currentUser.isAnonymous && this.currentUser.walletAddress !== accounts[0]) {
                          console.log("Wallet address changed. Updating state.");
                          this.currentUser.walletAddress = accounts[0];
                          localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
                          this.dispatchUserUpdate();
                     } else {
                         console.log("Account change event ignored (not connected/same address).");
                     }
                 } else {
                     console.log("Received empty accounts array, handling as disconnect.");
                     this.handleDisconnect();
                 }
            });
            // --- End Event Listeners ---

            console.log("initWalletConnectProvider: Initialization successful.");
            return this.wcProvider;
        } catch (error) {
            console.error("initWalletConnectProvider: FAILED during initialization:", error);
            let message = "Could not initialize WalletConnect.";
            if (error.message?.includes('Project ID is invalid')) { message = "WalletConnect Project ID is invalid."; }
            else if (error.message?.includes('Network request failed')) { message = "Network error initializing WalletConnect."; }
            else if (error.message?.includes('Unsupported chain id')) { message = "WalletConnect: Unsupported chain configured."; }
            else if (error.message) { message = `WalletConnect Init Error: ${error.message}`; }
            this.showNotification(message, "error");
            this.wcProvider = null; // Ensure provider is null on failure
            return null;
        }
    }

    // Main initialization function called after DOM is ready
    async init() {
        if (this.isInitialized) { console.log("App Init: Already initialized. Skipping."); return; }
        document.removeEventListener('DOMContentLoaded', this._boundInit);
        console.log('App Init: Starting initialization (DOM Ready)...');

        try {
            console.log("App Init: Step 1 - Initializing WalletConnect Provider...");
            await this.initWalletConnectProvider(); // Contains library check + retry

            console.log("App Init: Step 2 - Loading user state...");
            this.loadUserState();

            console.log("App Init: Step 3 - Setting up event listeners...");
            this.setupEventListeners();

            console.log("App Init: Step 4 - Performing initial UI updates...");
            this.updateProfileUI(); // Only affects profile page
            this.dispatchUserUpdate(); // Notify navbar etc.
            this.dispatchTokenUpdate(); // Notify navbar etc.

            console.log('App Init: Initialization sequence completed successfully.');
            this.isInitialized = true; // Mark as complete

        } catch (error) {
             console.error("!!! App Init: CRITICAL ERROR DURING INITIALIZATION SEQUENCE !!!", error);
             this.showNotification("Critical error loading the app. Please refresh.", "error");
             this.isInitialized = false; // Mark as failed
        }
    }


    loadUserState() {
        console.log("loadUserState: Loading user state from localStorage...");
        try {
            const savedUser = localStorage.getItem('safeVoiceUser');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                if (typeof this.currentUser !== 'object' || this.currentUser === null) {
                    console.error("loadUserState: Invalid user data structure found:", this.currentUser);
                    throw new Error("Parsed user data is not a valid object.");
                }
                this.walletConnected = !!this.currentUser.walletAddress;
                this.tokenBalance = Number(this.currentUser.tokenBalance) || 0;
                console.log('loadUserState: User state loaded successfully:', this.currentUser);
            } else {
                console.log('loadUserState: No saved user state found.');
                this.currentUser = null;
                this.walletConnected = false;
                this.tokenBalance = 0;
            }
        } catch (error) {
            console.error('loadUserState: Error loading or parsing state:', error);
            localStorage.removeItem('safeVoiceUser');
            this.currentUser = null;
            this.walletConnected = false;
            this.tokenBalance = 0;
        }
    }

    setupEventListeners() {
        console.log("setupEventListeners: Setting up listeners...");

        // Reactions (Delegation)
        document.body.addEventListener('click', (event) => {
            const reactionBtn = event.target.closest('.reaction-btn');
            if (reactionBtn) {
                console.log("setupEventListeners: Reaction button clicked.");
                this.handleReaction(reactionBtn);
            }
        });

        // Specific Buttons
        const connectBtnIndex = document.getElementById('connectWalletBtnIndex');
        const anonymousBtnIndex = document.getElementById('anonymousModeBtnIndex');
        const connectBtnProfile = document.getElementById('connectWalletBtnProfile');

        if (connectBtnIndex) {
            connectBtnIndex.addEventListener('click', () => {
                console.log("setupEventListeners: Index Connect button clicked.");
                this.connectWallet();
            });
            console.log("Listener attached: #connectWalletBtnIndex.");
        } else if (document.getElementById('hero')) {
             console.warn("setupEventListeners: Button #connectWalletBtnIndex not found on index!");
        }

        if (anonymousBtnIndex) {
            anonymousBtnIndex.addEventListener('click', () => {
                console.log("setupEventListeners: Index Anonymous button clicked.");
                if (this.enterAnonymousMode()) {
                    window.location.href = './feed.html';
                }
            });
            console.log("Listener attached: #anonymousModeBtnIndex.");
        } else if (document.getElementById('hero')) {
            console.warn("setupEventListeners: Button #anonymousModeBtnIndex not found on index!");
        }

        if (connectBtnProfile) {
            connectBtnProfile.addEventListener('click', () => {
                console.log("setupEventListeners: Profile Connect button clicked.");
                this.connectWallet();
            });
            console.log("Listener attached: #connectWalletBtnProfile.");
        } else if (document.getElementById('profileUsername')) {
            console.warn("setupEventListeners: Button #connectWalletBtnProfile not found on profile!");
        }

        // State Change Listeners
        window.addEventListener('safeVoiceUserUpdate', this.updateProfileUI.bind(this));
        console.log("Listener attached: window safeVoiceUserUpdate.");
        window.addEventListener('safeVoiceTokenUpdate', this.updateProfileUI.bind(this));
        console.log("Listener attached: window safeVoiceTokenUpdate.");

        // Feather Icons
        try {
            if (typeof feather !== 'undefined') {
                 feather.replace();
                 console.log("Feather.replace() called at end of setupEventListeners.");
            } else {
                 console.error("Feather library not available at end of setupEventListeners.");
            }
        } catch(e) { console.error("Error running feather.replace in setupEventListeners:", e); }

        this.initTooltips();
        console.log("setupEventListeners: Setup complete.");
    }

    updateProfileUI() {
        const usernameEl = document.getElementById('profileUsername');
        if (!usernameEl) return; // Not on profile page

        console.log('updateProfileUI: Updating profile page elements...');
        const walletEl = document.getElementById('profileWallet');
        const tokenEl = document.getElementById('profileTokenBalance');
        const connectBtn = document.getElementById('connectWalletBtnProfile');
        const postsContainer = document.getElementById('myPostsContainer');
        const totalPostsEl = document.getElementById('profileTotalPosts');
        const reactionsGivenEl = document.getElementById('profileReactionsGiven');
        const postsPlaceholder = document.getElementById('postsPlaceholder');

        if (!walletEl || !tokenEl || !connectBtn || !postsContainer || !totalPostsEl || !reactionsGivenEl || !postsPlaceholder) {
             console.error("updateProfileUI: CRITICAL - Missing required profile elements!");
             if (usernameEl) usernameEl.textContent = "Profile Error";
             return;
        }

        try {
            if (this.currentUser) {
                tokenEl.textContent = this.tokenBalance?.toLocaleString() ?? '0';

                if (this.currentUser.isAnonymous) {
                    console.log("updateProfileUI: State is Anonymous.");
                    usernameEl.textContent = this.currentUser.anonymousId || 'Anonymous User';
                    walletEl.textContent = 'Anonymous Mode';
                    connectBtn.textContent = 'Connect Wallet';
                    connectBtn.style.display = 'inline-block';
                    postsPlaceholder.textContent = 'Connect wallet to see posts (coming soon).';
                    postsContainer.innerHTML = '';
                    postsContainer.appendChild(postsPlaceholder);
                } else if (this.currentUser.walletAddress) {
                    console.log("updateProfileUI: State is Wallet Connected.");
                    usernameEl.textContent = 'Wallet Connected';
                    const shortAddress = `${this.currentUser.walletAddress.substring(0, 6)}...${this.currentUser.walletAddress.substring(this.currentUser.walletAddress.length - 4)}`;
                    walletEl.textContent = shortAddress;
                    connectBtn.style.display = 'none';
                    postsPlaceholder.innerHTML = `
                        <i data-feather="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i>
                        <p>Loading posts for ${shortAddress}...</p>
                        <p class="text-sm">(Supabase needed)</p>`;
                     postsContainer.innerHTML = '';
                     postsContainer.appendChild(postsPlaceholder);
                } else {
                     console.warn("updateProfileUI: currentUser exists but invalid state.");
                     throw new Error("Invalid currentUser state.");
                }
            } else {
                console.log("updateProfileUI: State is Logged Out / No User.");
                usernameEl.textContent = 'Anonymous User';
                walletEl.textContent = 'Wallet not connected';
                tokenEl.textContent = '0';
                connectBtn.textContent = 'Connect Wallet';
                connectBtn.style.display = 'inline-block';
                postsPlaceholder.textContent = 'Connect wallet or enter anonymously.';
                 postsContainer.innerHTML = '';
                 postsContainer.appendChild(postsPlaceholder);
            }

            totalPostsEl.textContent = '0'; // Placeholder
            reactionsGivenEl.textContent = '0'; // Placeholder

            if (typeof feather !== 'undefined') {
                console.log("updateProfileUI: Running feather.replace() after UI update.");
                feather.replace();
            } else {
                 console.warn("updateProfileUI: Feather library not available for dynamic icons.");
            }
             console.log("updateProfileUI: Update successful.");

        } catch (error) {
             console.error("updateProfileUI: Error during update:", error);
             if (usernameEl) usernameEl.textContent = "Profile Error";
             if (walletEl) walletEl.textContent = "Load error";
             if (tokenEl) tokenEl.textContent = "-";
             if (postsContainer) postsContainer.innerHTML = '<p class="text-center text-red-500">Error displaying profile.</p>';
        }
    }


    async handleReaction(button) {
        console.log("handleReaction: Initiated.");
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;
        if (!postId || !reactionType) {
            console.warn("handleReaction: Missing data attributes on button.");
            return;
        }
        button.classList.add('opacity-50', 'pointer-events-none');
        try {
            await this.simulateAPICall(100, 300);
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent, 10) || 0;
                countElement.textContent = currentCount + 1;
                 button.style.transition = 'transform 0.1s ease-out';
                 button.style.transform = 'scale(1.15)';
                 setTimeout(() => { button.style.transform = 'scale(1)'; }, 150);
                 console.log(`handleReaction: Updated count for post ${postId}, type ${reactionType}.`);
            }
            if (this.currentUser) {
                 this.awardTokens(2, 'reaction_given');
            } else {
                 console.log("handleReaction: No user session for token award.");
            }
        } catch (error) {
            console.error('handleReaction: Failed:', error);
            this.showNotification('Failed to add reaction.', 'error');
        } finally {
            setTimeout(() => {
                button.classList.remove('opacity-50', 'pointer-events-none');
            }, 400);
        }
    }

    async connectWallet() {
        console.log("connectWallet: Action initiated...");
        if (this._isConnecting) {
            console.log("connectWallet: Already connecting.");
            this.showNotification("Connecting... Please wait.", "info");
            return false;
        }
        this._isConnecting = true;

        let accounts = [];
        let connectionError = null;

        try {
            console.log("connectWallet: Step 1 - Ensuring WC Provider is ready...");
            if (!this.wcProvider) {
                 console.log("connectWallet: WC provider not initialized, calling initWalletConnectProvider...");
                 await this.initWalletConnectProvider();
                 if (!this.wcProvider) {
                      console.error("connectWallet: WC provider initialization failed within connectWallet.");
                      // Notification should have been shown by initWalletConnectProvider
                      throw new Error("WalletConnect failed to initialize.");
                 }
                 console.log("connectWallet: WC provider initialized successfully.");
            } else {
                 console.log("connectWallet: WC provider already initialized.");
            }

            console.log("connectWallet: Step 2 - Initiating connection via WalletConnect...");
            this.showNotification("Connecting wallet... Check wallet app for approval.", "info", 7000); // Longer duration for user action

            // Check for existing session first
            if (this.wcProvider.accounts && this.wcProvider.accounts.length > 0) {
                 console.log("connectWallet: Using existing WC session:", this.wcProvider.accounts);
                 accounts = this.wcProvider.accounts;
            } else {
                 console.log("connectWallet: No existing WC session, calling wcProvider.connect()...");
                 // This triggers the modal/redirect
                 await this.wcProvider.connect();
                 accounts = this.wcProvider.accounts;
                 console.log("connectWallet: wcProvider.connect() successful, accounts:", accounts);
                 if (!accounts || accounts.length === 0) {
                     throw new Error("WalletConnect connect() returned no accounts.");
                 }
            }

            console.log("connectWallet: Step 3 - Processing connection...");
            const walletAddress = accounts[0];

            console.log("connectWallet: Step 3a - Wrapping WC provider with Ethers...");
            this.provider = new ethers.providers.Web3Provider(this.wcProvider);
            console.log("connectWallet: Ethers provider created.");

            this.walletConnected = true;
            const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
            const welcomeBonus = 100;

            console.log("connectWallet: Step 4 - Updating App State...");
            this.currentUser = {
                walletAddress: walletAddress,
                isAnonymous: false,
                tokenBalance: existingBalance + welcomeBonus
            };
            this.tokenBalance = this.currentUser.tokenBalance;
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            console.log("connectWallet: App state updated:", this.currentUser);

            console.log("connectWallet: Step 5 - UI Feedback & Updates...");
            const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
            this.showNotification(`Wallet ${shortAddress} connected! +${welcomeBonus} tokens`, 'success');
            this.dispatchTokenUpdate();
            this.dispatchUserUpdate();

            console.log("connectWallet: Step 6 - Checking for redirect...");
            if (document.getElementById('hero')) {
                console.log("Connected on index page, scheduling redirect...");
                setTimeout(() => { window.location.href = './feed.html'; }, 1500);
            } else {
                console.log("Connected on non-index page, no redirect.");
            }

            this._isConnecting = false; // Reset flag before success return
            console.log("connectWallet: Connection successful.");
            return true;

        } catch (error) {
            console.error('connectWallet: Connection process failed:', error);
            connectionError = error;

            // More detailed error feedback
            if (error.message?.includes("User closed modal") || String(error.code).includes('USER_REJECTED') || error.code === 4001) {
                 this.showNotification('Connection cancelled by user.', 'warning');
            } else if (error.message?.includes("Expired connection") || String(error.code).includes('SESSION_EXPIRED')) {
                 this.showNotification('Connection timed out. Try again.', 'warning');
            } else if (error.message?.includes("pairing modal closed")) {
                 console.warn("connectWallet: Pairing modal closed early.");
                 this.showNotification('Connection cancelled.', 'info');
            } else if (error.message?.includes("WalletConnect failed to initialize") || error.message?.includes("WalletConnect could not be initialized")) {
                console.error("connectWallet: Initialization failed, cannot connect.");
                // Notification already shown by init function
            } else if (error.message?.includes("Session currently disconnected")) {
                 this.showNotification('Session disconnected. Please try connecting again.', 'warning');
            } else {
                 this.showNotification(`Connect failed: ${error.message || 'Unknown error'}`, 'error');
            }

        } finally {
            this._isConnecting = false; // CRITICAL: Always reset the guard
            console.log("connectWallet: Process finished.");
            if (accounts && accounts.length > 0 && !connectionError) {
                 return true; // Success path already returned
            } else {
                 console.log("connectWallet: Returning false (failure).");
                 return false; // Indicate failure
            }
        }
    }


     handleDisconnect() {
        console.log("handleDisconnect: Wallet disconnected.");
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null;
        // Keep wcProvider instance? WalletConnect docs suggest keeping it to potentially re-connect later.
        // Let's keep it for now unless issues arise.
        // this.wcProvider = null;
        localStorage.removeItem('safeVoiceUser');
        this.showNotification("Wallet disconnected.", "info");
        this.dispatchUserUpdate();
        this.dispatchTokenUpdate();
        console.log("handleDisconnect: App state reset.");
     }


    enterAnonymousMode() {
        console.log("enterAnonymousMode: Attempting...");
        if (this.walletConnected) {
             console.log("enterAnonymousMode: Blocked - Wallet connected.");
             this.showNotification("Already connected with a wallet.", "info");
             return true; // Allow redirect even if already connected
        }

        const anonymousBonus = 50;
        if (!this.currentUser || !this.currentUser.isAnonymous) {
             console.log("enterAnonymousMode: Setting anonymous state...");
             this.currentUser = {
                 anonymousId: this.generateAnonymousId(),
                 isAnonymous: true,
                 tokenBalance: anonymousBonus
             };
             localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
             this.tokenBalance = this.currentUser.tokenBalance;
             this.showNotification(`Entering anonymous mode. +${anonymousBonus} tokens!`, 'info');
             this.dispatchTokenUpdate();
             this.dispatchUserUpdate();
             console.log("enterAnonymousMode: Anonymous state set.");
        } else {
             console.log("enterAnonymousMode: Already anonymous.");
             // Ensure balances are synced just in case
             this.tokenBalance = this.currentUser.tokenBalance;
             this.dispatchTokenUpdate();
        }
        return true; // Indicate success for redirect
     }

    // --- Dispatchers ---
    dispatchTokenUpdate() {
        console.log("dispatchTokenUpdate: Firing event with balance:", this.tokenBalance);
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', { detail: { newBalance: this.tokenBalance } }));
    }
    dispatchUserUpdate() {
        console.log("dispatchUserUpdate: Firing event with user:", this.currentUser);
        window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', { detail: { currentUser: this.currentUser } }));
    }

    // --- Helpers ---
    generateAnonymousId() { const a=['Brave','Calm','Wise','Kind','Strong','Gentle','Bright','True','Quiet','Clear','Silent','Swift']; const n=['Owl','Phoenix','Lion','Dolphin','Eagle','Wolf','Tiger','Bear','River','Star','Flame','Stone']; return `${a[Math.floor(Math.random()*a.length)]}${n[Math.floor(Math.random()*n.length)]}${Math.floor(Math.random()*900)+100}`; }
    awardTokens(amount, reason) { if(!this.currentUser){console.warn("awardTokens: No user."); return;} try{const c=Number(this.currentUser.tokenBalance)||0; const t=Number(amount)||0; if(t<=0)return; this.currentUser.tokenBalance=c+t; this.tokenBalance=this.currentUser.tokenBalance; localStorage.setItem('safeVoiceUser',JSON.stringify(this.currentUser)); this.dispatchTokenUpdate(); console.log(`awardTokens: Awarded ${t} for ${reason}. New: ${this.tokenBalance}`); this.showNotification(`+${t} tokens: ${reason.replace(/_/g,' ')}!`,'success');} catch(e){console.error("awardTokens: Error:",e); this.showNotification("Token balance error.","error");} }
    simulateAPICall(minDuration = 100, maxDuration = 400) { const d=Math.random()*(maxDuration-minDuration)+minDuration; return new Promise(r=>setTimeout(r,d)); }
    showNotification(message, type = 'info', duration = 3500) { try{const id=`N-${Date.now()}-${Math.random().toString(36).substring(2,7)}`; const n=document.createElement('div'); n.id=id; let base='fixed top-20 right-4 p-4 rounded-lg text-white z-[5000] shadow-lg transition-all duration-300 ease-in-out opacity-0 max-w-sm transform translate-x-full'; let typeC=''; switch(type){case 'success':typeC='bg-green-500';break; case 'error':typeC='bg-red-500';break; case 'warning':typeC='bg-yellow-500 text-black';break; case 'info': default:typeC='bg-blue-500';break;} n.className=`${base} ${typeC}`; n.textContent=message; document.body.appendChild(n); requestAnimationFrame(()=>{n.classList.remove('opacity-0','translate-x-full'); n.classList.add('opacity-100','translate-x-0'); const existing=Array.from(document.querySelectorAll('[id^=N-]:not(#'+id+')')).reverse(); existing.forEach((el,i)=>{el.style.transform=`translateY(${(i+1)*70}px) translateX(0px)`;});}); setTimeout(()=>{const el=document.getElementById(id); if(el){el.classList.remove('opacity-100','translate-x-0'); el.classList.add('opacity-0','translate-x-full'); setTimeout(()=>el.remove(),300);}},duration);}catch(e){console.error("showNotification: Error:",e);} }
    initTooltips() { /* console.log("Init tooltips (placeholder)"); */ }
    showTooltip(event) { /* Placeholder */ }
    hideTooltip(event) { /* Placeholder */ }
}

// --- Global App Initialization ---
if (!window.safeVoiceApp) {
    window.safeVoiceApp = new SafeVoiceApp();
    console.log("Global: SafeVoiceApp instance created and scheduled for init.");
} else {
    console.warn("Global: SafeVoiceApp instance already exists. Check script imports.");
}
// --- END ---


// --- Utility functions (SafeVoiceUtils) ---
const SafeVoiceUtils = {
    formatNumber: (num) => {
        const number = Number(num);
        if (isNaN(number)) return '0';
        if (number >= 1e6) return (number / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (number >= 1e3) return (number / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return number.toLocaleString();
    },
    formatDate: (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSeconds = Math.round(diffMs / 1000);
            const diffMins = Math.round(diffSeconds / 60);
            const diffHours = Math.round(diffMins / 60);
            const diffDays = Math.round(diffHours / 24);

            if (diffSeconds < 5) return 'Just now';
            if (diffMins < 1) return `${diffSeconds}s ago`;
            if (diffHours < 1) return `${diffMins}m ago`;
            if (diffDays < 1) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Utils: Error formatting date:", dateString, e);
            return 'Date error';
        }
    },
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = () => {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    simulatePGPEncryption: async (content) => {
        return new Promise(resolve => {
            setTimeout(() => {
                try {
                    const stringContent = String(content || '');
                    const encrypted = `🔒 PGP_ENCRYPTED_${btoa(stringContent).substring(0, 20)}...[SIM]`;
                    resolve(encrypted);
                } catch (e) {
                    console.error("Utils: PGP sim error:", e);
                    resolve(`🔒 PGP_ERROR...`);
                }
            }, 300);
        });
    },
    calculateTokenReward: (action, metadata = {}) => {
        const rewards = {
            post_created: 10,
            reaction_given: 2,
            reaction_received: 2,
            comment_posted: 5,
            crisis_support: 50,
            content_moderated: 15,
            first_post: 25,
            first_reaction: 10,
            wallet_connected: 100,
            anonymous_entry: 50
        };
        return rewards[action] || 0;
    }
};
window.SafeVoiceUtils = SafeVoiceUtils;
console.log("Global: SafeVoiceUtils attached to window.");
// --- END UTILS ---

