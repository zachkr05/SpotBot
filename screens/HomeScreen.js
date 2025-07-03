import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const CLIENT_ID = "602ac32e57a3499bbc9d6cebd5418250";

const HomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [timeRange, setTimeRange] = useState('short_term'); // short_term, medium_term, long_term

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  /**
   * Get a valid access token, refreshing if necessary
   */
  const getValidToken = async () => {
    try {
      const [[, token], [, refreshToken], [, expirationDate]] = await AsyncStorage.multiGet([
        "token",
        "refreshToken", 
        "expirationDate"
      ]);

      console.log("DEBUG ▶︎ Token check:", { 
        hasToken: !!token, 
        hasRefreshToken: !!refreshToken,
        expirationDate: expirationDate ? new Date(Number(expirationDate)).toISOString() : null,
        isExpired: expirationDate ? Date.now() > Number(expirationDate) : null
      });

      if (!token) {
        throw new Error("No access token found");
      }

      // Check if token is expired
      if (expirationDate && Date.now() > Number(expirationDate)) {
        console.log("DEBUG ▶︎ Token expired, attempting refresh...");
        
        if (!refreshToken) {
          throw new Error("Token expired and no refresh token available");
        }

        // Refresh the token
        const newToken = await refreshAccessToken(refreshToken);
        return newToken;
      }

      return token;
    } catch (error) {
      console.error("Error getting valid token:", error);
      throw error;
    }
  };

  /**
   * Refresh the access token using refresh token
   */
  const refreshAccessToken = async (refreshToken) => {
    try {
      console.log("DEBUG ▶︎ Attempting to refresh token...");
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("DEBUG ▶︎ Token refresh failed:", errorData);
        throw new Error(`Token refresh failed: ${errorData.error_description || response.statusText}`);
      }

      const data = await response.json();
      
      // Store the new token
      const expiry = Date.now() + data.expires_in * 1000;
      await AsyncStorage.multiSet([
        ["token", data.access_token],
        ["expirationDate", String(expiry)],
        // Keep the same refresh token if a new one wasn't provided
        ...(data.refresh_token ? [["refreshToken", data.refresh_token]] : [])
      ]);

      console.log("DEBUG ▶︎ Token refreshed successfully");
      return data.access_token;
    } catch (error) {
      console.error("Error refreshing token:", error);
      // Clear invalid tokens
      await AsyncStorage.multiRemove(["token", "refreshToken", "expirationDate"]);
      throw error;
    }
  };

  /**
   * Make authenticated API calls to Spotify
   */
  const spotifyApiCall = async (endpoint) => {
    try {
      const token = await getValidToken();
      
      const url = `https://api.spotify.com/v1${endpoint}`;
      console.log("DEBUG ▶︎ Making API call to:", url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("DEBUG ▶︎ API Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("DEBUG ▶︎ API Error response:", errorData);
        
        if (response.status === 401) {
          // Token is invalid, clear storage and redirect to login
          await AsyncStorage.multiRemove(["token", "refreshToken", "expirationDate"]);
          Alert.alert(
            "Session Expired", 
            "Your session has expired. Please log in again.",
            [{ text: "OK", onPress: () => navigation.navigate("Login") }]
          );
          throw new Error("Authentication failed - please log in again");
        }
        
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  };

  const fetchAnalytics = async () => {
    try {
      console.log("DEBUG ▶︎ Starting to fetch analytics...");

      // Make all API calls with proper error handling
      const [tracksData, artistsData, recentData] = await Promise.allSettled([
        spotifyApiCall(`/me/top/tracks?limit=10&time_range=${timeRange}`),
        spotifyApiCall(`/me/top/artists?limit=5&time_range=${timeRange}`),
        spotifyApiCall('/me/player/recently-played?limit=10')
      ]);

      // Handle tracks data
      if (tracksData.status === 'fulfilled') {
        setTopTracks(tracksData.value.items || []);
        console.log("DEBUG ▶︎ Top tracks loaded:", tracksData.value.items?.length || 0);
      } else {
        console.error("Failed to fetch top tracks:", tracksData.reason);
        setTopTracks([]);
      }

      // Handle artists data
      if (artistsData.status === 'fulfilled') {
        setTopArtists(artistsData.value.items || []);
        console.log("DEBUG ▶︎ Top artists loaded:", artistsData.value.items?.length || 0);
      } else {
        console.error("Failed to fetch top artists:", artistsData.reason);
        setTopArtists([]);
      }

      // Handle recent data
      if (recentData.status === 'fulfilled') {
        setRecentlyPlayed(recentData.value.items || []);
        console.log("DEBUG ▶︎ Recently played loaded:", recentData.value.items?.length || 0);
      } else {
        console.error("Failed to fetch recently played:", recentData.reason);
        setRecentlyPlayed([]);
      }

      // Show error if all requests failed
      if (tracksData.status === 'rejected' && artistsData.status === 'rejected' && recentData.status === 'rejected') {
        Alert.alert('Error', 'Failed to fetch your Spotify data. Please try again.');
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to fetch your Spotify data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      <TouchableOpacity
        style={[styles.timeButton, timeRange === 'short_term' && styles.activeTimeButton]}
        onPress={() => setTimeRange('short_term')}
      >
        <Text style={[styles.timeButtonText, timeRange === 'short_term' && styles.activeTimeText]}>
          4 Weeks
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.timeButton, timeRange === 'medium_term' && styles.activeTimeButton]}
        onPress={() => setTimeRange('medium_term')}
      >
        <Text style={[styles.timeButtonText, timeRange === 'medium_term' && styles.activeTimeText]}>
          6 Months
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.timeButton, timeRange === 'long_term' && styles.activeTimeButton]}
        onPress={() => setTimeRange('long_term')}
      >
        <Text style={[styles.timeButtonText, timeRange === 'long_term' && styles.activeTimeText]}>
          All Time
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTrackItem = ({ item, index }) => (
    <View style={styles.trackItem}>
      <Text style={styles.trackRank}>{index + 1}</Text>
      <Image source={{ uri: item.album.images[0]?.url }} style={styles.trackImage} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {item.artists.map(artist => artist.name).join(', ')}
        </Text>
      </View>
      <Text style={styles.duration}>
        {Math.floor(item.duration_ms / 60000)}:{((item.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}
      </Text>
    </View>
  );

  const renderArtistItem = ({ item, index }) => (
    <TouchableOpacity style={styles.artistItem}>
      <Image source={{ uri: item.images[0]?.url }} style={styles.artistImage} />
      <Text style={styles.artistRank}>{index + 1}</Text>
      <Text style={styles.artistItemName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.artistGenres} numberOfLines={1}>
        {item.genres.slice(0, 2).join(', ')}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentItem = ({ item }) => (
    <View style={styles.recentItem}>
      <Image source={{ uri: item.track.album.images[0]?.url }} style={styles.recentImage} />
      <View style={styles.recentInfo}>
        <Text style={styles.recentTrack} numberOfLines={1}>
          {item.track.name}
        </Text>
        <Text style={styles.recentArtist} numberOfLines={1}>
          {item.track.artists[0].name}
        </Text>
        <Text style={styles.playedAt}>
          {new Date(item.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#040306', '#131624']} style={styles.container}>
        <ActivityIndicator size="large" color="#1DB954" style={styles.loader} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#040306', '#131624']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Music Analytics</Text>
          <Ionicons name="analytics" size={30} color="#1DB954" />
        </View>

        {renderTimeRangeSelector()}

        {/* Top Artists Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Artists</Text>
          {topArtists.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {topArtists.map((artist, index) => (
                <View key={artist.id}>
                  {renderArtistItem({ item: artist, index })}
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No top artists data available</Text>
          )}
        </View>

        {/* Top Tracks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Played Tracks</Text>
          {topTracks.length > 0 ? (
            topTracks.slice(0, 5).map((track, index) => (
              <View key={track.id}>
                {renderTrackItem({ item: track, index })}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No top tracks data available</Text>
          )}
        </View>

        {/* Recently Played Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          {recentlyPlayed.length > 0 ? (
            recentlyPlayed.slice(0, 5).map((item, index) => (
              <View key={`${item.track.id}-${index}`}>
                {renderRecentItem({ item })}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recently played data available</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  timeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTimeButton: {
    backgroundColor: '#1DB954',
  },
  timeButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTimeText: {
    color: 'white',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  trackRank: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 15,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  artistName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  duration: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  artistItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 120,
  },
  artistImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  artistRank: {
    position: 'absolute',
    top: 5,
    right: 25,
    backgroundColor: '#1DB954',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  artistItemName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistGenres: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  recentImage: {
    width: 45,
    height: 45,
    borderRadius: 5,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentTrack: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  recentArtist: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  playedAt: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
});

export default HomeScreen;