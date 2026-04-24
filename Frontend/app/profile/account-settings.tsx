import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import {
  useConfirmAccountEmailChange,
  useDeleteAccount,
  useMyProfile,
  useRequestAccountEmailChange,
  useUpdateAccountSettings,
  useUpdateLocalAccountPassword,
} from "@/hooks/useProfile";

type EditableField = "username" | "name" | "email" | null;

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { signOutLocal, persistAppAccessToken } = useLocalAuth();
  const { user } = useUser();
  const requestEmailChange = useRequestAccountEmailChange();
  const confirmEmailChange = useConfirmAccountEmailChange();
  const updateLocalPassword = useUpdateLocalAccountPassword();

  const signOutEverywhere = async () => {
    await signOutLocal();
    await signOut();
  };
  const { data: myProfile } = useMyProfile();
  const updateAccountSettings = useUpdateAccountSettings();
  const deleteAccount = useDeleteAccount();
  const isEmailAccount = myProfile?.authProvider === "email";

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editingValue, setEditingValue] = useState("");
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailAddressForVerification, setEmailAddressForVerification] = useState<any>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [emailOtpError, setEmailOtpError] = useState("");

  useEffect(() => {
    if (!myProfile) return;
    setUsername(myProfile.username ?? "");
    setName(myProfile.name ?? "");
    setEmail(myProfile.email ?? "");
  }, [myProfile]);

  const openEdit = (field: Exclude<EditableField, null>) => {
    setEditingField(field);
    setEditingValue(field === "username" ? username : field === "name" ? name : email);
    setEmailOtpStep(false);
    setPendingEmail("");
    setEmailOtpCode("");
    setEmailAddressForVerification(null);
    setEmailOtpError("");
  };

  const handleSaveField = async () => {
    if (!editingField || !myProfile) return;
    const nextValue = editingValue.trim();
    if (!nextValue) return;

    const nextUsername = editingField === "username" ? nextValue : username;
    const nextName = editingField === "name" ? nextValue : name;
    const nextEmail = editingField === "email" ? nextValue.toLowerCase() : email;

    if (editingField === "email") {
      if (nextEmail === email.toLowerCase()) {
        setEditingField(null);
        setEditingValue("");
        return;
      }
      if (isEmailAccount) {
        try {
          setEmailOtpError("");
          await requestEmailChange.mutateAsync(nextEmail);
          setPendingEmail(nextEmail);
          setEmailOtpCode("");
          setEmailAddressForVerification(null);
          setEmailOtpStep(true);
        } catch (error: any) {
          setEmailOtpError(
            error?.response?.data?.error ||
              error?.message ||
              "Could not send verification code to that email."
          );
        }
        return;
      }
      const createEmailAddress = (user as any)?.createEmailAddress;
      if (typeof createEmailAddress !== "function") {
        setEmailOtpError("Email verification is unavailable for this account.");
        return;
      }

      try {
        setEmailOtpError("");
        const newEmailAddress = await createEmailAddress.call(user, {
          emailAddress: nextEmail,
        });
        await newEmailAddress.prepareVerification({
          strategy: "email_code",
        });
        setPendingEmail(nextEmail);
        setEmailAddressForVerification(newEmailAddress);
        setEmailOtpCode("");
        setEmailOtpStep(true);
      } catch (error: any) {
        setEmailOtpError(
          error?.errors?.[0]?.longMessage ||
            error?.errors?.[0]?.message ||
            error?.message ||
            "Could not send OTP code to that email."
        );
      }
      return;
    }

    try {
      await updateAccountSettings.mutateAsync({
        username: nextUsername,
        name: nextName,
        email: nextEmail,
      });
      setUsername(nextUsername);
      setName(nextName);
      setEmail(nextEmail);
      setEditingField(null);
      setEditingValue("");
    } catch {
      // Error shown below
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode.trim()) {
      setEmailOtpError("Enter the code from your email.");
      return;
    }
    if (isEmailAccount) {
      if (!pendingEmail) return;
      try {
        setEmailOtpError("");
        const data = await confirmEmailChange.mutateAsync({
          newEmail: pendingEmail,
          otp: emailOtpCode.trim(),
        });
        if (data?.accessToken) {
          await persistAppAccessToken(data.accessToken);
        }
        setEmail(pendingEmail);
        setEditingField(null);
        setEditingValue("");
        setEmailOtpStep(false);
        setPendingEmail("");
        setEmailOtpCode("");
        setEmailAddressForVerification(null);
      } catch (error: any) {
        setEmailOtpError(
          error?.response?.data?.error || error?.message || "Could not verify the code."
        );
      }
      return;
    }
    if (!emailAddressForVerification || !pendingEmail) return;
    try {
      setEmailOtpError("");
      const verifiedEmail = await emailAddressForVerification.attemptVerification({
        code: emailOtpCode.trim(),
      });

      if (verifiedEmail?.verification?.status !== "verified") {
        setEmailOtpError("Invalid OTP code. Please try again.");
        return;
      }

      const setPrimary = verifiedEmail?.setAsPrimary;
      if (typeof setPrimary === "function") {
        await setPrimary.call(verifiedEmail);
      } else {
        const updateUser = (user as any)?.update;
        if (typeof updateUser === "function") {
          await updateUser.call(user, { primaryEmailAddressId: verifiedEmail.id });
        }
      }

      await updateAccountSettings.mutateAsync({
        username,
        name,
        email: pendingEmail,
      });

      setEmail(pendingEmail);
      setEditingField(null);
      setEditingValue("");
      setEmailOtpStep(false);
      setPendingEmail("");
      setEmailOtpCode("");
      setEmailAddressForVerification(null);
    } catch (error: any) {
      setEmailOtpError(
        error?.errors?.[0]?.longMessage ||
          error?.errors?.[0]?.message ||
          error?.message ||
          "Could not verify OTP code."
      );
    }
  };

  const handleResendEmailOtp = async () => {
    if (isEmailAccount && pendingEmail) {
      try {
        setEmailOtpError("");
        await requestEmailChange.mutateAsync(pendingEmail);
      } catch (error: any) {
        setEmailOtpError(
          error?.response?.data?.error || error?.message || "Could not resend the code."
        );
      }
      return;
    }
    if (!emailAddressForVerification) return;
    try {
      setEmailOtpError("");
      await emailAddressForVerification.prepareVerification({ strategy: "email_code" });
    } catch (error: any) {
      setEmailOtpError(
        error?.errors?.[0]?.longMessage ||
          error?.errors?.[0]?.message ||
          error?.message ||
          "Could not resend OTP code."
      );
    }
  };

  const handleChangePassword = async () => {
    const current = currentPassword.trim();
    const next = newPassword.trim();
    if (!current || !next) return;

    if (isEmailAccount) {
      try {
        setPasswordPending(true);
        setPasswordError("");
        const data = await updateLocalPassword.mutateAsync({ currentPassword: current, newPassword: next });
        if (data?.accessToken) {
          await persistAppAccessToken(data.accessToken);
        }
        setPasswordModalOpen(false);
        setCurrentPassword("");
        setNewPassword("");
      } catch (error: any) {
        setPasswordError(
          error?.response?.data?.error || error?.message || "Could not update password."
        );
      } finally {
        setPasswordPending(false);
      }
      return;
    }

    if (!user) return;
    const updatePassword = (user as any)?.updatePassword;
    if (typeof updatePassword !== "function") {
      setPasswordError("Password update is unavailable for this account.");
      return;
    }

    try {
      setPasswordPending(true);
      setPasswordError("");
      await updatePassword.call(user, { currentPassword: current, newPassword: next });
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      setPasswordError(
        error?.errors?.[0]?.longMessage ||
          error?.errors?.[0]?.message ||
          error?.message ||
          "Could not update password."
      );
    } finally {
      setPasswordPending(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync();
      await signOutEverywhere();
      router.replace("/(auth)/signin");
    } catch {
      // Error shown below
    }
  };

  const accountRows = useMemo(
    () => [
      { key: "username", label: "Username", value: username || "—" },
      { key: "name", label: "Name", value: name || "—" },
      { key: "email", label: "Email", value: email || "—" },
    ],
    [username, name, email]
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70">
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text className="text-white text-base font-semibold">Account settings</Text>
      </View>

      <View className="px-4 pt-5">
        <Text className="text-zinc-400 text-xs mb-2">ACCOUNT</Text>
        <View className="rounded-2xl border border-zinc-800 bg-zinc-900">
          {accountRows.map((row, idx) => (
            <Pressable
              key={row.key}
              onPress={() => openEdit(row.key as "username" | "name" | "email")}
              className={`px-4 py-3 flex-row items-center justify-between ${idx > 0 ? "border-t border-zinc-800" : ""}`}
            >
              <Text className="text-zinc-300 text-sm">{row.label}</Text>
              <View className="flex-row items-center ml-3">
                <Text className="text-zinc-100 text-sm" numberOfLines={1}>
                  {row.value}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#71717A" style={{ marginLeft: 6 }} />
              </View>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setPasswordModalOpen(true)}
            className="px-4 py-3 flex-row items-center justify-between border-t border-zinc-800"
          >
            <Text className="text-zinc-300 text-sm">Password</Text>
            <View className="flex-row items-center ml-3">
              <Text className="text-zinc-500 text-sm">••••••••</Text>
              <Ionicons name="chevron-forward" size={16} color="#71717A" style={{ marginLeft: 6 }} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => setDeleteConfirmOpen(true)}
            className="px-4 py-3 flex-row items-center justify-between border-t border-zinc-800"
          >
            <Text className="text-red-400 text-sm">Delete account</Text>
            <Ionicons name="trash-outline" size={16} color="#F87171" />
          </Pressable>
        </View>
      </View>

      <View className="flex-1 justify-end px-4 pb-6">
        <Text className="text-zinc-400 text-xs mb-2">SESSION</Text>
        <Pressable
          onPress={() => void signOutEverywhere()}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex-row items-center justify-between"
        >
          <Text className="text-zinc-100 text-sm">Log out</Text>
          <Ionicons name="log-out-outline" size={18} color="#DBDEE1" />
        </Pressable>
      </View>

      {(updateAccountSettings.isError || deleteAccount.isError) ? (
        <View className="px-4 pb-3">
          <Text className="text-red-400 text-sm">
            {(updateAccountSettings.error as any)?.response?.data?.error ||
              (deleteAccount.error as any)?.response?.data?.error ||
              (updateAccountSettings.error as Error | undefined)?.message ||
              (deleteAccount.error as Error | undefined)?.message ||
              "Could not update account settings."}
          </Text>
        </View>
      ) : null}

      <Modal
        visible={!!editingField}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingField(null)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => {
            setEditingField(null);
            setEmailOtpStep(false);
            setPendingEmail("");
            setEmailOtpCode("");
            setEmailAddressForVerification(null);
            setEmailOtpError("");
          }}
        >
          <Pressable className="w-full max-w-[360px] rounded-2xl bg-[#15161A] border border-zinc-800 px-4 pt-3 pb-4">
            <Text className="text-zinc-100 text-base font-semibold mb-2">
              Edit {editingField ?? ""}
            </Text>
            {!emailOtpStep ? (
              <>
                <TextInput
                  value={editingValue}
                  onChangeText={setEditingValue}
                  placeholder={`Enter ${editingField ?? "value"}`}
                  placeholderTextColor="#71717A"
                  className="rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100"
                  autoCapitalize={editingField === "name" ? "words" : "none"}
                  keyboardType={editingField === "email" ? "email-address" : "default"}
                  autoCorrect={false}
                />
                <Pressable className="py-3 mt-2 rounded-md active:bg-zinc-800/70" onPress={handleSaveField}>
                  <Text className="text-indigo-300 text-sm font-semibold">
                    {editingField === "email"
                      ? requestEmailChange.isPending
                        ? "Sending..."
                        : isEmailAccount
                          ? "Send code"
                          : "Send OTP"
                      : updateAccountSettings.isPending
                        ? "Saving..."
                        : "Save"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-zinc-400 text-xs mb-2">
                  Enter OTP sent to <Text className="text-zinc-200">{pendingEmail}</Text>
                </Text>
                <TextInput
                  value={emailOtpCode}
                  onChangeText={setEmailOtpCode}
                  placeholder="OTP code"
                  placeholderTextColor="#71717A"
                  className="rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable className="py-3 mt-2 rounded-md active:bg-zinc-800/70" onPress={handleVerifyEmailOtp}>
                  <Text className="text-indigo-300 text-sm font-semibold">
                    {isEmailAccount && confirmEmailChange.isPending
                      ? "Verifying..."
                      : updateAccountSettings.isPending
                        ? "Verifying..."
                        : "Verify and save"}
                  </Text>
                </Pressable>
                <Pressable className="py-3 rounded-md active:bg-zinc-800/70" onPress={handleResendEmailOtp}>
                  <Text className="text-zinc-300 text-sm">Resend OTP</Text>
                </Pressable>
              </>
            )}
            {emailOtpError ? <Text className="text-red-400 text-xs mt-2">{emailOtpError}</Text> : null}
            <Pressable className="py-3 rounded-md active:bg-zinc-800/70" onPress={() => setEditingField(null)}>
              <Text className="text-zinc-100 text-sm">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={passwordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => !passwordPending && setPasswordModalOpen(false)}
        >
          <Pressable className="w-full max-w-[360px] rounded-2xl bg-[#15161A] border border-zinc-800 px-4 pt-3 pb-4">
            <Text className="text-zinc-100 text-base font-semibold mb-2">Change password</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor="#71717A"
              className="rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100"
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor="#71717A"
              className="rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100 mt-2"
              secureTextEntry
              autoCapitalize="none"
            />
            {passwordError ? <Text className="text-red-400 text-xs mt-2">{passwordError}</Text> : null}
            <Pressable className="py-3 mt-2 rounded-md active:bg-zinc-800/70" onPress={handleChangePassword}>
              <Text className="text-indigo-300 text-sm font-semibold">
                {passwordPending ? "Updating..." : "Update password"}
              </Text>
            </Pressable>
            <Pressable className="py-3 rounded-md active:bg-zinc-800/70" onPress={() => setPasswordModalOpen(false)}>
              <Text className="text-zinc-100 text-sm">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmOpen(false)}
      >
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-6" onPress={() => setDeleteConfirmOpen(false)}>
          <Pressable className="w-full max-w-[360px] rounded-2xl bg-[#15161A] border border-zinc-800 px-4 pt-3 pb-4">
            <Text className="text-zinc-100 text-base font-semibold mb-2">Delete account</Text>
            <Text className="text-zinc-400 text-sm mb-3">
              This will permanently delete your account and all servers created by this account.
            </Text>
            <Pressable className="py-3 rounded-md active:bg-red-500/10" onPress={handleDeleteAccount}>
              <Text className="text-red-400 text-sm font-semibold">
                {deleteAccount.isPending ? "Deleting..." : "Confirm delete"}
              </Text>
            </Pressable>
            <Pressable className="py-3 rounded-md active:bg-zinc-800/70" onPress={() => setDeleteConfirmOpen(false)}>
              <Text className="text-zinc-100 text-sm">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
