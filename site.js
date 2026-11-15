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
