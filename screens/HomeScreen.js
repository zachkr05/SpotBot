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

const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [timeRange, setTimeRange] = useState('short_term'); // short_term, medium_term, long_term

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      // Fetch top tracks
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=${timeRange}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Fetch top artists
      const artistsResponse = await fetch(
        `https://api.spotify.com/v1/me/top/artists?limit=5&time_range=${timeRange}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Fetch recently played
      const recentResponse = await fetch(
        'https://api.spotify.com/v1/me/player/recently-played?limit=10',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (tracksResponse.ok && artistsResponse.ok && recentResponse.ok) {
        const tracksData = await tracksResponse.json();
        const artistsData = await artistsResponse.json();
        const recentData = await recentResponse.json();

        setTopTracks(tracksData.items || []);
        setTopArtists(artistsData.items || []);
        setRecentlyPlayed(recentData.items || []);
      } else {
        // Handle token expiration
        if (tracksResponse.status === 401) {
          Alert.alert('Session Expired', 'Please log in again');
          // Navigate to login or refresh token
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to fetch your Spotify data');
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {topArtists.map((artist, index) => (
              <View key={artist.id}>
                {renderArtistItem({ item: artist, index })}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Top Tracks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Played Tracks</Text>
          {topTracks.slice(0, 5).map((track, index) => (
            <View key={track.id}>
              {renderTrackItem({ item: track, index })}
            </View>
          ))}
        </View>

        {/* Recently Played Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          {recentlyPlayed.slice(0, 5).map((item, index) => (
            <View key={`${item.track.id}-${index}`}>
              {renderRecentItem({ item })}
            </View>
          ))}
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