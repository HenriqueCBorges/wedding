// Acesso aos dados do casamento no Firestore.
//
// Coleções:
//   convites/{codigo}  { familia: string | null, convidados: [{ id, nome }],
//                        respostas: { [convidadoId]: 'sim' | 'nao' }, respondidoEm,
//                        criadoEm, atualizadoEm }
//   config/site        { pixChave, pixNome, pixCidade }              (leitura pública)
//   admin/mesas        { A: [{ nome, cadeiras }], B: [...] }        (só noivos)
//   presentes/{id}     { nome, presente, valor, data, agradecido, obs } (só noivos)
//   convites também têm: telefone (WhatsApp)
//
// Convidado sem família = convite com uma pessoa e `familia: null`.
import { db, dbLite, auth } from './firebase.js';

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
  const { db: d, fs } = await dbLite();
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
  const { db: d, fs } = await dbLite();
  await fs.updateDoc(fs.doc(d, 'convites', normalizeCode(code)), {
    respostas,
    respondidoEm: fs.serverTimestamp(),
  });
}

export async function getSiteConfig() {
  const { db: d, fs } = await dbLite();
  const snap = await fs.getDoc(fs.doc(d, 'config', 'site'));
  return snap.exists() ? snap.data() : {};
}

/* ---------- Área interna ---------- */
// O login é por usuário (ex.: henrique.carvalho); por baixo, o Firebase usa um e-mail.
export const ADMIN_EMAIL_DOMAIN = 'casamento-stefania-henrique.firebaseapp.com';
// Aceita só o usuário ("henrique.carvalho") ou o e-mail completo; ignora espaços e acentos.
export function userToEmail(user) {
  const clean = String(user || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (clean.includes('@')) return clean;
  return `${clean}@${ADMIN_EMAIL_DOMAIN}`;
}
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
            telefone: x.telefone || '',
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

export async function saveInvite({ code, familia, convidados, respostas, telefone }, { isNew }) {
  const { db: d, fs } = await db();
  const ref = fs.doc(d, 'convites', code);
  const ids = new Set(convidados.map((c) => c.id));
  // descarta respostas de pessoas removidas do convite
  const kept = Object.fromEntries(Object.entries(respostas || {}).filter(([id]) => ids.has(id)));
  const data = {
    familia: familia?.trim() || null,
    convidados: convidados.map(cleanGuest),
    respostas: kept,
    telefone: String(telefone || '').replace(/[^\d+]/g, ''),
    atualizadoEm: fs.serverTimestamp(),
  };
  if (isNew) await fs.setDoc(ref, { ...data, criadoEm: fs.serverTimestamp() });
  else await fs.updateDoc(ref, data);
}

// Convidado: { id, nome, tags: string[], assento: { lado: 'A'|'B', mesa: 1-10, cadeira: 1-7 } | null }
function cleanGuest(c) {
  return {
    id: c.id,
    nome: String(c.nome || '').trim(),
    tags: Array.isArray(c.tags) ? [...new Set(c.tags)] : [],
    assento: c.assento ? { lado: c.assento.lado, mesa: c.assento.mesa, cadeira: c.assento.cadeira } : null,
  };
}

/**
 * Atualiza convidados de vários convites de uma vez (ex.: trocar duas pessoas de lugar).
 * @param {Map<string, Array>} updates  código do convite → lista completa de convidados
 */
export async function saveGuestsBatch(updates) {
  const { db: d, fs } = await db();
  const batch = fs.writeBatch(d);
  for (const [code, convidados] of updates)
    batch.update(fs.doc(d, 'convites', code), {
      convidados: convidados.map(cleanGuest),
      atualizadoEm: fs.serverTimestamp(),
    });
  await batch.commit();
}

export async function deleteInvite(code) {
  const { db: d, fs } = await db();
  await fs.deleteDoc(fs.doc(d, 'convites', code));
}

export async function saveSiteConfig(config) {
  const { db: d, fs } = await db();
  await fs.setDoc(fs.doc(d, 'config', 'site'), config, { merge: true });
}

/* ---------- Ações em massa: atualiza só alguns campos de vários convites ---------- */
export async function updateInvitesBatch(updates) {
  const { db: d, fs } = await db();
  const batch = fs.writeBatch(d);
  for (const [code, fields] of updates) batch.update(fs.doc(d, 'convites', code), { ...fields, atualizadoEm: fs.serverTimestamp() });
  await batch.commit();
}

/* ---------- Respostas registradas pelos noivos (confirmação pelo painel) ---------- */
/** @param {Map<string, object>} updates  código do convite → mapa completo de respostas */
export async function saveResponsesBatch(updates) {
  const { db: d, fs } = await db();
  const batch = fs.writeBatch(d);
  for (const [code, respostas] of updates)
    batch.update(fs.doc(d, 'convites', code), {
      respostas,
      respondidoEm: Object.keys(respostas).length ? fs.serverTimestamp() : null,
      atualizadoEm: fs.serverTimestamp(),
    });
  await batch.commit();
}

/* ---------- Configuração das mesas (nomes e cadeiras) ---------- */
export async function watchTables(callback) {
  const { db: d, fs } = await db();
  return fs.onSnapshot(fs.doc(d, 'admin', 'mesas'), (snap) => callback(snap.exists() ? snap.data() : {}), () => callback({}));
}
export async function saveTables(config) {
  const { db: d, fs } = await db();
  await fs.setDoc(fs.doc(d, 'admin', 'mesas'), config);
}

/* ---------- Presentes recebidos (registrados à mão, pois o Pix não avisa) ---------- */
export async function watchGifts(callback, onError) {
  const { db: d, fs } = await db();
  return fs.onSnapshot(
    fs.collection(d, 'presentes'),
    (snap) =>
      callback(
        snap.docs
          .map((doc) => {
            const x = doc.data();
            return { id: doc.id, ...x, data: x.data?.toDate?.() || null };
          })
          .sort((a, b) => (b.data || 0) - (a.data || 0)),
      ),
    onError,
  );
}
export async function saveGift(gift) {
  const { db: d, fs } = await db();
  const data = {
    nome: String(gift.nome || '').trim(),
    presente: String(gift.presente || '').trim(),
    valor: Math.max(0, Math.round(Number(gift.valor || 0) * 100) / 100),
    data: gift.data instanceof Date ? fs.Timestamp.fromDate(gift.data) : fs.serverTimestamp(),
    agradecido: !!gift.agradecido,
    obs: String(gift.obs || '').trim(),
  };
  if (gift.id) await fs.setDoc(fs.doc(d, 'presentes', gift.id), data);
  else await fs.addDoc(fs.collection(d, 'presentes'), data);
}
export async function setGiftThanked(id, agradecido) {
  const { db: d, fs } = await db();
  await fs.updateDoc(fs.doc(d, 'presentes', id), { agradecido });
}
export async function deleteGift(id) {
  const { db: d, fs } = await db();
  await fs.deleteDoc(fs.doc(d, 'presentes', id));
}

/* ---------- Cópia de segurança (painel) ---------- */
// Lê tudo o que o site guarda e devolve um objeto simples, pronto para virar arquivo .json.
export async function exportBackup() {
  const { db: d, fs } = await db();
  const plain = (v) => {
    if (v && typeof v.toDate === 'function') return v.toDate().toISOString(); // datas do Firestore
    if (Array.isArray(v)) return v.map(plain);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
    return v;
  };
  const all = async (name) =>
    (await fs.getDocs(fs.collection(d, name))).docs.map((s) => ({ id: s.id, ...plain(s.data()) }));
  const one = async (path, id) => {
    const s = await fs.getDoc(fs.doc(d, path, id));
    return s.exists() ? plain(s.data()) : null;
  };
  const [convites, presentes, mesas, site] = await Promise.all([
    all('convites'),
    all('presentes'),
    one('admin', 'mesas'),
    one('config', 'site'),
  ]);
  return { geradoEm: new Date().toISOString(), convites, presentes, mesas, config: site };
}
