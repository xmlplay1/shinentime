const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("primaryNav");
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("formMessage");
const quoteStepButtons = Array.from(document.querySelectorAll(".quote-step-btn"));
const quoteStepPanels = Array.from(document.querySelectorAll(".quote-step-panel"));
const quotePrevStepBtn = document.getElementById("quotePrevStep");
const quoteNextStepBtn = document.getElementById("quoteNextStep");
const quoteProgressFill = document.getElementById("quoteProgressFill");
let currentQuoteStep = 1;

// If requested EX/IN assets are missing in deployment, fall back automatically.
function applyImageFallbacks() {
  const images = Array.from(document.querySelectorAll("img[data-fallback-src]"));
  images.forEach((img) => {
    const fallbackSrc = String(img.getAttribute("data-fallback-src") || "").trim();
    if (!fallbackSrc) return;
    const applyFallback = () => {
      if (img.dataset.fallbackApplied === "1") return;
      img.dataset.fallbackApplied = "1";
      img.src = fallbackSrc;
    };
    img.addEventListener(
      "error",
      applyFallback,
      { once: true }
    );
    // If image already failed before listener attached, recover immediately.
    if (img.complete && (!img.naturalWidth || img.naturalWidth === 0)) {
      applyFallback();
    }
  });
}

applyImageFallbacks();

function initParallaxMotion() {
  const layers = Array.from(document.querySelectorAll("[data-parallax], .parallax-layer"));
  if (!layers.length) return;
  let ticking = false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return;
  const update = () => {
    const y = window.scrollY || 0;
    layers.forEach((el) => {
      const speed = Number.parseFloat(el.getAttribute("data-parallax-speed") || "0.08");
      const offset = Math.round(y * speed);
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
  update();
}

initParallaxMotion();

function initServiceTilt() {
  const cards = Array.from(document.querySelectorAll(".service-card"));
  if (!cards.length) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return;
  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--card-tilt-y", `${(x * 5).toFixed(2)}deg`);
      card.style.setProperty("--card-tilt-x", `${(-y * 5).toFixed(2)}deg`);
    });
    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--card-tilt-x", "0deg");
      card.style.setProperty("--card-tilt-y", "0deg");
    });
  });
}

initServiceTilt();

function getFormspreeEndpoint() {
  return (
    quoteForm?.dataset?.formspreeEndpoint?.trim() ||
    (String(quoteForm?.dataset?.quoteBackend || "formspree").toLowerCase() !== "formspark"
      ? quoteForm?.getAttribute("action")?.trim()
      : "") ||
    ""
  );
}

function getFormsparkEndpoint() {
  return quoteForm?.dataset?.formsparkEndpoint?.trim() || "";
}

/**
 * Mirror the quote to Formspark. Cross-origin fetch often fails for multipart;
 * we try full FormData first, then text-only + sendBeacon, then a real iframe POST.
 */
function formDataWithoutFiles(sourceForm) {
  const fd = new FormData(sourceForm);
  fd.delete("photo1");
  fd.delete("photo2");
  fd.delete("photo3");
  fd.append("_photosNote", "Photos were sent with the Formspree copy of this quote.");
  return fd;
}

function postFormDataViaHiddenIframe(url, formData) {
  return new Promise((resolve) => {
    const iframeName = `formspark_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.setAttribute("hidden", "");
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);

    const f = document.createElement("form");
    f.method = "POST";
    f.action = url;
    f.target = iframeName;
    f.enctype = "multipart/form-data";
    f.setAttribute("hidden", "");

    for (const [key, val] of formData.entries()) {
      if (val instanceof File) {
        continue;
      }
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(val);
      f.appendChild(input);
    }

    document.body.appendChild(f);
    f.submit();
    window.setTimeout(() => {
      f.remove();
      iframe.remove();
      resolve();
    }, 2500);
  });
}

async function mirrorToFormspark(sourceForm, url) {
  if (!url) return;

  const full = new FormData(sourceForm);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: full,
      mode: "cors",
      credentials: "omit"
    });
    if (res.ok) return;
  } catch (e) {
    // continue
  }

  const slim = formDataWithoutFiles(sourceForm);
  if (navigator.sendBeacon) {
    try {
      if (navigator.sendBeacon(url, slim)) return;
    } catch (e2) {
      // continue
    }
  }

  try {
    const res2 = await fetch(url, {
      method: "POST",
      body: slim,
      mode: "cors",
      credentials: "omit"
    });
    if (res2.ok) return;
  } catch (e3) {
    // continue
  }

  await postFormDataViaHiddenIframe(url, slim);
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
const submitEstimateRange = document.getElementById("submitEstimateRange");
const submitEstimateHint = document.getElementById("submitEstimateHint");
const QUOTE_STORAGE_KEY = "shine-n-time-last-quote";
let currentGalleryIndex = 0;
let currentZoom = 1;
function isFlyerOrBrandedLogoUrl(url) {
  const u = String(url || "").toLowerCase();
  if (!u) return true;
  if (u.includes("img_2868")) return true;
  if (u.includes("logo.png") || u.includes("logo.jpg") || u.includes("logo.jpeg")) return true;
  if (u.includes("logo-mark")) return true;
  if (u.includes("shinentime") && u.includes("logo")) return true;
  if (u.includes("shine-n-time") && u.includes("logo")) return true;
  if (u.includes("shinen") && u.includes("logo")) return true;
  return false;
}

function buildLogoCandidates() {
  const urls = [];
  const push = (url) => {
    const trimmed = String(url || "").trim();
    if (!trimmed || urls.includes(trimmed) || isFlyerOrBrandedLogoUrl(trimmed)) return;
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
    "logo.jpg",
    "logo.JPG",
    "logo.jpeg",
    "logo.JPEG",
    "logo-mark.png",
    "logo-mark.webp",
    "logo-1.png",
    "logo-2.png",
    "logo-3.png",
    "logo1.png",
    "logo2.png",
    "logo3.png"
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
  silver: { sedan: 37, suvTruck: 49 },
  gold: { sedan: 99, suvTruck: 115 },
  platinum: { sedan: 129, suvTruck: 149 }
};

function packageMenuLineFromForm(form) {
  const pkg = String(form.elements.namedItem("package")?.value || "")
    .trim()
    .toLowerCase();
  const rawVehicle = String(form.elements.namedItem("vehicleType")?.value || "")
    .trim()
    .toLowerCase();
  const vehicle =
    rawVehicle === "suv" || rawVehicle === "truck" || rawVehicle === "van" || rawVehicle.includes("suv")
      ? "suv"
      : rawVehicle === "sedan" || rawVehicle === "coupe"
        ? "sedan"
        : rawVehicle;
  const priceKey = vehicle === "suv" ? "suvTruck" : vehicle;
  const row = PACKAGE_PRICING[pkg];
  if (!row || !priceKey || row[priceKey] == null) {
    return "Pick vehicle size + package to see menu base.";
  }
  const label =
    pkg === "silver" ? "Silver" : pkg === "gold" ? "Gold" : pkg === "platinum" ? "Platinum" : pkg;
  const sizeLabel = vehicle === "suv" ? "SUV / truck / van" : "Sedan / coupe";
  const sedan = row.sedan;
  const suv = row.suvTruck;
  return `${label} menu: sedan $${sedan} · SUV/truck $${suv} (your pick: ${sizeLabel} → $${row[priceKey]} base)`;
}

const TWO_CAR_BUNDLE_DISCOUNT = 0.1;

const EXTRA_PRICING = {
  petHair: { low: 20, high: 20 },
  sandSalt: { low: 15, high: 15 },
  roadSalt: { low: 18, high: 18 },
  bioClean: { low: 35, high: 35 },
  smokeOdor: { low: 25, high: 25 },
  moldRisk: { low: 60, high: 60 },
  exteriorFoamWash: { low: 28, high: 40 },
  wheelDecon: { low: 20, high: 28 },
  spraySealant: { low: 25, high: 38 },
  bugTarRemoval: { low: 15, high: 25 },
  saltNeutralizer: { low: 18, high: 28 }
};

const SEVERITY_MULTIPLIER = {
  light: 1,
  medium: 1.35,
  heavy: 1.75
};

/** Pet hair, sand/mud, road salt, bio: no charge at "light" severity; medium/heavy add cost. */
const SEVERITY_GATED_EXTRAS = new Set(["petHair", "sandSalt", "roadSalt", "bioClean", "moldRisk"]);

function getSeverityForExtra(key) {
  if (key === "petHair") return String(document.getElementById("petHairLevel")?.value || "light");
  if (key === "sandSalt") return String(document.getElementById("sandLevel")?.value || "light");
  if (key === "roadSalt") return String(document.getElementById("saltLevel")?.value || "light");
  if (key === "bioClean") return String(document.getElementById("bioLevel")?.value || "light");
  if (key === "moldRisk") return String(document.getElementById("moldLevel")?.value || "light");
  return "medium";
}

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

// Smooth custom 1s anchor scrolling for on-page nav links.
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");
    if (!href || href === "#" || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY - 8;
    const duration = 1000;
    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(p);
      window.scrollTo(0, startY + (targetY - startY) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
});

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
  const fromTiles = Array.from(document.querySelectorAll(".gallery-tile"))
    .map((button) => {
      const img = button.querySelector("img");
      if (!img) return null;
      return {
        src: img.currentSrc || img.src,
        alt: img.alt || "Gallery photo"
      };
    })
    .filter(Boolean);
  if (fromTiles.length) return fromTiles;
  return Array.from(document.querySelectorAll(".ba-compare .ba-after"))
    .map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt || "After photo"
    }))
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

/** Before/After compare sliders (#gallery): auto-sweep until user drags; optional full screen into lightbox */
function initBeforeAfterSliders() {
  document.querySelectorAll(".ba-compare").forEach((fig, figIndex) => {
    const stage = fig.querySelector(".ba-stage");
    const wrap = fig.querySelector(".ba-before-wrap");
    const handle = fig.querySelector(".ba-handle");
    const afterImg = fig.querySelector(".ba-after");
    const beforeImg = fig.querySelector(".ba-before");
    const fsBtn = fig.querySelector(".ba-fullscreen");
    if (!stage || !wrap || !handle || !afterImg || !beforeImg) return;

    let pct = 50;
    let autoDir = 1;
    let rafId = null;
    let userInteracted = false;

    const apply = () => {
      stage.style.setProperty("--ba-split", `${pct}%`);
    };
    apply();

    const tick = () => {
      if (userInteracted) return;
      pct += autoDir * 0.2;
      if (pct >= 70) {
        pct = 70;
        autoDir = -1;
      }
      if (pct <= 30) {
        pct = 30;
        autoDir = 1;
      }
      apply();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const stopAuto = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };

    const setFromClientX = (clientX) => {
      const rect = stage.getBoundingClientRect();
      pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      apply();
    };

    const onPointerDown = (e) => {
      if (e.target.closest(".ba-fullscreen")) return;
      userInteracted = true;
      stopAuto();
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setFromClientX(e.clientX);
    };

    const onPointerMove = (e) => {
      if (!stage.hasPointerCapture(e.pointerId)) return;
      setFromClientX(e.clientX);
    };

    const onPointerUp = (e) => {
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);

    if (fsBtn && lightbox && lightboxImage) {
      fsBtn.addEventListener("click", () => {
        userInteracted = true;
        stopAuto();
        currentGalleryIndex = figIndex;
        currentZoom = 1;
        lightboxImage.src = afterImg.currentSrc || afterImg.src;
        lightboxImage.alt = afterImg.alt || "After photo";
        if (lightboxCaption) {
          lightboxCaption.textContent = `${fig.querySelector(".ba-label")?.textContent || "Before & After"} — after view (${figIndex + 1}/3)`;
        }
        lightboxImage.style.transform = "scale(1)";
        lightbox.hidden = false;
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");
      });
    }
  });
}

initBeforeAfterSliders();

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
  if (!vehicleType || !packageSelect || !estimateHidden) return;
  if (!estimateRange && !submitEstimateRange) return;

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
    if (estimateRange) {
      estimateRange.textContent = "—";
      estimateRange.classList.add("estimate-value--pending");
    }
    if (submitEstimateRange) {
      submitEstimateRange.textContent = "—";
      submitEstimateRange.classList.add("estimate-value--pending");
    }
    if (estimateBreakdown) estimateBreakdown.textContent = message;
    if (submitEstimateHint) submitEstimateHint.textContent = message;
    estimateHidden.value = "";
    const emailEstimate = document.getElementById("emailEstimate");
    if (emailEstimate) emailEstimate.value = "";
  };

  if (!vehicle || !pkg || !PACKAGE_PRICING[pkg] || !PACKAGE_PRICING[pkg][priceKey]) {
    setPendingEstimate("Pick vehicle size and package to see a ballpark range.");
    return;
  }

  estimateRange?.classList.remove("estimate-value--pending");
  submitEstimateRange?.classList.remove("estimate-value--pending");

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
      const severity = getSeverityForExtra(key);

      if (SEVERITY_GATED_EXTRAS.has(key)) {
        if (severity === "light") {
          extras.push(`${input.dataset.label || key} (light — included, no extra)`);
          return;
        }
        mult = SEVERITY_MULTIPLIER[severity] || SEVERITY_MULTIPLIER.medium;
      }

      const addLow = Math.round(pricing.low * mult);
      const addHigh = Math.round(pricing.high * mult);
      low += addLow;
      high += addHigh;
      const label = input.dataset.label || key;
      const severityLabel = SEVERITY_GATED_EXTRAS.has(key) || key === "moldRisk" ? severity : "add-on";
      extras.push(`${label} (${severityLabel})`);
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

  const rangeText = `$${low} - $${high}`;
  if (estimateRange) estimateRange.textContent = rangeText;
  if (submitEstimateRange) submitEstimateRange.textContent = rangeText;
  const extrasText = extras.length ? ` + extras: ${extras.join(", ")}` : "";
  const carsText = carCount > 1 ? ` for ${carCount} cars` : " for 1 car";
  const bundleText = bundleEligible ? ` Includes ${Math.round(TWO_CAR_BUNDLE_DISCOUNT * 100)}% bundle discount.` : "";
  const vehicleLabel = vehicle === "sedan" ? "Sedan / coupe" : "SUV / truck / van";
  const summaryText = `Estimated $${low} - $${high}. Base ${pkg.toUpperCase()} package for ${vehicleLabel}${carsText}${extrasText}.${bundleText} Final quote confirmed after inspection.`;
  const shortBreakdown = summaryText.replace(/^Estimated \$\d+ - \$\d+\. /, "");
  if (estimateBreakdown) {
    estimateBreakdown.textContent = shortBreakdown;
  }
  if (submitEstimateHint) {
    submitEstimateHint.textContent = shortBreakdown;
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
const moldLevelInput = document.getElementById("moldLevel");
function toggleExtraSeverityControls() {
  if (!extrasFieldset) return;
  const rows = Array.from(extrasFieldset.querySelectorAll(".extra-row"));
  rows.forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"][name="extras"]');
    const severityLabel = row.querySelector(".extra-sub");
    const severitySelect = row.querySelector("select");
    const enabled = Boolean(checkbox?.checked);
    if (severityLabel) severityLabel.hidden = !enabled;
    if (severitySelect) {
      severitySelect.hidden = !enabled;
      severitySelect.disabled = !enabled;
    }
  });
}

if (conditionLevelInput) conditionLevelInput.addEventListener("change", calculateEstimate);
if (firstDetailDiscountInput) firstDetailDiscountInput.addEventListener("change", calculateEstimate);
if (carCountInput) carCountInput.addEventListener("change", calculateEstimate);
if (petHairLevelInput) petHairLevelInput.addEventListener("change", calculateEstimate);
if (sandLevelInput) sandLevelInput.addEventListener("change", calculateEstimate);
if (roadSaltLevelInput) roadSaltLevelInput.addEventListener("change", calculateEstimate);
if (bioLevelInput) bioLevelInput.addEventListener("change", calculateEstimate);
if (moldLevelInput) moldLevelInput.addEventListener("change", calculateEstimate);
if (extrasFieldset) {
  extrasFieldset.addEventListener("change", () => {
    toggleExtraSeverityControls();
    calculateEstimate();
  });
  toggleExtraSeverityControls();
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
    "moldLevel",
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

if (quoteForm) {
  const QUOTE_TOTAL_STEPS = 4;
  const requiredByStep = {
    1: ["name"],
    2: ["serviceFocus", "serviceScope", "package", "conditionLevel", "vehicle", "vehicleType", "zipCode"],
    3: ["appointmentDate"],
    4: []
  };

  function labelForSelect(id) {
    const el = document.getElementById(id);
    if (!el || el.tagName !== "SELECT") return "";
    const opt = el.options[el.selectedIndex];
    return opt ? String(opt.textContent || "").trim() : "";
  }

  function buildQuoteConfirmSummary() {
    const box = document.getElementById("quoteConfirmSummary");
    if (!box) return;
    const fd = new FormData(quoteForm);
    const get = (k) => String(fd.get(k) || "").trim();
    const extras = Array.from(quoteForm.querySelectorAll('#extrasFieldset input[name="extras"]:checked')).map(
      (input) => input.dataset.label || input.value
    );
    const prep = Array.from(quoteForm.querySelectorAll('#prepFieldset input[name="prep"]:checked')).map((input) => {
      const lab = input.closest("label");
      return lab ? lab.textContent.trim() : input.value;
    });
    const rows = [
      ["Contact", [get("name"), get("phone"), get("email")].filter(Boolean).join(" · ")],
      ["Vehicle", [get("vehicle"), get("vehicleType") ? labelForSelect("vehicleType") : "", get("zipCode")].filter(Boolean).join(" · ")],
      ["Cars", get("carCount") ? `${get("carCount")} car(s)` : ""],
      ["Service", [labelForSelect("serviceFocus"), labelForSelect("serviceScope"), labelForSelect("package")].filter(Boolean).join(" · ")],
      ["Package menu (base)", packageMenuLineFromForm(quoteForm)],
      ["Condition", labelForSelect("conditionLevel")],
      ["Date & time", [get("appointmentDate"), get("timeWindow")].filter(Boolean).join(" · ")],
      ["Notes", get("notes")],
      ["Extras", extras.length ? extras.join(", ") : "None selected"],
      ["Prep", prep.length ? prep.join(", ") : "None checked"],
      ["Estimate", String(document.getElementById("estimateSummary")?.value || "").trim() || "—"]
    ];
    box.innerHTML = rows
      .filter(([, val]) => val)
      .map(
        ([k, v]) =>
          `<div><dt>${k}</dt><dd>${String(v)
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</dd></div>`
      )
      .join("");
  }

  function showQuoteStep(step) {
    currentQuoteStep = Math.max(1, Math.min(QUOTE_TOTAL_STEPS, step));
    quoteForm.dataset.quoteStep = String(currentQuoteStep);
    quoteStepPanels.forEach((panel) => {
      const panelStep = Number(panel.getAttribute("data-step") || "1");
      const isActivePanel = panelStep === currentQuoteStep;
      panel.hidden = !isActivePanel;
      panel.classList.toggle("is-active", isActivePanel);
    });
    quoteStepButtons.forEach((button) => {
      const isActive = Number(button.dataset.stepTrigger || "1") === currentQuoteStep;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });
    if (quotePrevStepBtn) quotePrevStepBtn.disabled = currentQuoteStep === 1;
    if (quoteNextStepBtn) {
      const isConfirmStep = currentQuoteStep === QUOTE_TOTAL_STEPS;
      quoteNextStepBtn.hidden = isConfirmStep;
      quoteNextStepBtn.disabled = isConfirmStep;
      quoteNextStepBtn.setAttribute("aria-hidden", isConfirmStep ? "true" : "false");
      quoteNextStepBtn.tabIndex = isConfirmStep ? -1 : 0;
    }
    if (quoteProgressFill) {
      const width = ((currentQuoteStep - 1) / (QUOTE_TOTAL_STEPS - 1)) * 100;
      quoteProgressFill.style.width = `${width}%`;
    }
    if (currentQuoteStep === 4) {
      calculateEstimate();
      buildQuoteConfirmSummary();
    }
  }

  function validateStep(step) {
    const required = requiredByStep[step] || [];
    for (const name of required) {
      const input = quoteForm.elements.namedItem(name);
      const value = String(input?.value || "").trim();
      if (!value) {
        formMessage.textContent = "Please complete this step before moving on.";
        formMessage.style.color = "#b91c1c";
        input?.focus?.();
        return false;
      }
    }
    if (step === 1) {
      const phone = String(quoteForm.elements.namedItem("phone")?.value || "").trim();
      const email = String(quoteForm.elements.namedItem("email")?.value || "").trim();
      if (!phone && !email) {
        formMessage.textContent = "Leave at least phone or email so we can reply.";
        formMessage.style.color = "#b91c1c";
        quoteForm.elements.namedItem("phone")?.focus?.();
        return false;
      }
    }
    if (step === 4) {
      const ack = document.getElementById("quoteConfirmAck");
      if (!ack || ack.type !== "checkbox" || !ack.checked) {
        formMessage.textContent = "Please confirm your details with the checkbox before sending.";
        formMessage.style.color = "#b91c1c";
        ack?.focus?.();
        return false;
      }
    }
    formMessage.textContent = "";
    return true;
  }

  quoteStepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetStep = Number(button.dataset.stepTrigger || "1");
      if (targetStep <= currentQuoteStep + 1) {
        if (targetStep > currentQuoteStep && !validateStep(currentQuoteStep)) return;
        showQuoteStep(targetStep);
      }
    });
  });

  quotePrevStepBtn?.addEventListener("click", () => {
    showQuoteStep(currentQuoteStep - 1);
  });
  quoteNextStepBtn?.addEventListener("click", () => {
    if (!validateStep(currentQuoteStep)) return;
    showQuoteStep(currentQuoteStep + 1);
  });
  showQuoteStep(1);

  // Hide severity controls unless corresponding extra checkbox is checked.
  const extraRows = Array.from(quoteForm.querySelectorAll(".extra-row"));
  const toggleExtraSeverity = () => {
    extraRows.forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const severityLabel = row.querySelector(".extra-sub");
      const severitySelect = row.querySelector("select");
      const active = Boolean(checkbox?.checked);
      if (severityLabel) severityLabel.hidden = !active;
      if (severitySelect) severitySelect.hidden = !active;
    });
  };
  extrasFieldset?.addEventListener("change", toggleExtraSeverity);
  toggleExtraSeverity();

  quoteForm.addEventListener("input", () => {
    if (Number(quoteForm.dataset.quoteStep) === 4) buildQuoteConfirmSummary();
  });
  quoteForm.addEventListener("change", () => {
    if (Number(quoteForm.dataset.quoteStep) === 4) buildQuoteConfirmSummary();
  });

  if (editLastQuoteButton) {
    editLastQuoteButton.addEventListener("click", () => {
      const draft = loadQuoteDraft();
      if (!draft) {
        formMessage.textContent = "No previous quote found yet. Submit one first.";
        formMessage.style.color = "#b91c1c";
        return;
      }
      fillQuoteForm(draft);
      const ack = document.getElementById("quoteConfirmAck");
      if (ack && "checked" in ack) ack.checked = false;
      showQuoteStep(1);
      formMessage.textContent = "Last quote loaded. Review each step, then confirm on step 4.";
      formMessage.style.color = "#0f766e";
    });
  }

  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (Number(quoteForm.dataset.quoteStep) !== QUOTE_TOTAL_STEPS) {
      formMessage.textContent = "Go to the last step to review and send your quote.";
      formMessage.style.color = "#b91c1c";
      showQuoteStep(QUOTE_TOTAL_STEPS);
      return;
    }
    if (!validateStep(4)) return;
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
      moldLevel: String(data.get("moldLevel") || "").trim(),
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

    const formspreeUrl = getFormspreeEndpoint();
    const formsparkUrl = getFormsparkEndpoint();
    const backend = String(quoteForm.dataset.quoteBackend || "formspree").toLowerCase();

    if (backend === "formspark") {
      if (!formsparkUrl) {
        formMessage.textContent = "Form not connected. Call 734-419-1846 or DM @shine_n_time.";
        formMessage.style.color = "#b91c1c";
        return;
      }
    } else if (!formspreeUrl) {
      formMessage.textContent = "Form not connected. Call 734-419-1846 or DM @shine_n_time.";
      formMessage.style.color = "#b91c1c";
      return;
    }

    const submitBtn = document.getElementById("submitBtn");
    const editBtn = document.getElementById("editLastQuoteBtn");
    const originalSubmitText = submitBtn?.textContent || "Send Quote Request";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="btn-spinner" aria-hidden="true"></span><span>Sending to Shine N Time System...</span>';
    }
    if (editBtn) editBtn.disabled = true;
    formMessage.textContent = "Sending your request…";
    formMessage.style.color = "#0f766e";

    try {
      if (backend === "formspark") {
        const fd = new FormData(quoteForm);
        const response = await fetch(formsparkUrl, { method: "POST", body: fd });
        if (!response.ok) throw new Error("Request failed");
      } else {
        const fdSpree = new FormData(quoteForm);
        const spreeRes = await fetch(formspreeUrl, {
          method: "POST",
          body: fdSpree,
          headers: { Accept: "application/json" }
        });
        if (!spreeRes.ok) throw new Error("Formspree failed");

        if (formsparkUrl) {
          mirrorToFormspark(quoteForm, formsparkUrl).catch(() => {});
        }
      }

      const quoteShell = quoteForm.closest(".quote-shell") || quoteForm.parentElement;
      if (quoteShell) {
        quoteShell.innerHTML = `
          <div class="quote-success card reveal visible" role="status" aria-live="polite">
            <p class="section-tagline">Request Received</p>
            <h3>Request Received! Our system is reviewing your car&apos;s condition—we will text you shortly.</h3>
            <p>Need immediate help? <a href="tel:+17344191846">Call 734-419-1846</a>.</p>
          </div>
        `;
      } else {
        formMessage.textContent =
          "Request Received! Our system is reviewing your car's condition—we will text you shortly.";
        formMessage.style.color = "#0f766e";
      }
    } catch (error) {
      formMessage.textContent = "Could not send right now. Call 734-419-1846 or DM @shine_n_time.";
      formMessage.style.color = "#b91c1c";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalSubmitText;
      }
      if (editBtn) editBtn.disabled = false;
    }
  });
}
