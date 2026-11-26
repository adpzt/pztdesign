/* pztdesign · V1 slides
   Chaque bloc Behance est reconstruit en plans (calques regroupés) positionnés
   dans le repère de la slide d'origine. Les plans bougent à des vitesses
   différentes au défilement (parallaxe) et apparaissent à l'entrée. */
(() => {
  const page = document.getElementById("page");
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pct = (v, total) => (v / total * 100) + "%";

  // ---------- vidéos en boucle ----------
  // Lecture seulement à l'écran. Les boucles sont encodées à 60 images/s : une vidéo à 25-30 images/s
  // fait caler Chrome et Safari sur sa cadence pendant le défilement (mesuré : 211 images lentes contre 2).
  function suivreVideo(v, bloc) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { rootMargin: "200px 0px" }).observe(bloc);
  }

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
    img.dataset.sizes = `(max-width: 767px) ${(f * 100).toFixed(2)}vw, ${(f * 94).toFixed(2)}vw`;
  }
  function plan(p, m, dossier) {
    const el = document.createElement("div");
    el._boite = [p.x, p.y, p.w, p.h];
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

  // piles où les visuels s'inclinent un peu en 3D au défilement (jamais de texte)
  const INCLINAISON = {
    hellobank: ["carrousel1", "carrousel2", "carrousel5"],
    etatpur: ["post01", "post02", "post03"],
  };

  // ---------- parallaxe organisée ----------
  // Les visuels qui se touchent bougent ensemble ; une légende bouge avec le visuel qu'elle accompagne
  // (rien ne se masque, rien ne se décale dans une composition) ; les textes seuls restent fixes.
  // Chaque groupe reçoit une seule profondeur (data-prof).
  function organiser(s, m) {
    const boite = (x, y, w, h) => ({ x0: x, y0: y, x1: x + w, y1: y + h });
    const ecart = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
    const noeuds = [];
    s.querySelectorAll(":scope > .plan").forEach(el => {
      const role = el.dataset.role;
      if (role === "fond" || role === "etoile") return;
      if (el._boite) noeuds.push({ el, type: role === "visuel" ? "v" : "z", b: boite(...el._boite), d: +el.dataset.depth || 0 });
      else if (role === "texte") {
        const t = (m.textes || []).find(t => t.id === el.dataset.id);
        if (t) noeuds.push({ el, type: "z", b: boite(t.x, t.base - t.size, t.txt.length * t.size * 0.55, t.size * 1.25) });
      }
    });
    const par = noeuds.map((_, i) => i);
    const f = i => (par[i] === i ? i : (par[i] = f(par[i])));
    const aire = b => (b.x1 - b.x0) * (b.y1 - b.y0);
    const commun = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    noeuds.forEach((a, i) => noeuds.forEach((b, j) => {
      if (j <= i || (a.type === "z" && b.type === "z")) return;
      if (a.type === "v" && b.type === "v") {
        // posés bord à bord (bannière + portrait…) : verrouillés ; empilés (carrousel en éventail) : profondeurs libres
        if (ecart(a.b, b.b) < 30 && commun(a.b, b.b) < 0.03 * Math.min(aire(a.b), aire(b.b))) par[f(i)] = f(j);
      } else if (ecart(a.b, b.b) < 120) par[f(i)] = f(j);
    }));
    const groupes = new Map();
    noeuds.forEach((n, i) => { const r = f(i); if (!groupes.has(r)) groupes.set(r, []); groupes.get(r).push(n); });
    let g = 0;
    groupes.forEach(liste => {
      const vis = liste.filter(n => n.type === "v");
      const avecTexte = liste.some(n => n.type === "z");
      const prof = vis.length ? vis.reduce((a, n) => a + n.d, 0) / vis.length * (avecTexte ? 0.75 : 1) : 0;
      liste.forEach(n => { n.g = g; n.prof = prof; });
      g++;
    });
    noeuds.forEach(n => { n.el.dataset.groupe = n.g; n.el.dataset.prof = n.prof.toFixed(3); });
  }

  // carrousel : les vraies slides côte à côte dans une fenêtre 4:5, qui défilent avec la page (slide XTB)
  function carrousel(c, m, dossier) {
    const el = document.createElement("div");
    el.className = "plan carrousel";
    el._boite = [c.x, c.y, c.w, c.h];
    el.dataset.role = "visuel"; el.dataset.depth = c.depth; el.dataset.id = c.carte;
    el.style.left = pct(c.x, m.w); el.style.top = pct(c.y, m.h); el.style.width = pct(c.w, m.w);
    el.innerHTML = '<div class="carrousel__fenetre"><div class="carrousel__piste"></div></div><div class="carrousel__points" aria-hidden="true"></div>';
    const piste = el.querySelector(".carrousel__piste"), points = el.querySelector(".carrousel__points");
    c.slides.forEach((src, i) => {
      const img = new Image();
      img.alt = i ? "" : "Carrousel XTB";
      img.width = c.largeur; img.height = Math.round(c.largeur * 5412 / 4320);
      img.decoding = "async";
      img.dataset.src = `assets/slides/${dossier}/${src}`;
      leger(img, img.dataset.src, c.largeur, c.w / m.w);
      prechargeur.observe(img);
      piste.appendChild(img);
      points.appendChild(document.createElement("span"));
    });
    el._piste = piste; el._points = [...points.children]; el._n = c.slides.length;
    el._points[0].classList.add("is-actif");
    return el;
  }

  function slidePlans(b) {
    const m = b.manifest;
    const s = document.createElement("section");
    s.className = "slide";
    s.id = b.id;
    s.style.aspectRatio = `${m.w} / ${m.h}`;
    // un calque de texte découpé en blocs (zones.py) donne un plan par bloc : chaque légende peut suivre son visuel
    const cartes = new Set((m.carrousels || []).map(c => c.carte));
    m.planes.forEach(p => {
      if (cartes.has(p.id)) return; // remplacée par son carrousel
      if (p.parts) p.parts.forEach((q, i) => s.appendChild(plan({ ...p, ...q, id: `${p.id}__${i}` }, m, b.id)));
      else s.appendChild(plan(p, m, b.id));
    });
    (m.carrousels || []).forEach(c => s.appendChild(carrousel(c, m, b.id)));
    if (m.carrousels) s._carrousels = [...s.querySelectorAll(".carrousel")];
    // textes vivants (police du site), position = ligne de base dans le repère du canevas
    (m.textes || []).forEach(t => {
      const el = document.createElement("div");
      el.className = "plan plan--texte";
      el.dataset.role = "texte"; el.dataset.depth = 0; el.dataset.id = t.id || "";
      el.style.left = pct(t.x, m.w); el.style.top = pct(t.base, m.h);
      el.innerHTML = `<span style="font-size:calc(${t.size} / ${m.w} * 100cqw);font-weight:${t.weight || 500}${t.color ? ";color:" + t.color : ""}">${t.txt}</span>`;
      s.appendChild(el);
    });
    organiser(s, m);
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
    t("pres__nom pres__nom--prenom", 1132, 1107.2, "ADRIEN");
    t("pres__nom pres__nom--famille", 972.1, 1241.1, "POIZAT");
    const mail = t("pres__mail", 1405.1, 1857.3, "pztcontactpro@gmail.com", "a");
    mail.href = "mailto:pztcontactpro@gmail.com";
    mail.dataset.copier = "";
    t("pres__desc", 1404.9, 1988.9,
      "Graphiste &amp; DA freelance, je conçois des identités visuelles, des campagnes publicitaires<br>et des contenus créatifs pour des marques qui veulent se démarquer.");

    const roles = ["Art Director", "Graphic Design", "Motion Design", "Branding"];
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
    // la photo et le nom posé dessus forment un seul groupe (le nom ne glisse jamais sur la photo)
    s.querySelectorAll(".plan[data-role='visuel'], .pres__nom").forEach(el => { el.classList.add("plan"); el.dataset.prof = "0.22"; el.dataset.groupe = "0"; });
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
    suivreVideo(v, s);
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
          <a class="fin__mail" href="mailto:pztcontactpro@gmail.com" data-copier title="Copier l’adresse">pztcontactpro@gmail.com</a>
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
    // ordre voulu par Adrien : Art Director (à l'arrivée), puis Graphic Design, Motion Design, Branding, en boucle
    const { ul, puce, n } = s._roles;
    const items = [...ul.children];
    let i = 0, minuterie = 0; // premier tour : rien au-dessus d'Art Director
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
    window.addEventListener("resize", () => placer(i, false));
    if (reduit) return;
    const suivant = () => {
      i += 1;
      // la puce se replie en losange pendant le changement, comme sur le GIF de Behance
      gsap.timeline()
        .to(puce, { scale: 0.45, rotation: 45, duration: 0.28, ease: "power2.in" })
        .to(puce, { scale: 1, rotation: 90, duration: 0.3, ease: "power2.out" })
        .set(puce, { rotation: 0 });
      placer(i, true);
      if (i >= n * 2) setTimeout(() => { i = n; placer(i, false); }, 600); // même mot : boucle invisible
    };
    // repart d'Art Director à chaque arrivée sur la slide
    new IntersectionObserver(([e]) => {
      clearInterval(minuterie);
      if (e.isIntersecting) { i = 0; placer(i, false); minuterie = setInterval(suivant, 2100); }
    }, { threshold: 0.35 }).observe(s);
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
    }
    const H = () => s.getBoundingClientRect().height;
    if (s._carrousels) {
      const PAS_XTB = Math.max(...s._carrousels.map(c => c._n)) - 1;
      let epingle = null; // la slide XTB fixée (renseignée par ScrollTrigger)
      const cs = s._carrousels, lis = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
      ScrollTrigger.create({
        trigger: s, start: "center center", end: () => "+=" + Math.round(innerHeight * 0.34 * PAS_XTB), pin: true, scrub: true,
        onUpdate: self => cs.forEach((c, i) => {
          // une marche par slide pour tous (le plus long carrousel en a 8) ; arrêt sur 60 % de chaque marche
          const p = Math.min(c._n - 1, Math.max(0, self.progress * PAS_XTB - i * 0.06));
          const n = Math.min(c._n - 1, Math.floor(p)), f = p - n;
          const k = Math.min(c._n - 1, n + lis(0.2, 0.6, f));
          c._piste.style.transform = `translate3d(${(-k * 100).toFixed(3)}%,0,0)`;
          const actif = Math.round(k);
          c._points.forEach((pt, j) => pt.classList.toggle("is-actif", j === actif));
        }),
        onToggle: self => { epingle = self; },
      });
      // aimant : quand on lâche le défilement pendant les carrousels, on se cale sur la slide la plus proche
      let attente = 0;
      window.addEventListener("scroll", () => {
        clearTimeout(attente);
        attente = setTimeout(() => {
          if (!epingle || !epingle.isActive || !window.__lenis) return;
          const cible = Math.round(epingle.progress * PAS_XTB) / PAS_XTB;
          if (Math.abs(cible - epingle.progress) * PAS_XTB < 0.04) return;
          window.__lenis.scrollTo(epingle.start + cible * (epingle.end - epingle.start), { duration: 0.6 });
        }, 160);
      }, { passive: true });
    }

    // Parallaxe : les décors (formes de fond, étoiles) glissent le plus ; les visuels glissent par groupes
    // (une légende avec son visuel, des visuels qui se touchent ensemble) ; les textes seuls restent fixes.
    // Tout est à sa place exacte du PSD quand la slide est au centre de l'écran.
    // Apparition : chaque groupe monte d'autant plus qu'il est en avant, en vague de gauche à droite.
    const contenus = [];
    s.querySelectorAll(".plan").forEach(el => {
      const d = parseFloat(el.dataset.depth) || 0;
      const role = el.dataset.role;
      const decor = role === "fond" || role === "etoile";
      const img = el.firstElementChild;
      const prof = s._carrousels ? 0 : decor ? d * 1.5 : parseFloat(el.dataset.prof || "0");
      if (prof) {
        el.classList.add("plan--bouge");
        el.style.setProperty("--md", (Math.abs(prof) * (decor ? 30 : 24)).toFixed(1));
        const amp = () => (mobile.matches ? 0.12 : decor ? 0.26 : 0.34) * prof * H();
        if (s.id === "presentation") {
          // la photo (et le nom posé dessus) arrive un peu plus bas puis se cale sur le texte, et y reste
          gsap.fromTo(el, { y: () => amp() }, { y: 0, ease: "none",
            scrollTrigger: { trigger: s, start: "top bottom", end: "center center", scrub: true, invalidateOnRefresh: true } });
        } else {
          gsap.fromTo(el, { y: () => amp() }, {
            y: () => -amp(), ease: "none",
            scrollTrigger: { trigger: s, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
          });
        }
      }
      const incl = (INCLINAISON[s.id] || []).includes(el.dataset.id);
      if (incl && !mobile.matches) {
        gsap.fromTo(el, { rotationY: -6, rotationX: 4, transformPerspective: 1200 }, {
          rotationY: 6, rotationX: -4, ease: "none",
          scrollTrigger: { trigger: s, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
        });
      }
      if (role === "etoile") {
        gsap.to(img || el, { rotation: 180, ease: "none", scrollTrigger: { trigger: s, start: "top top", end: "bottom top", scrub: true } });
      }
      if (!decor) contenus.push(el);
    });
    if (contenus.length && idx > 0) {
      // chaque groupe (visuel + sa légende) arrive quand il entre à l'écran, d'autant plus bas qu'il est en avant ;
      // les textes seuls arrivent avec la slide
      const larg = s.offsetWidth || 1;
      const parGroupe = new Map();
      contenus.filter(el => el.firstElementChild).forEach(el => {
        const g = el.dataset.groupe ?? el.dataset.id;
        if (!parGroupe.has(g)) parGroupe.set(g, []);
        parGroupe.get(g).push(el);
      });
      parGroupe.forEach(els => {
        const prof = parseFloat(els[0].dataset.prof || "0");
        const imgs = els.map(el => el.firstElementChild);
        const declencheur = prof ? els.reduce((a, el) => (el.offsetTop < a.offsetTop ? el : a)) : s;
        gsap.from(imgs, {
          opacity: 0, y: prof ? 60 + prof * 130 : 26, scale: prof > 0.2 ? 0.96 : 1,
          duration: prof ? 1.2 : 0.9, ease: "power3.out",
          delay: Math.min(0.25, els[0].offsetLeft / larg * 0.25),
          scrollTrigger: { trigger: declencheur, start: prof ? "top 94%" : "top 78%", toggleActions: "play none none reverse" },
        });
      });
    }
    // seules les slides proches de l'écran gardent leurs calques prêts à bouger (fluidité)
    ScrollTrigger.create({ trigger: s, start: "top bottom+=40%", end: "bottom top-=40%", toggleClass: "is-proche" });
  });
  // ---------- profondeur à la souris (ordinateur) : les groupes en avant suivent un peu le curseur ----------
  if (!reduit && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let cx = 0, cy = 0, tx = 0, ty = 0, actif = false;
    const boucle = () => {
      cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
      document.querySelectorAll(".slide.is-proche").forEach(sl => { sl.style.setProperty("--mx", cx.toFixed(3)); sl.style.setProperty("--my", cy.toFixed(3)); });
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) requestAnimationFrame(boucle); else actif = false;
    };
    window.addEventListener("pointermove", e => {
      tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1;
      if (!actif) { actif = true; requestAnimationFrame(boucle); }
    }, { passive: true });
  }

  // ---------- arrivée : l'étoile tourne au centre, puis va se poser sur la couverture qui s'assemble ----------
  (function intro() {
    const couv = document.querySelector("#couverture");
    const etoile = couv && couv.querySelector(".plan[data-role='etoile']");
    if (!etoile || reduit || window.scrollY > 40) return;
    const imgsPlans = [...couv.querySelectorAll(".plan")].map(el => el.firstElementChild).filter(Boolean);
    const vol = document.createElement("div");
    vol.className = "intro-etoile";
    vol.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#etoile"/></svg>';
    document.body.appendChild(vol);
    document.documentElement.classList.add("en-intro");
    gsap.set(imgsPlans, { opacity: 0 });
    const suite = [...document.querySelectorAll("#page > .slide")].filter(sl => sl !== couv);
    gsap.set(suite, { autoAlpha: 0 });
    if (window.__lenis) window.__lenis.stop();
    const tourne = gsap.to(vol, { rotation: "+=360", duration: 2.2, ease: "none", repeat: -1 });
    const imgs = [...couv.querySelectorAll("img")];
    imgs.forEach(img => { if (!img.getAttribute("src")) charger(img); });
    const prets = Promise.all(imgs.map(i => i.decode().catch(() => {})));
    const minimum = new Promise(r => setTimeout(r, 650));
    Promise.race([Promise.all([prets, minimum]), new Promise(r => setTimeout(r, 2800))]).then(() => {
      // centres par getBoundingClientRect (exact même en rotation), taille par offsetWidth (sans la rotation)
      const cible = etoile.getBoundingClientRect(), v = vol.getBoundingClientRect(), taille = vol.offsetWidth;
      const r0 = gsap.getProperty(vol, "rotation");
      tourne.kill();
      const fin = Math.ceil((r0 + 200) / 45) * 45; // finit sur un angle où l'étoile retombe sur elle-même
      const role = el => el.parentElement.dataset.role;
      const id = el => el.parentElement.dataset.id;
      const cadre = imgsPlans.filter(i => ["carre", "grille", "caches"].includes(id(i)));
      const textes = imgsPlans.filter(i => role(i) === "texte");
      const etoileImg = etoile.firstElementChild;
      gsap.timeline({ onComplete: () => {
          vol.remove();
          document.documentElement.classList.remove("en-intro");
          if (window.__lenis) window.__lenis.start();
        } })
        .to(vol, { x: cible.left + cible.width / 2 - (v.left + v.width / 2), y: cible.top + cible.height / 2 - (v.top + v.height / 2),
                   scale: etoile.offsetWidth / taille, rotation: fin, duration: 1.3, ease: "power3.inOut" }, 0)
        .fromTo(cadre, { opacity: 0, scale: 0.9, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.08 }, 0.45)
        .fromTo(textes, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1.15, ease: "power3.out" }, 0.6)
        .to(suite, { autoAlpha: 1, duration: 0.6, ease: "power1.out" }, 1.2)
        .set(etoileImg, { opacity: 1 }, 1.3)
        .set(vol, { opacity: 0 }, 1.3);
    });
  })();

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
  const CLE_FORMULAIRE = "f9d2f5a4-c598-4d51-b67f-7631e6c0a27d";
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

  // l'adresse affichée se copie d'un clic (bulle « E-mail copié ») ; les boutons ouvrent le formulaire
  function copierMail(a) {
    const mail = "pztcontactpro@gmail.com";
    const fait = () => {
      const r = a.getBoundingClientRect();
      const bulle = document.createElement("div");
      bulle.className = "copie";
      bulle.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#etoile"/></svg>E-mail copié';
      bulle.setAttribute("role", "status");
      bulle.style.left = `${r.right + 14}px`;
      bulle.style.top = `${r.top + r.height / 2}px`;
      document.body.appendChild(bulle);
      requestAnimationFrame(() => bulle.classList.add("is-visible"));
      setTimeout(() => { bulle.classList.remove("is-visible"); setTimeout(() => bulle.remove(), 400); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(mail).then(fait, () => ouvrirFormulaire());
    else ouvrirFormulaire();
  }
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="mailto:"]');
    if (!a || a.hasAttribute("data-direct")) return;
    e.preventDefault();
    if (a.hasAttribute("data-copier")) copierMail(a);
    else ouvrirFormulaire();
  });
})();
