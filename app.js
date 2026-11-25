"use strict";

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const PROFILE_KEY = "telefon_sozlovchi_profile";
const ORDERS_KEY = "telefon_sozlovchi_orders";

const profileOverlay = $("#profileOverlay");
const profileForm = $("#profileForm");
const profileButton = $("#profileButton");
const orderForm = $("#orderForm");
const orderList = $("#orderList");
const toast = $("#toast");

let profile = loadStorage(PROFILE_KEY, null);
let orders = loadStorage(ORDERS_KEY, []);

const stages = [
  "Yangi",
  "Narx taklif qilindi",
  "Narx tasdiqlandi",
  "Ta'mirlanmoqda",
  "Tayyor",
  "Topshirildi"
];

function loadStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch (error) {
    console.warn("Saqlangan ma'lumotni o'qib bo'lmadi:", error);
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2800);
}

function formatPrice(price) {
  return `${Number(price).toLocaleString("uz-UZ")} so'm`;
}

function createOrderId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TS-${random}`;
}

function formatDate(value) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function updateProfileButton() {
  if (profile) {
    profileButton.textContent = `👤 ${profile.name}`;
  } else {
    profileButton.textContent = "👤 Kirish";
  }
}

function openProfileModal() {
  if (profile) {
    const question = confirm(
      "Profilingizdan chiqishni xohlaysizmi?"
    );

    if (question) {
      profile = null;
      saveStorage(PROFILE_KEY, null);
      updateProfileButton();
      showToast("Profildan chiqildi.");
    }

    return;
  }

  profileOverlay.hidden = false;
  window.setTimeout(() => {
    $("#customerName").focus();
  }, 100);
}

function closeProfileModal() {
  profileOverlay.hidden = true;
}

function phoneDigitsValid(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

profileButton.addEventListener("click", openProfileModal);

$("#modalClose").addEventListener("click", closeProfileModal);

profileOverlay.addEventListener("click", (event) => {
  if (event.target === profileOverlay) {
    closeProfileModal();
  }
});

profileForm.addEventListener("submit", (event) => {
  event.preventEventDefault;
  event.preventDefault();

  const name = $("#customerName").value.trim();
  const phone = $("#customerPhone").value.trim();

  if (!name) {
    showToast("Ismingizni kiriting.");
    $("#customerName").focus();
    return;
  }

  if (!phoneDigitsValid(phone)) {
    showToast("Telefon raqamini to'g'ri kiriting.");
    $("#customerPhone").focus();
    return;
  }

  profile = {
    name,
    phone,
    createdAt: new Date().toISOString()
  };

  saveStorage(PROFILE_KEY, profile);
  updateProfileButton();
  profileForm.reset();
  profileOverlay.hidden = true;
  showToast("Profil saqlandi.");
});

function getActions(order) {
  if (order.status === "Yangi") {
    return `
      <button type="button" data-action="quote" data-id="${order.id}">
        Demo narx taklifi
      </button>
    `;
  }

  if (order.status === "Narx taklif qilindi") {
    return `
      <button type="button" data-action="approve" data-id="${order.id}">
        Narxni tasdiqlash
      </button>
      <button type="button" data-action="cancel" data-id="${order.id}">
        Rad etish
      </button>
    `;
  }

  if (order.status === "Narx tasdiqlandi") {
    return `
      <button type="button" data-action="repair" data-id="${order.id}">
        Ta'mirni boshlash
      </button>
    `;
  }

  if (order.status === "Ta'mirlanmoqda") {
    return `
      <button type="button" data-action="ready" data-id="${order.id}">
        Telefon tayyor
      </button>
    `;
  }

  if (order.status === "Tayyor" && !order.paid) {
    return `
      <button class="pay-button" type="button" data-action="pay" data-id="${order.id}">
        Demo tolov qilish
      </button>
    `;
  }

  if (order.status === "Tayyor" && order.paid) {
    return `
      <button type="button" data-action="collect" data-id="${order.id}">
        Telefonni oldim
      </button>
    `;
  }

  return "";
}

function renderOrders() {
  if (!Array.isArray(orders) || orders.length === 0) {
    orderList.innerHTML = `
      <div class="order-empty">
        Hozircha buyurtmalar yo'q. Forma orqali birinchi buyurtmani bering.
      </div>
    `;
    return;
  }

  orderList.innerHTML = [...orders].reverse().map((order) => {
    const stageIndex = stages.indexOf(order.status);

    const progress = stages.map((_, index) =>
      `<i class="${index <= stageIndex ? "done" : ""}"></i>`
    ).join("");

    return `
      <article class="order-card">
        <div class="order-card-top">
          <div>
            <h3>
              ${escapeHTML(order.brand)}
              ${escapeHTML(order.model)}
              — ${escapeHTML(order.problem)}
            </h3>
            <div class="order-id">
              ${escapeHTML(order.id)}
              · ${formatDate(order.createdAt)}
            </div>
          </div>
          <span class="order-badge">${escapeHTML(order.status)}</span>
        </div>

        <div class="order-progress">${progress}</div>

        <p class="order-description">
          ${order.description ? `${escapeHTML(order.description)}<br>` : ""}
          Telefon: ${escapeHTML(order.phone)}<br>
          Yetkazish: ${escapeHTML(order.delivery)}
          ${order.price ? `<br>Narx: <strong>${formatPrice(order.price)}</strong>` : ""}
          ${order.paid ? "<br>✅ Demo to'lov qayd etildi." : ""}
        </p>

        <div class="order-actions">
          ${getActions(order)}
          <button type="button" data-action="delete" data-id="${order.id}">
            O'chirish
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function persistOrders() {
  saveStorage(ORDERS_KEY, orders);
  renderOrders();
}

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!profile) {
    profileOverlay.hidden = false;
    showToast("Avval ro'yxatdan o'ting.");
    window.setTimeout(() => $("#customerName").focus(), 100);
    return;
  }

  const brand = $("#brand").value;
  const model = $("#model").value.trim();
  const problem = $("#problem").problem;
  const phone = $("#phone").value.trim();
  const delivery = $("#delivery").value;
  const description = $("#description").value.trim();
  const photo = $("#photo").files[0] || null;

  if (!brand) {
    showToast("Telefon brendini tanlang.");
    $("#brand").focus();
    return;
  }

  if (!model) {
    showToast("Telefon modelini kiriting.");
    $("#model").focus();
    return;
  }

  if (!phoneDigitsValid(phone)) {
    showToast("Telefon raqamini to'g'ri kiriting.");
    $("#phone").focus();
    return;
  }

  const selectedProblem = $("#problem").value;

  if (!selectedProblem) {
    showToast("Nosozlik turini tanlang.");
    $("#problem").focus();
    return;
  }

  const order = {
    id: createOrderId(),
    brand,
    model,
    problem: selectedProblem,
    phone,
    delivery,
    description,
    photoName: photo ? photo.name : "",
    status: "Yangi",
    price: null,
    paid: false,
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  persistOrders();
  orderForm.reset();
  showToast(`Buyurtma qabul qilindi: ${order.id}`);

  $("#buyurtmalar").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

orderList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const orderId = button.dataset.id;
  const action = button.dataset.action;
  const order = orders.find((item) => item.id === orderId);

  if (!order) return;

  switch (action) {
    case "quote":
      order.price = 250000;
      order.status = "Narx taklif qilindi";
      showToast("Demo narx taklifi yuborildi.");
      break;

    case "approve":
      order.status = "Narx tasdiqlandi";
      showToast("Narx tasdiqlandi.");
      break;

    case "cancel":
      order.status = "Bekor qilindi";
      showToast("Buyurtma bekor qilindi.");
      break;

    case "repair":
      order.status = "Ta'mirlanmoqda";
      showToast("Ta'mirlash boshlandi.");
      break;

    case "ready":
      order.status = "Tayyor";
      showToast("Telefon tayyor. Demo to'lov qilish mumkin.");
      break;

    case "pay":
      const confirmed = confirm(
        "Bu demo to'lov. Haqiqiy pul yechilmaydi. Davom etasizmi?"
      );

      if (confirmed) {
        order.paid = true;
        showToast("Demo to'lov qayd etildi.");
      }
      break;

    case "collect":
      order.status = "Topshirildi";
      showToast("Buyurtma yakunlandi.");
      break;

    case "delete":
      if (confirm("Buyurtmani o'chirasizmi?")) {
        orders = orders.filter((item) => item.id !== orderId);
        showToast("Buyurtma o'chirildi.");
      }
      break;
  }

  persistOrders();
});

$("#clearOrders").addEventListener("click", () => {
  if (!orders.length) {
    showToast("O'chirish uchun buyurtma yo'q.");
    return;
  }

  if (confirm("Barcha buyurtmalarni o'chirasizmi?")) {
    orders = [];
    persistOrders();
    showToast("Buyurtmalar tozalandi.");
  }
});

$$(".service-card").forEach((card) => {
  card.addEventListener("click", () => {
    const problem = card.dataset.problem;
    const problemSelect = $("#problem");

    problemSelect.value = problem;

    $("#forma").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    window.setTimeout(() => {
      $("#model").focus();
    }, 550);
  });
});

const menuButton = $("#menuButton");
const mobileNav = $("#mobileNav");

menuButton.addEventListener("click", () => {
  const opened = mobileNav.classList.toggle("open");
  menuButton.classList.toggle("open", opened);
  menuButton.setAttribute("aria-expanded", String(opened));
});

$$(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    menuButton.classList.remove("open");
  });
});

const revealItems = $$(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12
  });

  revealItems.forEach((item) => {
    revealObserver.observe(item);
  });
} else {
  revealItems.forEach((item) => {
    item.classList.add("visible");
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !profileOverlay.hidden) {
    closeProfileModal();
  }
});

updateProfileButton();
renderOrders();