import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fresh, tick, perceive, reply } from "./brain";

const KEY = "nexi_brain_v1";

export default function App() {
  const [b, setB] = useState(null);
  const [chat, setChat] = useState([]);
  const [txt, setTxt] = useState("");
  const list = useRef(null);

  useEffect(() => {
    (async () => {
      let s = null;
      try { s = JSON.parse(await AsyncStorage.getItem(KEY)); } catch (e) {}
      const brain = tick(s || fresh());
      setB(brain);
      setChat([{ id: "0", me: false, t: s ? "Na, wieder da?" : "Hey, ich bin Nexi. Wer bist du?" }]);
    })();
  }, []);

  const persist = (nb) => { setB({ ...nb }); AsyncStorage.setItem(KEY, JSON.stringify(nb)).catch(() => {}); };
  const add = (me, t) => setChat((c) => [...c, { id: String(c.length + 1), me, t }]);

  const send = () => {
    const v = txt.trim();
    if (!v || !b) return;
    setTxt("");
    add(true, v);
    if (v.toLowerCase().includes(b.codeword.toLowerCase())) {
      const nb = fresh(); nb.codeword = b.codeword; persist(nb);
      setChat([{ id: "r", me: false, t: "Nexi wurde ausgeschaltet und startet neu.\nHey, ich bin Nexi. Wer bist du?" }]);
      return;
    }
    const nb = perceive(tick(b), v);
    add(false, reply(nb, v));
    persist(nb);
  };

  if (!b) return <SafeAreaView style={s.root} />;
  const sad = b.energy < 25 || b.emo.anger > 0.5;
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.head}>
        <View style={s.face}>
          <View style={s.hair} />
          <View style={s.eyes}><View style={s.eye} /><View style={s.eye} /></View>
          <View style={[s.mouth, sad && s.mouthSad]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>Nexi</Text>
          <Bar label="Energie" v={b.energy / 100} />
          <Bar label="Freude" v={b.emo.joy} />
          <Bar label="Vertrauen" v={b.trait.trust} />
        </View>
      </View>
      <FlatList ref={list} data={chat} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => list.current && list.current.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[s.msg, item.me ? s.me : s.him]}><Text style={item.me ? s.meT : s.himT}>{item.t}</Text></View>
        )} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.row}>
          <TextInput style={s.input} value={txt} onChangeText={setTxt} placeholder="Schreib Nexi…" placeholderTextColor="#9a8fc4" onSubmitEditing={send} />
          <TouchableOpacity style={s.btn} onPress={send}><Text style={{ color: "#fff", fontWeight: "700" }}>Senden</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Bar = ({ label, v }) => (
  <View style={{ marginTop: 4 }}>
    <Text style={{ color: "#9a8fc4", fontSize: 11 }}>{label}</Text>
    <View style={s.bar}><View style={[s.fill, { width: Math.round(Math.max(0, Math.min(1, v)) * 100) + "%" }]} /></View>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#120d24" },
  head: { flexDirection: "row", gap: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: "#33285e" },
  face: { width: 72, height: 80, borderRadius: 24, backgroundColor: "#2b2155", borderWidth: 2, borderColor: "#19e3d1", alignItems: "center", overflow: "hidden" },
  hair: { position: "absolute", top: 0, left: 0, right: 0, height: 22, backgroundColor: "#ff3d9a" },
  eyes: { flexDirection: "row", gap: 16, marginTop: 34 },
  eye: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#19e3d1" },
  mouth: { marginTop: 10, width: 20, height: 9, borderBottomWidth: 3, borderColor: "#19e3d1", borderRadius: 10 },
  mouthSad: { borderBottomWidth: 0, borderTopWidth: 3, marginTop: 14 },
  name: { color: "#efe9ff", fontSize: 20, fontWeight: "700" },
  bar: { height: 5, backgroundColor: "#33285e", borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, backgroundColor: "#19e3d1" },
  msg: { maxWidth: "85%", padding: 10, borderRadius: 14, marginBottom: 8 },
  me: { alignSelf: "flex-end", backgroundColor: "#19e3d1" },
  him: { alignSelf: "flex-start", backgroundColor: "#1d1638", borderWidth: 1, borderColor: "#33285e" },
  meT: { color: "#06201e", fontSize: 16 },
  himT: { color: "#efe9ff", fontSize: 16 },
  row: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: "#33285e" },
  input: { flex: 1, color: "#efe9ff", backgroundColor: "#1d1638", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  btn: { backgroundColor: "#ff3d9a", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
});
