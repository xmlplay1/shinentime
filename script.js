const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("primaryNav");
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");
const quoteEndpoint =
  quoteForm?.getAttribute("data-formspree-endpoint") ||
  quoteForm?.getAttribute("action") ||
  "";

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
      nav.classList.remove("open");
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
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
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

    if (!quoteEndpoint || quoteEndpoint.includes("REPLACE_WITH_YOUR_FORMSPREE_ID")) {
      formMessage.textContent = "Form is not connected yet. Add your Formspree URL in index.html to receive quote requests.";
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

      formMessage.textContent = "Thanks! Your quote request was sent. We will contact you soon.";
      formMessage.style.color = "#0f766e";
      quoteForm.reset();
    } catch (error) {
      formMessage.textContent = "Could not send right now. Please call 724-419-1846 or DM @shine_n_time on Instagram.";
      formMessage.style.color = "#b91c1c";
    }
  });
}
