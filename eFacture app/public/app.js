/**
 * eFacture CHU Owendo - Logique de l'application (Intranet SQLite)
 * Gestion simplifiée : Créer, Modifier, Sauvegarder en Brouillon (Standby), Finaliser, Supprimer, Imprimer
 */

// État global de l'application
let authToken = localStorage.getItem('efacture_token') || null;
let currentUser = null;
try {
    const cachedUser = localStorage.getItem('efacture_user');
    if (cachedUser) currentUser = JSON.parse(cachedUser);
} catch (e) {}

let activeOrder = null;
let cachedOrders = [];
let currentHubFilter = 'ALL';
let currentActiveView = 'hub';

// ==========================================================================
// Mode Navigateur & Démonstration Cloud (Vercel & Hors-Serveur)
// ==========================================================================
const BROWSER_ACCOUNTS = [
    { username: 'direction', password: 'Dir2026Password!', role: 'admin', service: 'Direction Générale', nom_complet: 'Direction Générale' },
    { username: 'pharmacie', password: 'Pharma2026Password!', role: 'emetteur', service: 'Pharmacie Centrale', nom_complet: 'Chef Pharmacie Centrale' },
    { username: 'chirurgie', password: 'Chir2026Password!', role: 'emetteur', service: 'Bloc Opératoire & Chirurgie', nom_complet: 'Major Bloc Opératoire' },
    { username: 'laboratoire', password: 'Lab2026Password!', role: 'emetteur', service: 'Laboratoire d\'Analyses', nom_complet: 'Resp. Laboratoire' },
    { username: 'logistique', password: 'Logis2026Password!', role: 'emetteur', service: 'Logistique & Urgences', nom_complet: 'Resp. Logistique & Urgences' },
    { username: 'radiologie', password: 'Radio2026Password!', role: 'emetteur', service: 'Imagerie Médicale & Radiologie', nom_complet: 'Chef Radiologie' },
    { username: 'maternite', password: 'Mat2026Password!', role: 'emetteur', service: 'Maternité & Néonatalogie', nom_complet: 'Sage-Femme Major' },
    { username: 'maintenance', password: 'Maint2026Password!', role: 'emetteur', service: 'Biomédical & Maintenance', nom_complet: 'Ingénieur Biomédical' }
];

const INITIAL_DEMO_ORDERS = [
    {
        id: 1,
        numero_bc: 'BCI-2026-0001',
        date_emission: '2026-10-09',
        service: 'Bloc Opératoire & Chirurgie',
        demandeur: 'Dr. MINTSA (Chirurgien Chef)',
        responsable: 'Major Bloc Opératoire',
        lieu_livraison: 'Pharmacie Centrale - CHU Owendo',
        fournisseur: 'Centrale d\'Achat Pharmaceutique',
        motif: 'Réapprovisionnement d\'urgence pour les interventions du week-end.',
        total_ht: 385000,
        total_ttc: 385000,
        statut: 'FINALISE',
        created_at: '2026-10-09 10:00:00',
        items: [
            { designation: 'Boîtes de gants stériles T7.5 (lot de 50)', qty: 20, price: 12500 },
            { designation: 'Poches sérum physiologique 500ml', qty: 50, price: 1500 },
            { designation: 'Compresses stériles 10x10 (paquets de 100)', qty: 30, price: 2000 }
        ]
    },
    {
        id: 2,
        numero_bc: 'BCI-2026-0002',
        date_emission: '2026-10-10',
        service: 'Logistique & Urgences',
        demandeur: 'M. ONDO (Logistique)',
        responsable: 'Chef de Service Urgences',
        lieu_livraison: 'Magasin Général - CHU Owendo',
        fournisseur: 'Fournisseur Médical Gabonais',
        motif: 'Dotation hebdomadaire pour les salles de soins d\'urgences.',
        total_ht: 185000,
        total_ttc: 185000,
        statut: 'BROUILLON',
        created_at: '2026-10-10 08:30:00',
        items: [
            { designation: 'Kits de suture à usage unique', qty: 15, price: 7000 },
            { designation: 'Flacons Bétadine dermique 500ml', qty: 16, price: 5000 }
        ]
    }
];

function getBrowserOrders() {
    try {
        const stored = localStorage.getItem('efacture_browser_orders');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem('efacture_browser_orders', JSON.stringify(INITIAL_DEMO_ORDERS));
    return JSON.parse(JSON.stringify(INITIAL_DEMO_ORDERS));
}

function saveBrowserOrders(orders) {
    localStorage.setItem('efacture_browser_orders', JSON.stringify(orders));
}

// ==========================================================================
// 1. Initialisation & Cycle de Vie
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    updateHubDateHeader();
    if (currentUser) {
        updateUserUI();
    }
    initAuth();
});

function updateHubDateHeader() {
    const dateElem = document.getElementById("hub-greeting-date");
    if (!dateElem) return;
    try {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let formatted = new Date().toLocaleDateString('fr-FR', options);
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        dateElem.innerText = `${formatted} • Centre Hospitalier Universitaire d'Owendo`;
    } catch (e) {
        dateElem.innerText = `Centre Hospitalier Universitaire d'Owendo`;
    }
}

async function initAuth() {
    if (!authToken) {
        showLoginModal();
        return;
    }

    try {
        let authValidated = false;
        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                localStorage.setItem('efacture_user', JSON.stringify(currentUser));
                authValidated = true;
            } else if (response.status === 401 || response.status === 403) {
                throw new Error('Session expirée');
            }
        } catch (fetchErr) {
            if (fetchErr.message === 'Session expirée') throw fetchErr;
        }

        // Si Vercel ou serveur non joignable mais session en cache valide
        if (!authValidated && currentUser) {
            authValidated = true;
        }

        if (authValidated) {
            updateUserUI();
            hideLoginModal();
            await loadOrdersFromAPI();
            showOfficeView('hub');
        } else {
            throw new Error('Session non valide');
        }
    } catch (err) {
        console.warn('Session non valide, réinitialisation:', err);
        localStorage.removeItem('efacture_token');
        localStorage.removeItem('efacture_user');
        authToken = null;
        currentUser = null;
        showLoginModal();
    }
}

function updateUserUI() {
    const nameLabel = document.getElementById("user-display-name");
    const serviceLabel = document.getElementById("user-display-service");
    const roleTag = document.getElementById("user-display-role");
    const greetingText = document.getElementById("hub-greeting-text");

    if (currentUser) {
        if (nameLabel) nameLabel.innerText = currentUser.nom_complet || currentUser.username;
        if (serviceLabel) serviceLabel.innerText = currentUser.service || "CHU Owendo";

        if (greetingText) {
            const timeHour = new Date().getHours();
            const salutation = (timeHour >= 18 || timeHour < 5) ? "Bonsoir" : "Bonjour";
            greetingText.innerText = `${salutation}, ${currentUser.service || currentUser.nom_complet}`;
        }

        if (roleTag) {
            roleTag.className = currentUser.role === 'admin' ? "role-tag admin" : "role-tag emetteur";
            roleTag.innerText = currentUser.service || "SERVICE";
        }
    }
}

// ==========================================================================
// 2. Authentification (Plein Écran CHU)
// ==========================================================================
function showLoginModal() {
    document.documentElement.classList.add("show-login");
    const modal = document.getElementById("login-modal");
    if (modal) modal.classList.add("active");
}

function hideLoginModal() {
    document.documentElement.classList.remove("show-login");
    const modal = document.getElementById("login-modal");
    if (modal) modal.classList.remove("active");
}

async function handleLoginSubmit(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById("login-username");
    const passwordInput = document.getElementById("login-password");
    const errorDiv = document.getElementById("login-error-msg");

    const username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!username || !password) return;

    try {
        if (errorDiv) errorDiv.style.display = "none";

        let loginSuccess = false;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                authToken = data.token;
                currentUser = data.user;
                loginSuccess = true;
            } else if (response.status === 401) {
                const data = await response.json().catch(() => ({}));
                if (errorDiv) {
                    errorDiv.innerText = data.error || "Identifiant ou mot de passe incorrect";
                    errorDiv.style.display = "block";
                }
                return;
            }
        } catch (apiErr) {
            // Serveur backend non joignable (ex: Vercel) -> bascule vers le mode navigateur
        }

        if (!loginSuccess) {
            const found = BROWSER_ACCOUNTS.find(a => a.username.toLowerCase() === username && a.password === password);
            if (found) {
                authToken = 'browser_token_' + Date.now();
                currentUser = {
                    id: Math.floor(Math.random() * 1000) + 1,
                    username: found.username,
                    role: found.role,
                    service: found.service,
                    nom_complet: found.nom_complet
                };
                loginSuccess = true;
            } else {
                if (errorDiv) {
                    errorDiv.innerText = "Identifiant ou mot de passe incorrect";
                    errorDiv.style.display = "block";
                }
                return;
            }
        }

        localStorage.setItem('efacture_token', authToken);
        localStorage.setItem('efacture_user', JSON.stringify(currentUser));

        updateUserUI();
        hideLoginModal();
        showToast(`Connecté : ${currentUser.service || currentUser.nom_complet}`);

        await loadOrdersFromAPI();
        showOfficeView('hub');
    } catch (err) {
        if (errorDiv) {
            errorDiv.innerText = "Erreur de connexion.";
            errorDiv.style.display = "block";
        }
    }
}

function logoutUser() {
    localStorage.removeItem('efacture_token');
    localStorage.removeItem('efacture_user');
    authToken = null;
    currentUser = null;
    showLoginModal();
    showToast("Déconnexion effectuée");
}

// ==========================================================================
// 3. Chargement et Synchronisation SQLite & Navigateur
// ==========================================================================
async function loadOrdersFromAPI() {
    if (!authToken) return;

    try {
        let loaded = false;
        try {
            const response = await fetch('/api/orders', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                cachedOrders = data.orders || [];
                loaded = true;
            }
        } catch (err) {}

        if (!loaded) {
            cachedOrders = getBrowserOrders();
        }

        updateCounters();
        renderHubOrders();
        renderRegistry();

        // Mettre à jour l'en-tête de l'éditeur si ouvert
        if (activeOrder && activeOrder.id) {
            const updated = cachedOrders.find(o => o.id === activeOrder.id);
            if (updated) {
                activeOrder.statut = updated.statut;
                updateEditorHeader();
            }
        }
    } catch (err) {
        console.error('Erreur chargement orders:', err);
    }
}

function updateCounters() {
    const totalCount = cachedOrders.length;
    const draftsCount = cachedOrders.filter(o => o.statut === 'BROUILLON' || o.statut === 'EN_ATTENTE').length;
    const finalizedCount = cachedOrders.filter(o => o.statut === 'FINALISE' || o.statut === 'VALIDE_DG').length;

    // Badges Sidebar & Tabs
    const badgeTotal = document.getElementById("badge-total-orders");
    if (badgeTotal) badgeTotal.innerText = totalCount;

    const hubAll = document.getElementById("hub-badge-all");
    if (hubAll) hubAll.innerText = totalCount;

    const hubDrafts = document.getElementById("hub-badge-drafts");
    if (hubDrafts) hubDrafts.innerText = draftsCount;

    const hubFinalized = document.getElementById("hub-badge-finalized");
    if (hubFinalized) hubFinalized.innerText = finalizedCount;
}

// ==========================================================================
// 4. Navigation & Vues
// ==========================================================================
function showOfficeView(viewId) {
    currentActiveView = viewId;

    document.querySelectorAll(".office-view-panel").forEach(p => p.classList.remove("active"));
    const targetPanel = document.getElementById(`view-${viewId}`);
    if (targetPanel) targetPanel.classList.add("active");

    document.querySelectorAll(".sidebar-nav-btn").forEach(btn => btn.classList.remove("active"));
    const activeNavBtn = document.getElementById(`side-nav-${viewId}`);
    if (activeNavBtn) activeNavBtn.classList.add("active");

    const appLayout = document.getElementById("app-layout");
    const toggleBtn = document.getElementById("btn-toggle-sidebar");

    if (viewId === 'editor') {
        // La sidebar disparaît automatiquement dans l'éditeur de bon de commande
        if (appLayout) appLayout.classList.add("sidebar-hidden");
        if (toggleBtn) {
            toggleBtn.classList.remove("active");
            toggleBtn.title = "Afficher le menu latéral";
        }
        updateEditorHeader();
    } else {
        // La sidebar réapparaît pour le Hub d'accueil et le Registre
        if (appLayout) appLayout.classList.remove("sidebar-hidden");
        if (toggleBtn) {
            toggleBtn.classList.add("active");
            toggleBtn.title = "Masquer le menu latéral";
        }
        if (viewId === 'hub') {
            renderHubOrders(currentHubFilter);
        } else if (viewId === 'registry') {
            renderRegistry();
        }
    }
}

function toggleSidebarInEditor() {
    const appLayout = document.getElementById("app-layout");
    if (!appLayout) return;
    const isNowHidden = appLayout.classList.toggle("sidebar-hidden");
    const toggleBtn = document.getElementById("btn-toggle-sidebar");
    if (toggleBtn) {
        toggleBtn.classList.toggle("active", !isNowHidden);
        toggleBtn.title = isNowHidden ? "Afficher le menu latéral" : "Masquer le menu latéral";
    }
}

function switchTab(tabId) {
    showOfficeView(tabId);
}

function updateEditorHeader() {
    if (!activeOrder) return;
    const titleElem = document.getElementById("editor-current-bci-title");
    const pillElem = document.getElementById("editor-current-status-pill");

    if (titleElem) {
        titleElem.innerText = `${activeOrder.numero_bc || 'Nouveau Bon'} • ${activeOrder.service || (currentUser ? currentUser.service : '')}`;
    }

    if (pillElem) {
        const isFinalized = activeOrder.statut === 'FINALISE' || activeOrder.statut === 'VALIDE_DG';
        pillElem.className = isFinalized ? "status-pill approved" : "status-pill draft";
        pillElem.innerHTML = isFinalized 
            ? '<span class="status-dot"></span>Finalisé' 
            : '<span class="status-dot"></span>Brouillon';
    }
}

// ==========================================================================
// 5. Rendu du Hub d'Accueil (La liste centrale)
// ==========================================================================
function filterHubStatus(status) {
    currentHubFilter = status;

    const tabAll = document.getElementById("hub-tab-all");
    const tabDraft = document.getElementById("hub-tab-draft");
    const tabFinalized = document.getElementById("hub-tab-finalized");

    if (tabAll) tabAll.classList.toggle("active", status === 'ALL');
    if (tabDraft) tabDraft.classList.toggle("active", status === 'BROUILLON');
    if (tabFinalized) tabFinalized.classList.toggle("active", status === 'FINALISE');

    if (currentActiveView !== 'hub') {
        showOfficeView('hub');
    }

    renderHubOrders(status);
}

function handleHubSearch() {
    const q = (document.getElementById("hub-search-input")?.value || "").toLowerCase().trim();
    renderHubOrders(currentHubFilter, q);
}

function renderHubOrders(filterStatus = currentHubFilter, searchQ = "") {
    const tbody = document.getElementById("hub-orders-tbody");
    if (!tbody) return;

    let filtered = [...cachedOrders];

    if (filterStatus === 'BROUILLON') {
        filtered = filtered.filter(o => o.statut === 'BROUILLON' || o.statut === 'EN_ATTENTE');
    } else if (filterStatus === 'FINALISE') {
        filtered = filtered.filter(o => o.statut === 'FINALISE' || o.statut === 'VALIDE_DG');
    }

    if (searchQ) {
        filtered = filtered.filter(o => {
            const num = (o.numero_bc || "").toLowerCase();
            const dem = (o.demandeur || "").toLowerCase();
            const serv = (o.service || "").toLowerCase();
            const motif = (o.motif || "").toLowerCase();
            const four = (o.fournisseur || "").toLowerCase();
            return num.includes(searchQ) || dem.includes(searchQ) || serv.includes(searchQ) || motif.includes(searchQ) || four.includes(searchQ);
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
                    <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">Aucun bon dans cette section</div>
                    <div style="font-size: 12.5px;">Cliquez sur <strong>« Créer un Nouveau Bon »</strong> ci-dessus pour initialiser une commande.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(ord => {
        const formattedDate = (ord.date_emission || ord.date || "").split("-").reverse().join("/");
        const grandTotal = ord.total_ttc || 0;
        const isFinalized = ord.statut === 'FINALISE' || ord.statut === 'VALIDE_DG';
        const motifText = ord.motif ? escapeHtml(ord.motif) : "Articles & consommables";

        const statusBadge = isFinalized 
            ? `<span class="status-pill approved"><span class="status-dot"></span>Finalisé</span>` 
            : `<span class="status-pill draft"><span class="status-dot"></span>Brouillon</span>`;

        return `
            <tr onclick="openOrderInEditor(${ord.id})">
                <td>
                    <div class="hub-doc-item-title">
                        <div class="hub-doc-icon ${isFinalized ? 'approved' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                        </div>
                        <div class="hub-doc-info">
                            <span class="hub-doc-num">${escapeHtml(ord.numero_bc || ('BCI-' + ord.id))}</span>
                            <span class="hub-doc-motif">${motifText}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--primary-chu);">${escapeHtml(ord.service || '-')}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(ord.demandeur || '-')}</div>
                </td>
                <td style="color: var(--text-muted); font-size: 12.5px;">${formattedDate}</td>
                <td style="text-align: right; font-weight: 700; color: var(--text-main); font-size: 14px;">
                    ${formatNumber(grandTotal)} <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">FCFA</span>
                </td>
                <td style="text-align: center;">
                    ${statusBadge}
                </td>
                <td style="text-align: right;" onclick="event.stopPropagation()">
                    <div style="display: inline-flex; gap: 6px;">
                        <button class="btn btn-sm btn-outline" title="Éditer et continuer la saisie" onclick="openOrderInEditor(${ord.id})">
                            <svg viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Éditer</span>
                        </button>
                        <button class="btn btn-sm btn-outline" title="Imprimer le bon A4" onclick="openOrderAndPrint(${ord.id})">
                            <svg viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                            <span>Imprimer</span>
                        </button>
                        <button class="btn btn-sm btn-danger-outline" title="Supprimer définitivement ce bon" onclick="deleteOrder(${ord.id})">
                            <svg viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>Supprimer</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function openOrderAndPrint(orderId) {
    await openOrderInEditor(orderId);
    triggerPrint();
}

// ==========================================================================
// 6. Chargement d'une commande dans le formulaire Split-Screen
// ==========================================================================
async function loadOrderIntoForm(orderData) {
    let fullOrder = orderData;
    if (orderData.id && (!orderData.items || orderData.items.length === 0)) {
        try {
            const res = await fetch(`/api/orders/${orderData.id}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const detail = await res.json();
                fullOrder = {
                    ...detail.order,
                    items: detail.items.map(it => ({
                        designation: it.designation,
                        qty: it.quantite,
                        price: it.prix_unitaire
                    }))
                };
            }
        } catch (e) {
            console.error('Erreur chargement détails:', e);
        }
    }

    activeOrder = JSON.parse(JSON.stringify(fullOrder));
    if (!activeOrder.items || activeOrder.items.length === 0) {
        activeOrder.items = [{ designation: "Fournitures de service", qty: 1, price: 0 }];
    }

    document.getElementById("inp-num").value = activeOrder.numero_bc || activeOrder.id || "";
    document.getElementById("inp-date").value = activeOrder.date_emission || activeOrder.date || new Date().toISOString().split("T")[0];
    document.getElementById("inp-requester").value = activeOrder.demandeur || activeOrder.requester || "";
    document.getElementById("inp-service").value = activeOrder.service || (currentUser ? currentUser.service : "");
    document.getElementById("inp-manager").value = activeOrder.responsable || activeOrder.manager || "";
    document.getElementById("inp-delivery").value = activeOrder.lieu_livraison || activeOrder.delivery || "Entrepôt principal";
    document.getElementById("inp-supplier").value = activeOrder.fournisseur || activeOrder.supplier || "";
    document.getElementById("inp-motif").value = activeOrder.motif || "";

    // Signatures
    const name1 = document.getElementById("inp-val-name1");
    const date1 = document.getElementById("inp-val-date1");
    const name2 = document.getElementById("inp-val-name2");
    const date2 = document.getElementById("inp-val-date2");
    const name3 = document.getElementById("inp-val-name3");
    const date3 = document.getElementById("inp-val-date3");
    const name4 = document.getElementById("inp-val-name4");
    const date4 = document.getElementById("inp-val-date4");

    if (name1) name1.value = activeOrder.demandeur || "";
    if (date1) date1.value = activeOrder.date_emission || "";
    if (name2) name2.value = activeOrder.responsable || "";
    if (date2) date2.value = "";
    if (name3) name3.value = "";
    if (date3) date3.value = "";
    if (name4) name4.value = activeOrder.valide_par_nom || "";
    if (date4) date4.value = activeOrder.valide_date || "";

    renderFormArticlesTable();
    syncToDocument();
    updateEditorHeader();
}

async function openOrderInEditor(orderId) {
    const target = cachedOrders.find(o => o.id === orderId);
    if (!target) return;

    await loadOrderIntoForm(target);
    showOfficeView("editor");
}

// ==========================================================================
// 7. Gestion dynamique des articles dans le formulaire de gauche
// ==========================================================================
function renderFormArticlesTable() {
    const tbody = document.getElementById("edit-articles-tbody");
    if (!tbody || !activeOrder) return;

    tbody.innerHTML = activeOrder.items.map((item, idx) => {
        const lineTotal = (parseInt(item.qty, 10) || 0) * (parseFloat(item.price) || 0);
        return `
            <tr>
                <td>
                    <input type="text" class="input-cell" placeholder="Désignation de l'article" value="${escapeHtml(item.designation)}" oninput="updateArticleField(${idx}, 'designation', this.value)">
                </td>
                <td style="width: 70px;">
                    <input type="number" class="input-cell text-center" min="1" placeholder="Qté" value="${item.qty || 1}" oninput="updateArticleField(${idx}, 'qty', this.value)">
                </td>
                <td style="width: 100px;">
                    <input type="number" class="input-cell text-right" min="0" placeholder="P.U" value="${item.price || 0}" oninput="updateArticleField(${idx}, 'price', this.value)">
                </td>
                <td class="text-right row-total-cell" style="width: 90px; font-weight: 700;">
                    ${formatNumber(lineTotal)}
                </td>
                <td class="text-center" style="width: 28px;">
                    <button type="button" class="btn-remove-row" style="background: transparent; border: none; color: #dc2626; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 2px;" title="Supprimer la ligne" onclick="removeArticleRow(${idx})">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    updateFormTotal();
}

function updateArticleField(index, field, value) {
    if (!activeOrder || !activeOrder.items[index]) return;

    if (field === "qty") {
        activeOrder.items[index].qty = parseInt(value, 10) || 0;
    } else if (field === "price") {
        activeOrder.items[index].price = parseFloat(value) || 0;
    } else {
        activeOrder.items[index].designation = value;
    }

    const rows = document.querySelectorAll("#edit-articles-tbody tr");
    if (rows[index]) {
        const lineTotal = (parseInt(activeOrder.items[index].qty, 10) || 0) * (parseFloat(activeOrder.items[index].price) || 0);
        const totalCell = rows[index].querySelector(".row-total-cell");
        if (totalCell) totalCell.innerText = formatNumber(lineTotal);
    }

    updateFormTotal();
    syncToDocument();
}

function addNewArticleRow() {
    if (!activeOrder) return;
    activeOrder.items.push({
        designation: "",
        qty: 1,
        price: 0
    });
    renderFormArticlesTable();
    syncToDocument();

    setTimeout(() => {
        const inputs = document.querySelectorAll("#edit-articles-tbody input[type='text']");
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
}

function removeArticleRow(index) {
    if (!activeOrder || activeOrder.items.length <= 1) {
        showToast("La commande doit comporter au moins une ligne");
        return;
    }
    activeOrder.items.splice(index, 1);
    renderFormArticlesTable();
    syncToDocument();
}

function updateFormTotal() {
    if (!activeOrder) return;
    const total = activeOrder.items.reduce((sum, item) => {
        return sum + ((parseInt(item.qty, 10) || 0) * (parseFloat(item.price) || 0));
    }, 0);
    const display = document.getElementById("form-total-display");
    if (display) display.innerText = formatNumber(total);
}

// ==========================================================================
// 8. Synchronisation instantanée avec le document A4 officiel
// ==========================================================================
function syncToDocument() {
    if (!activeOrder) return;

    const num = document.getElementById("inp-num").value || "BCI-2026-0001";
    const dateVal = document.getElementById("inp-date").value || new Date().toISOString().split("T")[0];
    const requester = document.getElementById("inp-requester").value || "-";
    const service = document.getElementById("inp-service").value || "-";
    const manager = document.getElementById("inp-manager").value || "-";
    const delivery = document.getElementById("inp-delivery").value || "-";
    const supplier = document.getElementById("inp-supplier").value || "-";
    const motif = document.getElementById("inp-motif").value || "Aucun motif précisé.";

    activeOrder.numero_bc = num;
    activeOrder.date_emission = dateVal;
    activeOrder.demandeur = requester;
    activeOrder.service = service;
    activeOrder.responsable = manager;
    activeOrder.lieu_livraison = delivery;
    activeOrder.fournisseur = supplier;
    activeOrder.motif = motif;

    const formattedDate = dateVal.split("-").reverse().join("/");

    document.getElementById("pv-num").innerText = num;
    document.getElementById("pv-date").innerText = formattedDate;
    document.getElementById("pv-requester").innerText = requester;
    document.getElementById("pv-service").innerText = service;
    document.getElementById("pv-manager").innerText = manager;
    document.getElementById("pv-delivery").innerText = delivery;
    document.getElementById("pv-supplier").innerText = supplier;
    document.getElementById("pv-motif").innerText = motif;

    // Cases de validation
    for (let i = 1; i <= 4; i++) {
        const valName = document.getElementById(`inp-val-name${i}`)?.value || "";
        const valDate = document.getElementById(`inp-val-date${i}`)?.value || "";

        const pvNameSpan = document.getElementById(`pv-val-name${i}`);
        const pvDateSpan = document.getElementById(`pv-val-date${i}`);

        if (pvNameSpan) {
            pvNameSpan.innerText = valName.trim() ? valName : "_________________";
        }
        if (pvDateSpan) {
            pvDateSpan.innerText = valDate ? valDate.split("-").reverse().join("/") : "___ / ___ / ______";
        }
    }

    // Rendu des articles dans le document A4 officiel
    const pvTbody = document.getElementById("pv-articles-tbody");
    if (!pvTbody) return;

    let grandTotal = 0;
    const rowsHtml = activeOrder.items.map((item, idx) => {
        const lineTotal = (parseInt(item.qty, 10) || 0) * (parseFloat(item.price) || 0);
        grandTotal += lineTotal;
        return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${escapeHtml(item.designation) || '<span style="color:#999;">Article non renseigné</span>'}</td>
                <td style="text-align: center;">${item.qty || 0}</td>
                <td style="text-align: right;">${formatNumber(item.price || 0)}</td>
                <td style="text-align: right; font-weight: bold;">${formatNumber(lineTotal)}</td>
            </tr>
        `;
    }).join("");

    const emptyRowsHtml = `
        <tr class="empty-row" style="height: 24px;"><td></td><td></td><td></td><td></td><td></td></tr>
        <tr class="empty-row" style="height: 24px;"><td></td><td></td><td></td><td></td><td></td></tr>
    `;

    const totalRowHtml = `
        <tr style="background-color: #f2f2f2; font-weight: 800;">
            <td colspan="3" style="border: none;"></td>
            <td style="text-align: right; border: 1px solid #000; padding: 6px 8px;">TOTAL FCFA</td>
            <td style="text-align: right; border: 1px solid #000; padding: 6px 8px;">${formatNumber(grandTotal)}</td>
        </tr>
    `;

    pvTbody.innerHTML = rowsHtml + emptyRowsHtml + totalRowHtml;
}

// ==========================================================================
// 9. Sauvegarde Brouillon (Standby) vs Finaliser
// ==========================================================================

// Sauvegarde l'état actuel tel quel en STANDBY (Brouillon) sans forcer la saisie
async function saveActiveOrderAsDraft() {
    return performSave('BROUILLON');
}

// Valide et finalise le bon de commande
async function saveActiveOrderFinalized() {
    const service = document.getElementById("inp-service").value.trim();
    const demandeur = document.getElementById("inp-requester").value.trim();

    if (!service || service === "-") {
        alert("Veuillez renseigner le service demandeur avant de finaliser.");
        document.getElementById("inp-service").focus();
        return;
    }

    if (!demandeur || demandeur === "-") {
        alert("Veuillez renseigner le nom du demandeur avant de finaliser.");
        document.getElementById("inp-requester").focus();
        return;
    }

    return performSave('FINALISE');
}

function saveActiveOrder() {
    return saveActiveOrderFinalized();
}

async function performSave(targetStatut) {
    if (!activeOrder) return;
    if (!authToken) {
        showLoginModal();
        return;
    }

    const service = document.getElementById("inp-service").value.trim();
    const demandeur = document.getElementById("inp-requester").value.trim();

    const grandTotal = activeOrder.items.reduce((sum, item) => {
        return sum + ((parseInt(item.qty, 10) || 0) * (parseFloat(item.price) || 0));
    }, 0);

    const payload = {
        numero_bc: document.getElementById("inp-num").value.trim(),
        date_emission: document.getElementById("inp-date").value,
        service: service || (currentUser ? currentUser.service : "Service"),
        demandeur: demandeur || (currentUser ? currentUser.nom_complet : "En cours"),
        responsable: document.getElementById("inp-manager").value.trim(),
        lieu_livraison: document.getElementById("inp-delivery").value.trim(),
        fournisseur: document.getElementById("inp-supplier").value.trim(),
        motif: document.getElementById("inp-motif").value.trim(),
        total_ht: grandTotal,
        total_ttc: grandTotal,
        statut: targetStatut,
        items: activeOrder.items.map(it => ({
            designation: it.designation,
            quantite: it.qty,
            prix_unitaire: it.price,
            total: (it.qty || 1) * (it.price || 0)
        }))
    };

    try {
        let savedSuccessfully = false;
        try {
            let res;
            if (activeOrder.id && !String(activeOrder.id).startsWith("BCI-")) {
                res = await fetch(`/api/orders/${activeOrder.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (res && res.ok) {
                const data = await res.json();
                if (data.orderId) activeOrder.id = data.orderId;
                savedSuccessfully = true;
            }
        } catch (apiErr) {}

        // Fallback Navigateur (Vercel ou hors-serveur)
        if (!savedSuccessfully) {
            const bOrders = getBrowserOrders();
            const existingIdx = bOrders.findIndex(o => o.numero_bc === payload.numero_bc || o.id === activeOrder.id);

            const record = {
                ...payload,
                id: activeOrder.id && !String(activeOrder.id).startsWith("BCI-") ? activeOrder.id : Date.now(),
                created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
                items: activeOrder.items.map(it => ({
                    designation: it.designation,
                    qty: it.qty,
                    price: it.price
                }))
            };

            if (existingIdx >= 0) {
                bOrders[existingIdx] = record;
            } else {
                bOrders.unshift(record);
            }
            saveBrowserOrders(bOrders);
            activeOrder.id = record.id;
        }

        activeOrder.statut = targetStatut;

        const msg = targetStatut === 'BROUILLON' 
            ? "Bon sauvegardé en Brouillon (Standby)" 
            : "Bon de commande finalisé avec succès";

        showToast(msg);
        await loadOrdersFromAPI();
        updateEditorHeader();
    } catch (err) {
        alert("Erreur enregistrement : " + err.message);
    }
}

// ==========================================================================
// 10. Suppression Directe (Partout : Hub, Éditeur, Registre)
// ==========================================================================
async function deleteOrder(orderId) {
    const target = cachedOrders.find(o => o.id === orderId);
    const num = target ? (target.numero_bc || target.id) : orderId;

    if (!confirm(`Supprimer définitivement le bon de commande ${num} de la base de données ?`)) {
        return;
    }

    try {
        let deletedOnApi = false;
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res && res.ok) deletedOnApi = true;
        } catch (apiErr) {}

        if (!deletedOnApi) {
            const bOrders = getBrowserOrders().filter(o => o.id !== orderId && o.numero_bc !== orderId);
            saveBrowserOrders(bOrders);
        }

        showToast(`Bon ${num} supprimé`);
        await loadOrdersFromAPI();

        // Si c'était le bon actuellement affiché dans l'éditeur, revenir au hub
        if (activeOrder && (activeOrder.id === orderId || activeOrder.numero_bc === orderId)) {
            activeOrder = null;
            showOfficeView('hub');
        }
    } catch (err) {
        alert("Erreur suppression : " + err.message);
    }
}

async function deleteActiveOrder() {
    if (!activeOrder || !activeOrder.id || String(activeOrder.id).startsWith("BCI-")) {
        // Bon pas encore sauvegardé en base
        if (confirm("Annuler et vider la saisie en cours ?")) {
            await createNewOrderPrompt();
            showOfficeView('hub');
        }
        return;
    }

    await deleteOrder(activeOrder.id);
}

async function createNewOrderPrompt() {
    if (!authToken) {
        showLoginModal();
        return;
    }

    const today = new Date().toISOString().split("T")[0];
    let nextNum = `BCI-2026-0001`;

    try {
        const res = await fetch('/api/orders/next-number', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.nextNumber) nextNum = data.nextNumber;
        }
    } catch (e) {
        console.warn('Utilisation numéro local');
    }

    const newBlankOrder = {
        numero_bc: nextNum,
        date_emission: today,
        demandeur: currentUser ? currentUser.nom_complet : "",
        service: currentUser ? currentUser.service : "",
        responsable: "",
        lieu_livraison: "Entrepôt principal",
        fournisseur: "",
        motif: "",
        statut: "BROUILLON",
        items: [
            { designation: "", qty: 1, price: 0 }
        ]
    };

    await loadOrderIntoForm(newBlankOrder);
    showOfficeView("editor");
    showToast(`Nouveau bon ${nextNum} prêt`);
}

async function generateAutoNumber() {
    try {
        const res = await fetch('/api/orders/next-number', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.nextNumber) {
                document.getElementById("inp-num").value = data.nextNumber;
                syncToDocument();
                showToast(`Nouveau numéro : ${data.nextNumber}`);
            }
        }
    } catch (e) {
        console.warn(e);
    }
}

async function duplicateOrder(orderId) {
    const target = cachedOrders.find(o => o.id === orderId);
    if (!target) return;

    try {
        const resDetail = await fetch(`/api/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!resDetail.ok) throw new Error('Impossible de charger le bon source');
        const detail = await resDetail.json();

        const numRes = await fetch('/api/orders/next-number', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const numData = await numRes.json();

        const cloned = {
            ...detail.order,
            id: null,
            numero_bc: numData.nextNumber,
            date_emission: new Date().toISOString().split("T")[0],
            statut: 'BROUILLON',
            valide_par_nom: null,
            valide_date: null,
            items: detail.items.map(it => ({
                designation: it.designation,
                qty: it.quantite,
                price: it.prix_unitaire
            }))
        };

        await loadOrderIntoForm(cloned);
        showOfficeView("editor");
        showToast(`Bon dupliqué avec le N° ${cloned.numero_bc}`);
    } catch (e) {
        alert("Erreur duplication : " + e.message);
    }
}

// ==========================================================================
// 11. Registre Exhaustif
// ==========================================================================
function renderRegistry() {
    const tbody = document.getElementById("registry-tbody");
    if (!tbody) return;

    if (cachedOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Aucun bon enregistré pour le moment.</td></tr>`;
        return;
    }

    tbody.innerHTML = cachedOrders.map(ord => {
        const formattedDate = (ord.date_emission || ord.date || "").split("-").reverse().join("/");
        const grandTotal = ord.total_ttc || 0;
        const isFinalized = ord.statut === 'FINALISE' || ord.statut === 'VALIDE_DG';
        const statusBadge = isFinalized 
            ? `<span class="status-pill approved"><span class="status-dot"></span>Finalisé</span>` 
            : `<span class="status-pill draft"><span class="status-dot"></span>Brouillon</span>`;

        return `
            <tr>
                <td style="font-weight: 700; color: var(--primary-blue);">${ord.numero_bc || ('BCI-' + ord.id)}</td>
                <td>${formattedDate}</td>
                <td><strong>${escapeHtml(ord.service || '-')}</strong></td>
                <td>${escapeHtml(ord.demandeur || '-')}</td>
                <td style="text-align: center;">
                    <span style="font-weight: 600;">${ord.total_articles || 1}</span>
                </td>
                <td style="text-align: right; font-weight: 700;">
                    ${formatNumber(grandTotal)} FCFA
                </td>
                <td style="text-align: center;">
                    ${statusBadge}
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn btn-sm btn-outline" title="Ouvrir dans l'éditeur" onclick="openOrderInEditor(${ord.id})">
                            <svg viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Éditer</span>
                        </button>
                        <button class="btn btn-sm btn-outline" title="Dupliquer" onclick="duplicateOrder(${ord.id})">
                            <svg viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Cloner</span>
                        </button>
                        <button class="btn btn-sm btn-danger-outline" title="Supprimer définitivement" onclick="deleteOrder(${ord.id})">
                            <svg viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>Supprimer</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function filterRegistry() {
    const q = (document.getElementById("registry-search")?.value || "").toLowerCase().trim();
    const rows = document.querySelectorAll("#registry-tbody tr");

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? "" : "none";
    });
}

// ==========================================================================
// 12. Sauvegarde Clé USB & Impression A4
// ==========================================================================
function downloadDatabaseBackup() {
    if (!authToken) {
        showLoginModal();
        return;
    }

    if (window.location.port === '3000') {
        const downloadUrl = `/api/system/backup?token=${encodeURIComponent(authToken)}`;
        window.location.href = downloadUrl;
        showToast("Téléchargement de la sauvegarde SQLite en cours...");
        return;
    }

    // Sur Vercel ou en mode navigateur : téléchargement d'un export JSON complet
    const orders = getBrowserOrders();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        source: "CHU Owendo - Bons de Commande Internes",
        export_date: new Date().toISOString(),
        total_bons: orders.length,
        commandes: orders
    }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `BCI_CHU_Owendo_Sauvegarde_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast("Sauvegarde exportée avec succès");
}

function triggerPrint() {
    syncToDocument();
    showOfficeView("editor");
    setTimeout(() => {
        window.print();
    }, 150);
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function formatNumber(num) {
    if (isNaN(num)) return "0";
    return Math.round(num).toLocaleString("fr-FR");
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
