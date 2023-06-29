import { SpotifyTrackType, SpotifyPlaylistType } from './spotifyApi';
import { ReactElement } from 'react';

// SpotifyPlaylistType is the the model designed to hold the playlist object directy from the Spotify API
// PlaylistModel is used by SpotifyDedup and contains the Spotify playlist model, plus duplicate tracks and status info etc.
// Also added to PlaylistModel is an array of SpotifyTrackType to store the tracks.  This is because the Spotify playlist model only has 
// an array of links (href: string) and not the full track information which is required by SpotifyDedup
export type PlaylistModel = {
  origIndex: number; // Initial array index, used to identify playlist from inPlaylists entries 
  playlist: SpotifyPlaylistType;
  tracks: Array<TrackModel> // Additional array as we now need to store the unprocessed tracks inside so they can be processed later on
  status: string;
  processed: boolean;
  downloaded: boolean; // New status because we are downloading and processing separately
};

export type TrackModel = {
  origIndex: number; // Initial array index, used to identify track from inPlaylists entries
  arrayIndex: number; // Current array index, maintained by UI .filter method and to pass to removeSingleDuplicate()
  track: SpotifyTrackType;
  inPlaylists: Array<InPlaylistsModel>;
  isLiked: boolean
}

// New model for storing duplicate info - a list of the playlists that the track can be found in
// We save the reason, whether it is 'same-id' or 'same-name-artist'
export type InPlaylistsModel = {
  foreignPlaylistIndex: number; // The location of the foreign playlist of the duplicate
  foreignTrackIndex: number;  // The location of the track in the foreign playlist
  reason: string;
  playlist: SpotifyPlaylistType;
  trackToRemove: TrackModel; // If the track is not identical, store the similar track so we can delete it
}

export type DuplicatesCsvExportModel = {
  playlist_id: string;
  playlist_name: string;
  playlist_owner: string;
  track_id: string;
  track_name: string;
  liked: boolean;
  track_artist: string;
  track_duration: number;
  in_playlists: string;
  similar_in_playlists: string;
};

// Removed
// playlist_url: string;
// track_url: string;