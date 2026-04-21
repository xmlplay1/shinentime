const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("primaryNav");
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("formMessage");
const formsparkRedirectInput = document.getElementById("formsparkRedirect");

if (formsparkRedirectInput && typeof window !== "undefined" && window.location?.href) {
  try {
    const returnUrl = new URL(window.location.href);
    returnUrl.hash = "quote";
    returnUrl.searchParams.set("submitted", "1");
    formsparkRedirectInput.value = returnUrl.toString();
  } catch (error) {
    formsparkRedirectInput.value = "";
  }
}

if (typeof window !== "undefined" && window.location?.search) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("submitted") === "1" && formMessage) {
    formMessage.textContent = "Thanks! Your quote was sent. We will reach out soon.";
    formMessage.style.color = "#0f766e";
    const clean = new URL(window.location.href);
    clean.searchParams.delete("submitted");
    const nextSearch = clean.searchParams.toString();
    const path = `${clean.pathname}${nextSearch ? `?${nextSearch}` : ""}${clean.hash || "#quote"}`;
    window.history.replaceState({}, "", path);
    document.getElementById("quote")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
const year = document.getElementById("year");
const editLastQuoteButton = document.getElementById("editLastQuoteBtn");
const galleryButtons = Array.from(document.querySelectorAll(".gallery-tile"));
const lightbox =
  document.getElementById("galleryLightbox") ||
  document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxZoomIn =
  document.getElementById("lightboxZoomIn") ||
  document.getElementById("zoomInBtn");
const lightboxZoomOut =
  document.getElementById("lightboxZoomOut") ||
  document.getElementById("zoomOutBtn");
const lightboxZoomReset =
  document.getElementById("lightboxZoomReset") ||
  document.getElementById("zoomResetBtn");
const vehicleType =
  document.getElementById("vehicleType") ||
  document.getElementById("vehicleSize");
const packageSelect = document.getElementById("package");
const extrasFieldset = document.querySelector(".extras-group");
const prepFieldset = document.getElementById("prepFieldset");
const prepSummaryInput = document.getElementById("prepSummary");
const estimateRange = document.getElementById("estimateValue");
const estimateBreakdown = document.getElementById("estimateBreakdown");
const estimateHidden = document.getElementById("estimateSummary");
const quoteFormAction = quoteForm?.getAttribute("action") || "";
const QUOTE_STORAGE_KEY = "shine-n-time-last-quote";
let currentGalleryIndex = 0;
let currentZoom = 1;
function buildLogoCandidates() {
  const urls = [];
  const push = (url) => {
    const trimmed = String(url || "").trim();
    if (!trimmed || urls.includes(trimmed)) return;
    urls.push(trimmed);
  };

  const meta = document.querySelector('meta[name="site-logo"]');
  push(meta?.getAttribute("content"));

  const bases = ["./", "./assets/", "./images/", "./img/", "./public/"];
  const names = [
    "logo.png",
    "logo.PNG",
    "logo.webp",
    "logo.WEBP",
    "Logo.PNG",
    "logo.jpg",
    "logo.JPG",
    "logo.jpeg",
    "logo.JPEG",
    "Logo.png",
    "LOGO.png",
    "logo-mark.png",
    "logo-mark.webp",
    "logo-1.png",
    "logo-2.png",
    "logo-3.png",
    "logo1.png",
    "logo2.png",
    "logo3.png",
    "ShineNTime.png",
    "shine-n-time.png",
    "shine-n-time-logo.png",
    "shine-n-time-logo.webp",
    "shinentime-logo.png",
    "shinentime-logo.webp"
  ];

  bases.forEach((base) => {
    names.forEach((name) => push(`${base}${name}`));
  });

  return urls;
}

function initSiteLogo() {
  const img = document.getElementById("siteLogo");
  const fallback = document.getElementById("logoFallback");
  const mark = document.getElementById("logoMark");
  if (!img) return;

  const candidates = buildLogoCandidates();

  img.removeAttribute("src");
  img.style.display = "none";
  if (fallback) fallback.hidden = false;
  mark?.classList.remove("has-logo");

  const tryNext = (index) => {
    if (index >= candidates.length) {
      return;
    }
    const candidate = candidates[index];
    const probe = new Image();
    probe.onload = () => {
      img.src = candidate;
      img.style.display = "block";
      if (fallback) fallback.hidden = true;
      mark?.classList.add("has-logo");
    };
    probe.onerror = () => tryNext(index + 1);
    probe.src = candidate;
  };

  tryNext(0);
}

initSiteLogo();

const PACKAGE_PRICING = {
  silver: { sedan: 49, suvTruck: 59 },
  gold: { sedan: 125, suvTruck: 140 },
  platinum: { sedan: 160, suvTruck: 180 }
};

const TWO_CAR_BUNDLE_DISCOUNT = 0.1;

const EXTRA_PRICING = {
  petHair: { low: 20, high: 20 },
  sandSalt: { low: 15, high: 15 },
  roadSalt: { low: 18, high: 18 },
  bioClean: { low: 35, high: 35 },
  smokeOdor: { low: 25, high: 25 },
  moldRisk: { low: 60, high: 60 },
  exteriorFoamWash: { low: 35, high: 50 },
  wheelDecon: { low: 25, high: 35 },
  spraySealant: { low: 30, high: 45 },
  bugTarRemoval: { low: 20, high: 30 },
  saltNeutralizer: { low: 22, high: 34 }
};

const SEVERITY_MULTIPLIER = {
  light: 1,
  medium: 1.35,
  heavy: 1.75
};

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("show");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("show");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

function getGalleryItems() {
  return Array.from(document.querySelectorAll(".gallery-tile"))
    .map((button) => {
      const img = button.querySelector("img");
      if (!img) return null;
      return {
        src: img.currentSrc || img.src,
        alt: img.alt || "Gallery photo"
      };
    })
    .filter(Boolean);
}

function renderLightboxImage() {
  const items = getGalleryItems();
  if (!items.length || !lightboxImage) return;
  const item = items[currentGalleryIndex];
  lightboxImage.src = item.src;
  lightboxImage.alt = item.alt;
  if (lightboxCaption) {
    lightboxCaption.textContent = `${item.alt} (${currentGalleryIndex + 1}/${items.length})`;
  }
  lightboxImage.style.transform = `scale(${currentZoom})`;
}

function openLightbox(index) {
  if (!lightbox) return;
  currentGalleryIndex = index;
  currentZoom = 1;
  renderLightboxImage();
  lightbox.hidden = false;
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.hidden = true;
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
}

function nextLightbox() {
  const items = getGalleryItems();
  if (!items.length) return;
  currentGalleryIndex = (currentGalleryIndex + 1) % items.length;
  renderLightboxImage();
}

function prevLightbox() {
  const items = getGalleryItems();
  if (!items.length) return;
  currentGalleryIndex = (currentGalleryIndex - 1 + items.length) % items.length;
  renderLightboxImage();
}

function updateZoom(step) {
  currentZoom = Math.max(1, Math.min(2.6, currentZoom + step));
  if (lightboxImage) {
    lightboxImage.style.transform = `scale(${currentZoom})`;
  }
}

galleryButtons.forEach((button, index) => {
  button.addEventListener("click", () => openLightbox(index));
});

if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
if (lightboxNext) lightboxNext.addEventListener("click", nextLightbox);
if (lightboxPrev) lightboxPrev.addEventListener("click", prevLightbox);
if (lightboxZoomIn) lightboxZoomIn.addEventListener("click", () => updateZoom(0.2));
if (lightboxZoomOut) lightboxZoomOut.addEventListener("click", () => updateZoom(-0.2));
if (lightboxZoomReset) {
  lightboxZoomReset.addEventListener("click", () => {
    currentZoom = 1;
    if (lightboxImage) lightboxImage.style.transform = "scale(1)";
  });
}

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  const stopInnerClose = (event) => event.stopPropagation();
  lightbox.querySelector(".lightbox-content")?.addEventListener("click", stopInnerClose);
}

window.addEventListener("keydown", (event) => {
  if (!lightbox || lightbox.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowRight") nextLightbox();
  if (event.key === "ArrowLeft") prevLightbox();
  if (event.key === "+" || event.key === "=") updateZoom(0.2);
  if (event.key === "-") updateZoom(-0.2);
});

function calculateEstimate() {
  if (!vehicleType || !packageSelect || !estimateRange || !estimateHidden) return;

  const rawVehicle = String(vehicleType.value || "").trim().toLowerCase();
  const vehicle =
    rawVehicle === "suv" || rawVehicle === "truck" || rawVehicle === "van" || rawVehicle.includes("suv")
      ? "suv"
      : rawVehicle === "sedan" || rawVehicle === "coupe"
        ? "sedan"
        : rawVehicle;
  const pkg = String(packageSelect.value || "").trim().toLowerCase();
  const priceKey = vehicle === "suv" ? "suvTruck" : vehicle;

  const setPendingEstimate = (message) => {
    estimateRange.textContent = "—";
    estimateRange.classList.add("estimate-value--pending");
    if (estimateBreakdown) estimateBreakdown.textContent = message;
    estimateHidden.value = "";
    const emailEstimate = document.getElementById("emailEstimate");
    if (emailEstimate) emailEstimate.value = "";
  };

  if (!vehicle || !pkg || !PACKAGE_PRICING[pkg] || !PACKAGE_PRICING[pkg][priceKey]) {
    setPendingEstimate("Pick vehicle size and package to see a ballpark range.");
    return;
  }

  estimateRange.classList.remove("estimate-value--pending");

  const carCountInput = document.getElementById("carCount");
  const carCountRaw = Number.parseInt(String(carCountInput?.value || "1"), 10);
  const carCount = Number.isFinite(carCountRaw) ? Math.min(4, Math.max(1, carCountRaw)) : 1;

  let low = PACKAGE_PRICING[pkg][priceKey];
  let high = PACKAGE_PRICING[pkg][priceKey];
  const extras = [];
  const conditionLevel = String(document.getElementById("conditionLevel")?.value || "");
  const discountChecked = Boolean(document.getElementById("firstDetailDiscount")?.checked);

  const conditionMultiplier = {
    light: 1,
    medium: 1.18,
    heavy: 1.35
  };
  const conditionFactor = conditionMultiplier[conditionLevel] || 1;
  low = Math.round(low * conditionFactor);
  high = Math.round(high * conditionFactor);

  if (extrasFieldset) {
    const checked = Array.from(extrasFieldset.querySelectorAll("input[type='checkbox']:checked"));
    checked.forEach((input) => {
      const key = input.value;
      const pricing = EXTRA_PRICING[key];
      if (!pricing) return;
      let mult = 1;
      if (key === "petHair") {
        mult = SEVERITY_MULTIPLIER[String(document.getElementById("petHairLevel")?.value || "medium")] || 1;
      } else if (key === "sandSalt") {
        mult = SEVERITY_MULTIPLIER[String(document.getElementById("sandLevel")?.value || "medium")] || 1;
      } else if (key === "roadSalt") {
        mult = SEVERITY_MULTIPLIER[String(document.getElementById("saltLevel")?.value || "medium")] || 1;
      } else if (key === "bioClean") {
        mult = SEVERITY_MULTIPLIER[String(document.getElementById("bioLevel")?.value || "medium")] || 1;
      }
      const addLow = Math.round(pricing.low * mult);
      const addHigh = Math.round(pricing.high * mult);
      low += addLow;
      high += addHigh;
      const label = input.dataset.label || key;
      let severityLabel = "medium";
      if (mult <= SEVERITY_MULTIPLIER.light + 0.001) severityLabel = "light";
      else if (mult >= SEVERITY_MULTIPLIER.heavy - 0.001) severityLabel = "heavy";
      extras.push(`${label} (${severityLabel} severity)`);
    });
  }

  if (discountChecked) {
    const discountPct = 0.2;
    low = Math.max(0, Math.round(low * (1 - discountPct)));
    high = Math.max(0, Math.round(high * (1 - discountPct)));
  }

  low *= carCount;
  high *= carCount;

  const bundleEligible = carCount >= 2;
  if (bundleEligible) {
    low = Math.max(0, Math.round(low * (1 - TWO_CAR_BUNDLE_DISCOUNT)));
    high = Math.max(0, Math.round(high * (1 - TWO_CAR_BUNDLE_DISCOUNT)));
  } else {
    low = Math.round(low);
    high = Math.round(high);
  }

  estimateRange.textContent = `$${low} - $${high}`;
  const extrasText = extras.length ? ` + extras: ${extras.join(", ")}` : "";
  const carsText = carCount > 1 ? ` for ${carCount} cars` : " for 1 car";
  const bundleText = bundleEligible ? ` Includes ${Math.round(TWO_CAR_BUNDLE_DISCOUNT * 100)}% bundle discount.` : "";
  const vehicleLabel = vehicle === "sedan" ? "Sedan / coupe" : "SUV / truck / van";
  const summaryText = `Estimated $${low} - $${high}. Base ${pkg.toUpperCase()} package for ${vehicleLabel}${carsText}${extrasText}.${bundleText} Final quote confirmed after inspection.`;
  if (estimateBreakdown) {
    estimateBreakdown.textContent = summaryText.replace(/^Estimated \$\d+ - \$\d+\. /, "");
  }
  estimateHidden.value = summaryText;
  const emailEstimate = document.getElementById("emailEstimate");
  if (emailEstimate) emailEstimate.value = summaryText;
}

if (vehicleType) vehicleType.addEventListener("change", calculateEstimate);
if (packageSelect) packageSelect.addEventListener("change", calculateEstimate);
const conditionLevelInput = document.getElementById("conditionLevel");
const firstDetailDiscountInput = document.getElementById("firstDetailDiscount");
const carCountInput = document.getElementById("carCount");
const petHairLevelInput = document.getElementById("petHairLevel");
const sandLevelInput = document.getElementById("sandLevel");
const roadSaltLevelInput = document.getElementById("saltLevel");
const bioLevelInput = document.getElementById("bioLevel");
if (conditionLevelInput) conditionLevelInput.addEventListener("change", calculateEstimate);
if (firstDetailDiscountInput) firstDetailDiscountInput.addEventListener("change", calculateEstimate);
if (carCountInput) carCountInput.addEventListener("change", calculateEstimate);
if (petHairLevelInput) petHairLevelInput.addEventListener("change", calculateEstimate);
if (sandLevelInput) sandLevelInput.addEventListener("change", calculateEstimate);
if (roadSaltLevelInput) roadSaltLevelInput.addEventListener("change", calculateEstimate);
if (bioLevelInput) bioLevelInput.addEventListener("change", calculateEstimate);
if (extrasFieldset) {
  extrasFieldset.addEventListener("change", calculateEstimate);
}
calculateEstimate();

function updatePrepSummary() {
  if (!prepFieldset || !prepSummaryInput) return;
  const checked = Array.from(prepFieldset.querySelectorAll("input[type='checkbox']:checked"));
  const lines = checked.map((input) => {
    const label = input.closest("label");
    return label ? label.textContent.trim() : input.value;
  });
  prepSummaryInput.value = lines.length ? lines.join(" | ") : "";
}

if (prepFieldset) {
  prepFieldset.addEventListener("change", updatePrepSummary);
  updatePrepSummary();
}

function saveQuoteDraft(data) {
  try {
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Ignore storage errors in private/incognito modes.
  }
}

function loadQuoteDraft() {
  try {
    const raw = localStorage.getItem(QUOTE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function fillQuoteForm(values) {
  if (!quoteForm || !values) return;
  const fields = [
    "name",
    "phone",
    "email",
    "appointmentDate",
    "timeWindow",
    "vehicle",
    "zipCode",
    "carCount",
    "vehicleType",
    "vehicleSize",
    "serviceFocus",
    "serviceScope",
    "package",
    "conditionLevel",
    "petHairLevel",
    "sandLevel",
    "saltLevel",
    "bioLevel",
    "notes",
    "estimateSummary",
    "prepSummary"
  ];
  fields.forEach((field) => {
    const input = quoteForm.elements.namedItem(field);
    if (input && typeof values[field] === "string") {
      input.value = values[field];
    }
  });

  const discountInput = document.getElementById("firstDetailDiscount");
  if (discountInput && typeof values.firstDetailDiscount === "boolean") {
    discountInput.checked = values.firstDetailDiscount;
  }

  if (extrasFieldset && Array.isArray(values.extras)) {
    const checkboxes = Array.from(extrasFieldset.querySelectorAll("input[type='checkbox']"));
    checkboxes.forEach((checkbox) => {
      checkbox.checked = values.extras.includes(checkbox.value);
    });
  }

  if (prepFieldset && Array.isArray(values.prep)) {
    const prepBoxes = Array.from(prepFieldset.querySelectorAll("input[type='checkbox']"));
    prepBoxes.forEach((checkbox) => {
      checkbox.checked = values.prep.includes(checkbox.value);
    });
  }
  updatePrepSummary();
  calculateEstimate();
}

if (editLastQuoteButton) {
  editLastQuoteButton.addEventListener("click", () => {
    const draft = loadQuoteDraft();
    if (!draft) {
      formMessage.textContent = "No previous quote found yet. Submit one first.";
      formMessage.style.color = "#b91c1c";
      return;
    }
    fillQuoteForm(draft);
    formMessage.textContent = "Last quote loaded. You can edit and resend it.";
    formMessage.style.color = "#0f766e";
  });
}

if (quoteForm) {
  quoteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(quoteForm);
    const requiredFields = ["name", "vehicle", "zipCode", "vehicleType", "carCount", "package", "serviceScope", "conditionLevel", "appointmentDate"];
    const hasMissing = requiredFields.some((field) => !String(data.get(field) || "").trim());
    const phoneValue = String(data.get("phone") || "").trim();
    const emailValue = String(data.get("email") || "").trim();

    if (hasMissing) {
      formMessage.textContent = "Please fill out all required fields first.";
      formMessage.style.color = "#b91c1c";
      return;
    }

    if (!phoneValue && !emailValue) {
      formMessage.textContent = "Please add at least a phone number or email so we can reach you.";
      formMessage.style.color = "#b91c1c";
      return;
    }

    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      formMessage.textContent = "Please enter a valid email address.";
      formMessage.style.color = "#b91c1c";
      return;
    }

    updatePrepSummary();
    calculateEstimate();

    const draftValues = {
      name: String(data.get("name") || "").trim(),
      phone: phoneValue,
      email: emailValue,
      appointmentDate: String(data.get("appointmentDate") || "").trim(),
      timeWindow: String(data.get("timeWindow") || "").trim(),
      vehicle: String(data.get("vehicle") || "").trim(),
      zipCode: String(data.get("zipCode") || "").trim(),
      carCount: String(data.get("carCount") || "1").trim(),
      vehicleType: String(data.get("vehicleType") || "").trim(),
      package: String(data.get("package") || "").trim(),
      conditionLevel: String(data.get("conditionLevel") || "").trim(),
      petHairLevel: String(data.get("petHairLevel") || "").trim(),
      sandLevel: String(data.get("sandLevel") || "").trim(),
      saltLevel: String(data.get("saltLevel") || "").trim(),
      bioLevel: String(data.get("bioLevel") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      estimateSummary: String(document.getElementById("estimateSummary")?.value || "").trim(),
      prepSummary: String(document.getElementById("prepSummary")?.value || "").trim(),
      firstDetailDiscount: Boolean(document.getElementById("firstDetailDiscount")?.checked),
      extras: Array.from(
        (extrasFieldset ? extrasFieldset.querySelectorAll("input[type='checkbox']:checked") : [])
      ).map((input) => input.value),
      prep: Array.from(
        (prepFieldset ? prepFieldset.querySelectorAll("input[type='checkbox']:checked") : [])
      ).map((input) => input.value)
    };
    saveQuoteDraft(draftValues);

    if (!quoteFormAction || !quoteFormAction.includes("submit-form.com")) {
      formMessage.textContent = "Form not connected. Call 734-419-1846 or DM @shine_n_time.";
      formMessage.style.color = "#b91c1c";
      return;
    }

    formMessage.textContent = "Sending your request…";
    formMessage.style.color = "#0f766e";

    // Formspark: real browser POST (HTML `action`). `submit()` does not re-dispatch the submit event.
    quoteForm.submit();
  });
}
