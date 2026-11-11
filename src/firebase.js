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

let appPromise;
function app() {
  appPromise ??= import('firebase/app').then(({ initializeApp }) => initializeApp(config));
  return appPromise;
}

let dbPromise;
export function db() {
  dbPromise ??= Promise.all([app(), import('firebase/firestore')]).then(([a, fs]) => {
    const db = fs.getFirestore(a);
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
