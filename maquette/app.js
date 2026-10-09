/**
 * eFacture Hôpital - Logique de l'application Maquette
 * Mode : Split-Screen (Saisie en direct à gauche / Aperçu A4 à droite) + Registre CRUD
 * Stockage : 100% Hors-ligne avec persistance localStorage
 */

// Données de démonstration initiales (1 exemplaire photo + 1 exemplaire hôpital labo)
const DEMO_ORDERS = [
    {
        id: "BCI-2026-0147",
        date: "2026-10-09",
        requester: "Marie Koumba",
        service: "Logistique",
        manager: "Paul M.",
        delivery: "Entrepôt principal",
        supplier: "Papeterie Centrale",
        motif: "Réapprovisionnement trimestriel des fournitures de l'entrepôt (stock actuel sous le seuil minimal).",
        items: [
            { designation: "Ramettes papier A4 80 g", qty: 20, price: 3500 },
            { designation: "Cartons d'archivage", qty: 30, price: 1800 },
            { designation: "Rouleaux d'étiquettes", qty: 10, price: 4200 },
            { designation: "Gants de manutention (paires)", qty: 15, price: 2500 },
            { designation: "Cutters de sécurité", qty: 8, price: 1500 }
        ],
        signers: {
            name1: "Marie Koumba", date1: "2026-10-09",
            name2: "Paul M.", date2: "",
            name3: "", date3: "",
            name4: "", date4: ""
        }
    },
    {
        id: "BCI-2026-0148",
        date: "2026-10-09",
        requester: "Dr. A. Kouame",
        service: "Laboratoire d'analyses médicales",
        manager: "Directeur Médical",
        delivery: "Laboratoire central - RDC",
        supplier: "Fournisseur Médical Bio-Santé",
        motif: "Rupture de stock critique sur les tubes sous vide de prélèvements sanguins (consommation ambulatoire d'urgence).",
        items: [
            { designation: "Tubes sous vide EDTA K2 (Bouchon Violet) 4ml", qty: 300, price: 120 },
            { designation: "Tubes sous vide Héparine de Lithium (Bouchon Vert) 5ml", qty: 300, price: 130 },
            { designation: "Aiguilles de prélèvement multiples 21G", qty: 600, price: 75 },
            { designation: "Boîtes de gants d'examen latex non poudrés (M)", qty: 20, price: 4500 }
        ],
        signers: {
            name1: "Dr. A. Kouame", date1: "2026-10-09",
            name2: "Chef de Département", date2: "",
            name3: "", date3: "",
            name4: "", date4: ""
        }
    }
];

// État en mémoire
let activeOrder = null;

// Initialisation au chargement
document.addEventListener("DOMContentLoaded", () => {
    initStorage();
    const orders = getOrders();
    // Charger le premier bon par défaut
    loadOrderIntoForm(orders[0] || DEMO_ORDERS[0]);
    updateBadgeCounter();
    renderRegistry();
});

// ==========================================================================
// Gestion du Stockage Local (localStorage)
// ==========================================================================
function initStorage() {
    if (!localStorage.getItem("efacture_hospital_orders")) {
        localStorage.setItem("efacture_hospital_orders", JSON.stringify(DEMO_ORDERS));
    }
}

function getOrders() {
    try {
        const raw = localStorage.getItem("efacture_hospital_orders");
        return raw ? JSON.parse(raw) : DEMO_ORDERS;
    } catch (e) {
        return DEMO_ORDERS;
    }
}

function saveOrdersList(orders) {
    localStorage.setItem("efacture_hospital_orders", JSON.stringify(orders));
    updateBadgeCounter();
}

function updateBadgeCounter() {
    const orders = getOrders();
    const badge = document.getElementById("badge-total-orders");
    if (badge) badge.innerText = orders.length;
}

// ==========================================================================
// Génération Automatique des Numéros de Bon (Sans base de données)
// ==========================================================================
function generateNextOrderNumber() {
    const orders = getOrders();
    const currentYear = new Date().getFullYear();
    let maxSeq = 146; // Base séquentielle de départ

    orders.forEach(o => {
        if (!o.id) return;
        const match = o.id.match(/(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxSeq) maxSeq = num;
        }
    });

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(4, "0");
    return `BCI-${currentYear}-${padded}`;
}

function generateAutoNumber() {
    const newNum = generateNextOrderNumber();
    const input = document.getElementById("inp-num");
    if (input) input.value = newNum;
    if (activeOrder) activeOrder.id = newNum;
    syncToDocument();
    showToast(`Numéro automatique généré : ${newNum}`);
}

// ==========================================================================
// Chargement d'une commande dans le formulaire Split-Screen
// ==========================================================================
function loadOrderIntoForm(order) {
    activeOrder = JSON.parse(JSON.stringify(order));

    if (!activeOrder.signers) {
        activeOrder.signers = {
            name1: activeOrder.requester || "", date1: activeOrder.date || "",
            name2: activeOrder.manager || "", date2: "",
            name3: "", date3: "",
            name4: "", date4: ""
        };
    }

    document.getElementById("inp-num").value = activeOrder.id;
    document.getElementById("inp-date").value = activeOrder.date;
    document.getElementById("inp-requester").value = activeOrder.requester || "";
    document.getElementById("inp-service").value = activeOrder.service || "";
    document.getElementById("inp-manager").value = activeOrder.manager || "";
    document.getElementById("inp-delivery").value = activeOrder.delivery || "";
    document.getElementById("inp-supplier").value = activeOrder.supplier || "";
    document.getElementById("inp-motif").value = activeOrder.motif || "";

    // Chargement des 4 cases de validation
    for (let i = 1; i <= 4; i++) {
        const nameInput = document.getElementById(`inp-val-name${i}`);
        const dateInput = document.getElementById(`inp-val-date${i}`);
        if (nameInput) nameInput.value = activeOrder.signers[`name${i}`] || "";
        if (dateInput) dateInput.value = activeOrder.signers[`date${i}`] || "";
    }

    renderFormArticlesTable();
    syncToDocument();
}

// ==========================================================================
// Gestion dynamique des articles dans le formulaire de gauche
// ==========================================================================
function renderFormArticlesTable() {
    const tbody = document.getElementById("edit-articles-tbody");
    if (!tbody || !activeOrder) return;

    tbody.innerHTML = activeOrder.items.map((item, idx) => {
        const lineTotal = (parseInt(item.qty, 10) || 0) * (parseFloat(item.price) || 0);
        return `
            <tr>
                <td>
                    <input type="text" class="input-cell" placeholder="Désignation" value="${escapeHtml(item.designation)}" oninput="updateArticleField(${idx}, 'designation', this.value)">
                </td>
                <td style="width: 70px;">
                    <input type="number" class="input-cell text-center" min="1" placeholder="Qté" value="${item.qty || 1}" oninput="updateArticleField(${idx}, 'qty', this.value)">
                </td>
                <td style="width: 100px;">
                    <input type="number" class="input-cell text-right" min="0" placeholder="P.U" value="${item.price || 0}" oninput="updateArticleField(${idx}, 'price', this.value)">
                </td>
                <td class="text-right row-total-cell" style="width: 90px;">
                    ${formatNumber(lineTotal)}
                </td>
                <td class="text-center" style="width: 28px;">
                    <button type="button" class="btn-remove-row" title="Supprimer la ligne" onclick="removeArticleRow(${idx})">✕</button>
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

    // Mise à jour ciblée du total de la ligne sans toucher aux inputs (garde le focus du curseur)
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

    // Donner le focus au dernier champ ajouté
    setTimeout(() => {
        const inputs = document.querySelectorAll("#edit-articles-tbody input[type='text']");
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
}

function removeArticleRow(index) {
    if (!activeOrder || activeOrder.items.length <= 1) {
        showToast("La commande doit comporter au moins un article");
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
// Synchronisation instantanée avec le document A4 à droite
// ==========================================================================
function syncToDocument() {
    if (!activeOrder) return;

    // Récupérer les valeurs des inputs principaux
    const num = document.getElementById("inp-num").value || "BCI-2026-0001";
    const dateVal = document.getElementById("inp-date").value || new Date().toISOString().split("T")[0];
    const requester = document.getElementById("inp-requester").value || "-";
    const service = document.getElementById("inp-service").value || "-";
    const manager = document.getElementById("inp-manager").value || "-";
    const delivery = document.getElementById("inp-delivery").value || "-";
    const supplier = document.getElementById("inp-supplier").value || "-";
    const motif = document.getElementById("inp-motif").value || "Aucun motif précisé.";

    // Mettre à jour l'état interne
    activeOrder.id = num;
    activeOrder.date = dateVal;
    activeOrder.requester = requester;
    activeOrder.service = service;
    activeOrder.manager = manager;
    activeOrder.delivery = delivery;
    activeOrder.supplier = supplier;
    activeOrder.motif = motif;

    // Formatage de la date en JJ/MM/AAAA
    const formattedDate = dateVal.split("-").reverse().join("/");

    // Injection dans le document A4 officiel
    document.getElementById("pv-num").innerText = num;
    document.getElementById("pv-date").innerText = formattedDate;
    document.getElementById("pv-requester").innerText = requester;
    document.getElementById("pv-service").innerText = service;
    document.getElementById("pv-manager").innerText = manager;
    document.getElementById("pv-delivery").innerText = delivery;
    document.getElementById("pv-supplier").innerText = supplier;
    document.getElementById("pv-motif").innerText = motif;

    // Synchronisation des 4 cases de validation du bas
    if (!activeOrder.signers) activeOrder.signers = {};
    for (let i = 1; i <= 4; i++) {
        const valName = document.getElementById(`inp-val-name${i}`)?.value || "";
        const valDate = document.getElementById(`inp-val-date${i}`)?.value || "";

        activeOrder.signers[`name${i}`] = valName;
        activeOrder.signers[`date${i}`] = valDate;

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
                <td class="center">${idx + 1}</td>
                <td>${escapeHtml(item.designation) || '<span style="color:#999;">Article non renseigné</span>'}</td>
                <td class="center">${item.qty || 0}</td>
                <td class="right">${formatNumber(item.price || 0)}</td>
                <td class="right">${formatNumber(lineTotal)}</td>
            </tr>
        `;
    }).join("");

    // 2 lignes vides esthétiques comme sur la photo originale
    const emptyRowsHtml = `
        <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
        <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
    `;

    // Ligne de total général
    const totalRowHtml = `
        <tr class="total-row">
            <td colspan="3" style="border: none;"></td>
            <td class="total-label">TOTAL</td>
            <td class="total-amount">${formatNumber(grandTotal)}</td>
        </tr>
    `;

    pvTbody.innerHTML = rowsHtml + emptyRowsHtml + totalRowHtml;
}

// ==========================================================================
// Actions CRUD (Enregistrer, Nouveau, Supprimer, Dupliquer)
// ==========================================================================
function saveActiveOrder() {
    if (!activeOrder) return;

    if (!activeOrder.service || activeOrder.service === "-") {
        alert("Veuillez renseigner le service demandeur.");
        document.getElementById("inp-service").focus();
        return;
    }

    const orders = getOrders();
    const existingIndex = orders.findIndex(o => o.id === activeOrder.id);

    if (existingIndex >= 0) {
        orders[existingIndex] = JSON.parse(JSON.stringify(activeOrder));
    } else {
        orders.unshift(JSON.parse(JSON.stringify(activeOrder)));
    }

    saveOrdersList(orders);
    renderRegistry();
    showToast(`Commande ${activeOrder.id} enregistrée avec succès !`);
}

function createNewOrderPrompt() {
    const today = new Date().toISOString().split("T")[0];
    const newNum = generateNextOrderNumber();

    const newBlankOrder = {
        id: newNum,
        date: today,
        requester: "",
        service: "",
        manager: "",
        delivery: "Entrepôt principal",
        supplier: "",
        motif: "",
        items: [
            { designation: "", qty: 1, price: 0 }
        ],
        signers: {
            name1: "", date1: today,
            name2: "", date2: "",
            name3: "", date3: "",
            name4: "", date4: ""
        }
    };

    loadOrderIntoForm(newBlankOrder);
    switchTab("editor");
    showToast(`Nouveau bon ${newBlankOrder.id} généré automatiquement`);
    setTimeout(() => {
        document.getElementById("inp-requester").focus();
    }, 100);
}

function deleteOrder(orderId) {
    if (!confirm(`Êtes-vous certain de vouloir supprimer le bon de commande ${orderId} ?`)) {
        return;
    }

    let orders = getOrders();
    orders = orders.filter(o => o.id !== orderId);
    saveOrdersList(orders);
    renderRegistry();

    // Si on a supprimé la commande active, charger la première restante
    if (activeOrder && activeOrder.id === orderId) {
        if (orders.length > 0) {
            loadOrderIntoForm(orders[0]);
        } else {
            createNewOrderPrompt();
        }
    }

    showToast(`Bon ${orderId} supprimé`);
}

function duplicateOrder(orderId) {
    const orders = getOrders();
    const source = orders.find(o => o.id === orderId);
    if (!source) return;

    const today = new Date().toISOString().split("T")[0];
    const newNum = generateNextOrderNumber();

    const cloned = JSON.parse(JSON.stringify(source));
    cloned.id = newNum;
    cloned.date = today;
    if (cloned.signers) {
        cloned.signers.date1 = today;
        cloned.signers.date2 = "";
        cloned.signers.date3 = "";
        cloned.signers.date4 = "";
    }

    orders.unshift(cloned);
    saveOrdersList(orders);
    renderRegistry();
    loadOrderIntoForm(cloned);
    switchTab("editor");
    showToast(`Bon dupliqué avec le N° automatique ${cloned.id}`);
}

function openOrderInEditor(orderId) {
    const orders = getOrders();
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    loadOrderIntoForm(target);
    switchTab("editor");
    showToast(`Bon ${orderId} ouvert en mode édition`);
}

// ==========================================================================
// Rendu et Filtrage du Registre CRUD (Vue 2)
// ==========================================================================
function renderRegistry() {
    const orders = getOrders();
    const tbody = document.getElementById("registry-tbody");
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted);">Aucun bon enregistré pour le moment.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(ord => {
        const formattedDate = ord.date.split("-").reverse().join("/");
        const totalItemsCount = ord.items.reduce((s, i) => s + (parseInt(i.qty, 10) || 0), 0);
        const grandTotal = ord.items.reduce((s, i) => s + ((parseInt(i.qty, 10) || 0) * (parseFloat(i.price) || 0)), 0);

        return `
            <tr>
                <td style="font-weight: 700; color: var(--primary);">${ord.id}</td>
                <td>${formattedDate}</td>
                <td><strong>${escapeHtml(ord.service || '-')}</strong></td>
                <td>${escapeHtml(ord.requester || '-')}</td>
                <td class="text-center">
                    <span style="font-weight: 600;">${ord.items.length} ligne(s)</span>
                    <span style="font-size: 11px; color: var(--text-muted); display: block;">(${totalItemsCount} unités)</span>
                </td>
                <td class="text-right" style="font-weight: 700;">
                    ${formatNumber(grandTotal)} FCFA
                </td>
                <td class="text-center">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn btn-sm btn-outline-dark" title="Ouvrir dans l'éditeur" onclick="openOrderInEditor('${ord.id}')">
                            Éditer
                        </button>
                        <button class="btn btn-sm btn-outline-dark" title="Dupliquer" onclick="duplicateOrder('${ord.id}')">
                            Cloner
                        </button>
                        <button class="btn btn-sm btn-danger-outline" title="Supprimer" onclick="deleteOrder('${ord.id}')">
                            Supprimer
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
// Impression / Export A4
// ==========================================================================
function triggerPrint() {
    syncToDocument();
    // Toujours s'assurer d'être sur l'onglet éditeur avant d'imprimer
    switchTab("editor");
    setTimeout(() => {
        window.print();
    }, 150);
}

// ==========================================================================
// Navigation par Onglets (Saisie vs Registre)
// ==========================================================================
function switchTab(tabId) {
    document.querySelectorAll(".nav-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));

    const targetTabBtn = document.getElementById(`tab-${tabId}`);
    const targetPanel = document.getElementById(`view-${tabId}`);

    if (targetTabBtn) targetTabBtn.classList.add("active");
    if (targetPanel) targetPanel.classList.add("active");
}

// ==========================================================================
// Utilitaires (Notifications & Formatage)
// ==========================================================================
function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2400);
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
