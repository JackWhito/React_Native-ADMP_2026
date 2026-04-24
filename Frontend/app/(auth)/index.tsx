import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";
import useAuthSocial from "@/hooks/useSocialAuth";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { useRouter } from "expo-router";
import { isAxiosError } from "axios";

type AuthMode = "signin" | "signup" | "forgot";

function getApiError(e: unknown): string {
  if (isAxiosError(e)) {
    const msg = e.response?.data?.error;
    if (typeof msg === "string") return msg;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

export default function AuthScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    isLocalAuthed,
    signInWithPassword,
    startEmailRegistration,
    verifyEmailRegistration,
    requestPasswordReset,
    completePasswordReset,
  } = useLocalAuth();
  const { handleSocialAuth, loadingStrategy } = useAuthSocial();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [forgotStep, setForgotStep] = useState<0 | 1>(0);
  const [signupStep, setSignupStep] = useState<0 | 1>(0);
  const [emailAddress, setEmailAddress] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (isLocalAuthed || isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [isLocalAuthed, isSignedIn, router]);

  if (isLocalAuthed || isSignedIn) return null;

  const isSocialLoading = loadingStrategy !== null;
  const isBusy = isSocialLoading || submitting;

  const resetForgot = () => {
    setForgotStep(0);
    setOtp("");
    setNewPassword("");
    setErrorText("");
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorText("");
    setSignupStep(0);
    setOtp("");
    if (next !== "forgot") {
      resetForgot();
    } else {
      resetForgot();
    }
  };

  const handleEmailAuth = async () => {
    setErrorText("");
    if (mode === "signin") {
      if (!emailAddress.trim() || !password) {
        setErrorText("Enter email and password.");
        return;
      }
      setSubmitting(true);
      try {
        await signInWithPassword(emailAddress.trim().toLowerCase(), password);
        router.replace("/(tabs)");
      } catch (e) {
        setErrorText(getApiError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "signup") {
      if (signupStep === 0) {
        if (!emailAddress.trim() || !password) {
          setErrorText("Enter email and password.");
          return;
        }
        if (!name.trim()) {
          setErrorText("Enter your display name.");
          return;
        }
        setSubmitting(true);
        try {
          await startEmailRegistration({
            email: emailAddress.trim().toLowerCase(),
            password,
            name: name.trim(),
          });
          setOtp("");
          setSignupStep(1);
        } catch (e) {
          setErrorText(getApiError(e));
        } finally {
          setSubmitting(false);
        }
        return;
      }

      if (!otp.trim()) {
        setErrorText("Enter the verification code from your email.");
        return;
      }
      setSubmitting(true);
      try {
        await verifyEmailRegistration(emailAddress.trim().toLowerCase(), otp.trim());
        router.replace("/(tabs)");
      } catch (e) {
        setErrorText(getApiError(e));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleResendSignupCode = async () => {
    setErrorText("");
    if (!emailAddress.trim() || !password || !name.trim()) {
      setErrorText("Go back and fill in all fields to resend.");
      return;
    }
    setSubmitting(true);
    try {
      await startEmailRegistration({
        email: emailAddress.trim().toLowerCase(),
        password,
        name: name.trim(),
      });
    } catch (e) {
      setErrorText(getApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSend = async () => {
    setErrorText("");
    if (!emailAddress.trim()) {
      setErrorText("Enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(emailAddress.trim().toLowerCase());
      setForgotStep(1);
    } catch (e) {
      setErrorText(getApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotComplete = async () => {
    setErrorText("");
    if (!emailAddress.trim() || !otp.trim() || !newPassword) {
      setErrorText("Email, code, and new password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await completePasswordReset({
        email: emailAddress.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });
      router.replace("/(tabs)");
    } catch (e) {
      setErrorText(getApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? signupStep === 0
          ? "Create account"
          : "Verify your email"
        : forgotStep === 0
          ? "Reset password"
          : "Enter new password";

  const subtitle =
    mode === "forgot"
      ? forgotStep === 0
        ? "We will email you a 6-digit code if an account exists."
        : "Use the code from your email to set a new password."
      : mode === "signin"
        ? "Sign in with email or Google."
        : signupStep === 0
          ? "Sign up with email or Google."
          : "Enter the 6-digit code we sent to your email.";

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-white text-3xl font-bold">{title}</Text>
          <Text className="text-zinc-400 mt-2 mb-6">{subtitle}</Text>

          {mode !== "forgot" && (
            <View className="flex-row bg-zinc-900 rounded-xl p-1 mb-5">
              <Pressable
                onPress={() => switchMode("signin")}
                className={`flex-1 py-2.5 rounded-lg ${mode === "signin" ? "bg-indigo-500" : ""}`}
              >
                <Text className="text-white text-center font-semibold">Sign in</Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode("signup")}
                className={`flex-1 py-2.5 rounded-lg ${mode === "signup" ? "bg-indigo-500" : ""}`}
              >
                <Text className="text-white text-center font-semibold">Sign up</Text>
              </Pressable>
            </View>
          )}

          {mode === "forgot" && (
            <Pressable
              onPress={() => switchMode("signin")}
              className="mb-4 self-start"
            >
              <Text className="text-indigo-400 text-sm">← Back to sign in</Text>
            </Pressable>
          )}

          {mode === "signin" && (
            <>
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-3"
                placeholder="Email"
                placeholderTextColor="#71717a"
                value={emailAddress}
                onChangeText={setEmailAddress}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-2"
                placeholder="Password"
                placeholderTextColor="#71717a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
              <Pressable
                onPress={() => {
                  setErrorText("");
                  switchMode("forgot");
                }}
                className="self-end mb-4"
              >
                <Text className="text-indigo-400 text-sm">Forgot password?</Text>
              </Pressable>
            </>
          )}

          {mode === "signup" && signupStep === 0 && (
            <>
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-3"
                placeholder="Display name"
                placeholderTextColor="#71717a"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-3"
                placeholder="Email"
                placeholderTextColor="#71717a"
                value={emailAddress}
                onChangeText={setEmailAddress}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-4"
                placeholder="Password"
                placeholderTextColor="#71717a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
              />
            </>
          )}

          {mode === "signup" && signupStep === 1 && (
            <>
              <Pressable
                onPress={() => {
                  setSignupStep(0);
                  setOtp("");
                  setErrorText("");
                }}
                className="mb-3 self-start"
              >
                <Text className="text-indigo-400 text-sm">← Back</Text>
              </Pressable>
              <Text className="text-zinc-500 text-sm mb-2">
                Code sent to: {emailAddress.trim().toLowerCase()}
              </Text>
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-3"
                placeholder="6-digit code"
                placeholderTextColor="#71717a"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
              />
              <Pressable onPress={handleResendSignupCode} className="self-start mb-4" disabled={isBusy}>
                <Text className="text-indigo-400 text-sm">Resend code</Text>
              </Pressable>
            </>
          )}

          {mode === "forgot" && forgotStep === 0 && (
            <TextInput
              className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-4"
              placeholder="Email"
              placeholderTextColor="#71717a"
              value={emailAddress}
              onChangeText={setEmailAddress}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}

          {mode === "forgot" && forgotStep === 1 && (
            <>
              <Text className="text-zinc-500 text-sm mb-2">
                Sending code to: {emailAddress.trim().toLowerCase()}
              </Text>
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-3"
                placeholder="6-digit code from email"
                placeholderTextColor="#71717a"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
              />
              <TextInput
                className="bg-zinc-900 text-white rounded-xl px-4 py-3 mb-2"
                placeholder="New password"
                placeholderTextColor="#71717a"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Text className="text-zinc-500 text-xs mb-4">
                At least 8 characters with upper, lower, number, and symbol.
              </Text>
            </>
          )}

          {mode === "signin" && (
            <Pressable
              onPress={handleEmailAuth}
              disabled={isBusy}
              className={`rounded-xl py-3.5 ${isBusy ? "bg-zinc-700" : "bg-indigo-500"}`}
            >
              <Text className="text-white text-center font-semibold">
                {isBusy && !isSocialLoading ? "Please wait..." : "Continue"}
              </Text>
            </Pressable>
          )}

          {mode === "signup" && signupStep === 0 && (
            <Pressable
              onPress={handleEmailAuth}
              disabled={isBusy}
              className={`rounded-xl py-3.5 ${isBusy ? "bg-zinc-700" : "bg-indigo-500"}`}
            >
              <Text className="text-white text-center font-semibold">
                {isBusy && !isSocialLoading ? "Please wait..." : "Send verification code"}
              </Text>
            </Pressable>
          )}

          {mode === "signup" && signupStep === 1 && (
            <Pressable
              onPress={handleEmailAuth}
              disabled={isBusy}
              className={`rounded-xl py-3.5 ${isBusy ? "bg-zinc-700" : "bg-indigo-500"}`}
            >
              <Text className="text-white text-center font-semibold">
                {isBusy && !isSocialLoading ? "Please wait..." : "Create account"}
              </Text>
            </Pressable>
          )}

          {mode === "forgot" && forgotStep === 0 && (
            <Pressable
              onPress={handleForgotSend}
              disabled={isBusy}
              className={`rounded-xl py-3.5 ${isBusy ? "bg-zinc-700" : "bg-indigo-500"}`}
            >
              <Text className="text-white text-center font-semibold">
                {submitting ? "Please wait..." : "Send code"}
              </Text>
            </Pressable>
          )}

          {mode === "forgot" && forgotStep === 1 && (
            <Pressable
              onPress={handleForgotComplete}
              disabled={isBusy}
              className={`rounded-xl py-3.5 ${isBusy ? "bg-zinc-700" : "bg-indigo-500"}`}
            >
              <Text className="text-white text-center font-semibold">
                {submitting ? "Please wait..." : "Reset password & sign in"}
              </Text>
            </Pressable>
          )}

          <Pressable
            className="mt-3 rounded-xl py-3.5 bg-white/95 flex-row justify-center items-center"
            disabled={isSocialLoading}
            onPress={() => !isSocialLoading && void handleSocialAuth("oauth_google")}
          >
            {loadingStrategy === "oauth_google" ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-zinc-900 font-semibold">Continue with Google</Text>
            )}
          </Pressable>

          {!!errorText && <Text className="text-red-400 text-sm mt-4">{errorText}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
