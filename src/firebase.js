// Conexão com o Firebase (Firestore + Authentication).
// A configuração do app web é pública por natureza: quem protege os dados são as
// regras em firestore.rules e o login da área interna.
//
// Os módulos do Firebase são carregados sob demanda, para não pesar a abertura do site.

const config = {
  apiKey: 'AIzaSyAoOxobd9fZUrUJLEcdS7Vq4MgJB7k43xY',
  authDomain: 'casamento-stefania-henrique.firebaseapp.com',
  projectId: 'casamento-stefania-henrique',
  storageBucket: 'casamento-stefania-henrique.firebasestorage.app',
  messagingSenderId: '620718060692',
  appId: '1:620718060692:web:f52de833c4fd7e5038b081',
};

// Em desenvolvimento, `?emulador` na URL usa os emuladores locais (firebase emulators:start).
const useEmulator =
  import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('emulador');

// App Check: só aceita acessos vindos do próprio site (bloqueia robôs tentando códigos de convite).
// Liga sozinho quando existe a chave do reCAPTCHA v3 em VITE_APPCHECK_SITE_KEY (.env.production).
export const APPCHECK_KEY = import.meta.env.VITE_APPCHECK_SITE_KEY || '';
async function startAppCheck(a) {
  if (!APPCHECK_KEY || useEmulator) return;
  try {
    if (import.meta.env.DEV) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // token de teste no console
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(a, { provider: new ReCaptchaV3Provider(APPCHECK_KEY), isTokenAutoRefreshEnabled: true });
  } catch (e) {
    console.warn('App Check indisponível', e);
  }
}

let appPromise;
function app() {
  appPromise ??= import('firebase/app').then(async ({ initializeApp }) => {
    const a = initializeApp(config);
    await startAppCheck(a);
    return a;
  });
  return appPromise;
}

// Versão "lite" (~4x menor): só leituras e escritas simples. Usada nas páginas dos convidados.
let litePromise;
export function dbLite() {
  litePromise ??= Promise.all([app(), import('firebase/firestore/lite')]).then(([a, fs]) => {
    const db = fs.getFirestore(a);
    if (useEmulator) fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return { db, fs };
  });
  return litePromise;
}

// Versão completa (tempo real, lotes): usada só no painel dos noivos.
let dbPromise;
export function db() {
  dbPromise ??= Promise.all([app(), import('firebase/firestore')]).then(([a, fs]) => {
    // cache local no navegador: o painel abre instantâneo nas próximas visitas e
    // continua mostrando os dados se a internet oscilar
    let db;
    try {
      db = fs.initializeFirestore(a, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      });
    } catch {
      db = fs.getFirestore(a);
    }
    if (useEmulator) fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return { db, fs };
  });
  return dbPromise;
}

let authPromise;
export function auth() {
  authPromise ??= Promise.all([app(), import('firebase/auth')]).then(([a, au]) => {
    const auth = au.getAuth(a);
    if (useEmulator) au.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    return { auth, au };
  });
  return authPromise;
}
