const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("primaryNav");
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");
const editLastQuoteButton = document.getElementById("editLastQuoteBtn");
const pastWorkScroll = document.querySelector(".past-work-scroll");
const galleryButtons = Array.from(document.querySelectorAll(".work-card-btn"));
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxZoomIn = document.getElementById("zoomInBtn");
const lightboxZoomOut = document.getElementById("zoomOutBtn");
const lightboxZoomReset = document.getElementById("zoomResetBtn");
const vehicleType = document.getElementById("vehicleType");
const packageSelect = document.getElementById("package");
const extrasFieldset = document.getElementById("extrasFieldset");
const estimateRange = document.getElementById("estimateRange");
const estimateBreakdown = document.getElementById("estimateBreakdown");
const estimateHidden = document.getElementById("estimateValue");
const quoteEndpoint =
  quoteForm?.getAttribute("action") ||
  quoteForm?.dataset?.formspreeEndpoint ||
  "";
const QUOTE_STORAGE_KEY = "shine-n-time-last-quote";
let currentGalleryIndex = 0;
let currentZoom = 1;
let pastWorkAutoScrollKilled = false;
let stopPastWorkAutoScroll = null;

const PACKAGE_PRICING = {
  silver: { sedan: 49, suvTruck: 59 },
  gold: { sedan: 125, suvTruck: 140 },
  platinum: { sedan: 160, suvTruck: 180 }
};

const EXTRA_PRICING = {
  petHair: { low: 20, high: 45 },
  heavyStains: { low: 25, high: 60 },
  bioClean: { low: 30, high: 85 },
  smokeOdor: { low: 25, high: 70 },
  sandSalt: { low: 15, high: 35 },
  moldRisk: { low: 45, high: 140 }
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

if (pastWorkScroll && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const originalCards = Array.from(pastWorkScroll.children);
  originalCards.forEach((card) => pastWorkScroll.appendChild(card.cloneNode(true)));

  let animationFrame = null;
  let resumeTimer = null;
  let lastTime = 0;
  let paused = false;
  const speedPxPerSecond = window.matchMedia("(max-width: 760px)").matches ? 16 : 22;

  const step = (timestamp) => {
    if (!lastTime) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (!paused && !pastWorkAutoScrollKilled) {
      pastWorkScroll.scrollLeft += speedPxPerSecond * delta;
      const resetPoint = pastWorkScroll.scrollWidth / 2;
      if (pastWorkScroll.scrollLeft >= resetPoint) {
        pastWorkScroll.scrollLeft -= resetPoint;
      }
    }

    animationFrame = window.requestAnimationFrame(step);
  };

  const pause = () => {
    paused = true;
    pastWorkScroll.classList.add("is-paused");
  };

  const resume = () => {
    if (pastWorkAutoScrollKilled) return;
    paused = false;
    pastWorkScroll.classList.remove("is-paused");
  };

  const resumeSoon = () => {
    if (pastWorkAutoScrollKilled) return;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(resume, 1800);
  };

  stopPastWorkAutoScroll = () => {
    pastWorkAutoScrollKilled = true;
    pause();
  };

  animationFrame = window.requestAnimationFrame(step);
  pastWorkScroll.addEventListener("mouseenter", pause);
  pastWorkScroll.addEventListener("mouseleave", resume);
  pastWorkScroll.addEventListener("touchstart", pause, { passive: true });
  pastWorkScroll.addEventListener("touchend", resumeSoon, { passive: true });
  pastWorkScroll.addEventListener("wheel", resumeSoon, { passive: true });
  window.addEventListener("pagehide", () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(resumeTimer);
  });
}

function getGalleryItems() {
  return Array.from(document.querySelectorAll(".work-card-btn"))
    .map((button) => {
      const img = button.querySelector("img");
      if (!img) return null;
      return {
        src: img.currentSrc || img.src,
        alt: img.alt || "Past work photo"
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
  if (typeof stopPastWorkAutoScroll === "function") {
    stopPastWorkAutoScroll();
  }
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
  if (!vehicleType || !packageSelect || !estimateRange || !estimateBreakdown || !estimateHidden) return;

  const vehicle = vehicleType.value;
  const pkg = packageSelect.value;
  if (!vehicle || !pkg || !PACKAGE_PRICING[pkg]) {
    estimateRange.textContent = "$0 - $0";
    estimateBreakdown.textContent = "Choose vehicle type + package to see estimate.";
    estimateHidden.value = "";
    return;
  }

  let low = PACKAGE_PRICING[pkg][vehicle];
  let high = PACKAGE_PRICING[pkg][vehicle];
  const extras = [];

  if (extrasFieldset) {
    const checked = Array.from(extrasFieldset.querySelectorAll("input[type='checkbox']:checked"));
    checked.forEach((input) => {
      const key = input.value;
      const pricing = EXTRA_PRICING[key];
      if (!pricing) return;
      low += pricing.low;
      high += pricing.high;
      extras.push(input.dataset.label || key);
    });
  }

  estimateRange.textContent = `$${low} - $${high}`;
  const extrasText = extras.length ? ` + extras: ${extras.join(", ")}` : "";
  estimateBreakdown.textContent = `Base ${pkg.toUpperCase()} package for ${vehicle === "sedan" ? "Sedan" : "SUV/Truck"}${extrasText}. Final quote confirmed after inspection.`;
  estimateHidden.value = `${low}-${high}`;
}

if (vehicleType) vehicleType.addEventListener("change", calculateEstimate);
if (packageSelect) packageSelect.addEventListener("change", calculateEstimate);
if (extrasFieldset) {
  extrasFieldset.addEventListener("change", calculateEstimate);
}
calculateEstimate();

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
    "preferredDate",
    "vehicle",
    "vehicleType",
    "package",
    "service",
    "notes",
    "estimateValue"
  ];
  fields.forEach((field) => {
    const input = quoteForm.elements.namedItem(field);
    if (input && typeof values[field] === "string") {
      input.value = values[field];
    }
  });

  if (extrasFieldset && Array.isArray(values.extras)) {
    const checkboxes = Array.from(extrasFieldset.querySelectorAll("input[type='checkbox']"));
    checkboxes.forEach((checkbox) => {
      checkbox.checked = values.extras.includes(checkbox.value);
    });
  }
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
  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(quoteForm);
    const requiredFields = ["name", "vehicle", "vehicleType", "package", "service"];
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

    const draftValues = {
      name: String(data.get("name") || "").trim(),
      phone: phoneValue,
      email: emailValue,
      preferredDate: String(data.get("preferredDate") || "").trim(),
      vehicle: String(data.get("vehicle") || "").trim(),
      vehicleType: String(data.get("vehicleType") || "").trim(),
      package: String(data.get("package") || "").trim(),
      service: String(data.get("service") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      estimateValue: String(data.get("estimateValue") || "").trim(),
      extras: Array.from(
        (extrasFieldset ? extrasFieldset.querySelectorAll("input[type='checkbox']:checked") : [])
      ).map((input) => input.value)
    };
    saveQuoteDraft(draftValues);

    if (!quoteEndpoint) {
      formMessage.textContent = "Form not connected. Call 724-419-1846 or DM @shine_n_time.";
      formMessage.style.color = "#b91c1c";
      return;
    }

    formMessage.textContent = "Sending your request...";
    formMessage.style.color = "#0f766e";

    try {
      const response = await fetch(quoteEndpoint, {
        method: "POST",
        body: data,
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      formMessage.textContent = "Thanks! Quote sent. We will reach out soon.";
      formMessage.style.color = "#0f766e";
    } catch (error) {
      formMessage.textContent = "Could not send right now. Call 724-419-1846 or DM @shine_n_time.";
      formMessage.style.color = "#b91c1c";
    }
  });
}
