const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("primaryNav");
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");
const editLastQuoteButton = document.getElementById("editLastQuoteBtn");
const pastWorkScroll = document.querySelector(".past-work-scroll");
const quoteEndpoint =
  quoteForm?.getAttribute("action") ||
  quoteForm?.dataset?.formspreeEndpoint ||
  "";
const QUOTE_STORAGE_KEY = "shine-n-time-last-quote";

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

if (pastWorkScroll) {
  let autoScrollTimer;
  let resumeTimer;
  const scrollStep = 1;
  const intervalMs = 28;

  const tick = () => {
    const maxScrollLeft = pastWorkScroll.scrollWidth - pastWorkScroll.clientWidth;
    if (pastWorkScroll.scrollLeft >= maxScrollLeft - 2) {
      pastWorkScroll.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    pastWorkScroll.scrollLeft += scrollStep;
  };

  const startAutoScroll = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    clearInterval(autoScrollTimer);
    autoScrollTimer = setInterval(tick, intervalMs);
  };

  const pauseAutoScroll = () => {
    clearInterval(autoScrollTimer);
  };

  const scheduleResume = () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(startAutoScroll, 2200);
  };

  startAutoScroll();

  pastWorkScroll.addEventListener("mouseenter", pauseAutoScroll);
  pastWorkScroll.addEventListener("mouseleave", startAutoScroll);
  pastWorkScroll.addEventListener("touchstart", pauseAutoScroll, { passive: true });
  pastWorkScroll.addEventListener("touchend", scheduleResume, { passive: true });
  pastWorkScroll.addEventListener("wheel", scheduleResume, { passive: true });
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
  const fields = ["name", "phone", "email", "vehicle", "service", "notes"];
  fields.forEach((field) => {
    const input = quoteForm.elements.namedItem(field);
    if (input && typeof values[field] === "string") {
      input.value = values[field];
    }
  });
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
    const requiredFields = ["name", "vehicle", "service"];
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
      vehicle: String(data.get("vehicle") || "").trim(),
      service: String(data.get("service") || "").trim(),
      notes: String(data.get("notes") || "").trim()
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
