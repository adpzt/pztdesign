/* pztdesign · V1 slides
   Chaque bloc Behance est reconstruit en plans (calques regroupés) positionnés
   dans le repère de la slide d'origine. Les plans bougent à des vitesses
   différentes au défilement (parallaxe) et apparaissent à l'entrée. */
(() => {
  const page = document.getElementById("page");
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pct = (v, total) => (v / total * 100) + "%";

  // ---------- construction ----------
  // les calques se chargent deux écrans avant d'arriver à l'écran
  const charger = img => {
    if (img.dataset.srcset) { img.sizes = img.dataset.sizes; img.srcset = img.dataset.srcset; }
    img.src = img.dataset.src;
  };
  const prechargeur = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { charger(e.target); prechargeur.unobserve(e.target); } });
  }, { rootMargin: "200% 0px" });
  // version légère (_m, moitié de la taille) pour les petits écrans : le navigateur choisit seul
  // f = part de la largeur de la slide occupée par l'image
  function leger(img, chemin, w, f) {
    if (!chemin.endsWith(".webp")) return;
    img.dataset.f = f;
    img.dataset.srcset = `${chemin.replace(/\.webp$/, "_m.webp")} ${Math.round(w / 2)}w, ${chemin.replace(/\.webp$/, "_l.webp")} ${Math.round(w * 2 / 3)}w, ${chemin} ${w}w`;
    img.dataset.sizes = `(max-width: 767px) ${(f * 100).toFixed(2)}vw, ${(f * 85).toFixed(2)}vw`;
  }
  function plan(p, m, dossier) {
    const el = document.createElement("div");
    el.className = "plan" + (p.blend === "multiply" ? " plan--multiply" : "");
    el.dataset.depth = p.depth || 0;
    el.dataset.role = p.role || "visuel";
    el.dataset.id = p.id;
    if (p.suit) el.dataset.suit = p.suit;
    el.style.left = pct(p.x, m.w);
    el.style.top = pct(p.y, m.h);
    el.style.width = pct(p.w, m.w);
    if (p.svg === "etoile") { // étoile pzt en vectoriel (entière, jamais coupée)
      el.innerHTML = '<svg viewBox="0 0 100 100" style="display:block;width:100%;height:auto;fill:var(--pzt)"><use href="#etoile"/></svg>';
      return el;
    }
    const img = new Image();
    img.alt = "";
    img.width = p.w; img.height = p.h;
    img.decoding = "async";
    img.dataset.src = `assets/slides/${dossier}/${p.src}`;
    leger(img, img.dataset.src, p.w, p.w / m.w);
    prechargeur.observe(img);
    el.appendChild(img);
    return el;
  }

  function slidePlans(b) {
    const m = b.manifest;
    const s = document.createElement("section");
    s.className = "slide";
    s.id = b.id;
    s.style.aspectRatio = `${m.w} / ${m.h}`;
    m.planes.forEach(p => s.appendChild(plan(p, m, b.id)));
    // textes vivants (police du site), position = ligne de base dans le repère du canevas
    (m.textes || []).forEach(t => {
      const el = document.createElement("div");
      el.className = "plan plan--texte";
      el.dataset.role = "texte"; el.dataset.depth = 0;
      el.style.left = pct(t.x, m.w); el.style.top = pct(t.base, m.h);
      el.innerHTML = `<span style="font-size:calc(${t.size} / ${m.w} * 100cqw);font-weight:${t.weight || 500}${t.color ? ";color:" + t.color : ""}">${t.txt}</span>`;
      s.appendChild(el);
    });
    (m.liens || []).forEach(l => {
      const a = document.createElement("a");
      a.className = "lien";
      a.href = l.href;
      a.setAttribute("aria-label", l.label || l.href);
      a.style.left = pct(l.x, m.w); a.style.top = pct(l.y, m.h);
      a.style.width = pct(l.w, m.w); a.style.height = pct(l.h, m.h);
      s.appendChild(a);
    });
    return s;
  }

  function slidePresentation(b) {
    // version freelance (slide2.psd, 3838 x 2159) : photo en calque, textes vivants
    const W = 3838, H = 2159;
    const s = slidePlans(b);
    const t = (cls, x, baseline, html, tag = "div") => {
      const el = document.createElement(tag);
      el.className = "pres__txt " + cls;
      el.style.left = pct(x, W);
      el.style.top = pct(baseline, H);
      el.style.transform = "translateY(-0.8em)"; // ligne de base Photoshop -> haut du bloc
      el.innerHTML = html;
      s.appendChild(el);
      return el;
    };
    t("pres__nom pres__nom--prenom", 1132, 1297.2, "ADRIEN");
    t("pres__nom pres__nom--famille", 972.1, 1431.1, "POIZAT");
    const mail = t("pres__mail", 1405.1, 1857.3, "pztcontactpro@gmail.com", "a");
    mail.href = "mailto:pztcontactpro@gmail.com";
    t("pres__desc", 1404.9, 1988.9,
      "Graphiste &amp; DA freelance, je conçois des identités visuelles, des campagnes publicitaires<br>et des contenus créatifs pour des marques qui veulent se démarquer.");

    const roles = ["Motion Design", "Graphic Design", "Art Director"];
    const box = document.createElement("div");
    box.className = "roles";
    const ul = document.createElement("ul");
    ul.className = "roles__liste";
    const tour = [...roles, ...roles, ...roles]; // liste répétée pour boucler sans saut
    tour.forEach(r => { const li = document.createElement("li"); li.className = "roles__item"; li.innerHTML = `<span>${r}</span>`; ul.appendChild(li); });
    box.appendChild(ul);
    s.appendChild(box);
    const puce = document.createElement("div");
    puce.className = "roles__puce";
    s.appendChild(puce);
    s._roles = { ul, puce, n: roles.length };
    return s;
  }

  // bloc vidéo (anciens GIF de Behance, convertis en MP4 en boucle)
  function slideVideo(b) {
    const s = document.createElement("section");
    s.className = "slide slide--video" + (b.clair ? " slide--clair" : "");
    s.id = b.id;
    s.style.aspectRatio = `${b.w} / ${b.h}`;
    const v = document.createElement("video");
    v.className = "slide__video";
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.preload = "none";
    v.poster = `assets/videos/${b.src}.webp`;
    v.src = `assets/videos/${b.src}.mp4`;
    s.appendChild(v);
    // lecture seulement quand le bloc est à l'écran
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { v.play().catch(() => {}); } else { v.pause(); }
    }, { rootMargin: "200px 0px" }).observe(s);
    return s;
  }

  // vidéo motion (YouTube sur Behance) : aperçu muet en boucle, clic = vidéo complète avec le son
  function slideLecteur(b) {
    const s = slideVideo({ ...b, src: b.src + "_apercu", w: 16, h: 9 });
    s.classList.add("slide--lecteur");
    s.querySelector("video").poster = `assets/videos/${b.src}.webp`;
    const btn = document.createElement("button");
    btn.className = "lecteur__btn";
    btn.type = "button";
    btn.innerHTML = `<span class="lecteur__play" aria-hidden="true"></span><span class="lecteur__titre">${b.titre}</span>`;
    btn.setAttribute("aria-label", "Lire la vidéo : " + b.titre);
    s.appendChild(btn);
    s.addEventListener("click", () => ouvrirVideo(b));
    return s;
  }

  // fenêtre vidéo par-dessus la page (la page reste visible derrière, floutée)
  function ouvrirVideo(b) {
    if (window.__suivi) window.__suivi("video", b.titre);
    const box = document.createElement("div");
    box.className = "pop";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", b.titre);
    box.innerHTML = `<div class="pop__cadre">
        <video class="pop__video" src="assets/videos/${b.src}.mp4" poster="assets/videos/${b.src}.webp" controls autoplay playsinline preload="auto"></video>
        <p class="pop__titre">${b.titre}</p>
        <button class="pop__fermer" type="button"><span aria-hidden="true">✕</span> Fermer</button>
      </div>`;
    const video = box.querySelector("video");
    const fermer = () => {
      video.pause();
      box.classList.remove("is-ouvert");
      setTimeout(() => box.remove(), 300);
      document.removeEventListener("keydown", esc);
      if (window.__lenis) window.__lenis.start();
      document.documentElement.classList.remove("pop-ouvert");
    };
    const esc = e => { if (e.key === "Escape") fermer(); };
    box.addEventListener("click", e => { if (e.target === box || e.target.closest(".pop__fermer")) fermer(); });
    document.addEventListener("keydown", esc);
    document.body.appendChild(box);
    if (window.__lenis) window.__lenis.stop();
    document.documentElement.classList.add("pop-ouvert");
    requestAnimationFrame(() => box.classList.add("is-ouvert"));
    box.querySelector(".pop__fermer").focus({ preventScroll: true });
  }

  // deux vidéos côte à côte sur une même ligne
  function slideDuo(b) {
    const s = document.createElement("section");
    s.className = "slide slide--duo";
    s.id = b.id;
    b.items.forEach(it => s.appendChild(slideLecteur(it)));
    return s;
  }

  // bloc image simple (slides qui n'existent qu'en export plat)
  function slideImage(b) {
    const s = document.createElement("section");
    s.className = "slide slide--image";
    s.id = b.id;
    s.style.aspectRatio = `${b.w} / ${b.h}`;
    const img = new Image();
    img.className = "slide__video";
    img.dataset.src = `assets/images/${b.src}.webp`;
    leger(img, img.dataset.src, b.w, 1);
    prechargeur.observe(img);
    img.alt = b.alt || "";
    img.width = b.w; img.height = b.h;
    img.loading = "lazy"; img.decoding = "async";
    s.appendChild(img);
    return s;
  }

  // fin : merci + « Un projet en tête ? Parlons-en. » sur un seul écran (repère 1920 x 1080)
  function slideFin(b) {
    const s = document.createElement("section");
    s.className = "slide slide--fin";
    s.id = b.id;
    s.style.aspectRatio = "1920 / 1080";
    s.innerHTML = `
      <div class="plan fin__etoile" data-role="etoile" data-depth="0.35"><svg viewBox="0 0 100 100"><use href="#etoile"/></svg></div>
      <div class="plan fin__merci" data-role="texte"><img src="assets/slides/merci/texte.svg" alt="pztdesign, merci" width="940" height="330"></div>
      <div class="plan fin__bloc" data-role="texte"><div>
        <p class="fin__question">Un projet en tête ?</p>
        <p class="fin__titre">Parlons-en.</p>
        <div class="fin__actions">
          <a class="fin__bouton" href="mailto:pztcontactpro@gmail.com"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#etoile"/></svg>Écrire à Adrien</a>
          <a class="fin__mail" href="mailto:pztcontactpro@gmail.com">pztcontactpro@gmail.com</a>
        </div>
      </div></div>
      <p class="plan fin__pied" data-role="texte"><span>pztdesign · Graphiste &amp; DA freelance<span class="fin__lieu"><span class="fin__sep"> · </span>Paris, France</span></span></p>`;
    return s;
  }

  const blocs = window.PZT_BLOCS || [];
  blocs.forEach(b => {
    const s = b.type === "presentation" ? slidePresentation(b)
            : b.type === "video" ? slideVideo(b)
            : b.type === "image" ? slideImage(b)
            : b.type === "lecteur" ? slideLecteur(b)
            : b.type === "duo" ? slideDuo(b)
            : b.type === "fin" ? slideFin(b) : slidePlans(b);
    page.appendChild(s);
  });

  // ---------- animation des rôles (reprend le GIF de Behance) ----------
  function animerRoles(s) {
    const { ul, puce, n } = s._roles;
    const items = [...ul.children];
    let i = n + 1; // « Graphic Design » au centre, comme sur la slide
    const pas = () => items[0].getBoundingClientRect().height;
    const placer = (k, anim) => {
      const y = -(k - 1) * pas();
      items.forEach((li, j) => {
        const actif = j === k;
        const v = { color: actif ? "#000" : "#ececec", scale: actif ? 1 : 0.913 };
        if (anim) gsap.to(li.firstChild, { ...v, duration: 0.55, ease: "power2.inOut" });
        else gsap.set(li.firstChild, v);
      });
      if (anim) gsap.to(ul, { y, duration: 0.55, ease: "power3.inOut" });
      else gsap.set(ul, { y });
    };
    placer(i, false);
    if (reduit) return;
    setInterval(() => {
      i += 1;
      // la puce se replie en losange pendant le changement, comme sur le GIF de Behance
      gsap.timeline()
        .to(puce, { scale: 0.45, rotation: 45, duration: 0.28, ease: "power2.in" })
        .to(puce, { scale: 1, rotation: 90, duration: 0.3, ease: "power2.out" })
        .set(puce, { rotation: 0 });
      placer(i, true);
      if (i >= n * 2 + 1) { setTimeout(() => { i = n + 1; placer(i, false); }, 600); }
    }, 2100);
    window.addEventListener("resize", () => placer(i, false));
  }

  // ---------- téléphone : un tap sur une slide l'ouvre en grand, déplaçable au doigt ----------
  const mobile = window.matchMedia("(max-width: 767px)");
  function ouvrirZoom(slide) {
    const box = document.createElement("div");
    box.className = "zoom";
    const scroller = document.createElement("div");
    scroller.className = "zoom__defile";
    const clone = slide.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("zoom__slide");
    clone.querySelectorAll("[style]").forEach(el => { el.style.transform = ""; el.style.opacity = ""; el.style.translate = ""; el.style.rotate = ""; el.style.scale = ""; });
    // la slide agrandie fait 260 vw : on reprend la version complète des images
    clone.querySelectorAll("img[data-src]").forEach(img => {
      if (img.dataset.srcset) img.dataset.sizes = `${(img.dataset.f * 260).toFixed(2)}vw`;
      charger(img);
    });
    clone.querySelectorAll("video").forEach(v => { v.muted = true; v.play().catch(() => {}); });
    scroller.appendChild(clone);
    const fermer = document.createElement("button");
    fermer.className = "zoom__fermer"; fermer.type = "button";
    fermer.innerHTML = '<span aria-hidden="true">✕</span> Fermer';
    box.append(scroller, fermer);
    const fin = () => { box.classList.remove("is-ouvert"); setTimeout(() => box.remove(), 250); document.documentElement.classList.remove("pop-ouvert"); };
    fermer.addEventListener("click", fin);
    document.body.appendChild(box);
    document.documentElement.classList.add("pop-ouvert");
    requestAnimationFrame(() => {
      box.classList.add("is-ouvert");
      scroller.scrollLeft = 0;
    });
  }
  document.querySelectorAll("#page > .slide:not(.slide--lecteur):not(.slide--duo):not(.slide--fin)").forEach(slide => {
    slide.addEventListener("click", e => {
      if (!mobile.matches || e.target.closest("a, button")) return;
      ouvrirZoom(slide);
    });
  });
  if (mobile.matches) {
    // petit indice, une seule fois
    const astuce = document.createElement("div");
    astuce.className = "astuce";
    astuce.textContent = "Touchez une slide pour l’agrandir";
    document.body.appendChild(astuce);
    let montre = false;
    window.addEventListener("scroll", () => {
      if (montre || window.scrollY < window.innerHeight * 0.5) return;
      montre = true; astuce.classList.add("is-visible");
      setTimeout(() => astuce.classList.remove("is-visible"), 3200);
    }, { passive: true });
  }

  // ---------- défilement fluide + parallaxe ----------
  gsap.registerPlugin(ScrollTrigger);
  if (!reduit) {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll(".slide").forEach((s, idx) => {
    if (s._roles) animerRoles(s);
    if (reduit) return;
    const vid = s.querySelector(":scope > .slide__video"); // pas les vidéos des blocs imbriqués (duo)
    if (vid) {
      gsap.from(vid, { opacity: 0, scale: 0.97, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: s, start: "top 85%", toggleActions: "play none none reverse" } });
      gsap.fromTo(vid, { y: () => 0.04 * s.offsetHeight }, { y: () => -0.04 * s.offsetHeight, ease: "none",
        scrollTrigger: { trigger: s, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } });
    }
    const H = () => s.getBoundingClientRect().height;

    // Parallaxe : seuls les éléments de décor (formes de fond, étoiles) glissent.
    // Les visuels et leurs textes restent calés comme dans le PSD (rien ne se masque).
    // Apparition : tout le contenu de la slide monte ensemble, en vague de gauche à droite.
    const contenus = [];
    s.querySelectorAll(".plan").forEach(el => {
      const d = parseFloat(el.dataset.depth) || 0;
      const role = el.dataset.role;
      const decor = role === "fond" || role === "etoile";
      const img = el.firstElementChild;
      if (decor && d !== 0) {
        el.style.willChange = "transform";
        const amp = () => (mobile.matches ? 0.12 : 0.26) * d * H();
        gsap.fromTo(el, { y: () => amp() }, {
          y: () => -amp(), ease: "none",
          scrollTrigger: { trigger: s, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
        });
      }
      if (role === "etoile") {
        gsap.to(img || el, { rotation: 180, ease: "none", scrollTrigger: { trigger: s, start: "top top", end: "bottom top", scrub: true } });
      }
      if (!decor) contenus.push(el);
    });
    if (contenus.length) {
      const larg = s.offsetWidth || 1;
      const imgs = contenus.map(el => el.firstElementChild);
      const delais = contenus.map(el => Math.min(0.3, el.offsetLeft / larg * 0.3));
      if (idx === 0) gsap.from(imgs, { opacity: 0, y: 30, duration: 1.1, ease: "power3.out", delay: i => 0.1 + delais[i] });
      else gsap.from(imgs, {
        opacity: 0, y: 36, duration: 1, ease: "power3.out", delay: i => delais[i],
        scrollTrigger: { trigger: s, start: "top 80%", toggleActions: "play none none reverse" },
      });
    }
  });
  // bouton « Parlons-en » : seulement après la présentation (la couverture reste pure)
  const contact = document.querySelector(".contact");
  const apres = document.querySelector("#socialads") || document.querySelectorAll(".slide")[2];
  if (contact && apres) {
    ScrollTrigger.create({
      trigger: apres, start: "top 85%",
      onEnter: () => contact.classList.add("is-visible"),
      onLeaveBack: () => contact.classList.remove("is-visible"),
    });
  }
  const finale = document.querySelector("#fin");
  if (contact && finale) {
    ScrollTrigger.create({
      trigger: finale, start: "top 70%",
      onEnter: () => { contact.classList.add("is-cache"); document.documentElement.classList.add("sur-fin"); },
      onLeaveBack: () => { contact.classList.remove("is-cache"); document.documentElement.classList.remove("sur-fin"); },
    });
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());

  // ---------- formulaire de contact (remplace l'ouverture de l'app Mail) ----------
  // Envoi par Web3Forms (clé publique, faite pour être dans la page). Sans clé : brouillon de mail.
  const CLE_FORMULAIRE = "";
  function ouvrirFormulaire() {
    window.__suivi("formulaire");
    const box = document.createElement("div");
    box.className = "pop pop--form";
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Écrire à Adrien");
    box.innerHTML = `<form class="form" novalidate>
        <button class="form__fermer" type="button" aria-label="Fermer">✕</button>
        <p class="form__question">Un projet en tête ?</p>
        <p class="form__titre">Parlons-en.</p>
        <div class="form__ligne">
          <label class="form__champ"><span>Nom</span><input name="name" autocomplete="name" required></label>
          <label class="form__champ"><span>E-mail</span><input name="email" type="email" autocomplete="email" required></label>
        </div>
        <label class="form__champ"><span>Sujet</span><input name="subject" required></label>
        <label class="form__champ"><span>Description</span><textarea name="message" rows="5" required></textarea></label>
        <input type="checkbox" name="botcheck" class="form__piege" tabindex="-1" autocomplete="off">
        <div class="form__bas">
          <p class="form__etat" aria-live="polite"></p>
          <button class="form__envoyer" type="submit"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#etoile"/></svg>Envoyer</button>
        </div>
      </form>`;
    const form = box.querySelector("form"), etat = box.querySelector(".form__etat");
    const fermer = () => {
      box.classList.remove("is-ouvert"); setTimeout(() => box.remove(), 300);
      document.removeEventListener("keydown", esc);
      if (window.__lenis) window.__lenis.start();
      document.documentElement.classList.remove("pop-ouvert");
    };
    const esc = e => { if (e.key === "Escape") fermer(); };
    box.addEventListener("mousedown", e => { if (e.target === box) fermer(); });
    box.querySelector(".form__fermer").addEventListener("click", fermer);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const champs = [...form.querySelectorAll("[required]")];
      const vide = champs.find(c => !c.value.trim() || (c.type === "email" && !c.checkValidity()));
      champs.forEach(c => c.closest(".form__champ").classList.toggle("is-erreur", !c.value.trim() || (c.type === "email" && !c.checkValidity())));
      if (vide) {
        const nom = { name: "votre nom", email: "un e-mail valide", subject: "le sujet", message: "la description" }[vide.name];
        etat.textContent = `Il manque ${nom}.`; vide.focus(); return;
      }
      const d = Object.fromEntries(new FormData(form));
      if (!CLE_FORMULAIRE) {
        location.href = `mailto:pztcontactpro@gmail.com?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.message + "\n\n" + d.name + " · " + d.email)}`;
        return;
      }
      form.classList.add("is-envoi"); etat.textContent = "Envoi…";
      try {
        const r = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...d, subject: "Portfolio · " + d.subject, from_name: d.name, access_key: CLE_FORMULAIRE }) });
        const j = await r.json();
        if (!j.success) throw new Error(j.message);
        form.classList.add("is-envoye");
        window.__suivi("message");
        form.innerHTML = `<button class="form__fermer" type="button" aria-label="Fermer">✕</button>
          <svg class="form__etoile" viewBox="0 0 100 100" aria-hidden="true"><use href="#etoile"/></svg>
          <p class="form__question">Message envoyé.</p><p class="form__titre">Merci !</p>
          <p class="form__merci">Je reviens vers vous très vite.</p>`;
        form.querySelector(".form__fermer").addEventListener("click", fermer);
      } catch {
        form.classList.remove("is-envoi");
        etat.innerHTML = 'Oups, l’envoi a échoué. Écrivez-moi à <a href="mailto:pztcontactpro@gmail.com" data-direct>pztcontactpro@gmail.com</a>';
      }
    });
    document.addEventListener("keydown", esc);
    document.body.appendChild(box);
    if (window.__lenis) window.__lenis.stop();
    document.documentElement.classList.add("pop-ouvert");
    requestAnimationFrame(() => box.classList.add("is-ouvert"));
    setTimeout(() => box.querySelector("input").focus({ preventScroll: true }), 350);
  }
  // ---------- suivi des liens prospects (pztdesign.vercel.app/101, /102…) ----------
  // Envoie à Creative Space : ouverture (après 5 s, pour ignorer les robots des messageries),
  // jusqu'où la personne est allée, vidéos et formulaire. Aucun cookie. Vide = désactivé.
  const SUIVI = "";
  const codeProspect = (location.pathname.match(/^\/(\d{3,5})$/) || [])[1];
  const NOMS = { couverture: "Couverture", presentation: "Présentation", socialads: "Social Ads", xtb: "XTB", hellobank: "Hello bank!",
    etatpur: "État pur", teenage: "Teenage Engineering", jardinpur: "Jardin Pur", poppins: "Poppins", performa: "Marianne Éducation",
    medibox: "Medibox", modeles: "Posts organiques", videos: "Vidéos", stories: "Stories", projets: "Projets More+", psg: "PSG",
    affiches: "Affiches", lehavre: "Le Havre", angles_1: "4ngles", fragment: "fragment 02", motion: "Motion", cyberpunk: "Cyberpunk",
    trinity_cd: "Trinity", instagram: "Instagram", fin: "Fin (contact)" };
  window.__suivi = () => {};
  if (SUIVI && codeProspect && !navigator.webdriver && !/[?&]test\b/.test(location.search)) {
    const debut = Date.now();
    let plusLoin = "", rang = -1, ouvert = false;
    window.__suivi = (evenement, valeur) => {
      try { navigator.sendBeacon(SUIVI, JSON.stringify({ code: codeProspect, evenement, valeur, secondes: Math.round((Date.now() - debut) / 1000) })); } catch {}
    };
    setTimeout(() => { if (document.visibilityState === "visible") { ouvert = true; window.__suivi("ouverture"); } }, 5000);
    document.querySelectorAll("#page > .slide").forEach((sl, i) => ScrollTrigger.create({
      trigger: sl, start: "top 60%", onEnter: () => { if (i > rang) { rang = i; plusLoin = NOMS[sl.id] || sl.id; } },
    }));
    document.addEventListener("visibilitychange", () => { if (ouvert && document.visibilityState === "hidden") window.__suivi("depart", plusLoin); });
  }

  // tous les liens mail du site et le bouton « Parlons-en » ouvrent le formulaire
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="mailto:"]');
    if (!a || a.hasAttribute("data-direct")) return;
    e.preventDefault();
    ouvrirFormulaire();
  });
})();
