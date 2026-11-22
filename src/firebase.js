import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import firebaseAppletConfig from "../firebase-applet-config.json";

// Config de Firebase del proyecto "Finance". Base de datos y Storage del usuario:
const firebaseConfig = {
  apiKey: "AIzaSyAPyDC2kc_vgDjhLoA1EkI-Wljw8XQJwMw",
  authDomain: "finance-6e127.firebaseapp.com",
  projectId: "finance-6e127",
  storageBucket: "finance-6e127.firebasestorage.app",
  messagingSenderId: "10299682336",
  appId: "1:10299682336:web:671a87e670b3f038c49645",
};

export const app = getApps().find((a) => a.name === "[DEFAULT]") || initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const functions = getFunctions(app);

export const OWNER_EMAIL = "iventuramena@gmail.com";
export const ADMIN_EMAILS = [
  "iventuramena@gmail.com",
];
export const ALLOWED_EMAIL = OWNER_EMAIL; // Retrocompatibilidad

export const isOwnerUser = (user) => {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  if (email && ADMIN_EMAILS.some((adm) => adm.toLowerCase() === email)) {
    return true;
  }
  if (user.rol === "propietario" || user.rol === "admin") {
    return true;
  }
  return false;
};
export const storage = getStorage(app);

export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/contacts",
];

// App de Workspace provisionada para OAuth Client ID y permisos de Google Workspace (Gmail y Contacts)
export const workspaceApp =
  getApps().find((a) => a.name === "workspace-app") ||
  initializeApp(firebaseAppletConfig, "workspace-app");
export const workspaceAuth = getAuth(workspaceApp);
export const workspaceProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => workspaceProvider.addScope(scope));
workspaceProvider.setCustomParameters({
  prompt: "consent",
  access_type: "offline",
});

export const workspaceContactsProvider = new GoogleAuthProvider();
workspaceContactsProvider.addScope("https://www.googleapis.com/auth/contacts");
workspaceContactsProvider.setCustomParameters({
  prompt: "consent",
});

// Caché para token de autenticación de login general
let cachedLoginToken = null;

export const setCachedAccessToken = (token) => {
  cachedLoginToken = token;
};

export const getCachedAccessToken = () => {
  return cachedLoginToken;
};

export const clearCachedAccessToken = () => {
  cachedLoginToken = null;
};

// Caché exclusivo para el token de acceso con scope de Gmail (https://www.googleapis.com/auth/gmail.send)
let cachedGmailAccessToken = null;

export const setCachedGmailAccessToken = (token) => {
  cachedGmailAccessToken = token;
};

export const getCachedGmailAccessToken = () => {
  return cachedGmailAccessToken;
};

export const clearCachedGmailAccessToken = () => {
  cachedGmailAccessToken = null;
};

// Caché en memoria exclusivo para el token de acceso de Google Contacts (https://www.googleapis.com/auth/contacts)
let cachedContactsAccessToken = null;

export const setCachedContactsAccessToken = (token) => {
  cachedContactsAccessToken = token;
};

export const getCachedContactsAccessToken = () => {
  return cachedContactsAccessToken;
};

export const clearCachedContactsAccessToken = () => {
  cachedContactsAccessToken = null;
};

// Obtiene o solicita un token OAuth específico para enviar correos con Gmail
export const getOrRequestGmailAccessToken = async (forcePrompt = false) => {
  if (cachedGmailAccessToken && !forcePrompt) {
    return cachedGmailAccessToken;
  }

  // 1. Intentar primero con Google Identity Services (GIS) oficial cargado en index.html
  if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
    try {
      const token = await new Promise((resolve, reject) => {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: firebaseAppletConfig.oAuthClientId,
            scope: "https://www.googleapis.com/auth/gmail.send",
            hint: auth.currentUser?.email || ALLOWED_EMAIL,
            callback: (resp) => {
              if (resp && resp.access_token) {
                resolve(resp.access_token);
              } else if (resp?.error) {
                reject(new Error(resp.error_description || resp.error));
              } else {
                reject(new Error("No se obtuvo token de acceso de Google"));
              }
            },
            error_callback: (err) => {
              reject(err);
            },
          });
          client.requestAccessToken({ prompt: forcePrompt ? "consent" : "" });
        } catch (initErr) {
          reject(initErr);
        }
      });

      if (token) {
        cachedGmailAccessToken = token;
        return token;
      }
    } catch (gisErr) {
      console.warn("GIS falló o fue cancelado, intentando con popup de Firebase:", gisErr);
    }
  }

  // 2. Intentar con Firebase Auth en el workspaceApp provisionado
  try {
    const result = await signInWithPopup(workspaceAuth, workspaceProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGmailAccessToken = credential.accessToken;
      return cachedGmailAccessToken;
    }
  } catch (workspaceErr) {
    console.warn("workspaceAuth signInWithPopup falló:", workspaceErr);
    // 3. Fallback adicional con auth principal si tiene scope de Gmail
    try {
      const fallbackResult = await signInWithPopup(auth, workspaceProvider);
      const fallbackCred = GoogleAuthProvider.credentialFromResult(fallbackResult);
      if (fallbackCred?.accessToken) {
        cachedGmailAccessToken = fallbackCred.accessToken;
        return cachedGmailAccessToken;
      }
    } catch (fbErr) {
      console.error("Fallo general al solicitar autorización para Gmail:", fbErr);
    }
    throw workspaceErr;
  }

  throw new Error("No se pudo obtener el token de acceso de Google para Gmail.");
};

// Obtiene o solicita un token OAuth específico para Google Contacts (People API)
export const getOrRequestContactsAccessToken = async (forcePrompt = false) => {
  if (cachedContactsAccessToken && !forcePrompt) {
    return cachedContactsAccessToken;
  }

  // 1. Intentar primero con Google Identity Services (GIS)
  if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
    try {
      const token = await new Promise((resolve, reject) => {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: firebaseAppletConfig.oAuthClientId,
            scope: "https://www.googleapis.com/auth/contacts",
            hint: auth.currentUser?.email || undefined,
            callback: (resp) => {
              if (resp && resp.access_token) {
                resolve(resp.access_token);
              } else if (resp?.error) {
                reject(new Error(resp.error_description || resp.error));
              } else {
                reject(new Error("No se obtuvo token de acceso de Google Contacts"));
              }
            },
            error_callback: (err) => {
              reject(err);
            },
          });
          client.requestAccessToken({ prompt: forcePrompt ? "consent" : "" });
        } catch (initErr) {
          reject(initErr);
        }
      });

      if (token) {
        cachedContactsAccessToken = token;
        return token;
      }
    } catch (gisErr) {
      console.warn("GIS Contacts falló, intentando con popup de Firebase:", gisErr);
    }
  }

  // 2. Intentar con Firebase Auth en el workspaceApp provisionado
  try {
    const result = await signInWithPopup(workspaceAuth, workspaceContactsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedContactsAccessToken = credential.accessToken;
      return cachedContactsAccessToken;
    }
  } catch (workspaceErr) {
    console.warn("workspaceAuth signInWithPopup para Contacts falló:", workspaceErr);
    try {
      const fallbackResult = await signInWithPopup(auth, workspaceContactsProvider);
      const fallbackCred = GoogleAuthProvider.credentialFromResult(fallbackResult);
      if (fallbackCred?.accessToken) {
        cachedContactsAccessToken = fallbackCred.accessToken;
        return cachedContactsAccessToken;
      }
    } catch (fbErr) {
      console.error("Fallo al solicitar autorización para Google Contacts:", fbErr);
    }
    throw workspaceErr;
  }

  throw new Error("No se pudo obtener el token de acceso para Google Contacts.");
};

