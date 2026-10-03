// PROFLIX real Firebase client.
// Replace firebaseConfig below with the config from Firebase Console.
// Firebase Authentication + Firestore + Storage are used; no fake/demo login is built in.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
  updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc,
  getDocs, query, orderBy, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqz9FYkIGma4Lb8PkwlgKlESr9mRGw2TI",
  authDomain: "proflix-1c82c.firebaseapp.com",
  projectId: "proflix-1c82c",
  storageBucket: "proflix-1c82c.firebasestorage.app",
  messagingSenderId: "230181404876",
  appId: "1:230181404876:web:0e61ab254b4fdd64410269",
  measurementId: "G-LQ3ZZGVW7R"
};


const configReady = !Object.values(firebaseConfig).some(v => String(v).includes("PASTE_YOUR"));

let auth, db, storage;
if (configReady) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

const $ = (id) => document.getElementById(id);
const msg = (id, text, good=false) => {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.style.color = good ? "#59d98e" : "";
};

function friendlyError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/invalid-email":"Please enter a valid email.",
    "auth/user-not-found":"Email or password is incorrect.",
    "auth/wrong-password":"Email or password is incorrect.",
    "auth/email-already-in-use":"This email is already registered.",
    "auth/weak-password":"Password must be at least 6 characters.",
    "auth/too-many-requests":"Too many attempts. Please try again later.",
    "auth/network-request-failed":"Network error. Check your internet connection."
  };
  return map[code] || error?.message || "Something went wrong.";
}

function requireConfig() {
  if (!configReady) {
    alert("Firebase is not configured yet. Open app.js and paste your Firebase web config first.");
    return false;
  }
  return true;
}

async function getUserProfile(user) {
  if (!db || !user) return null;
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? snap.data() : null;
}

async function isAdmin(user) {
  if (!db || !user) return false;
  const snap = await getDoc(doc(db, "admins", user.uid));
  return snap.exists() && snap.data()?.active !== false;
}

function saveSettings() {
  const settings = {
    dark: $("themeToggle")?.checked ?? true,
    compact: $("compactToggle")?.checked ?? false,
    autoplay: $("autoplayToggle")?.checked ?? false,
    remember: $("rememberToggle")?.checked ?? true,
    releases: $("releaseToggle")?.checked ?? true,
    alerts: $("alertToggle")?.checked ?? true
  };
  localStorage.setItem("proflixSettings", JSON.stringify(settings));
  document.body.classList.toggle("compact", settings.compact);
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("proflixSettings") || "{}");
    for (const [id,key] of [["themeToggle","dark"],["compactToggle","compact"],["autoplayToggle","autoplay"],["rememberToggle","remember"],["releaseToggle","releases"],["alertToggle","alerts"]]) {
      if ($(id) && key in s) $(id).checked = !!s[key];
    }
    document.body.classList.toggle("compact", !!s.compact);
  } catch {}
}

async function guardPage() {
  if (!auth) return;
  const page = location.pathname.split("/").pop() || "index.html";
  const publicPages = ["login.html", ""];
  onAuthStateChanged(auth, async (user) => {
    if (!user && !publicPages.includes(page)) {
      location.href = "login.html";
      return;
    }
    if (user && page === "login.html") {
      location.href = "index.html";
      return;
    }
    if (user) {
      const avatar = $("avatarLink");
      if (avatar) avatar.textContent = (user.displayName || user.email || "U")[0].toUpperCase();
      if (page === "admin.html" && !(await isAdmin(user))) {
        document.body.innerHTML = `<main style="padding:40px;font-family:system-ui;color:white;background:#05080f;min-height:100vh"><h1>Access denied</h1><p>You are signed in, but this account is not an admin.</p><a href="index.html" style="color:#ff3345">Go home</a></main>`;
      }
      if (page === "profile.html") loadProfile(user);
    }
  });
}

async function login() {
  if (!requireConfig()) return;
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    location.href = "index.html";
  } catch (e) { msg("authMessage", friendlyError(e)); }
}

async function signup() {
  if (!requireConfig()) return;
  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, {displayName: name});
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid, displayName: name, email,
      photoURL: "", role: "user", createdAt: serverTimestamp()
    }, {merge:true});
    location.href = "index.html";
  } catch (e) { msg("authMessage", friendlyError(e)); }
}

async function resetPassword() {
  if (!requireConfig()) return;
  const email = $("email")?.value.trim();
  if (!email) return msg("authMessage", "Enter your email first.");
  try {
    await sendPasswordResetEmail(auth, email);
    msg("authMessage", "Password reset email sent.", true);
  } catch (e) { msg("authMessage", friendlyError(e)); }
}

async function logout() {
  if (auth) await signOut(auth);
  location.href = "login.html";
}

async function loadProfile(user) {
  const p = await getUserProfile(user) || {};
  const name = p.displayName || user.displayName || "User";
  $("profileName").textContent = name;
  $("profileEmail").textContent = user.email || "";
  $("profileNameInput").value = name;
  $("photoURL").value = p.photoURL || user.photoURL || "";
  $("profileAvatar").textContent = name[0].toUpperCase();
  $("profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const newName = $("profileNameInput").value.trim();
      const photo = $("photoURL").value.trim();
      await updateProfile(user, {displayName:newName, photoURL:photo || null});
      await setDoc(doc(db,"users",user.uid), {displayName:newName,photoURL:photo}, {merge:true});
      $("profileName").textContent = newName;
      $("profileAvatar").textContent = newName[0].toUpperCase();
      msg("profileMessage","Profile saved.",true);
    } catch(e) { msg("profileMessage",friendlyError(e)); }
  });
}

function cardHTML(item) {
  const poster = item.posterUrl || "";
  const image = poster ? `<img src="${poster}" alt="" loading="lazy">` : `<div class="poster-fallback"></div>`;
  return `<article class="card">
    <div class="poster">${image}<button class="play" data-watch="${item.videoUrl || ""}" title="Watch">▶</button></div>
    <h3>${escapeHTML(item.title || "Untitled")}</h3>
    <div class="meta">${escapeHTML(item.genre || item.type || "Movie")} • ${item.year || ""}</div>
    <div class="card-actions">
      <button class="btn ghost" data-list='${JSON.stringify(item).replaceAll("'","&#39;")}'>＋ List</button>
      ${item.videoUrl ? `<a class="btn primary" href="${item.videoUrl}" target="_blank" rel="noopener">⇩ Download</a>` : ""}
    </div>
  </article>`;
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function loadLibrary() {
  if (!db) return;
  try {
    const snap = await getDocs(query(collection(db,"movies"),orderBy("createdAt","desc")));
    const all = snap.docs.map(d=>({id:d.id,...d.data()}));
    const k = all.filter(x => x.type === "kdrama" || x.type === "series").slice(0,10);
    const m = all.filter(x => x.type === "movie").slice(0,10);
    if ($("kdramaGrid")) $("kdramaGrid").innerHTML = k.length ? k.map(cardHTML).join("") : demoCards("K-Drama");
    if ($("movieGrid")) $("movieGrid").innerHTML = m.length ? m.map(cardHTML).join("") : demoCards("Movies");
    bindCards();
  } catch(e) {
    if ($("kdramaGrid")) $("kdramaGrid").innerHTML = demoCards("K-Drama");
    if ($("movieGrid")) $("movieGrid").innerHTML = demoCards("Movies");
  }
}
function demoCards(type){
  const names = type==="K-Drama" ? ["Crash Landing on You","Goblin","The Heirs","Tomorrow","True Beauty"] : ["Avengers Endgame","Joker","Inception","The Dark Knight","Interstellar"];
  return names.map((n,i)=>`<article class="card"><div class="poster" style="background:linear-gradient(145deg,hsl(${i*55} 45% 25%),#0b1019)"><button class="play" disabled>▶</button></div><h3>${n}</h3><div class="meta">${type} • Demo poster</div></article>`).join("");
}
function bindCards(){
  document.querySelectorAll("[data-list]").forEach(btn=>btn.onclick=()=>{
    const item=JSON.parse(btn.dataset.list);
    const old=JSON.parse(localStorage.getItem("myList")||"[]");
    if(!old.some(x=>x.id===item.id)){old.push(item);localStorage.setItem("myList",JSON.stringify(old));alert("Added to My List.");}
  });
  document.querySelectorAll("[data-watch]").forEach(btn=>btn.onclick=()=>{
    if(btn.dataset.watch) window.open(btn.dataset.watch,"_blank","noopener");
  });
}

async function setupAdmin() {
  if (!auth || !db || !storage) return;
  const user = auth.currentUser;
  if (!user || !(await isAdmin(user))) return;
  $("refreshMovies")?.addEventListener("click", loadAdminList);
  $("uploadForm")?.addEventListener("submit", uploadMovie);
  await loadAdminList();
}
async function uploadMovie(e) {
  e.preventDefault();
  const poster = $("poster").files[0], video = $("video").files[0];
  if (!poster || !video) return msg("adminMessage","Choose both poster and video.");
  const title=$("title").value.trim(), type=$("type").value, genre=$("genre").value.trim(), year=Number($("year").value), description=$("description").value.trim();
  try {
    msg("adminMessage","Uploading...");
    const posterRef=ref(storage,`posters/${crypto.randomUUID()}-${poster.name}`);
    const videoRef=ref(storage,`videos/${crypto.randomUUID()}-${video.name}`);
    const pTask=uploadBytesResumable(posterRef,poster);
    await new Promise((resolve,reject)=>{pTask.on("state_changed",s=>{ $("uploadProgress").style.width=(s.bytesTransferred/s.totalBytes*40)+"%";},reject,resolve)});
    const posterUrl=await getDownloadURL(posterRef);
    const vTask=uploadBytesResumable(videoRef,video);
    await new Promise((resolve,reject)=>{vTask.on("state_changed",s=>{ $("uploadProgress").style.width=(40+s.bytesTransferred/s.totalBytes*60)+"%";},reject,resolve)});
    const videoUrl=await getDownloadURL(videoRef);
    await addDoc(collection(db,"movies"),{title,type,genre,year,description,posterUrl,videoUrl,posterPath:posterRef.fullPath,videoPath:videoRef.fullPath,createdBy:auth.currentUser.uid,createdAt:serverTimestamp()});
    $("uploadForm").reset();$("uploadProgress").style.width="100%";
    msg("adminMessage","Upload complete.",true); await loadAdminList();
  } catch(e){msg("adminMessage",friendlyError(e));}
}
async function loadAdminList(){
  if(!db || !$("adminList"))return;
  const snap=await getDocs(query(collection(db,"movies"),orderBy("createdAt","desc")));
  $("adminList").innerHTML=snap.docs.map(d=>{const x={id:d.id,...d.data()};return `<div class="admin-item"><img src="${x.posterUrl||""}" alt=""><div class="grow"><b>${escapeHTML(x.title)}</b><div class="meta">${x.type} • ${x.year||""}</div></div><button class="btn danger small" data-delete="${x.id}">Delete</button></div>`}).join("") || '<p class="muted">No uploads yet.</p>';
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteMovie(b.dataset.delete));
}
async function deleteMovie(id){
  if(!confirm("Delete this title and its database record?"))return;
  try{await deleteDoc(doc(db,"movies",id));await loadAdminList();}catch(e){alert(friendlyError(e));}
}

function initSearch(){
  const input=$("searchInput"); if(!input)return;
  input.addEventListener("input",()=>{const q=input.value.toLowerCase().trim();document.querySelectorAll(".card").forEach(c=>c.style.display=c.textContent.toLowerCase().includes(q)?"":"none")});
}
function initMisc(){
  $("menuBtn")?.addEventListener("click",()=>document.body.classList.toggle("menu-open"));
  $("logoutBtn")?.addEventListener("click",logout);
  $("resetPasswordBtn")?.addEventListener("click",resetPassword);
  ["themeToggle","compactToggle","autoplayToggle","rememberToggle","releaseToggle","alertToggle"].forEach(id=>$(id)?.addEventListener("change",saveSettings));
  loadSettings();
  $("premiumBtn")?.addEventListener("click",()=>alert("Premium billing can be connected later to your chosen payment provider."));
  $("heroWatch")?.addEventListener("click",()=>alert("Upload a title from Admin to connect the Watch button."));
  $("heroList")?.addEventListener("click",()=>alert("Use + List on any uploaded title."));
}

if ($("loginForm")) $("loginForm").addEventListener("submit",e=>{e.preventDefault();login()});
if ($("signupForm")) $("signupForm").addEventListener("submit",e=>{e.preventDefault();signup()});
$("resetBtn")?.addEventListener("click",resetPassword);

initMisc();
initSearch();
loadSettings();
guardPage();

if (configReady && auth) {
  onAuthStateChanged(auth, async user => {
    if (user && location.pathname.endsWith("index.html")) {
      await loadLibrary();
      const my=JSON.parse(localStorage.getItem("myList")||"[]");
      if($("myListGrid")) $("myListGrid").innerHTML=my.length?my.map(cardHTML).join(""):"<p class='muted'>Your saved titles will appear here.</p>";
      bindCards();
    }
    if (user && location.pathname.endsWith("admin.html")) setupAdmin();
  });
}
