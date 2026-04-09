import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDeleteServerCategory, useUpdateServerCategory } from "@/hooks/useServer";
import AppDialogModal from "@/components/modals/AppDialogModal";
import ConfirmActionModal from "@/components/modals/ConfirmActionModal";

export default function EditCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    serverId?: string | string[];
    serverName?: string | string[];
    categoryId?: string | string[];
    categoryName?: string | string[];
  }>();

  const serverId = useMemo(() => {
    const raw = params.serverId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.serverId]);
  const serverName = useMemo(() => {
    const raw = params.serverName;
    return (Array.isArray(raw) ? raw[0] : raw) || "Server";
  }, [params.serverName]);
  const categoryId = useMemo(() => {
    const raw = params.categoryId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.categoryId]);
  const initialCategoryName = useMemo(() => {
    const raw = params.categoryName;
    return (Array.isArray(raw) ? raw[0] : raw) || "";
  }, [params.categoryName]);

  const [categoryName, setCategoryName] = useState(initialCategoryName);
  const [messageModal, setMessageModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [closeToBack, setCloseToBack] = useState(false);
  const updateCategory = useUpdateServerCategory();
  const deleteCategory = useDeleteServerCategory();

  const canSave = !!serverId && !!categoryId && categoryName.trim().length > 0 && !updateCategory.isPending;
  const deleting = deleteCategory.isPending;

  const handleSave = async () => {
    if (!canSave || !serverId || !categoryId) return;
    try {
      await updateCategory.mutateAsync({
        serverId,
        categoryId,
        name: categoryName.trim(),
      });
      setMessageModal({
        open: true,
        title: "Category updated",
        message: "Category name was updated successfully.",
      });
      setCloseToBack(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        "Could not update category. Please try again.";
      setMessageModal({
        open: true,
        title: "Update failed",
        message: String(message),
      });
      setCloseToBack(false);
    }
  };

  const handleDelete = () => {
    if (!serverId || !categoryId) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!serverId || !categoryId) return;
    try {
      await deleteCategory.mutateAsync({ serverId, categoryId });
      setDeleteConfirmOpen(false);
      setMessageModal({
        open: true,
        title: "Category deleted",
        message: "Category and its channels were removed.",
      });
      setCloseToBack(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        "Could not delete category. Please try again.";
      setDeleteConfirmOpen(false);
      setMessageModal({
        open: true,
        title: "Delete failed",
        message: String(message),
      });
      setCloseToBack(false);
    }
  };

  const closeMessageModal = () => {
    setMessageModal((prev) => ({ ...prev, open: false }));
    if (closeToBack) {
      setCloseToBack(false);
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text className="text-white text-base font-semibold">Edit category</Text>
      </View>

      <View className="px-4 pt-4">
        <Text className="text-zinc-400 text-xs mb-2">SERVER</Text>
        <Text className="text-zinc-200 text-sm mb-5" numberOfLines={1}>
          {serverName}
        </Text>

        <Text className="text-zinc-400 text-xs mb-2">CATEGORY NAME</Text>
        <TextInput
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="Category name"
          placeholderTextColor="#71717a"
          className="bg-zinc-800 text-white rounded-md px-3 py-3 mb-5"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          className={`rounded-md px-4 py-3 mb-3 ${canSave ? "bg-indigo-500" : "bg-zinc-700"}`}
        >
          <Text className="text-white text-center font-semibold">
            {updateCategory.isPending ? "Saving..." : "Save changes"}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          className="rounded-md px-4 py-3 bg-red-500/20 border border-red-400/30"
        >
          <Text className="text-red-300 text-center font-semibold">
            {deleting ? "Deleting..." : "Delete category"}
          </Text>
        </Pressable>
      </View>

      <ConfirmActionModal
        visible={deleteConfirmOpen}
        title="Delete category"
        message={`Delete "${initialCategoryName}" and its channels?`}
        confirmLabel="Delete"
        confirmIcon="trash-outline"
        onConfirm={handleConfirmDelete}
        confirmPending={deleting}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <AppDialogModal
        visible={messageModal.open}
        title={messageModal.title}
        message={messageModal.message}
        onClose={closeMessageModal}
      />
    </SafeAreaView>
  );
}
