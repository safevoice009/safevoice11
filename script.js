// SafeVoice Global JavaScript V6.2 (Web3Modal v1 - cdnjs + Wait Check) - COMPLETE

// --- Constants ---
// WalletConnect v1 requires an Infura ID if you want Infura-provided RPC endpoints
// Replace with your own Infura ID (get one free at infura.io) or use a different RPC
const INFURA_ID = "61bf1b20f35746ada4114a0210084f05"; // <<< YOUR ID INSERTED
// WalletConnect Project ID (still needed for v1 provider config options potentially)
const WALLETCONNECT_PROJECT_ID = 'da4f1e37c813d4c75f45c08c62395981';

class SafeVoiceApp {
    constructor() {
        console.log("SafeVoiceApp constructing...");
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null; // Ethers.js provider (will come from Web3Modal)
        this.web3Modal = null; // Web3Modal v1 instance
        this.web3ModalProvider = null; // Raw provider instance from Web3Modal connection
        this.isInitialized = false;
        this._isConnecting = false; // Guard flag for connection process

        // Bind the init function to ensure correct `this` context
        this._boundInit = this.init.bind(this);
        // Wait for the DOM to be fully parsed before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this._boundInit);
            console.log("SafeVoiceApp: DOMContentLoaded listener attached for init.");
        } else {
            // If DOM is already loaded, schedule init slightly deferred
            console.log("SafeVoiceApp: DOM already loaded, scheduling init slightly deferred.");
            // Increased delay slightly to give CDNs more time
            setTimeout(this._boundInit, 100);
        }
    }

    // --- NEW: Wait for Libraries Function ---
    // Waits for specified global objects (libraries) to be available
    async waitForLibraries(libs, timeout = 5000, interval = 200) {
        console.log(`waitForLibraries: Waiting for: ${libs.join(', ')}...`);
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            // Check if all libraries in the array are defined and are of the expected type (usually function or object)
            const allLoaded = libs.every(libName => {
                const lib = window[libName];
                const expectedType = (libName === 'WalletConnectProvider') ? 'object' : 'function'; // WC Provider is object, Web3Modal is function
                return typeof lib !== 'undefined' && (expectedType === 'object' ? typeof lib?.default !== 'undefined' : typeof lib === expectedType);
            });

            if (allLoaded) {
                console.log(`waitForLibraries: All libraries (${libs.join(', ')}) loaded successfully.`);
                return true; // All libraries are loaded
            }
            // If not all loaded, wait for the interval duration before checking again
            await new Promise(resolve => setTimeout(resolve, interval));
            console.log(`waitForLibraries: Still waiting... Time elapsed: ${Date.now() - startTime}ms`);
        }
        // If the loop completes without finding all libraries, it timed out
        console.error(`waitForLibraries: Timed out after ${timeout}ms waiting for libraries: ${libs.join(', ')}.`);
        const missing = libs.filter(libName => typeof window[libName] === 'undefined');
        console.error(`waitForLibraries: Missing libraries: ${missing.join(', ')}`);
        this.showNotification(`Essential connection libraries failed to load (Timeout). Please check network and refresh.`, "error", 6000);
        return false; // Indicate failure
    }
    // --- End Wait for Libraries Function ---


    // Initialize Web3Modal v1 instance
    async initWeb3Modal() {
        console.log("initWeb3Modal (v1): Starting initialization...");

        // --- Use waitForLibraries to ensure dependencies are ready ---
        const requiredLibs = ['Web3Modal', 'WalletConnectProvider'];
        const libsReady = await this.waitForLibraries(requiredLibs, 5000); // Wait up to 5 seconds
        if (!libsReady) {
            console.error("initWeb3Modal (v1): Required libraries did not load in time. Aborting Web3Modal init.");
            // Notification already shown by waitForLibraries on timeout
            return false; // Stop initialization if libs aren't ready
        }
        // --- End Wait ---

        // Check if the necessary Infura ID is set (replace placeholder)
        if (!INFURA_ID || INFURA_ID === "YOUR_INFURA_PROJECT_ID") {
             console.error("initWeb3Modal (v1): CRITICAL - Infura ID placeholder detected in script.js! Replace it with your actual Infura Project ID.");
             this.showNotification("WalletConnect configuration error (Missing Infura ID). Get one from infura.io.", "error", 6000);
             return false; // Stop initialization if the essential ID is missing
        }

        try {
            console.log("initWeb3Modal (v1): Libraries confirmed ready. Configuring provider options...");

            // Configure providers for Web3Modal v1
            const providerOptions = {
                walletconnect: {
                    // Correctly reference the loaded WalletConnectProvider class constructor
                    package: window.WalletConnectProvider.default,
                    options: {
                        infuraId: INFURA_ID, // Pass the Infura ID constant
                        // Include RPC URLs for better reliability and multi-chain support later
                        rpc: {
                             1: `https://mainnet.infura.io/v3/${INFURA_ID}`, // Ethereum Mainnet (Chain ID 1)
                             // Add other chains here if needed in the future
                             // 137: `https://polygon-mainnet.infura.io/v3/${INFURA_ID}`, // Polygon
                        }
                    }
                },
                // Add configurations for other wallet providers here if desired
            };

            console.log("initWeb3Modal (v1): Attempting to create Web3Modal instance...");
            // Create the Web3Modal instance using the now-verified constructor
            // Use the constructor directly from window.Web3Modal
            // Note: cdnjs version might export Web3Modal.default depending on build
            const Web3ModalConstructor = window.Web3Modal.default || window.Web3Modal;
            if (typeof Web3ModalConstructor !== 'function') {
                 throw new Error("window.Web3Modal loaded but is not a constructor function!");
            }

            this.web3Modal = new Web3ModalConstructor({
                network: "mainnet",         // Default network connection request
                cacheProvider: true,       // Cache the user's chosen provider
                providerOptions,           // Pass the configured providers
                theme: "light",            // Optional: Set theme
                disableInjectedProvider: false // Allow direct MetaMask connection option
            });

            console.log("initWeb3Modal (v1): Web3Modal instance created successfully.");
            return true; // Indicate success

        } catch (error) {
            // Catch any errors during Web3Modal instantiation
            console.error("initWeb3Modal (v1): FAILED during initialization:", error);
            // Show a user-friendly error message, including the constructor error specifically
            const errorMsg = String(error.message).includes("constructor")
                ? "Wallet library (Web3Modal) loaded incorrectly."
                : `Web3Modal Init Error: ${error.message || 'Unknown configuration issue.'}`;
            this.showNotification(errorMsg, "error");
            this.web3Modal = null; // Ensure instance is null on failure
            return false; // Indicate failure
        }
    }

    // Main application initialization sequence
    async init() {
        // Prevent re-initialization
        if (this.isInitialized) {
            console.log("App Init: Already initialized. Skipping.");
            return;
        }
        document.removeEventListener('DOMContentLoaded', this._boundInit); // Clean up listener
        console.log('App Init: Starting initialization sequence (DOM Ready)...');

        try {
            // Step 1: Initialize Web3Modal (includes library loading check + wait)
            console.log("App Init: Step 1 - Initializing Web3Modal v1 (with library wait)...");
            const w3mInitialized = await this.initWeb3Modal();
            // If Web3Modal fails, log error but continue for anonymous access
            if (!w3mInitialized) {
                console.error("App Init: Web3Modal initialization failed. Wallet connections will be unavailable.");
                // Note: Notification already shown by initWeb3Modal on failure
            } else {
                console.log("App Init: Web3Modal initialized successfully.");
            }

            // Step 2: Load user state (runs regardless of Web3Modal status)
            console.log("App Init: Step 2 - Loading user state from localStorage...");
            this.loadUserState();

            // Step 3: Set up event listeners (runs regardless of Web3Modal status)
            console.log("App Init: Step 3 - Setting up event listeners...");
            this.setupEventListeners();

            // Step 4: Perform initial UI updates based on loaded state
            console.log("App Init: Step 4 - Performing initial UI updates...");
            this.updateProfileUI();     // Update profile page elements if present
            this.dispatchUserUpdate();  // Notify navbar etc. about user state
            this.dispatchTokenUpdate(); // Notify navbar etc. about token balance

            console.log('App Init: Initialization sequence finished.');
            this.isInitialized = true; // Mark as initialized

            // Step 5: Check for cached provider (only if Web3Modal loaded successfully)
            // Attempt auto-reconnect if user connected previously
            if (this.web3Modal && this.web3Modal.cachedProvider) {
                console.log("App Init: Cached provider found by Web3Modal. Attempting auto-connect in background...");
                // Run connection attempt but don't block further execution (no await)
                this.connectWallet().catch(err => {
                    console.warn("App Init: Auto-connect attempt failed:", err);
                    // Optionally clear cache on failure to prevent repeated errors
                    // this.web3Modal.clearCachedProvider();
                    // this.handleDisconnect(false); // Silently reset state if needed
                });
            } else if (this.web3Modal) {
                 console.log("App Init: No cached provider found by Web3Modal.");
            } else {
                 console.log("App Init: Web3Modal was not initialized, skipping cached provider check.");
            }

        } catch (error) {
             // Catch unexpected errors during the main init flow
             console.error("!!! App Init: CRITICAL ERROR DURING INITIALIZATION SEQUENCE !!!", error);
             // Show error to user
             const initErrorMessage = error.message?.includes("Web3Modal")
                ? `Wallet Connection Init Error: ${error.message}`
                : "Critical error loading the application. Please refresh.";
             this.showNotification(initErrorMessage, "error", 6000);
             this.isInitialized = false; // Mark init as failed
        }
    }


    // Connect Wallet using Web3Modal v1
    async connectWallet() {
        console.log("connectWallet (v1): Action initiated...");
        // Prevent multiple simultaneous connection attempts
        if (this._isConnecting) {
            console.log("connectWallet (v1): Connection attempt already in progress.");
            this.showNotification("Connecting... Please check your wallet or browser.", "info");
            return false; // Exit if already connecting
        }
        // Ensure Web3Modal was successfully initialized before attempting connection
        if (!this.web3Modal) {
            console.error("connectWallet (v1): Web3Modal is not initialized! Cannot connect.");
            this.showNotification("Wallet connection module is not ready. Please refresh the page.", "error", 5000);
            return false; // Exit if Web3Modal isn't ready
        }

        this._isConnecting = true; // Set guard flag
        let connectionError = null; // Variable to store errors
        let provider = null; // Variable for the raw provider instance

        try {
            console.log("connectWallet (v1): Calling web3Modal.connect() to trigger modal...");
            this.showNotification("Opening wallet connection prompt...", "info", 7000);

            // --- Trigger Web3Modal ---
            provider = await this.web3Modal.connect(); // Shows modal, user selects, connects
            this.web3ModalProvider = provider; // Store the raw provider
            console.log("connectWallet (v1): web3Modal.connect() successful. Raw provider obtained.");

            // --- Subscribe to Provider Events ---
            this.subscribeProviderEvents(provider);

            // --- Wrap with Ethers.js ---
            console.log("connectWallet (v1): Wrapping raw provider with Ethers.js...");
            this.provider = new ethers.providers.Web3Provider(provider);
            console.log("connectWallet (v1): Ethers.js provider created.");

            // --- Get Account Information ---
            const signer = this.provider.getSigner();
            const walletAddress = await signer.getAddress();
            console.log("connectWallet (v1): Retrieved wallet address:", walletAddress);
            if (!walletAddress) throw new Error("Could not retrieve address from wallet after connection.");

            // --- Update Application State ---
            this.walletConnected = true;
            const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
            const welcomeBonus = 100;
            console.log("connectWallet (v1): Updating application state...");
            this.currentUser = {
                walletAddress: walletAddress,
                isAnonymous: false,
                tokenBalance: existingBalance + welcomeBonus
            };
            this.tokenBalance = this.currentUser.tokenBalance;
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            console.log("connectWallet (v1): Application state updated:", this.currentUser);

            // --- UI Feedback and Updates ---
            const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
            this.showNotification(`Wallet ${shortAddress} connected! +${welcomeBonus} tokens`, 'success');
            this.dispatchTokenUpdate();
            this.dispatchUserUpdate();

            // --- Redirect if on Homepage ---
            if (document.getElementById('hero')) {
                console.log("Connected on index page, scheduling redirect to feed...");
                setTimeout(() => { window.location.href = './feed.html'; }, 1500);
            }

            this._isConnecting = false; // Reset guard flag BEFORE returning success
            console.log("connectWallet (v1): Connection process completed successfully.");
            return true; // Indicate success

        } catch (error) {
            // --- Error Handling ---
            console.error('connectWallet (v1): Connection process failed:', error);
            connectionError = error;
            let displayError = `Wallet connect failed: ${error.message || 'Unknown error. Please try again.'}`;

            // Specific error messages based on common scenarios
            if (String(error).includes("Modal closed") || String(error.message).includes("User closed modal") || String(error).includes("User rejected") || error.code === 4001) {
                 displayError = 'Connection request cancelled.';
                 console.warn("connectWallet (v1): User cancelled/rejected.");
                 this.showNotification(displayError, 'warning');
            } else if (String(error.message).includes("Provider not found")) {
                displayError = 'No compatible wallet (like MetaMask) detected.';
                console.warn("connectWallet (v1): Injected provider likely missing.");
                this.showNotification(displayError, 'warning', 5000);
            } else if (String(error.message).includes("Already processing")) {
                 displayError = 'Connection already pending. Check wallet.';
                 console.warn("connectWallet (v1): Request already pending.");
                 this.showNotification(displayError, 'info');
            } else {
                this.showNotification(displayError, 'error'); // Generic error
            }
            // Ensure internal state reflects potential failure
            // If provider was obtained but getting address failed, disconnect might be needed
            // if (provider && !this.walletConnected) {
            //     await this.handleDisconnect(false);
            // }

        } finally {
            // --- Cleanup ---
            this._isConnecting = false; // CRITICAL: Always reset the guard flag
            console.log("connectWallet (v1): Connection process finished.");
            // Return true only if Ethers provider was successfully set and no major error occurred
            return !!this.provider && !connectionError;
        }
    }

    // Subscribe to events from the connected provider
    subscribeProviderEvents(provider) {
        if (!provider?.on) { console.error("subscribeProviderEvents: Invalid provider object."); return; }
        console.log("subscribeProviderEvents: Attaching listeners...");

        // Define bound handlers ONCE
        this._handleAccountsChanged = this._handleAccountsChanged || ((accounts) => {
            console.log("Provider Event: 'accountsChanged'", accounts);
            if (accounts && accounts.length > 0) {
                 if (this.currentUser && !this.currentUser.isAnonymous && this.currentUser.walletAddress.toLowerCase() !== accounts[0].toLowerCase()) {
                     console.log("Account changed. Updating state...");
                     this.currentUser.walletAddress = accounts[0];
                     localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
                     this.dispatchUserUpdate();
                     this.showNotification("Wallet account switched.", "info");
                 } else { console.log("Account event: No relevant state change."); }
             } else {
                 console.log("Account event: Empty accounts array, handling as disconnect.");
                 this.handleDisconnect();
             }
        }).bind(this);

        this._handleChainChanged = this._handleChainChanged || ((chainId) => {
            console.log("Provider Event: 'chainChanged'", chainId);
            this.showNotification(`Network changed (ID: ${chainId}). Disconnecting for safety. Please reconnect on Ethereum Mainnet.`, "warning", 6000);
            this.handleDisconnect(); // Force disconnect on chain change for simplicity
        }).bind(this);

        this._handleDisconnectEvent = this._handleDisconnectEvent || ((error) => {
            console.log("Provider Event: 'disconnect'", error);
            // Avoid double handling if rejection occurred during connection attempt
            if (this._isConnecting && (error?.code === 1013 || String(error?.message).includes("rejected"))) {
                 console.log("Disconnect event during connection, likely user rejection - connectWallet handles state.");
                 this._isConnecting = false; // Ensure flag is reset
                 return;
            }
            console.log("Handling unexpected disconnect event.");
            this.handleDisconnect(); // Trigger full disconnect logic
        }).bind(this);

        // --- Remove Old Listeners First ---
        if (provider.removeListener) {
            try {
                 provider.removeListener("accountsChanged", this._handleAccountsChanged);
                 provider.removeListener("chainChanged", this._handleChainChanged);
                 provider.removeListener("disconnect", this._handleDisconnectEvent);
                 console.log("subscribeProviderEvents: Removed potential old listeners.");
            } catch(e) { console.warn("Error removing old provider listeners:", e); }
        } else { console.warn("Provider missing removeListener."); }

        // --- Attach New Listeners ---
        provider.on("accountsChanged", this._handleAccountsChanged);
        provider.on("chainChanged", this._handleChainChanged);
        provider.on("disconnect", this._handleDisconnectEvent);

        console.log("subscribeProviderEvents: Listeners attached.");
    }


    // Disconnect Wallet (adjusted for Web3Modal v1)
    async handleDisconnect(showNotification = true) {
        console.log("handleDisconnect (v1): Initiating disconnection...");

        // --- Step 1: Clear Application State ---
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null; // Clear Ethers provider
        console.log("handleDisconnect (v1): Internal state cleared.");

        // --- Step 2: Attempt to Close/Disconnect Underlying Provider ---
        if (this.web3ModalProvider) {
            console.log("handleDisconnect (v1): Attempting to close/disconnect underlying provider...");
            if (typeof this.web3ModalProvider.close === 'function') { // WC v1 method
                try { await this.web3ModalProvider.close(); console.log("Underlying WC v1 closed."); }
                catch (e) { console.error("Error closing WC v1 provider:", e); }
            } else if (typeof this.web3ModalProvider.disconnect === 'function') { // Some injected might use this
                 try { await this.web3ModalProvider.disconnect(); console.log("Underlying provider disconnect() called."); }
                 catch (e) { console.error("Error disconnecting provider:", e); }
            } else { console.log("No standard close/disconnect method on underlying provider."); }
            this.web3ModalProvider = null; // Clear reference
        } else { console.log("No active underlying provider to close."); }

        // --- Step 3: Clear Web3Modal Cache ---
        if (this.web3Modal?.clearCachedProvider) {
            this.web3Modal.clearCachedProvider();
            console.log("handleDisconnect (v1): Web3Modal provider cache cleared.");
        } else { console.warn("Web3Modal instance missing or lacks clearCachedProvider."); }

        // --- Step 4: Clear Local Storage ---
        localStorage.removeItem('safeVoiceUser');
        console.log("handleDisconnect (v1): localStorage cleared.");

        // --- Step 5: UI Feedback and Updates ---
        if (showNotification) { this.showNotification("Wallet disconnected.", "info"); }
        this.dispatchUserUpdate(); // Update UI to disconnected state
        this.dispatchTokenUpdate(); // Reset token displays
        console.log("handleDisconnect (v1): Disconnection process complete.");
    }


    // --- Other Methods (No Changes Needed from V6.1 structure) ---

    // Loads user state from localStorage
    loadUserState() { console.log("loadUserState: Loading..."); try { const d=localStorage.getItem('safeVoiceUser'); if(d){this.currentUser=JSON.parse(d); if(typeof this.currentUser!=='object'||this.currentUser===null)throw new Error("Invalid user data."); this.walletConnected=!!this.currentUser.walletAddress; this.tokenBalance=Number(this.currentUser.tokenBalance)||0; console.log('loadUserState: Success:', this.currentUser);} else { console.log('loadUserState: No saved state.'); this.currentUser=null; this.walletConnected=false; this.tokenBalance=0; } } catch(e){ console.error('loadUserState: Error:',e); localStorage.removeItem('safeVoiceUser'); this.currentUser=null; this.walletConnected=false; this.tokenBalance=0; } }
    // Sets up button and global event listeners
    setupEventListeners() { console.log("setupEventListeners: Setting up..."); document.body.addEventListener('click',(e)=>{ const t=e.target.closest('.reaction-btn'); if(t){console.log("Reaction click detected.");this.handleReaction(t);}}); const ci=document.getElementById('connectWalletBtnIndex'); const ai=document.getElementById('anonymousModeBtnIndex'); const cp=document.getElementById('connectWalletBtnProfile'); if(ci){ci.addEventListener('click',()=>{console.log("Index Connect clicked.");this.connectWallet();}); console.log("Listener attached: #connectWalletBtnIndex.");} else if(document.getElementById('hero'))console.warn("Button #connectWalletBtnIndex missing!"); if(ai){ai.addEventListener('click',()=>{console.log("Index Anonymous clicked.");if(this.enterAnonymousMode())window.location.href='./feed.html';}); console.log("Listener attached: #anonymousModeBtnIndex.");} else if(document.getElementById('hero'))console.warn("Button #anonymousModeBtnIndex missing!"); if(cp){cp.addEventListener('click',()=>{console.log("Profile Connect clicked.");this.connectWallet();}); console.log("Listener attached: #connectWalletBtnProfile.");} else if(document.getElementById('profileUsername'))console.warn("Button #connectWalletBtnProfile missing!"); window.addEventListener('safeVoiceUserUpdate',this.updateProfileUI.bind(this)); console.log("Listener attached: user update -> profile UI."); window.addEventListener('safeVoiceTokenUpdate',this.updateProfileUI.bind(this)); console.log("Listener attached: token update -> profile UI."); try{if(typeof feather!=='undefined'){feather.replace(); console.log("Feather.replace() called after listeners setup.");} else console.error("Feather N/A after setupListeners.");} catch(e){console.error("Feather error after setup:",e);} this.initTooltips(); console.log("setupEventListeners: Complete."); }
    // Updates the profile page UI elements
    updateProfileUI() { const u=document.getElementById('profileUsername'); if(!u)return; console.log('updateProfileUI: Updating...'); const w=document.getElementById('profileWallet'); const t=document.getElementById('profileTokenBalance'); const c=document.getElementById('connectWalletBtnProfile'); const pC=document.getElementById('myPostsContainer'); const tP=document.getElementById('profileTotalPosts'); const rG=document.getElementById('profileReactionsGiven'); const pH=document.getElementById('postsPlaceholder'); if(!w||!t||!c||!pC||!tP||!rG||!pH){console.error("updateProfileUI: Missing elements!"); if(u)u.textContent="Profile Error"; return;} try{if(this.currentUser){t.textContent=this.tokenBalance?.toLocaleString()??'0'; if(this.currentUser.isAnonymous){u.textContent=this.currentUser.anonymousId||'Anonymous'; w.textContent='Anonymous Mode'; c.textContent='Connect Wallet'; c.style.display='inline-block'; pH.textContent='Connect wallet to see posts.'; pC.innerHTML=''; if(!pC.contains(pH))pC.appendChild(pH);} else if(this.currentUser.walletAddress){u.textContent='Wallet Connected'; const s=`${this.currentUser.walletAddress.substring(0,6)}...${this.currentUser.walletAddress.substring(this.currentUser.walletAddress.length-4)}`; w.textContent=s; c.style.display='none'; pH.innerHTML=`<i data-feather="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i><p>Loading posts...</p><p class="text-sm">(Supabase needed)</p>`; pC.innerHTML=''; if(!pC.contains(pH))pC.appendChild(pH);} else{throw new Error("Invalid currentUser state.");}} else{u.textContent='Anonymous'; w.textContent='Wallet not connected'; t.textContent='0'; c.textContent='Connect Wallet'; c.style.display='inline-block'; pH.textContent='Connect or enter anonymously.'; pC.innerHTML=''; if(!pC.contains(pH))pC.appendChild(pH);} tP.textContent='0'; rG.textContent='0'; if(typeof feather!=='undefined')feather.replace(); console.log("updateProfileUI: Success.");} catch(e){console.error("updateProfileUI: Error:",e); u.textContent="Profile Error"; if(w)w.textContent="Load error"; if(t)t.textContent="-"; if(pC)pC.innerHTML='<p class="text-red-500">Error.</p>';} }
    // Handles reaction button clicks
    async handleReaction(button) { console.log("handleReaction..."); const p=button.dataset.postId; const r=button.dataset.reaction; if(!p||!r)return; button.classList.add('opacity-50','pointer-events-none'); try{await this.simulateAPICall(100,300); const c=button.querySelector('.reaction-count'); if(c){const n=(parseInt(c.textContent,10)||0)+1; c.textContent=n; button.style.transition='transform 0.1s ease'; button.style.transform='scale(1.15)'; setTimeout(()=>button.style.transform='scale(1)',150);} if(this.currentUser)this.awardTokens(2,'reaction_given');} catch(e){console.error('handleReaction Error:',e); this.showNotification('Reaction failed.','error');} finally{setTimeout(()=>button.classList.remove('opacity-50','pointer-events-none'),400);} }
    // Enters anonymous mode
    enterAnonymousMode() { console.log("enterAnonymousMode..."); if(this.walletConnected){console.log("Blocked: Wallet connected."); this.showNotification("Already connected.","info"); return true;} const B=50; if(!this.currentUser||!this.currentUser.isAnonymous){console.log("Setting anonymous state..."); this.currentUser={anonymousId:this.generateAnonymousId(),isAnonymous:true,tokenBalance:B}; localStorage.setItem('safeVoiceUser',JSON.stringify(this.currentUser)); this.tokenBalance=this.currentUser.tokenBalance; this.showNotification(`Anonymous mode. +${B} tokens!`,'info'); this.dispatchTokenUpdate(); this.dispatchUserUpdate();} else console.log("Already anonymous."); return true; }
    // Dispatches token update event
    dispatchTokenUpdate() { console.log("dispatchTokenUpdate:", this.tokenBalance); window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate',{detail:{newBalance:this.tokenBalance}})); }
    // Dispatches user update event
    dispatchUserUpdate() { console.log("dispatchUserUpdate:", this.currentUser); window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate',{detail:{currentUser:this.currentUser}})); }
    // Generates anonymous ID
    generateAnonymousId() { const a=['Brave','Calm','Wise','Kind','Strong','Gentle','Bright','True','Quiet','Clear','Silent','Swift','Eager','Bold','Keen','Loyal']; const n=['Owl','Phoenix','Lion','Dolphin','Eagle','Wolf','Tiger','Bear','River','Star','Flame','Stone','Hawk','Fox','Sky','Moon']; return `${a[Math.floor(Math.random()*a.length)]}${n[Math.floor(Math.random()*n.length)]}${Math.floor(Math.random()*900)+100}`; }
    // Awards simulated tokens
    awardTokens(amount, reason) { if(!this.currentUser){console.warn("awardTokens: No user."); return;} try{const c=Number(this.currentUser.tokenBalance)||0; const t=Number(amount)||0; if(t<=0)return; this.currentUser.tokenBalance=c+t; this.tokenBalance=this.currentUser.tokenBalance; localStorage.setItem('safeVoiceUser',JSON.stringify(this.currentUser)); this.dispatchTokenUpdate(); console.log(`awardTokens: ${t} for ${reason}. New: ${this.tokenBalance}`); this.showNotification(`+${t} tokens: ${reason.replace(/_/g,' ')}!`,'success');} catch(e){console.error("awardTokens Error:",e); this.showNotification("Token balance error.","error");} }
    // Simulates network delay
    simulateAPICall(minDuration = 100, maxDuration = 400) { const d=Math.random()*(maxDuration-minDuration)+minDuration; return new Promise(r=>setTimeout(r,d)); }
    // Shows toast notifications
    showNotification(message, type = 'info', duration = 3500) { try{const id=`N-${Date.now()}-${Math.random().toString(36).substring(2,7)}`; const n=document.createElement('div'); n.id=id; let base='fixed top-20 right-4 p-4 rounded-lg text-white z-[5000] shadow-lg transition-all duration-300 ease-in-out opacity-0 max-w-sm transform translate-x-full'; let typeC=''; switch(type){case 'success':typeC='bg-green-500';break; case 'error':typeC='bg-red-500';break; case 'warning':typeC='bg-yellow-500 text-black';break; case 'info': default:typeC='bg-blue-500';break;} n.className=`${base} ${typeC}`; n.textContent=message; document.body.appendChild(n); requestAnimationFrame(()=>{n.classList.remove('opacity-0','translate-x-full'); n.classList.add('opacity-100','translate-x-0'); const existing=Array.from(document.querySelectorAll('[id^=N-]:not(#'+id+')')).reverse(); existing.forEach((el,i)=>{const offset=(i+1)*(el.offsetHeight+10); el.style.transform=`translateY(${offset}px) translateX(0px)`; el.style.zIndex=`${5000-(i+1)}`;});}); setTimeout(()=>{const el=document.getElementById(id); if(el){el.classList.remove('opacity-100','translate-x-0'); el.classList.add('opacity-0','translate-x-full'); setTimeout(()=>{el.remove(); const remaining=Array.from(document.querySelectorAll('[id^=N-]')).reverse(); remaining.forEach((rel,ri)=>{const roffset=ri*(rel.offsetHeight+10); rel.style.transform=`translateY(${roffset}px) translateX(0px)`; rel.style.zIndex=`${5000-ri}`;});},300);}},duration);}catch(e){console.error("showNotification Error:",e);} }
    // Tooltip placeholders
    initTooltips() { /* Placeholder */ }
    showTooltip(event) { /* Placeholder */ }
    hideTooltip(event) { /* Placeholder */ }

} // End SafeVoiceApp Class


// --- Global App Initialization ---
// Create the single instance only if it doesn't exist
if (!window.safeVoiceApp) {
    window.safeVoiceApp = new SafeVoiceApp();
    console.log("Global: SafeVoiceApp instance created and initialization scheduled.");
} else {
    console.warn("Global: SafeVoiceApp instance already exists. Ensure script is not loaded multiple times.");
}
// --- END ---


// --- Utility functions (SafeVoiceUtils - Unchanged) ---
// Define utility functions in a separate object for organization
const SafeVoiceUtils = {
    formatNumber: (n)=>{const N=Number(n); if(isNaN(N))return '0'; if(N>=1e6)return (N/1e6).toFixed(1).replace(/\.0$/,'')+'M'; if(N>=1e3)return (N/1e3).toFixed(1).replace(/\.0$/,'')+'K'; return N.toLocaleString();},
    formatDate: (d)=>{try{const D=new Date(d); if(isNaN(D.getTime()))return 'Invalid date'; const n=new Date(); const s=Math.round((n.getTime()-D.getTime())/1e3); const m=Math.round(s/60); const h=Math.round(m/60); const ds=Math.round(h/24); if(s<5)return 'Just now'; if(m<1)return `${s}s ago`; if(h<1)return `${m}m ago`; if(ds<1)return `${h}h ago`; if(ds<7)return `${ds}d ago`; return D.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}catch(e){console.error("Utils: Date format error:",d,e); return 'Date error';}},
    debounce: (f,w)=>{let t; return function(...a){const c=this,l=()=>{t=null; f.apply(c,a);}; clearTimeout(t); t=setTimeout(l,w);};},
    simulatePGPEncryption: async (c)=>{return new Promise(r=>{setTimeout(()=>{try{const s=String(c||''); const e=`🔒 PGP_ENCRYPTED_${btoa(s).substring(0,20)}...[SIM]`; r(e);}catch(e){console.error("Utils: PGP sim error:",e); r(`🔒 PGP_ERROR...`);}},300);});},
    calculateTokenReward: (a, m={})=>{const r={post_created:10,reaction_given:2,reaction_received:2,comment_posted:5,crisis_support:50,content_moderated:15,first_post:25,first_reaction:10,wallet_connected:100,anonymous_entry:50}; return r[a]||0;}
};
window.SafeVoiceUtils = SafeVoiceUtils;
console.log("Global: SafeVoiceUtils attached to window.");
// --- END UTILS ---

