import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import Entypo from "react-native-vector-icons/Entypo";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";

// Import your screens - make sure these paths are correct
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/Profile";

const Tab = createBottomTabNavigator();

function BottomTabs() {
    return (
        <Tab.Navigator 
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: "rgba(0,0,0,0.5)",
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    shadowOpacity: 4,
                    shadowRadius: 4,
                    elevation: 4,
                    shadowOffset: { width: 0, height: 4 },
                    borderTopWidth: 0
                }
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: "Home",
                    headerShown: false,
                    tabBarLabelStyle: { color: "white" },
                    tabBarIcon: ({ focused }) =>
                        focused ? (
                            <Entypo name="home" size={24} color="white" />
                        ) : (
                            <AntDesign name="home" size={24} color="white" />
                        )
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: "Profile",
                    headerShown: false,
                    tabBarLabelStyle: { color: "white" },
                    tabBarIcon: ({ focused }) =>
                        focused ? (
                            <Ionicons name="person" size={24} color="white" />
                        ) : (
                            <Ionicons name="person-outline" size={24} color="white" />
                        )
                }}
            />
        </Tab.Navigator>
    );
}

const Stack = createNativeStackNavigator();

function Navigation() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen 
                    name="Login" 
                    component={LoginScreen} 
                    options={{ headerShown: false }} 
                />
                <Stack.Screen 
                    name="Main" 
                    component={BottomTabs} 
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default Navigation;