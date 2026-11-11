// Acesso aos dados do casamento no Firestore.
//
// Coleções:
//   convites/{codigo}  { familia: string | null, convidados: [{ id, nome }],
//                        respostas: { [convidadoId]: 'sim' | 'nao' }, respondidoEm,
//                        criadoEm, atualizadoEm }
//   config/site        { pixChave, pixNome, pixCidade }
//
// Convidado sem família = convite com uma pessoa e `familia: null`.
import { db, auth } from './firebase.js';

/* ---------- Códigos de convite ---------- */
// Sem 0/O e 1/I/L para não confundir quem digita o código impresso.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function normalizeCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}
export function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
export const randomId = () => crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

/* ---------- Área pública ---------- */
export async function getInvite(code) {
  const { db: d, fs } = await db();
  const snap = await fs.getDoc(fs.doc(d, 'convites', normalizeCode(code)));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    code: snap.id,
    familia: data.familia || null,
    convidados: data.convidados || [],
    respostas: data.respostas || {},
  };
}

export async function saveRsvp(code, respostas) {
  const { db: d, fs } = await db();
  await fs.updateDoc(fs.doc(d, 'convites', normalizeCode(code)), {
    respostas,
    respondidoEm: fs.serverTimestamp(),
  });
}

export async function getSiteConfig() {
  const { db: d, fs } = await db();
  const snap = await fs.getDoc(fs.doc(d, 'config', 'site'));
  return snap.exists() ? snap.data() : {};
}

/* ---------- Área interna ---------- */
// O login é por usuário (ex.: henrique.carvalho); por baixo, o Firebase usa um e-mail.
export const ADMIN_EMAIL_DOMAIN = 'casamento-stefania-henrique.firebaseapp.com';
export const userToEmail = (user) => `${String(user).trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
export const emailToUser = (email) => String(email || '').split('@')[0];

export async function login(user, password) {
  const { auth: a, au } = await auth();
  await au.signInWithEmailAndPassword(a, userToEmail(user), password);
}
export async function logout() {
  const { auth: a, au } = await auth();
  await au.signOut(a);
}
export async function watchUser(callback) {
  const { auth: a, au } = await auth();
  return au.onAuthStateChanged(a, callback);
}

export async function watchInvites(callback, onError) {
  const { db: d, fs } = await db();
  return fs.onSnapshot(
    fs.collection(d, 'convites'),
    (snap) =>
      callback(
        snap.docs.map((doc) => {
          const x = doc.data();
          return {
            code: doc.id,
            familia: x.familia || null,
            convidados: x.convidados || [],
            respostas: x.respostas || {},
            respondidoEm: x.respondidoEm?.toDate?.() || null,
            criadoEm: x.criadoEm?.toDate?.() || null,
          };
        }),
      ),
    onError,
  );
}

export async function inviteExists(code) {
  const { db: d, fs } = await db();
  return (await fs.getDoc(fs.doc(d, 'convites', code))).exists();
}

export async function saveInvite({ code, familia, convidados, respostas }, { isNew }) {
  const { db: d, fs } = await db();
  const ref = fs.doc(d, 'convites', code);
  const ids = new Set(convidados.map((c) => c.id));
  // descarta respostas de pessoas removidas do convite
  const kept = Object.fromEntries(Object.entries(respostas || {}).filter(([id]) => ids.has(id)));
  const data = {
    familia: familia?.trim() || null,
    convidados: convidados.map((c) => ({ id: c.id, nome: c.nome.trim() })),
    respostas: kept,
    atualizadoEm: fs.serverTimestamp(),
  };
  if (isNew) await fs.setDoc(ref, { ...data, criadoEm: fs.serverTimestamp() });
  else await fs.updateDoc(ref, data);
}

export async function deleteInvite(code) {
  const { db: d, fs } = await db();
  await fs.deleteDoc(fs.doc(d, 'convites', code));
}

export async function saveSiteConfig(config) {
  const { db: d, fs } = await db();
  await fs.setDoc(fs.doc(d, 'config', 'site'), config, { merge: true });
}
