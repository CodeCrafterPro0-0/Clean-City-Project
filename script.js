document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reportForm");
    const reportsDiv = document.getElementById("reports");
    const toggleBtn = document.getElementById("toggleReports");
    const reportsSection = document.getElementById("reportsSection");
    const locationInput = document.getElementById("location");
    const getLocationBtn = document.getElementById("getLocation");
    const photoInput = document.getElementById("photo");
    const countEl = document.getElementById("count");

    /* MAP */
    const map = L.map("map").setView([26.1445, 91.7362], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
    }).addTo(map);

    /* Icons */
    const icons = {
        "Trash Dumping": L.icon({
            iconUrl:"https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            iconSize:[32, 32]
        }),
        "Public Spitting": L.icon({
            iconUrl:"https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
            iconSize:[32, 32]
        }),
        "Overflow Bin": L.icon({
            iconUrl:"https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            iconSize:[32, 32]
        }),
        "Plastic Waste": L.icon({
            iconUrl:"https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            iconSize:[32, 32]
        })
    };

    /* DATA */
    let reports = JSON.parse(localStorage.getItem("reports")) || [];

    function updateCounter() {
        countEl.innerText = reports.length;
    }

    function displayReports() {
        reportsDiv.innerHTML = "";
        
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

    reports.forEach(report => {

        const div = document.createElement("div");
        div.className = "report";

        div.innerHTML = `
        <strong>📍 ${report.location}</strong><br>
        Issue: ${report.issue}<br>
        ${report.description || ""}
        `;

        reportsDiv.appendChild(div);

        // add map marker
        if (report.location.includes(",")) {
            const [lat, lon] = report.location.split(",");

            L.marker([lat, lon], {
                icon: icons[report.issue]
            })
                .addTo(map)
                .bindPopup(`<b>${report.issue}</b><br>${report.description || ""}`);
            }
        });

        updateCounter();
    }
    
    displayReports();

    /* GPS LOCATION */
    getLocationBtn.addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {

                const lat = pos.coords.latitude.toFixed(5);
                const lon = pos.coords.longitude.toFixed(5);

                locationInput.value = `${lat},${lon}`;
            });
        } else {
            alert("Geolocation not supported");
    }
});

    /* SUBMIT */
    form.addEventListener("submit", e => {
        e.preventDefault();

        const location = locationInput.value;
        const issue = document.getElementById("issue").value;
        const description = document.getElementById("description").value;

        let photo = null;

        if (photoInput.files[0]) {
            const reader = new FileReader();

            reader.onload = function () {
                photo = reader.result;
                saveReport(location, issue, description, photo);
            };

            reader.readAsDataURL(photoInput.files[0]);
        } else {
            saveReport(location, issue, description, null);
        }
    });

    function saveReport(location, issue, description, photo) {

        const report = { location, issue, description, photo };

        reports.push(report);

        localStorage.setItem("reports", JSON.stringify(reports));

        form.reset();
        displayReports();
    }

    /* TOGGLE REPORTS */
    toggleBtn.addEventListener("click", () => {
        reportsSection.classList.toggle("hidden");

        toggleBtn.innerText =
            reportsSection.classList.contains("hidden")
                ? "View Reports"
                : "Hide Reports";
    });
});