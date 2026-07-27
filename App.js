import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://flhfwfioyjogjmwetpot.supabase.co',
  'sb_publishable_efL_M7lmKTiXWzdtD4Af4Q_S1VSTRd_',
  { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } }
);

const INTERESTS = [
  { key: 'Sport', label: '🏃 Sport' },
  { key: 'Musik', label: '🎶 Musik' },
  { key: 'Hobby', label: '🎲 Hobby & Spiele' },
  { key: 'Food', label: '🍜 Essen & Trinken' },
  { key: 'Kultur', label: '🎭 Kultur' },
  { key: 'Lernen', label: '💡 Lernen' },
  { key: 'Outdoor', label: '🌳 Outdoor' },
];

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [tab, setTab] = useState('events');
  const [authMode, setAuthMode] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myInterests, setMyInterests] = useState([]);
  const [interestsSel, setInterestsSel] = useState([]);
  const [city, setCity] = useState('Nürnberg');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selected, setSelected] = useState(null);
  const [requested, setRequested] = useState({});
  const [myRequests, setMyRequests] = useState([]);
  const [loadingBuddys, setLoadingBuddys] = useState(false);

  useEffect(() => {
    if (screen !== 'app') return;
    if (tab === 'events') loadEvents();
    if (tab === 'buddys') loadMyRequests();
    if (tab === 'profil') loadProfile();
  }, [screen, tab, city]);

  async function loadEvents() {
    setLoadingEvents(true);
    const { data, error } = await supabase.from('events').select('*').eq('city', city).order('id');
    if (!error) setEvents(data || []);
    setLoadingEvents(false);
  }

  async function loadMyRequests() {
    setLoadingBuddys(true);
    const { data } = await supabase
      .from('buddy_requests')
      .select('id, person_name, created_at, events ( title, date_label, city, emoji )')
      .order('created_at', { ascending: false });
    setMyRequests(data || []);
    setLoadingBuddys(false);
  }

  async function loadProfile() {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) { setProfile(data); if (Array.isArray(data.interests)) setMyInterests(data.interests); }
  }

  function toggleInterest(key) {
    setInterestsSel(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function saveInterests() {
    if (interestsSel.length === 0) { setError('Bitte wähle mindestens ein Interesse.'); return; }
    setBusy(true);
    if (user) await supabase.from('profiles').update({ interests: interestsSel }).eq('id', user.id);
    setMyInterests(interestsSel);
    setBusy(false);
    setError('');
    setTab('events');
    setScreen('app');
  }

  async function handleAuth() {
    setError('');
    if (!email.includes('@') || password.length < 6) {
      setError('Bitte gültige E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.');
      return;
    }
    setBusy(true);
    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').insert({ id: data.user.id, name: name || 'Covo-Nutzer', city });
        }
        const { data: u } = await supabase.auth.getUser();
        setUser(u.user);
        setInterestsSel([]);
        setScreen('interests');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: u } = await supabase.auth.getUser();
        setUser(u.user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.user.id).single();
        if (prof) { setProfile(prof); if (Array.isArray(prof.interests)) setMyInterests(prof.interests); }
        setTab('events');
        setScreen('app');
      }
    } catch (e) {
      setError(e.message || 'Etwas ist schiefgelaufen.');
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(ev) {
    setSelected(ev);
    setRequested({});
    setScreen('detail');
    const { data } = await supabase.from('buddy_requests').select('person_name').eq('event_id', ev.id);
    if (data) {
      const map = {};
      data.forEach(r => { map[r.person_name] = true; });
      setRequested(map);
    }
  }

  async function sendRequest(personName) {
    setRequested(prev => ({ ...prev, [personName]: true }));
    const { error } = await supabase.from('buddy_requests').insert({ event_id: selected.id, person_name: personName });
    if (error) {
      setRequested(prev => ({ ...prev, [personName]: false }));
      Alert.alert('Ups', error.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setMyRequests([]); setMyInterests([]);
    setEmail(''); setPassword(''); setName(''); setError('');
    setScreen('welcome');
  }

  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.logo}>🎈</Text>
            <Text style={styles.brand}>Covo</Text>
            <Text style={styles.tagline}>Entdecke Events in deiner Stadt – und finde jemanden, der mitkommt.</Text>
          </View>
          <View style={styles.body}>
            <View style={styles.feature}><Text style={styles.featureText}>📅  Alle Community-Events deiner Stadt an einem Ort</Text></View>
            <View style={styles.feature}><Text style={styles.featureText}>🤝  Finde deinen Event-Buddy – nie wieder allein hingehen</Text></View>
            <View style={styles.feature}><Text style={styles.featureText}>🛡️  Sicher verabreden an öffentlichen Event-Orten</Text></View>
            <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={() => { setAuthMode('register'); setError(''); setScreen('auth'); }}>
              <Text style={styles.btnPrimaryText}>Konto erstellen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.85} onPress={() => { setAuthMode('login'); setError(''); setScreen('auth'); }}>
              <Text style={styles.btnSecondaryText}>Ich habe schon ein Konto</Text>
            </TouchableOpacity>
            <Text style={styles.footer}>Pilot: Nürnberg & München</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'auth') {
    return (
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <TouchableOpacity onPress={() => setScreen('welcome')}><Text style={styles.backDark}>‹ zurück</Text></TouchableOpacity>
            <Text style={styles.authTitle}>{authMode === 'register' ? 'Konto erstellen' : 'Anmelden'}</Text>
            <Text style={styles.authHint}>{authMode === 'register' ? 'Leg dein Covo-Profil an.' : 'Willkommen zurück!'}</Text>
            {authMode === 'register' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Vorname</Text>
                <TextInput style={styles.input} placeholder="z. B. Claudia" value={name} onChangeText={setName} />
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>E-Mail</Text>
              <TextInput style={styles.input} placeholder="name@mail.de" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Passwort</Text>
              <TextInput style={styles.input} placeholder="mindestens 6 Zeichen" secureTextEntry value={password} onChangeText={setPassword} />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={handleAuth} disabled={busy}>
              {busy ? <ActivityIndicator color="#5A2E12" /> : <Text style={styles.btnPrimaryText}>{authMode === 'register' ? 'Weiter' : 'Anmelden'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setError(''); setAuthMode(authMode === 'register' ? 'login' : 'register'); }}>
              <Text style={styles.switchText}>{authMode === 'register' ? 'Schon ein Konto? Hier anmelden' : 'Noch kein Konto? Jetzt registrieren'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === 'interests') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={styles.authTitle}>Was interessiert dich?</Text>
          <Text style={styles.authHint}>Wähle deine Interessen – wir heben passende Events für dich hervor.</Text>
          <View style={styles.chipsWrap}>
            {INTERESTS.map(it => {
              const on = interestsSel.includes(it.key);
              return (
                <TouchableOpacity key={it.key} style={[styles.selChip, on && styles.selChipOn]} onPress={() => toggleInterest(it.key)}>
                  <Text style={[styles.selChipTxt, on && styles.selChipTxtOn]}>{it.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error ? <Text style={[styles.errorText, { marginTop: 16 }]}>{error}</Text> : null}
          <TouchableOpacity style={[styles.btnPrimary, { marginTop: 24 }]} onPress={saveInterests} disabled={busy}>
            {busy ? <ActivityIndicator color="#5A2E12" /> : <Text style={styles.btnPrimaryText}>Los geht es 🎈</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'detail' && selected) {
    const people = Array.isArray(selected.people) ? selected.people : [];
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView>
          <View style={styles.hero}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('app')}><Text style={styles.backTxt}>‹</Text></TouchableOpacity>
            <Text style={{ fontSize: 60 }}>{selected.emoji}</Text>
          </View>
          <View style={{ padding: 20 }}>
            <View style={styles.badge}><Text style={styles.badgeTxt}>{selected.cat}</Text></View>
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <View style={styles.info}>
              <Text style={styles.infoLine}>📅  {selected.date_label}</Text>
              <Text style={styles.infoLine}>📍  {selected.loc}</Text>
              <Text style={styles.infoLine}>💶  <Text style={styles.price}>{selected.price}</Text></Text>
            </View>
            <Text style={styles.sectionTitle}>Über das Event</Text>
            <Text style={styles.desc}>{selected.description}</Text>
            <Text style={styles.sectionTitle}>🤝 Diese Leute suchen Begleitung</Text>
            {people.map((p, i) => {
              const done = requested[p.n];
              return (
                <View key={i} style={styles.buddy}>
                  <View style={styles.avatar}><Text style={styles.avatarTxt}>{p.a}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.buddyName}>{p.n}</Text>
                    {p.shared ? <Text style={styles.buddyShared}>{p.shared}</Text> : null}
                    <Text style={styles.buddyNote}>{p.note}</Text>
                  </View>
                  <TouchableOpacity style={done ? styles.btnDone : styles.btnSmall} activeOpacity={0.85} disabled={done} onPress={() => sendRequest(p.n)}>
                    <Text style={done ? styles.btnDoneTxt : styles.btnSmallTxt}>{done ? 'Angefragt ✓' : 'Anfragen'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <Text style={styles.safety}>🛡️ Sicher unterwegs: Verabredungen finden am öffentlichen Event-Ort statt. Profile lassen sich melden und blockieren.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sortedEvents = [...events].sort((a, b) => (myInterests.includes(b.cat) ? 1 : 0) - (myInterests.includes(a.cat) ? 1 : 0));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={{ flex: 1 }}>
        {tab === 'events' ? (
          <View style={{ flex: 1 }}>
            <View style={styles.evHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.evTitle}>Entdecken</Text>
                <Text style={styles.evSub}>{events.length} Events in {city}</Text>
              </View>
            </View>
            <View style={styles.cityRow}>
              {['Nürnberg', 'München'].map(c => (
                <TouchableOpacity key={c} style={[styles.cityPill, city === c && styles.cityPillOn]} onPress={() => setCity(c)}>
                  <Text style={[styles.cityPillText, city === c && styles.cityPillTextOn]}>📍 {c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {loadingEvents ? (
              <View style={{ padding: 40 }}><ActivityIndicator color="#52703A" /></View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
                {sortedEvents.map(e => {
                  const people = Array.isArray(e.people) ? e.people : [];
                  const match = myInterests.includes(e.cat);
                  return (
                    <TouchableOpacity key={e.id} style={styles.card} activeOpacity={0.9} onPress={() => openDetail(e)}>
                      <View style={styles.cardImg}>
                        <Text style={{ fontSize: 40 }}>{e.emoji}</Text>
                        <View style={styles.catChip}><Text style={styles.catChipText}>{e.cat}</Text></View>
                        <View style={styles.budChip}><Text style={styles.budChipText}>🤝 {people.length} suchen Begleitung</Text></View>
                      </View>
                      <View style={styles.cardBody}>
                        {match ? <Text style={styles.matchTag}>★ passt zu dir</Text> : null}
                        <Text style={styles.cardTitle}>{e.title}</Text>
                        <Text style={styles.cardMeta}>📅 {e.date_label}</Text>
                        <Text style={styles.cardMeta}>📍 {e.loc} · <Text style={styles.price}>{e.price}</Text></Text>
                        <Text style={styles.cardLink}>Details ansehen ›</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {events.length === 0 ? <Text style={styles.empty}>Keine Events gefunden.</Text> : null}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        ) : null}

        {tab === 'buddys' ? (
          <View style={{ flex: 1 }}>
            <View style={styles.evHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.evTitle}>Meine Buddys</Text>
                <Text style={styles.evSub}>Deine gesendeten Anfragen</Text>
              </View>
            </View>
            {loadingBuddys ? (
              <View style={{ padding: 40 }}><ActivityIndicator color="#52703A" /></View>
            ) : myRequests.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🤝</Text>
                <Text style={styles.empty}>Noch keine Anfragen gesendet. Öffne ein Event und frag jemanden an, der auch hingeht!</Text>
                <TouchableOpacity style={[styles.btnPrimary, { paddingHorizontal: 26, marginTop: 16 }]} onPress={() => setTab('events')}>
                  <Text style={styles.btnPrimaryText}>Events entdecken</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12 }}>
                {myRequests.map(r => (
                  <View key={r.id} style={styles.reqRow}>
                    <View style={styles.avatar}><Text style={styles.avatarTxt}>{(r.person_name || '?').charAt(0)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.buddyName}>{r.person_name}</Text>
                      <Text style={styles.buddyNote}>{r.events ? r.events.emoji + ' ' + r.events.title : 'Event'}</Text>
                    </View>
                    <View style={styles.waitBadge}><Text style={styles.waitBadgeTxt}>Wartet</Text></View>
                  </View>
                ))}
                <Text style={styles.hintNote}>💬 In der fertigen App öffnet sich hier ein Chat, sobald jemand deine Anfrage annimmt.</Text>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        ) : null}

        {tab === 'profil' ? (
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.profHead}>
              <View style={styles.profAvatar}><Text style={styles.profAvatarTxt}>{(profile && profile.name ? profile.name : 'C').charAt(0).toUpperCase()}</Text></View>
              <Text style={styles.profName}>{profile && profile.name ? profile.name : 'Mein Profil'}</Text>
              <Text style={styles.profSub}>📍 {profile && profile.city ? profile.city : city}{user && user.email ? '  ·  ' + user.email : ''}</Text>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={styles.sectionTitle}>Meine Interessen</Text>
              <View style={styles.chipsWrap}>
                {myInterests.length === 0 ? <Text style={styles.buddyNote}>Noch keine ausgewählt.</Text> : myInterests.map(k => {
                  const it = INTERESTS.find(x => x.key === k);
                  return <View key={k} style={[styles.selChip, styles.selChipOn]}><Text style={styles.selChipTxtOn}>{it ? it.label : k}</Text></View>;
                })}
              </View>
              <Text style={styles.sectionTitle}>Sicherheit & Vertrauen</Text>
              <View style={styles.infoRow}><Text style={styles.infoRowTitle}>🛡️  Verifizierung</Text><Text style={styles.infoRowSub}>In der fertigen App: Foto-/ID-Bestätigung für mehr Vertrauen</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoRowTitle}>🚩  Melden & Blockieren</Text><Text style={styles.infoRowSub}>Unangenehme Kontakte jederzeit melden oder blockieren</Text></View>
              <TouchableOpacity style={[styles.btnSecondary, { marginTop: 18 }]} onPress={logout}>
                <Text style={styles.btnSecondaryText}>Abmelden</Text>
              </TouchableOpacity>
              <Text style={styles.profFoot}>Covo · Prototyp · Pilot Nürnberg & München</Text>
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.nav}>
        {[['events', '🗓️', 'Events'], ['buddys', '🤝', 'Buddys'], ['profil', '👤', 'Profil']].map(([key, ic, lbl]) => (
          <TouchableOpacity key={key} style={styles.navBtn} onPress={() => setTab(key)}>
            <Text style={styles.navIc}>{ic}</Text>
            <Text style={[styles.navLbl, tab === key && styles.navLblOn]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDF7F3' },
  scroll: { flexGrow: 1 },
  header: { backgroundColor: '#96BE8C', paddingTop: 40, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logo: { fontSize: 52 },
  brand: { fontSize: 34, fontWeight: '800', color: '#233019', marginTop: 4 },
  tagline: { fontSize: 15, color: '#2C3626', textAlign: 'center', marginTop: 10, lineHeight: 22, maxWidth: 300 },
  body: { padding: 20 },
  feature: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#1E2A26', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  featureText: { fontSize: 15, color: '#333B2E', lineHeight: 21 },
  btnPrimary: { backgroundColor: '#F69C6D', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  btnPrimaryText: { color: '#5A2E12', fontSize: 16, fontWeight: '700' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 12, borderWidth: 1.5, borderColor: '#52703A' },
  btnSecondaryText: { color: '#52703A', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#6E7566', fontSize: 13, marginTop: 20 },
  backDark: { color: '#52703A', fontWeight: '700', fontSize: 15, marginBottom: 14 },
  authTitle: { fontSize: 26, fontWeight: '800', color: '#333B2E' },
  authHint: { fontSize: 14.5, color: '#6E7566', marginTop: 4, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#333B2E', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ECE4DB', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#333B2E' },
  errorText: { color: '#C0504D', fontSize: 13.5, marginBottom: 8 },
  switchText: { color: '#52703A', fontWeight: '700', fontSize: 14, textAlign: 'center', marginTop: 18 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  selChip: { borderWidth: 1.5, borderColor: '#ECE4DB', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 15, marginRight: 8, marginBottom: 8 },
  selChipOn: { backgroundColor: '#52703A', borderColor: '#52703A' },
  selChipTxt: { color: '#52703A', fontWeight: '600', fontSize: 13.5 },
  selChipTxtOn: { color: '#fff', fontWeight: '600', fontSize: 13.5 },
  evHeader: { backgroundColor: '#96BE8C', paddingTop: 40, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  evTitle: { fontSize: 22, fontWeight: '800', color: '#233019' },
  evSub: { fontSize: 12.5, color: '#324021' },
  cityRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  cityPill: { borderWidth: 1.5, borderColor: '#ECE4DB', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: '#fff', marginRight: 8 },
  cityPillOn: { backgroundColor: '#52703A', borderColor: '#52703A' },
  cityPillText: { color: '#52703A', fontWeight: '600', fontSize: 13 },
  cityPillTextOn: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', shadowColor: '#1E2A26', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardImg: { height: 90, backgroundColor: '#E4ECDA', alignItems: 'center', justifyContent: 'center' },
  catChip: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  catChipText: { fontSize: 11, fontWeight: '700', color: '#52703A' },
  budChip: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#F69C6D', borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  budChipText: { fontSize: 11, fontWeight: '700', color: '#5A2E12' },
  cardBody: { padding: 14 },
  matchTag: { fontSize: 12, fontWeight: '800', color: '#C77B2B', marginBottom: 3 },
  cardTitle: { fontSize: 16.5, fontWeight: '700', color: '#333B2E', marginBottom: 5 },
  cardMeta: { fontSize: 13, color: '#6E7566', lineHeight: 20 },
  cardLink: { fontSize: 13, color: '#52703A', fontWeight: '700', marginTop: 8 },
  price: { color: '#52703A', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#6E7566', marginTop: 4, lineHeight: 20 },
  reqRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ECE4DB', borderRadius: 14, padding: 12, marginBottom: 10 },
  waitBadge: { backgroundColor: '#FDF3E3', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  waitBadgeTxt: { fontSize: 11.5, fontWeight: '700', color: '#9A6A16' },
  hintNote: { fontSize: 12.5, color: '#7A5A1E', backgroundColor: '#FDF3E3', borderRadius: 12, padding: 12, marginTop: 6, lineHeight: 18 },
  hero: { backgroundColor: '#96BE8C', height: 150, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 44, left: 16, backgroundColor: 'rgba(255,255,255,0.9)', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 22, fontWeight: '700', color: '#233019', marginTop: -2 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#E4ECDA', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: '#52703A' },
  detailTitle: { fontSize: 22, fontWeight: '800', color: '#333B2E', marginTop: 10 },
  info: { backgroundColor: '#F1F5EC', borderRadius: 14, padding: 14, marginTop: 14 },
  infoLine: { fontSize: 14.5, color: '#333B2E', lineHeight: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#52703A', marginTop: 20, marginBottom: 10 },
  desc: { fontSize: 14.5, color: '#48513F', lineHeight: 22 },
  buddy: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ECE4DB', borderRadius: 14, padding: 12, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#96BE8C', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarTxt: { color: '#233019', fontWeight: '800', fontSize: 18 },
  buddyName: { fontWeight: '700', fontSize: 15, color: '#333B2E' },
  buddyShared: { fontSize: 11.5, fontWeight: '700', color: '#52703A', marginTop: 1 },
  buddyNote: { fontSize: 12.5, color: '#6E7566', marginTop: 1 },
  btnSmall: { backgroundColor: '#F69C6D', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  btnSmallTxt: { color: '#5A2E12', fontWeight: '700', fontSize: 13 },
  btnDone: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#52703A', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  btnDoneTxt: { color: '#52703A', fontWeight: '700', fontSize: 13 },
  safety: { fontSize: 12, color: '#6E7566', lineHeight: 18, marginTop: 20, textAlign: 'center' },
  profHead: { backgroundColor: '#96BE8C', paddingTop: 40, paddingBottom: 26, alignItems: 'center' },
  profAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FDF7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  profAvatarTxt: { fontSize: 32, fontWeight: '800', color: '#52703A' },
  profName: { fontSize: 22, fontWeight: '800', color: '#233019' },
  profSub: { fontSize: 13, color: '#2C3626', marginTop: 3 },
  infoRow: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ECE4DB', borderRadius: 14, padding: 14, marginBottom: 10 },
  infoRowTitle: { fontSize: 14.5, fontWeight: '700', color: '#333B2E' },
  infoRowSub: { fontSize: 12.5, color: '#6E7566', marginTop: 3, lineHeight: 18 },
  profFoot: { textAlign: 'center', color: '#6E7566', fontSize: 12, marginTop: 18 },
  nav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ECE4DB', paddingTop: 8, paddingBottom: 10 },
  navBtn: { flex: 1, alignItems: 'center' },
  navIc: { fontSize: 22, marginBottom: 2 },
  navLbl: { fontSize: 11, fontWeight: '600', color: '#A6AC9C' },
  navLblOn: { color: '#52703A' },
});
