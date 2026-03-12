import { View, Text, Pressable, ActivityIndicator, FlatList } from "react-native";
import { router } from "expo-router";
import { useServers } from "@/hooks/useServer";
import { Ionicons } from "@expo/vector-icons";
import ServerItem from "@/components/ServerItem";
import NavigationAction from "@/components/NavigationAction";
import { Separator } from "@/components/ui/separator";
import { Server } from "@/types";

export default function NavigationSideBar() {
    const {data:servers, isLoading, error} = useServers()
    if(isLoading) return (
        <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F4A261" />        
        </View>
    )
    if(error){
        return (
            <View className="flex-1 items-center justify-center">
                <Text className="text-red-500">Failed to load</Text>
            </View>
        )
    }

    const handleServerPress = (server: Server) => {
        router.push({
            pathname:"/server/[id]",
            params:{
                id:server._id,
                name: server.name,
                imageUrl: server.imageUrl,
            }
        })
    };
    return (
        <View className="flex-1 dark:bg-[#1E1F22] space-y-4 flex-col items-center py-3 w-full">           
            <NavigationAction />
            <FlatList
                data = {servers}
                keyExtractor={(item) => item._id}
                renderItem={({item}) => <ServerItem server={item} onPress={() => handleServerPress(item)} />}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{paddingHorizontal:10, paddingTop:10, paddingBottom:10}}
                ListEmptyComponent={<Text className="text-white">No Server found</Text>}
            />
        </View>     
    )
}
