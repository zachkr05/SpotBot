// LoginScreen.js
import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Entypo } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

WebBrowser.maybeCompleteAuthSession();

/* ---------- Spotify endpoints ---------- */
const discovery = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

const CLIENT_ID = "602ac32e57a3499bbc9d6cebd5418250";
const SCOPES = [
  "user-read-email",
  "user-library-read",
  "user-read-recently-played",
  "user-top-read",
];

/* ---------- Component ---------- */
export default function LoginScreen() {
  const navigation = useNavigation();

  /* 1️⃣  Build the correct redirect URI */
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "spotifyproject",
    path: "spotify-auth-callback",
  });
  
  console.log("DEBUG ▶︎ redirectUri =", redirectUri);

  /* 2️⃣  Build the auth request */
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  /* 3️⃣  Button handler */
  const handlePress = async () => {
    console.log("DEBUG ▶︎ Sign-in button tapped");
    try {
      await promptAsync({ useProxy: true });
    } catch (error) {
      console.error("Auth prompt error:", error);
      Alert.alert("Error", "Failed to open authentication");
    }
  };

  /* 4️⃣  Handle the redirect */
  useEffect(() => {
    if (!response) return;
    console.log("DEBUG ▶︎ Redirect received:", response.type, response.params);

    if (response.type !== "success") {
      Alert.alert("Auth failed", `Authentication failed: ${response.type}`);
      return;
    }

    /* --- exchange code for tokens --- */
    const exchangeTokens = async () => {
      try {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code: response.params.code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier },
          },
          discovery
        );
        
        console.log("DEBUG ▶︎ Token exchange successful");

        const expiry = Date.now() + tokenResult.expiresIn * 1000;
        
        await AsyncStorage.multiSet([
          ["token", tokenResult.accessToken],
          ["refreshToken", tokenResult.refreshToken ?? ""],
          ["expirationDate", String(expiry)],
        ]);

        Alert.alert(
          "Logged in!",
          `Successfully authenticated with Spotify`
        );
        
        navigation.navigate("Main");
      } catch (error) {
        console.error("Token exchange error:", error);
        Alert.alert("Error", "Failed to complete authentication");
      }
    };

    exchangeTokens();
  }, [response, request, navigation, redirectUri]);

  /* 5️⃣  Silent login */
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const [[, token], [, exp]] = await AsyncStorage.multiGet([
          "token",
          "expirationDate",
        ]);
        
        if (token && exp && Date.now() < Number(exp)) {
          console.log("DEBUG ▶︎ Silent login with cached token");
          navigation.navigate("Main");
        } else {
          console.log("DEBUG ▶︎ No valid cached token");
          // Clear expired tokens
          if (token) {
            await AsyncStorage.multiRemove(["token", "refreshToken", "expirationDate"]);
          }
        }
      } catch (error) {
        console.error("Error checking existing auth:", error);
      }
    };

    checkExistingAuth();
  }, [navigation]);

  /* ---------- UI ---------- */
  return (
    <LinearGradient colors={["#040306", "#131624"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Entypo
            name="spotify"
            size={80}
            color="white"
            style={styles.icon}
          />
          <Text style={styles.title}>SpotBot</Text>

          <Pressable
            disabled={!request}
            onPress={handlePress}
            style={[
              styles.primaryBtn,
              !request && styles.disabledBtn
            ]}
          >
            <Text style={styles.btnText}>
              {request ? "Sign in with Spotify" : "Loading..."}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  safeArea: { 
    flex: 1 
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 60,
  },
  primaryBtn: {
    backgroundColor: "#1DB954",
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: 300,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    backgroundColor: "#666",
  },
  btnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});