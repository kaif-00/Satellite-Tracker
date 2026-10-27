const globeElement = document.getElementById("globe");

function makeOrangeBlackTexture() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        const land = brightness > 8 ? Math.min(1, brightness / 90) : 0;
        
        pixels[i] = Math.round(8 + 247 * land);
        pixels[i + 1] = Math.round(8 + 82 * land);
        pixels[i + 2] = Math.round(8 + 2 * land);
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.onerror = reject;
    img.src = "https://unpkg.com/three-globe/example/img/earth-topology.png";
  });
}

const myGlobe = new Globe(globeElement)
.backgroundColor("rgba(0,0,0,0)")
.showAtmosphere(false)
.atmosphereColor("#ff6a00")
.atmosphereAltitude(0.18)
    .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
    .pointOfView({
      lat: 27,
      lng: 80,
      altitude: 2.0
    });
    
    makeOrangeBlackTexture().then((texture) => {
      myGlobe.globeImageUrl(texture);
    });
    
    // Load countries with light orange edges and orange interior fill
    fetch("https://cdn.jsdelivr.net/npm/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson")
    .then((res) => res.json())
    .then((countries) => {
      myGlobe
      .polygonsData(countries.features)
      .polygonCapColor(() => "rgba(255, 115, 0, 0.25)")
      .polygonSideColor(() => "rgba(255, 115, 0, 0.15)")
      .polygonStrokeColor(() => "rgba(255, 180, 100, 1)")
      .polygonAltitude(0.010);
    })
    .catch((err) => console.error("Error loading country borders:", err));
    
    // const satellites = a;
    
    // Panel DOM elements
    const panel = document.getElementById("satellite-panel");
    const closeBtn = document.getElementById("close-panel");
    const panelSatName = document.getElementById("panel-sat-name");
    const panelSatLat = document.getElementById("panel-sat-lat");
    const panelSatLng = document.getElementById("panel-sat-lng");
    const panelSatLaunch = document.getElementById("panel-sat-launch");
    const panelRadarCoords = document.getElementById("panel-radar-coords");
    
    let activeElement = null;
    let isClickingNode = false;
    
    function openSatellitePanel(satellite, element) {
      if (!satellite) return;
      
      // Prevent onGlobeClick from immediately dismissing the panel
      isClickingNode = true;
      setTimeout(() => {
        isClickingNode = false;
      }, 400);
      
      if (activeElement) {
        activeElement.classList.remove("active-satellite");
      }
      if (element) {
        activeElement = element;
        activeElement.classList.add("active-satellite");
      }
      
      const satName = satellite.Satname || satellite.name || satellite.satname || "Unknown Satellite";
      const satLat = satellite.Latitude ?? satellite.lat ?? satellite.satlat;
      const satLng = satellite.Longitude ?? satellite.lng ?? satellite.lon ?? satellite.satlng;
      const satLaunch = satellite.Launch_date || satellite.launchDate || "N/A";
      
      panelSatName.textContent = satName;
      panelSatLat.textContent = typeof satLat === "number" ? `${satLat.toFixed(4)}°` : (satLat || "--");
      panelSatLng.textContent = typeof satLng === "number" ? `${satLng.toFixed(4)}°` : (satLng || "--");
      if (panelSatLaunch) {
        panelSatLaunch.textContent = satLaunch;
      }
      panelRadarCoords.textContent = `LAT: ${satLat}° | LON: ${satLng}°`;
      
      panel.classList.add("open");
      globeElement.classList.add("panel-open");
      
      // Smoothly focus camera on the clicked satellite
      if (typeof satLat === "number" && typeof satLng === "number") {
        myGlobe.pointOfView({
          lat: satLat,
          lng: satLng
          // altitude: 1.8
        }, 800);
      }
}

function closeSatellitePanel() {
  if (isClickingNode) return;
  panel.classList.remove("open");
  globeElement.classList.remove("panel-open");
  if (activeElement) {
    activeElement.classList.remove("active-satellite");
    activeElement = null;
  }
}

if (closeBtn) {
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeSatellitePanel();
    });
}

myGlobe.onGlobeClick(() => {
  if (isClickingNode) return;
  closeSatellitePanel();
});

myGlobe
.htmlLat((d) => d.Latitude ?? d.lat ?? d.satlat)
.htmlLng((d) => d.Longitude ?? d.lng ?? d.lon ?? d.satlng)
.htmlAltitude(0.12)
.htmlElement((d) => {
  const el = document.createElement("div");
  el.className = "satellite-node";
  
  const satName = d.Satname || d.name || d.satname || "Satellite";
  
  el.innerHTML = `
    <div class="sat-pulse"></div>
    <div class="sat-dot"></div>
    <div class="sat-tooltip">${satName}</div>
  `;
  el.title = satName;
  
  // Prevent 3D canvas / OrbitControls from capturing node clicks
  el.addEventListener("pointerdown", (e) => e.stopPropagation());
  el.addEventListener("mousedown", (e) => e.stopPropagation());
  
  // Click on satellite node to show details in left panel
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    openSatellitePanel(d, el);
  });
  
  return el;
})
.htmlElementVisibilityModifier((el, isVisible) => {
  el.style.opacity = isVisible ? "1" : "0";
  el.style.pointerEvents = isVisible ? "auto" : "none";
});


async function satellit_data(place) {
  if (!place || !place.trim()) return;
  try{
    const res = await fetch(`http://127.0.0.1:8000/Data?name=${encodeURIComponent(place.trim())}`);
    if(!res.ok){
      const error = await res.json().catch(() => ({}));
      alert(error.detail || "Location not found or API error");
      return;
    }
    const satellite = await res.json();
    myGlobe.htmlElementsData(satellite);

    // Smoothly fly camera towards first satellite if available
    if (Array.isArray(satellite) && satellite.length > 0) {
      const first = satellite[0];
      const lat = first.Latitude ?? first.lat ?? 0;
      const lng = first.Longitude ?? first.lng ?? 0;
      myGlobe.pointOfView({ lat, lng, altitude: 2.2 }, 1000);
    }
  } catch (e){
    alert('Failed to connect to backend server. Make sure saterlite.py is running.');
  }
}
const input = document.querySelector('.name');
const button = document.querySelector('.go');

button.addEventListener('click',() => satellit_data(input.value));
input.addEventListener('keydown',(e) => {
  if (e.key === 'Enter') satellit_data(input.value)
  });