import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const Profile = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    totalTracks: 0,
    totalArtists: 0,
    totalPlaylists: 0,
    followingCount: 0,
  });
  const [topGenres, setTopGenres] = useState([]);
  const [listeningStats, setListeningStats] = useState({
    averagePopularity: 0,
    totalMinutesListened: 0,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      // Fetch user profile
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          Alert.alert('Session Expired', 'Please log in again');
          navigation.navigate('Login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const profileData = await profileResponse.json();
      setUserProfile(profileData);

      // Fetch additional stats
      await fetchUserStats(token);
      await fetchTopGenres(token);
      await fetchListeningStats(token);
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserStats = async (token) => {
    try {
      // Fetch user's saved tracks count
      const tracksResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tracksData = await tracksResponse.json();

      // Fetch user's followed artists count
      const artistsResponse = await fetch('https://api.spotify.com/v1/me/following?type=artist&limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const artistsData = await artistsResponse.json();

      // Fetch user's playlists count
      const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const playlistsData = await playlistsResponse.json();

      setStats({
        totalTracks: tracksData?.total || 0,
        totalArtists: artistsData?.artists?.total || 0,
        totalPlaylists: playlistsData?.total || 0,
        followingCount: artistsData?.artists?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTopGenres = async (token) => {
    try {
      // Get top artists to extract genres
      const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      // Extract and count genres
      const genreCounts = {};
      if (data?.items && data.items.length > 0) {
        data.items.forEach(artist => {
          if (artist.genres && artist.genres.length > 0) {
            artist.genres.forEach(genre => {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
          }
        });
      }

      // Sort genres by count and take top 5
      const sortedGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre, count]) => ({ genre, count }));

      setTopGenres(sortedGenres);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchListeningStats = async (token) => {
    try {
      // Fetch top tracks to calculate average popularity
      const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const avgPopularity = data.items.reduce((sum, track) => sum + track.popularity, 0) / data.items.length;
        const totalDuration = data.items.reduce((sum, track) => sum + track.duration_ms, 0);

        setListeningStats({
          averagePopularity: Math.round(avgPopularity),
          totalMinutesListened: Math.round(totalDuration / 60000),
        });
      }
    } catch (error) {
      console.error('Error fetching listening stats:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'refreshToken', 'expirationDate']);
            navigation.navigate('Login');
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  const renderStatCard = (icon, label, value, iconComponent = Ionicons) => {
    const IconComponent = iconComponent;
    return (
      <View style={styles.statCard}>
        <IconComponent name={icon} size={24} color="#1DB954" />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  };

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
        {/* Profile Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: userProfile?.images?.[0]?.url || 'https://via.placeholder.com/150' }}
            style={styles.profileImage}
          />
          <Text style={styles.displayName}>{userProfile?.display_name || 'Spotify User'}</Text>
          <Text style={styles.email}>{userProfile?.email}</Text>
          <View style={styles.subscriptionBadge}>
            <FontAwesome5 name="spotify" size={16} color="white" />
            <Text style={styles.subscriptionText}>
              {userProfile?.product === 'premium' ? 'Premium' : 'Free'} Account
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard('musical-notes', 'Saved Tracks', stats.totalTracks)}
          {renderStatCard('people', 'Following', stats.totalArtists)}
          {renderStatCard('list', 'Playlists', stats.totalPlaylists)}
          {renderStatCard('heart', 'Followers', userProfile?.followers?.total || 0)}
        </View>

        {/* Listening Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listening Insights</Text>
          <View style={styles.insightCard}>
            <MaterialIcons name="trending-up" size={24} color="#1DB954" />
            <View style={styles.insightContent}>
              <Text style={styles.insightLabel}>Music Taste Score</Text>
              <Text style={styles.insightValue}>{listeningStats.averagePopularity}%</Text>
              <Text style={styles.insightDescription}>
                Based on the popularity of your top tracks
              </Text>
            </View>
          </View>
        </View>

        {/* Top Genres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Top Genres</Text>
          {topGenres.length > 0 ? (
            topGenres.map((item, index) => (
              <View key={index} style={styles.genreItem}>
                <View style={styles.genreBar}>
                  <LinearGradient
                    colors={['#1DB954', '#1ed760']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.genreProgress, { width: `${(item.count / topGenres[0].count) * 100}%` }]}
                  />
                </View>
                <Text style={styles.genreName}>
                  {item.genre.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Listen to more music to see your top genres!</Text>
          )}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="settings-outline" size={22} color="white" />
            <Text style={styles.actionButtonText}>Settings</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="shield-checkmark-outline" size={22} color="white" />
            <Text style={styles.actionButtonText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#ff4444" />
            <Text style={[styles.actionButtonText, { color: '#ff4444' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* Country */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Country: {userProfile?.country || 'Not specified'}
          </Text>
          <Text style={styles.footerText}>
            Account ID: {userProfile?.id}
          </Text>
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
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#1DB954',
  },
  displayName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB954',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  subscriptionText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  insightCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightContent: {
    marginLeft: 15,
    flex: 1,
  },
  insightLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  insightValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1DB954',
    marginVertical: 5,
  },
  insightDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  genreItem: {
    marginBottom: 15,
  },
  genreBar: {
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 5,
  },
  genreProgress: {
    height: '100%',
    borderRadius: 15,
  },
  genreName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    marginLeft: 15,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 5,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Profile;