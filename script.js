const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("primaryNav");
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");

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
  quoteForm.addEventListener("submit", (event) => {
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

    const name = encodeURIComponent(String(data.get("name") || "").trim());
    const phone = encodeURIComponent(phoneValue || "Not provided");
    const email = encodeURIComponent(emailValue || "Not provided");
    const vehicle = encodeURIComponent(String(data.get("vehicle") || "").trim());
    const service = encodeURIComponent(String(data.get("service") || "").trim());
    const notes = encodeURIComponent(String(data.get("notes") || "").trim());

    const subject = encodeURIComponent("New Shine N Time Quote Request");
    const body = `Name: ${name}%0APhone: ${phone}%0AEmail: ${email}%0AVehicle: ${vehicle}%0AService: ${service}%0A%0ANotes:%0A${notes}`;
    const mailto = `mailto:quotes@shinentime.com?subject=${subject}&body=${body}`;

    formMessage.textContent = "Opening your email app to send the request...";
    formMessage.style.color = "#0f766e";
    window.location.href = mailto;
    quoteForm.reset();
  });
}
