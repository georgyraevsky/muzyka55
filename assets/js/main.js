/* ============================================================
   Георгий Раевский · живая музыка в Омске
   Без зависимостей. Анимируются только transform и opacity.
   ============================================================ */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Появление блоков при скролле ---------- */
  const revealItems = document.querySelectorAll(".reveal, .reveal-scale");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-in"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0 }
    );
    revealItems.forEach((el) => revealObserver.observe(el));

    // если человек домотал до самого низа — показываем всё оставшееся
    const revealAll = () => {
      if (window.scrollY + window.innerHeight < document.body.scrollHeight - 4) return;
      revealItems.forEach((el) => {
        el.classList.add("is-in");
        revealObserver.unobserve(el);
      });
    };

    window.addEventListener("scroll", revealAll, { passive: true });
    window.addEventListener("resize", revealAll, { passive: true });
  }

  /* ---------- 2. Промо-видео: кнопка Play поверх обложки ---------- */
  const promo = document.getElementById("promoVideo");
  const facade = document.getElementById("videoFacade");

  if (promo && facade) {
    const hideFacade = () => facade.classList.add("hidden");
    const showFacade = () => facade.classList.remove("hidden");

    facade.addEventListener("click", () => {
      promo.play();
    });
    promo.addEventListener("play", hideFacade);
    promo.addEventListener("pause", showFacade);
    promo.addEventListener("ended", showFacade);
  }

  /* ---------- 3. Одновременно звучит только одно видео ---------- */
  const allVideos = Array.from(document.querySelectorAll("video"));

  allVideos.forEach((video) => {
    video.addEventListener("play", () => {
      allVideos.forEach((other) => {
        if (other !== video && !other.paused) other.pause();
      });
    });
  });

  /* ---------- 4. Мобильное меню: полноэкранный слой + морф гамбургера ---------- */
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (navToggle && mobileMenu) {
    const setMenu = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      mobileMenu.classList.toggle("is-open", open);
      mobileMenu.classList.toggle("invisible", !open);
      mobileMenu.classList.toggle("opacity-0", !open);
      mobileMenu.classList.toggle("pointer-events-none", !open);
      document.body.style.overflow = open ? "hidden" : "";
      if (open) mobileMenu.querySelector("a")?.focus({ preventScroll: true });
    };

    setMenu(false);
    navToggle.setAttribute("aria-expanded", "false");

    navToggle.addEventListener("click", () => {
      setMenu(navToggle.getAttribute("aria-expanded") !== "true");
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (navToggle.getAttribute("aria-expanded") !== "true") return;
      setMenu(false);
      navToggle.focus({ preventScroll: true });
    });
  }

  /* ---------- 5. Год в подвале ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();