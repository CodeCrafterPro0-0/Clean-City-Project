/* ================= FIREBASE ================= */

import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7Bgx9pwBxz6mdCrNqzeJraDthc486Lqo",
  authDomain: "cleancity-22780.firebaseapp.com",
  projectId: "cleancity-22780",
  storageBucket: "cleancity-22780.firebasestorage.app",
  messagingSenderId: "986638713214",
  appId: "1:986638713214:web:53fb0442459812cfa4b32f"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();


/* ================= APP ================= */

document.addEventListener("DOMContentLoaded", () => {

const form = document.getElementById("reportForm");
const reportsDiv = document.getElementById("reports");
const toggleBtn = document.getElementById("toggleReports");
const reportsSection = document.getElementById("reportsSection");
const locationInput = document.getElementById("location");
const getLocationBtn = document.getElementById("getLocation");
const photoInput = document.getElementById("photo");
const countEl = document.getElementById("count");
const message = document.getElementById("message");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const adminEmail1 = "alaxenine@gmail.com";


/* ---------- MESSAGE ---------- */

function showMessage(text){
  message.innerText = text;
  message.classList.remove("hidden");

  setTimeout(()=>{
    message.classList.add("hidden");
  },3000);
}


/* ---------- MAP ---------- */

const map = L.map("map").setView([26.1445,91.7362],13);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
{
  attribution:"© OpenStreetMap © CARTO"
}).addTo(map);


/* ---------- ICONS ---------- */

const icons = {
 "Trash Dumping": L.icon({
   iconUrl:"https://maps.google.com/mapfiles/ms/icons/red-dot.png",
   iconSize:[32,32]
 }),
 "Public Spitting": L.icon({
   iconUrl:"https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
   iconSize:[32,32]
 }),
 "Overflow Bin": L.icon({
   iconUrl:"https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
   iconSize:[32,32]
 }),
 "Plastic Waste": L.icon({
   iconUrl:"https://maps.google.com/mapfiles/ms/icons/green-dot.png",
   iconSize:[32,32]
 })
};


/* ---------- COUNTER ---------- */

function updateCounter(count){
  countEl.innerText = count;
}


/* ---------- REALTIME REPORT LISTENER ---------- */

function listenReports(){

  const reportsRef = collection(db,"reports");

  return onSnapshot(reportsRef,(snapshot)=>{

    reportsDiv.innerHTML="";

    map.eachLayer(layer=>{
      if(layer instanceof L.Marker){
        map.removeLayer(layer);
      }
    });

    let count=0;

    snapshot.forEach(docSnap=>{

      const report = docSnap.data();
      const id = docSnap.id;

      const div=document.createElement("div");
      div.className="report";

      div.innerHTML=`
        <strong>📍 ${report.location}</strong><br>
        Issue: ${report.issue}<br>
        ${report.description || ""}
        <br>
        ${
          currentUser?.email=== adminEmail1
            ? `<button onclick="deleteReport('${id}')">Delete</button>`
            : ""
        }
      `;

      reportsDiv.appendChild(div);

      if(report.location.includes(",")){
        const [lat,lon]=report.location.split(",");

        L.marker([lat,lon],{
          icon:icons[report.issue]
        }).addTo(map);
      }

      count++;
    });

    updateCounter(count);
  });
}


/* ---------- LOGIN / LOGOUT ---------- */

loginBtn.addEventListener("click", async()=>{
  await signInWithPopup(auth,provider);
});

logoutBtn.addEventListener("click", async()=>{
  await signOut(auth);
});


/* ---------- AUTH STATE ---------- */

let currentUser = null;
let unsubscribe = null;

onAuthStateChanged(auth,user=>{

  if(unsubscribe){
    unsubscribe();
    unsubscribe=null;
  }

  if(user){
    currentUser=user;

    const isAdmin = user.email === adminEmail1;

    userInfo.innerText=`Logged in as ${user.displayName}` + (isAdmin ? "👑 Admin" : "");

    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    unsubscribe = listenReports();
  }
  else{
    currentUser=null;

    userInfo.innerText="";

    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");

    reportsDiv.innerHTML="";
    updateCounter(0);
  }
});


/* ---------- GPS LOCATION ---------- */

getLocationBtn.addEventListener("click",()=>{

  getLocationBtn.innerText="Getting Location...";
  getLocationBtn.disabled=true;

  navigator.geolocation.getCurrentPosition(

    pos=>{
      const lat=pos.coords.latitude.toFixed(5);
      const lon=pos.coords.longitude.toFixed(5);

      locationInput.value=`${lat},${lon}`;
      map.setView([lat,lon],16);

      getLocationBtn.disabled=false;
      getLocationBtn.innerText="Use My Location";
    },

    err=>{
      alert(err.message);
      getLocationBtn.disabled=false;
      getLocationBtn.innerText="Use My Location";
    }
  );
});


/* ---------- SUBMIT REPORT ---------- */

form.addEventListener("submit",e=>{
  e.preventDefault();

  if(!currentUser){
    showMessage("⚠ Please login first");
    return;
  }

  const location=locationInput.value;
  const issue=document.getElementById("issue").value;
  const description=document.getElementById("description").value;

  let photo=null;

  if(photoInput.files[0]){
    const reader=new FileReader();

    reader.onload=()=>{
      photo=reader.result;
      saveReport(location,issue,description,photo);
    };

    reader.readAsDataURL(photoInput.files[0]);
  }
  else{
    saveReport(location,issue,description,null);
  }
});


async function saveReport(location,issue,description,photo){

  const lastReport = localStorage.getItem("lastReport");

  if (lastReport){
    const diff = Date.now() - Number(lastReport);

    if (diff < 120000){
      showMessage("⌛ Please wait before reporting again");
      return;
    }
  }

  await addDoc(collection(db,"reports"),{
    location,
    issue,
    description,
    photo,
    user:currentUser.email,
    created:Date.now()
  });

  localStorage.setItem("lastReport", Date.now());

  form.reset();
  showMessage("✅ Report submitted successfully");
}


/* ---------- DELETE REPORT ---------- */

window.deleteReport = async function(id){
  await deleteDoc(doc(db,"reports",id));
  showMessage("🗑 Report deleted");
};


/* ---------- TOGGLE REPORTS ---------- */

  toggleBtn.addEventListener("click",()=>{
    reportsSection.classList.toggle("hidden");

    toggleBtn.innerText=
      reportsSection.classList.contains("hidden")
        ? "View Reports"
        : "Hide Reports";
  });

});
