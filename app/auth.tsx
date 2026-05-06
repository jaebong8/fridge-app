import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { colors, type, spacing, radius, shadow } from "../lib/tokens";

type Mode = "login" | "signup";

const REDIRECT_URL = "fridgeapp://auth/callback";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const submit = async () => {
    setError("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (mode === "signup" && !nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) setError("이메일 또는 비밀번호가 올바르지 않아요.");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { nickname: nickname.trim() } },
      });
      if (error) {
        if (error.message.toLowerCase().includes("email"))
          setError("유효하지 않은 이메일 주소예요.");
        else if (error.message.toLowerCase().includes("password"))
          setError("비밀번호는 6자 이상이어야 해요.");
        else setError("가입 중 오류가 발생했어요. 다시 시도해주세요.");
      } else if (!data.session) {
        setEmailSent(true);
      }
    }
    setLoading(false);
  };

  const signInWithProvider = async (provider: "google" | "kakao") => {
    setError("");
    setLoading(true);

    try {
      const kakaoScopes = "profile_nickname profile_image"; // 이메일 제외 (비즈니스 인증 필요)

      // 웹: 현재 페이지를 OAuth로 리다이렉트 (딥링크 불필요)
      if (Platform.OS === "web") {
        const redirectTo =
          typeof window !== "undefined" ? window.location.origin : REDIRECT_URL;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            ...(provider === "kakao" && { scopes: kakaoScopes }),
          },
        });
        if (error) setError("소셜 로그인 준비 중 오류가 발생했어요.");
        return;
      }

      // 네이티브 (Android/iOS)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: REDIRECT_URL,
          skipBrowserRedirect: true,
          ...(provider === "kakao" && { scopes: kakaoScopes }),
        },
      });
      if (error || !data.url) {
        setError("소셜 로그인 준비 중 오류가 발생했어요.");
        return;
      }

      const authUrl = data.url;
      const redirectUrl = await new Promise<string | null>((resolve) => {
        const sub = Linking.addEventListener("url", ({ url }) => {
          sub.remove();
          resolve(url);
        });
        WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URL).then(
          (result) => {
            sub.remove();
            resolve(result.type === "success" ? result.url : null);
          },
        );
      });

      if (!redirectUrl) return;

      const parsed = Linking.parse(redirectUrl);
      const code = parsed.queryParams?.code as string | undefined;
      if (!code) {
        setError("인증 코드를 받지 못했어요. 다시 시도해주세요.");
        return;
      }

      const { error: sessionError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (sessionError) setError("로그인에 실패했어요. 다시 시도해주세요.");
    } catch {
      setError("소셜 로그인 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <Text style={s.logo}>🧊</Text>
          <Text style={[type.titleXl, { color: colors.ink900, marginTop: 8 }]}>
            나만의 냉장고
          </Text>
          <Text style={[type.body, { color: colors.ink500, marginTop: 4 }]}>
            우리 가족 냉장고 관리
          </Text>
        </View>

        {emailSent ? (
          <View style={s.card}>
            <Text
              style={[
                type.titleMd,
                { color: colors.ink900, textAlign: "center" },
              ]}
            >
              📬 이메일을 확인해주세요
            </Text>
            <Text
              style={[
                type.body,
                { color: colors.ink500, textAlign: "center", marginTop: 8 },
              ]}
            >
              {email}으로{"\n"}인증 링크를 보냈어요.
            </Text>
            <Pressable
              onPress={() => {
                setEmailSent(false);
                switchMode("login");
              }}
              style={({ pressed }) => [
                s.btn,
                { marginTop: 8 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={s.btnText}>로그인으로 돌아가기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.card}>
            <View style={s.tabs}>
              {(["login", "signup"] as Mode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  style={[s.tab, mode === m && s.tabActive]}
                >
                  <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                    {m === "login" ? "로그인" : "회원가입"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.fields}>
              {mode === "signup" && (
                <Field
                  label="닉네임"
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="가족에게 표시될 이름"
                  autoCapitalize="none"
                />
              )}
              <Field
                label="이메일"
                value={email}
                onChangeText={setEmail}
                placeholder="hello@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="비밀번호"
                value={password}
                onChangeText={setPassword}
                placeholder="6자 이상"
                secureTextEntry
              />
            </View>

            {error !== "" && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                s.btn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>
                  {mode === "login" ? "로그인" : "가입하기"}
                </Text>
              )}
            </Pressable>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>또는</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.socialRow}>
              <Pressable
                onPress={() => signInWithProvider("google")}
                disabled={loading}
                style={({ pressed }) => [
                  s.socialBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={s.googleG}>G</Text>
                <Text style={s.socialBtnText}>Google</Text>
              </Pressable>

              <Pressable
                onPress={() => signInWithProvider("kakao")}
                disabled={loading}
                style={({ pressed }) => [
                  s.socialBtn,
                  s.kakaoBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={s.kakaoIcon}>💬</Text>
                <Text style={[s.socialBtnText, s.kakaoText]}>카카오</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink300}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "sentences"}
        secureTextEntry={secureTextEntry}
        style={f.input}
      />
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...type.caption, color: colors.ink500 },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ink100,
    backgroundColor: colors.bgElev,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.ink900,
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: "center", padding: spacing.xl },
  header: { alignItems: "center", marginBottom: spacing.xxxl },
  logo: { fontSize: 52 },

  card: {
    backgroundColor: colors.bgElev,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
    ...shadow.md,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.bgSunken,
    borderRadius: radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: radius.md - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.bgElev,
    ...shadow.sm,
  },
  tabText: { ...type.titleSm, color: colors.ink400 },
  tabTextActive: { color: colors.ink900 },

  fields: { gap: spacing.md },

  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { ...type.bodySm, color: colors.danger },

  btn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { ...type.titleSm, color: "#fff", fontSize: 15 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: -spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.ink100 },
  dividerText: { ...type.caption, color: colors.ink300 },

  socialRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  socialBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.ink200,
    backgroundColor: colors.bgElev,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  kakaoBtn: {
    backgroundColor: "#FEE500",
    borderColor: "#FEE500",
  },
  googleG: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4285F4",
  },
  kakaoIcon: { fontSize: 16 },
  socialBtnText: { ...type.titleSm, color: colors.ink700, fontSize: 15 },
  kakaoText: { color: "#3C1E1E" },
});
