// Birgi web sitesi — hava durumu (Open-Meteo, anahtarsız) ve büyük görsel penceresi
(function () {
  "use strict";

  // Hava durumu: yalnız ana sayfada .hava öğesi varsa çalışır; hata olursa öğe gizli kalır.
  var hava = document.querySelector(".hava");
  if (hava && window.fetch) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=38.2569&longitude=28.0674" +
      "&current=temperature_2m,weather_code,is_day&timezone=Europe%2FIstanbul";
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (veri) {
        var c = veri.current;
        var kod = c.weather_code;
        var simge = "☀", ad = "açık";
        if (kod === 0 && !c.is_day) { simge = "☾"; }
        else if (kod >= 1 && kod <= 3) { simge = "⛅"; ad = "parçalı bulutlu"; }
        else if (kod === 45 || kod === 48) { simge = "🌫"; ad = "sisli"; }
        else if (kod >= 51 && kod <= 67) { simge = "🌧"; ad = "yağmurlu"; }
        else if (kod >= 71 && kod <= 77) { simge = "❄"; ad = "karlı"; }
        else if (kod >= 80 && kod <= 82) { simge = "🌦"; ad = "sağanak yağışlı"; }
        else if (kod >= 85 && kod <= 86) { simge = "❄"; ad = "kar sağanaklı"; }
        else if (kod >= 95) { simge = "⛈"; ad = "fırtınalı"; }
        var derece = Math.round(c.temperature_2m);
        hava.textContent = simge + " " + derece + " °C";
        hava.setAttribute("aria-label", "Birgi'de hava şu an " + derece + " derece, " + ad);
        hava.hidden = false;
      })
      .catch(function () { /* hava bilgisi alınamazsa gösterilmez */ });
  }

  // Büyük görsel penceresi (dialog)
  var pencere = document.getElementById("buyuk");
  if (!pencere || typeof pencere.showModal !== "function") { return; }
  var resim = pencere.querySelector("img");
  var aciklama = pencere.querySelector("p");
  var sonOdak = null;
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-buyuk]");
    if (!b) { return; }
    sonOdak = b;
    resim.src = b.getAttribute("data-buyuk");
    resim.alt = b.getAttribute("data-alt") || "";
    aciklama.textContent = b.getAttribute("data-alt") || "";
    pencere.showModal();
  });
  pencere.addEventListener("click", function (e) {
    if (e.target === pencere || e.target.closest("button")) { pencere.close(); }
  });
  pencere.addEventListener("close", function () { if (sonOdak) { sonOdak.focus(); } });
})();

// Tanıtım videosu (sitenin kendi dosyası, YouTube yok): kapağa dokununca video öğesi eklenir ve oynar;
// öncesinde dosya indirilmez. Bitince kapak "Yeniden izle" olarak geri gelir.
(function () {
  "use strict";
  var kapak = document.querySelector("[data-video]");
  if (!kapak) { return; }
  var kutu = kapak.parentNode;
  var dosya = kapak.getAttribute("data-video");
  var etiket = kapak.querySelector(".video-dugme span");
  var video = null;

  function bitir() {
    if (document.fullscreenElement && document.exitFullscreen) { document.exitFullscreen().catch(function () {}); }
    if (video) { video.pause(); video.remove(); }
    video = null;
    etiket.textContent = "Yeniden izle";
    kapak.hidden = false;
    kapak.focus();
  }

  kapak.addEventListener("click", function (olay) {
    olay.preventDefault();
    if (video) { return; }
    video = document.createElement("video");
    video.src = dosya;
    video.controls = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-label", "Birgi tanıtım videosu (MEDYAPOZ)");
    video.addEventListener("ended", bitir);
    video.addEventListener("error", function () {
      if (video) { video.remove(); }
      video = null;
      kapak.hidden = false;
      etiket.textContent = "Video yüklenemedi — tekrar dene";
    });
    kutu.appendChild(video);
    kapak.hidden = true;
    var oynat = video.play();
    if (oynat && oynat.catch) { oynat.catch(function () { /* tarayıcı otomatik oynatmayı engellerse denetimlerle başlatılır */ }); }
    video.focus();
  });
})();

// Vektör Birgi haritası (Harita ve Ulaşım sayfası). Veri mobil uygulamayla aynıdır (birgi_harita.json, © OpenStreetMap).
// Altlık SVG satır içine alınır (yakınlaşınca keskin kalır); işaretler ekranda hep aynı boyda kalır (--ters = 1/ölçek).
// "Konumum": konum yalnız düğmeye basınca istenir, tarayıcıda kalır, hiçbir yere gönderilmez.
(function () {
  "use strict";
  var kutu = document.querySelector(".vh-kutu");
  if (!kutu) { return; }
  var ic = kutu.querySelector(".vh-ic");
  var d = kutu.dataset;
  var W = +d.genislik, H = +d.yukseklik, M = +d.metre, BATI = +d.bati, KUZEY = +d.kuzey, KX = +d.kx, KY = +d.ky;
  var isaretler = Array.prototype.slice.call(kutu.querySelectorAll(".vh-isaret"));
  var kart = kutu.querySelector(".vh-kart");
  var mesaj = kutu.querySelector(".vh-mesaj");
  var konumKatmani = kutu.querySelector(".vh-konum");
  var konumDugmesi = kutu.querySelector(".vh-konum-dugme");
  var s = 1, tx = 0, ty = 0, secili = null, tur = "", mesajSayac = null;

  isaretler.forEach(function (el) {
    el._x = parseFloat(el.style.left);
    el._y = parseFloat(el.style.top);
    el._ad = el.getAttribute("data-ad");
  });

  fetch(d.svg).then(function (r) { return r.text(); })
    .then(function (t) { ic.querySelector(".vh-altlik").innerHTML = t; })
    .catch(function () { /* altlık gelmezse işaretler yine görünür */ });

  function enAz() { return Math.max(kutu.clientWidth / W, kutu.clientHeight / H); }
  function ciz() {
    s = Math.min(Math.max(s, enAz()), 5);
    tx = Math.min(0, Math.max(kutu.clientWidth - W * s, tx));
    ty = Math.min(0, Math.max(kutu.clientHeight - H * s, ty));
    ic.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
    kutu.style.setProperty("--ters", String(1 / s));
    // İşaret boyu: 1 m = 1,3 px'te tam boy (18 px); uzaklaştıkça küçülür (en az 7 px), dokunma alanı en az 24 px
    boy = isaretBoyu();
    kutu.style.setProperty("--boy", boy + "px");
    kutu.style.setProperty("--alan", Math.max(24, Math.min(44, boy + 20)) + "px");
    kutu.style.setProperty("--kenar", (boy < 11 ? 1.5 : 2) + "px");
    adlar();
  }
  var boy = 18;
  function isaretBoyu() { return Math.round(Math.min(18, Math.max(7, 18 * s * M / 1.3)) * 10) / 10; }

  // Yakınlaşınca adlar görünür; çakışan adlar gizlenir (seçili önce)
  function adlar() {
    var goster = s * M > 1;
    var sira = isaretler.filter(function (el) { return !el.hidden; });
    // adlar işaret noktalarının da üstüne binmesin
    var yari = boy / 2 + 1;
    var kutular = sira.map(function (el) { var x = el._x * s, y = el._y * s; return { l: x - yari, t: y - yari, r: x + yari, b: y + yari }; });
    sira.sort(function (a, b) { return (b === secili ? 1 : 0) - (a === secili ? 1 : 0); });
    sira.forEach(function (el) {
      var x = el._x * s, y = el._y * s;
      var k = { l: x + yari, t: y - 9, r: x + yari + 4 + el._ad.length * 7.4, b: y + 9 };
      var cakisma = kutular.some(function (o) { return k.l < o.r && k.r > o.l && k.t < o.b && k.b > o.t; });
      var adli = goster && (el.classList.contains("secili") || !cakisma);
      el.classList.toggle("adli", adli);
      if (adli) { kutular.push(k); }
    });
  }

  function odakla(x, y, olcek, oran) {
    s = Math.min(Math.max(olcek, enAz()), 5);
    tx = kutu.clientWidth / 2 - x * s;
    ty = kutu.clientHeight * (oran || 0.5) - y * s;
    ciz();
  }

  function yakinlas(kat, cx, cy) {
    var yeni = Math.min(Math.max(s * kat, enAz()), 5);
    tx = cx - (cx - tx) * (yeni / s);
    ty = cy - (cy - ty) * (yeni / s);
    s = yeni;
    ciz();
  }

  // İlk görünüm: işaretlerin toplandığı merkez (uçtaki tek tük işaretler dışarıda kalabilir)
  function ilkGorunum() {
    var xs = isaretler.map(function (el) { return el._x; }).sort(function (a, b) { return a - b; });
    var ys = isaretler.map(function (el) { return el._y; }).sort(function (a, b) { return a - b; });
    var kes = Math.floor(xs.length / 10);
    var x0 = xs[kes], x1 = xs[xs.length - 1 - kes], y0 = ys[kes], y1 = ys[ys.length - 1 - kes];
    var pay = 60 * M;
    var olcek = Math.min(kutu.clientWidth / (x1 - x0 + 2 * pay), kutu.clientHeight / (y1 - y0 + 2 * pay));
    odakla((x0 + x1) / 2, (y0 + y1) / 2, olcek);
  }

  function mesajGoster(metin) {
    clearTimeout(mesajSayac);
    mesaj.textContent = metin;
    mesaj.hidden = false;
    mesajSayac = setTimeout(function () { mesaj.hidden = true; }, 6000);
  }

  function sec(el, yakin) {
    if (secili) { secili.classList.remove("secili"); }
    secili = el;
    if (!el) { kart.hidden = true; adlar(); return; }
    // aynı yapının (çok noktalı) bütün işaretleri değil, dokunulan işaret seçilir
    el.classList.add("secili");
    var g = el.getAttribute("data-gorsel");
    var img = kart.querySelector("img");
    img.hidden = !g;
    if (g) { img.src = g; }
    kart.querySelector(".vh-kart-tur").textContent = el.getAttribute("data-tur-ad") +
      (el.getAttribute("data-yaklasik") === "1" ? " · yaklaşık konum" : "");
    kart.querySelector(".vh-kart-ad").textContent = el._ad;
    kart.querySelector(".vh-bilgi").href = el.getAttribute("data-sayfa");
    kart.querySelector(".vh-tarif").href = "https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=" +
      el.getAttribute("data-enlem") + "," + el.getAttribute("data-boylam");
    kart.hidden = false;
    if (yakin) { odakla(el._x, el._y, Math.max(s, enAz() * 6), 0.33); } else { adlar(); }
  }

  function idIleSec(id) {
    var el = isaretler.filter(function (x) { return x.getAttribute("data-id") === id; })[0];
    if (!el) { return; }
    if (el.hidden) { turSec(""); }
    sec(el, true);
    kutu.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  // Tür süzgeci
  var suzgecler = Array.prototype.slice.call(document.querySelectorAll(".vh-suzgec button"));
  function turSec(t) {
    tur = t;
    suzgecler.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tur") === t)); });
    isaretler.forEach(function (el) { el.hidden = t !== "" && el.getAttribute("data-tur") !== t; });
    if (secili && secili.hidden) { sec(null); }
    adlar();
  }
  suzgecler.forEach(function (b) { b.addEventListener("click", function () { turSec(b.getAttribute("data-tur")); }); });

  // Sürükleme ve iki parmakla yakınlaştırma (pointer olayları); kısa dokunuş tıklama sayılır
  var parmaklar = {}, surukleme = false, son = null, baslangic = null;
  function noktalar() { return Object.keys(parmaklar).map(function (k) { return parmaklar[k]; }); }
  kutu.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".vh-araclar, .vh-kart, .vh-mesaj")) { return; }
    parmaklar[e.pointerId] = { x: e.clientX, y: e.clientY };
    baslangic = { x: e.clientX, y: e.clientY };
    surukleme = false;
    son = null;
  });
  window.addEventListener("pointermove", function (e) {
    if (!parmaklar[e.pointerId]) { return; }
    parmaklar[e.pointerId] = { x: e.clientX, y: e.clientY };
    var p = noktalar();
    var r = kutu.getBoundingClientRect();
    if (p.length === 1) {
      if (!surukleme && Math.abs(e.clientX - baslangic.x) + Math.abs(e.clientY - baslangic.y) < 6) { return; }
      if (!surukleme) { surukleme = true; kutu.classList.add("suruklu"); son = null; }
      if (son) { tx += p[0].x - son.x; ty += p[0].y - son.y; ciz(); }
      son = { x: p[0].x, y: p[0].y };
    } else if (p.length === 2) {
      surukleme = true;
      var orta = { x: (p[0].x + p[1].x) / 2 - r.left, y: (p[0].y + p[1].y) / 2 - r.top };
      var uz = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (son && son.uz) {
        tx += orta.x - son.x;
        ty += orta.y - son.y;
        yakinlas(uz / son.uz, orta.x, orta.y);
      }
      son = { x: orta.x, y: orta.y, uz: uz };
    }
  });
  function birak(e) {
    if (!parmaklar[e.pointerId]) { return; }
    delete parmaklar[e.pointerId];
    son = null;
    if (!noktalar().length) { setTimeout(function () { surukleme = false; kutu.classList.remove("suruklu"); }, 0); }
  }
  window.addEventListener("pointerup", birak);
  window.addEventListener("pointercancel", birak);

  kutu.addEventListener("click", function (e) {
    if (surukleme) { e.preventDefault(); e.stopPropagation(); return; }
    var isaret = e.target.closest(".vh-isaret");
    if (isaret) { sec(isaret, false); return; }
    if (!e.target.closest(".vh-araclar, .vh-kart, .vh-mesaj")) { sec(null); }
  }, true);
  kutu.querySelector(".vh-kapat").addEventListener("click", function () { sec(null); });
  kutu.addEventListener("wheel", function (e) {
    e.preventDefault();
    var r = kutu.getBoundingClientRect();
    yakinlas(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  kutu.addEventListener("dblclick", function (e) {
    if (e.target.closest(".vh-araclar, .vh-kart")) { return; }
    var r = kutu.getBoundingClientRect();
    yakinlas(2, e.clientX - r.left, e.clientY - r.top);
  });
  kutu.querySelectorAll("[data-yakin]").forEach(function (b) {
    b.addEventListener("click", function () {
      yakinlas(b.getAttribute("data-yakin") === "1" ? 1.6 : 1 / 1.6, kutu.clientWidth / 2, kutu.clientHeight / 2);
    });
  });
  kutu.addEventListener("keydown", function (e) {
    if (e.target !== kutu) { return; }
    var adim = 60;
    var k = { ArrowLeft: [adim, 0], ArrowRight: [-adim, 0], ArrowUp: [0, adim], ArrowDown: [0, -adim] }[e.key];
    if (k) { tx += k[0]; ty += k[1]; ciz(); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") { yakinlas(1.6, kutu.clientWidth / 2, kutu.clientHeight / 2); e.preventDefault(); }
    else if (e.key === "-") { yakinlas(1 / 1.6, kutu.clientWidth / 2, kutu.clientHeight / 2); e.preventDefault(); }
  });

  // Listeden ve yapı sayfalarından "haritada göster" (#harita=<yapı>)
  document.querySelectorAll("[data-goster]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); idIleSec(a.getAttribute("data-goster")); });
  });
  function karma() {
    var m = /^#harita=([\w-]+)$/.exec(location.hash);
    if (m) { idIleSec(m[1]); }
  }
  window.addEventListener("hashchange", karma);

  // Konumum
  var izleme = null, konum = null, ilkKonum = true;
  function konumXY(p) { return { x: (p.longitude - BATI) * KX, y: (KUZEY - p.latitude) * KY }; }
  function konumaGit() {
    var n = konumXY(konum);
    if (n.x < 0 || n.y < 0 || n.x > W || n.y > H) {
      var km = Math.hypot(n.x - W / 2, n.y - H / 2) / M / 1000;
      mesajGoster("Şu an Birgi haritasının dışındasınız (Birgi’ye yaklaşık " + (km < 10 ? km.toFixed(1) : Math.round(km)) + " km).");
      return;
    }
    odakla(n.x, n.y, Math.max(s, enAz() * 4), 0.4);
  }
  function konumCiz() {
    var n = konumXY(konum);
    var icinde = n.x >= 0 && n.y >= 0 && n.x <= W && n.y <= H;
    konumKatmani.hidden = !icinde;
    if (!icinde) { return; }
    konumKatmani.style.left = n.x + "px";
    konumKatmani.style.top = n.y + "px";
    var cap = Math.max(konum.accuracy, 3) * M * 2;
    var halka = konumKatmani.querySelector(".vh-halka");
    halka.style.width = cap + "px";
    halka.style.height = cap + "px";
  }
  konumDugmesi.addEventListener("click", function () {
    if (konum && izleme !== null) { konumaGit(); return; }
    if (!("geolocation" in navigator)) { mesajGoster("Bu tarayıcı konum göstermeyi desteklemiyor."); return; }
    if (izleme !== null) { return; }
    konumDugmesi.classList.add("bekliyor");
    izleme = navigator.geolocation.watchPosition(function (p) {
      konum = p.coords;
      konumDugmesi.classList.remove("bekliyor");
      konumDugmesi.classList.add("acik");
      konumDugmesi.setAttribute("aria-label", "Haritayı konumuma getir");
      konumCiz();
      if (ilkKonum) { ilkKonum = false; konumaGit(); }
    }, function (h) {
      navigator.geolocation.clearWatch(izleme);
      izleme = null;
      konumDugmesi.classList.remove("bekliyor", "acik");
      mesajGoster(h.code === 1 ? "Konum izni verilmedi. Tarayıcı ayarlarından izin verebilirsiniz." : "Konum alınamadı.");
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  });

  window.addEventListener("resize", ciz);
  ilkGorunum();
  karma();
})();

// Ana ekrana eklenmiş sürüm (PWA): çevrimdışı önbelleği yalnız ana ekrandan açılınca kaydet.
// Tarayıcıda siteyi açan ziyaretçiler etkilenmez.
(function () {
  "use strict";
  var anaEkran = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (anaEkran && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* önbellek olmadan da çalışır */ });
  }
})();
