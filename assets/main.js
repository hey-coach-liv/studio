// Every buy/book/waitlist button reads its URL from here.
// When Stan Store is live, paste each product link below. Nothing else needs editing.
const LINKS = {
  book30: "https://calendly.com/oyong-work/30min",
  book60: "https://calendly.com/oyong-hba2027-ivey/60-min",
  interviewGuide: "https://docs.google.com/forms/d/e/1FAIpQLScK9f9WobmKw14OIl_dAoKfqgy4DWO1CE5s0FlfxVptmKbl6Q/viewform",
  waitlist: "https://forms.gle/zMGZJQcMr5tQE6yZ8",
  pkgInterview: "mailto:oyong.partner@gmail.com?subject=Interview%20Ready%20package",
  pkgEssentials: "mailto:oyong.partner@gmail.com?subject=Application%20Essentials%20package",
  pkgJourney: "mailto:oyong.partner@gmail.com?subject=Full%20Application%20Journey%20package",
  portfolio: "/",
  instagram: "https://www.instagram.com/hey.coach.liv/",
  tiktok: "https://www.tiktok.com/@hey.coach.liv",
  email: "mailto:oyong.partner@gmail.com"
};

document.querySelectorAll("[data-link]").forEach((el) => {
  const url = LINKS[el.dataset.link];
  if (!url) return;
  el.href = url;
  if (url.startsWith("http")) {
    el.target = "_blank";
    el.rel = "noopener";
  }
});

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
    toggle.textContent = open ? "Close" : "Menu";
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
