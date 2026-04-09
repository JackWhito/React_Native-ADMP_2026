import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useSignIn, useSignUp } from "@clerk/expo";
import useAuthSocial from "@/hooks/useSocialAuth";
import { useRouter } from "expo-router";

type AuthMode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, fetchStatus: signInStatus, errors: signInErrors } = useSignIn();
  const { signUp, fetchStatus: signUpStatus, errors: signUpErrors } = useSignUp();
  const { handleSocialAuth, loadingStrategy } = useAuthSocial();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, router]);

  if (isSignedIn) return null;

  const isSocialLoading = loadingStrategy !== null;
  const isLoading =
    isSocialLoading || signInStatus === "fetching" || signUpStatus === "fetching";

  const finishAuth = async (finalize: any) => {
    await finalize({
      navigate: ({ session, decorateUrl }: any) => {
        if (session?.currentTask) return;
        const url = decorateUrl("/");
        if (url.startsWith("http")) {
          window.location.href = url;
          return;
        }
        router.replace("/(tabs)");
      },
    });
  };

  const handleContinue = async () => {
    if (!emailAddress || !password) return;
    if (mode === "signin") {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) return;
      if (signIn.status === "complete") {
        await finishAuth(signIn.finalize);
      }
      return;
    }

    if (!awaitingVerification) {
      const { error } = await signUp.password({ emailAddress, password });
      if (error) return;
      await signUp.verifications.sendEmailCode();
      setAwaitingVerification(true);
      return;
    }

    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await finishAuth(signUp.finalize);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 px-5 py-8">
      <Text className="text-white text-3xl font-bold">
        {mode === "signin" ? "Welcome back" : "Create account"}
      </Text>
      <Text className="text-zinc-400 mt-2 mb-6">
        {mode === "signin"
          ? "Sign in to continue."
          : awaitingVerification
            ? "Check your email and enter the verification code."
            : "Sign up with email and password."}
      </Text>

      <View className="flex-row bg-zinc-900 rounded-xl p-1 mb-5">
        <Pressable
          onPress={() => {
            setMode("signin");
            setAwaitingVerification(false);
            setCode("");
          }}
          className={`flex-1 py-2.5 rounded-lg ${mode === "signin" ? "bg-indigo-500" : ""}`}
        >
          <Text className="text-white text-center font-semibold">Sign in</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode("signup");
            setAwaitingVerification(false);
            setCode("");
          }}
          className={`flex-1 py-2.5 rounded-lg ${mode === "signup" ? "bg-indigo-500" : ""}`}
        >
          <Text className="text-white text-center font-semibold">Sign up</Text>
        </Pressable>
      </View>

      {!awaitingVerification && (
        <>
          <TextInput
            className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-3"
            placeholder="Email"
            placeholderTextColor="#71717a"
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-4"
            placeholder="Password"
            placeholderTextColor="#71717a"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </>
      )}

      {awaitingVerification && (
        <TextInput
          className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-4"
          placeholder="Verification code"
          placeholderTextColor="#71717a"
          value={code}
          onChangeText={setCode}
          keyboardType="numeric"
        />
      )}

      <Pressable
        onPress={handleContinue}
        disabled={isLoading || (!awaitingVerification && (!emailAddress || !password))}
        className={`rounded-xl py-3.5 ${isLoading ? "bg-zinc-700" : "bg-indigo-500"}`}
      >
        <Text className="text-white text-center font-semibold">
          {isLoading ? "Please wait..." : awaitingVerification ? "Verify" : "Continue"}
        </Text>
      </Pressable>

      <Pressable
        className="mt-3 rounded-xl py-3.5 bg-white/95 flex-row justify-center items-center"
        disabled={isSocialLoading}
        onPress={() => !isSocialLoading && handleSocialAuth("oauth_google")}
      >
        {loadingStrategy === "oauth_google" ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text className="text-zinc-900 font-semibold">Continue with Google</Text>
        )}
      </Pressable>

      {!!signInErrors.fields.identifier?.message && mode === "signin" && (
        <Text className="text-red-400 text-xs mt-3">
          {String(signInErrors.fields.identifier.message)}
        </Text>
      )}
      {!!signInErrors.fields.password?.message && mode === "signin" && (
        <Text className="text-red-400 text-xs mt-1">
          {String(signInErrors.fields.password.message)}
        </Text>
      )}
      {!!signUpErrors.fields.emailAddress?.message && mode === "signup" && (
        <Text className="text-red-400 text-xs mt-3">
          {String(signUpErrors.fields.emailAddress.message)}
        </Text>
      )}
      {!!signUpErrors.fields.password?.message && mode === "signup" && (
        <Text className="text-red-400 text-xs mt-1">
          {String(signUpErrors.fields.password.message)}
        </Text>
      )}
      {!!signUpErrors.fields.code?.message && mode === "signup" && awaitingVerification && (
        <Text className="text-red-400 text-xs mt-1">
          {String(signUpErrors.fields.code.message)}
        </Text>
      )}

      <View nativeID="clerk-captcha" />
    </SafeAreaView>
  );
}