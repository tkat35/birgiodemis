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

// Tanıtım videosu: kapağa dokununca YouTube oynatıcısı yüklenir (öncesinde YouTube'a bağlanılmaz).
// Video data-bitis saniyesinde durur ve kapak geri gelir (sondaki logo görünmesin). İleri sarınca YouTube'un
// "end" ayarı geçersiz kaldığı için oynatma süresi ayrıca izlenir.
(function () {
  "use strict";
  var kapak = document.querySelector("[data-video]");
  if (!kapak) { return; }
  var kutu = kapak.parentNode;
  var kimlik = kapak.getAttribute("data-video");
  var bitis = Number(kapak.getAttribute("data-bitis"));
  var etiket = kapak.querySelector(".video-dugme span");
  var oynatici = null;
  var sayac = null;

  function apiYukle(sonra, hata) {
    if (window.YT && window.YT.Player) { sonra(); return; }
    var onceki = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (onceki) { onceki(); } sonra(); };
    var betik = document.createElement("script");
    betik.src = "https://www.youtube.com/iframe_api";
    betik.onerror = function () { betik.remove(); hata(); };
    document.head.appendChild(betik);
  }

  function bitir() {
    clearInterval(sayac);
    if (document.fullscreenElement && document.exitFullscreen) { document.exitFullscreen().catch(function () {}); }
    if (oynatici) { try { oynatici.destroy(); } catch (h) { /* zaten kapanmış */ } }
    oynatici = null;
    Array.prototype.forEach.call(kutu.querySelectorAll("iframe, .video-yer"), function (o) { o.remove(); });
    etiket.textContent = "Yeniden izle";
    kapak.hidden = false;
    kapak.focus();
  }

  kapak.addEventListener("click", function (olay) {
    olay.preventDefault();
    if (oynatici) { return; }
    etiket.textContent = "Yükleniyor…";
    apiYukle(function () {
      var yer = document.createElement("div");
      yer.className = "video-yer";
      kutu.appendChild(yer);
      kapak.hidden = true;
      oynatici = new window.YT.Player(yer, {
        host: "https://www.youtube-nocookie.com",
        videoId: kimlik,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, end: bitis, rel: 0, playsinline: 1, hl: "tr", iv_load_policy: 3 },
        events: {
          onReady: function (o) { o.target.playVideo(); },
          onStateChange: function (o) { if (o.data === window.YT.PlayerState.ENDED) { bitir(); } }
        }
      });
      sayac = setInterval(function () {
        if (oynatici && typeof oynatici.getCurrentTime === "function" && oynatici.getCurrentTime() >= bitis) { bitir(); }
      }, 250);
    }, function () {
      etiket.textContent = "Video yüklenemedi — tekrar dene";
    });
  });
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
