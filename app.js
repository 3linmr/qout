let menuItems = [];

const cart = new Map();
let activeCategory = "الكل";
let pickupSelection = "يرجى تحديد الموعد";
let pickupData = null;
let loggedInPhone = "";
let otpCode = "";
let customerId = "";

const menuGrid = document.getElementById("menuGrid");
const menuFilters = document.getElementById("menuFilters");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const subtotalEl = document.getElementById("subtotal");
const taxEl = document.getElementById("tax");
const totalEl = document.getElementById("total");
const pickupSummary = document.getElementById("pickupSummary");
const loginBtn = document.getElementById("loginBtn");
const userPhone = document.getElementById("userPhone");
const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");
const authForm = document.getElementById("authForm");
const otpForm = document.getElementById("otpForm");
const phoneInput = document.getElementById("phoneInput");
const otpInput = document.getElementById("otpInput");
const otpHint = document.getElementById("otpHint");
const scheduleForm = document.getElementById("scheduleForm");
const pickupDate = document.getElementById("pickupDate");
const pickupTime = document.getElementById("pickupTime");
const scheduleHint = document.getElementById("scheduleHint");
const openScheduleBtn = document.getElementById("openScheduleBtn");
const payBtn = document.getElementById("payBtn");
const paymentHint = document.getElementById("paymentHint");
const cardFields = document.getElementById("cardFields");
const toast = document.getElementById("toast");

const vatRate = 0.15;
const apiBase = "/api";

const formatPrice = (value) => `${value.toFixed(2)} ر.س`;

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2400);
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "حدث خطأ في الطلب.");
  }
  return response.json();
};

const loadMenu = async () => {
  try {
    const data = await fetchJson(`${apiBase}/menu`);
    menuItems = data.items || [];
  } catch (error) {
    menuItems = [];
    showToast("تعذر تحميل المنيو حالياً.");
  }
};

const buildFilters = () => {
  const categories = ["الكل", ...new Set(menuItems.map((item) => item.category))];
  menuFilters.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = `filter-btn ${
      activeCategory === category ? "active" : ""
    }`;
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      buildFilters();
      renderMenu();
    });
    menuFilters.appendChild(button);
  });
};

const renderMenu = () => {
  if (menuItems.length === 0) {
    menuGrid.innerHTML = `<p class="form-hint">لا توجد أصناف متاحة حالياً.</p>`;
    return;
  }
  const items =
    activeCategory === "الكل"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);
  menuGrid.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.innerHTML = `
      <h4>${item.name}</h4>
      <p>${item.desc}</p>
      <div class="menu-meta">
        <span>${formatPrice(item.price)}</span>
        <button class="btn primary" data-id="${item.id}">أضف للسلة</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => addToCart(item));
    menuGrid.appendChild(card);
  });
};

const addToCart = (item) => {
  const existing = cart.get(item.id) || { ...item, qty: 0 };
  existing.qty += 1;
  cart.set(item.id, existing);
  showToast("تمت الإضافة للسلة");
  renderCart();
};

const updateQty = (id, delta) => {
  const item = cart.get(id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart.delete(id);
  } else {
    cart.set(id, item);
  }
  renderCart();
};

const renderCart = () => {
  cartItems.innerHTML = "";
  let subtotal = 0;
  cart.forEach((item) => {
    const lineTotal = item.qty * item.price;
    subtotal += lineTotal;
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <small>${formatPrice(item.price)}</small>
      </div>
      <div class="qty-controls">
        <button data-action="minus">-</button>
        <span>${item.qty}</span>
        <button data-action="plus">+</button>
      </div>
    `;
    const [minusBtn, , plusBtn] = row.querySelectorAll("button, span");
    minusBtn.addEventListener("click", () => updateQty(item.id, -1));
    plusBtn.addEventListener("click", () => updateQty(item.id, 1));
    cartItems.appendChild(row);
  });

  if (cart.size === 0) {
    cartItems.innerHTML = `<p class="form-hint">السلة فارغة حالياً.</p>`;
  }

  const tax = subtotal * vatRate;
  const total = subtotal + tax;
  subtotalEl.textContent = formatPrice(subtotal);
  taxEl.textContent = formatPrice(tax);
  totalEl.textContent = formatPrice(total);
  cartCount.textContent = Array.from(cart.values()).reduce((sum, item) => sum + item.qty, 0);
};

const createCustomer = async (phone) => {
  const data = await fetchJson(`${apiBase}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return data.customer;
};

const submitOrder = async () => {
  const items = Array.from(cart.values()).map((item) => ({
    id: item.id,
    qty: item.qty,
  }));
  const payload = {
    customerId,
    phone: loggedInPhone,
    pickup: pickupData,
    items,
  };
  const data = await fetchJson(`${apiBase}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.order;
};

const initSchedule = () => {
  const today = new Date();
  pickupDate.min = today.toISOString().split("T")[0];
  for (let hour = 7; hour <= 23; hour += 1) {
    ["00", "30"].forEach((minute) => {
      const option = document.createElement("option");
      option.value = `${String(hour).padStart(2, "0")}:${minute}`;
      option.textContent = `${String(hour).padStart(2, "0")}:${minute}`;
      pickupTime.appendChild(option);
    });
  }
};

scheduleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const type = scheduleForm.elements.pickupType.value;
  if (type === "now") {
    pickupSelection = "خلال 20 - 30 دقيقة";
    pickupData = { type: "now", label: pickupSelection };
  } else {
    if (!pickupDate.value || !pickupTime.value) {
      scheduleHint.textContent = "يرجى اختيار التاريخ والوقت.";
      scheduleHint.style.color = "crimson";
      return;
    }
    scheduleHint.style.color = "";
    pickupSelection = `${pickupDate.value} - ${pickupTime.value}`;
    pickupData = {
      type: "later",
      date: pickupDate.value,
      time: pickupTime.value,
      label: pickupSelection,
    };
  }
  pickupSummary.textContent = pickupSelection;
  showToast("تم حفظ موعد الاستلام");
});

openScheduleBtn.addEventListener("click", () => {
  document.getElementById("schedule").scrollIntoView({ behavior: "smooth" });
});

const openAuth = () => authModal.classList.remove("hidden");
const closeAuthModal = () => authModal.classList.add("hidden");

loginBtn.addEventListener("click", openAuth);
closeAuth.addEventListener("click", closeAuthModal);

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const phone = phoneInput.value.trim();
  if (!phone) return;
  otpCode = String(Math.floor(1000 + Math.random() * 9000));
  otpHint.textContent = `رمز تجريبي: ${otpCode}`;
  authForm.classList.add("hidden");
  otpForm.classList.remove("hidden");
});

otpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (otpInput.value.trim() !== otpCode) {
    otpHint.textContent = "رمز غير صحيح، حاول مرة أخرى.";
    otpHint.style.color = "crimson";
    return;
  }
  try {
    loggedInPhone = phoneInput.value.trim();
    const customer = await createCustomer(loggedInPhone);
    customerId = customer.id;
    localStorage.setItem("qoutPhone", loggedInPhone);
    localStorage.setItem("qoutCustomerId", customerId);
    userPhone.textContent = loggedInPhone;
    userPhone.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    paymentHint.textContent = "جاهز لإتمام الدفع.";
    closeAuthModal();
    showToast("تم تسجيل الدخول بنجاح");
  } catch (error) {
    otpHint.textContent = "تعذر تسجيل الدخول حالياً.";
    otpHint.style.color = "crimson";
  }
});

document.querySelectorAll("input[name='paymentMethod']").forEach((input) => {
  input.addEventListener("change", (event) => {
    cardFields.classList.toggle("hidden", event.target.value !== "mada");
  });
});

payBtn.addEventListener("click", async () => {
  if (!loggedInPhone) {
    paymentHint.textContent = "يرجى تسجيل الدخول برقم الهاتف أولاً.";
    paymentHint.style.color = "crimson";
    openAuth();
    return;
  }
  if (cart.size === 0) {
    showToast("أضف عناصر للسلة قبل الدفع.");
    return;
  }
  if (pickupSelection === "يرجى تحديد الموعد") {
    showToast("يرجى تحديد موعد الاستلام.");
    return;
  }
  try {
    await submitOrder();
    showToast("تم استلام طلبك بنجاح، شكرًا لك!");
    cart.clear();
    renderCart();
  } catch (error) {
    showToast("تعذر إرسال الطلب حالياً.");
  }
});

const bootstrap = async () => {
  await loadMenu();
  buildFilters();
  renderMenu();
  renderCart();
  initSchedule();
  const storedPhone = localStorage.getItem("qoutPhone");
  const storedCustomerId = localStorage.getItem("qoutCustomerId");
  if (storedPhone) {
    loggedInPhone = storedPhone;
    customerId = storedCustomerId || "";
    userPhone.textContent = storedPhone;
    userPhone.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    paymentHint.textContent = "جاهز لإتمام الدفع.";
  }
};

bootstrap();


