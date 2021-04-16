import { SpotifyTrackType, SpotifyPlaylistType } from './spotifyApi';
import { ReactElement } from 'react';

// SpotifyPlaylistType is the the model designed to hold the playlist object directy from the Spotify API
// PlaylistModel is used by SpotifyDedup and contains the Spotify playlist model, plus duplicate tracks and status info etc.
// Also added to PlaylistModel is an array of SpotifyTrackType to store the tracks.  This is because the Spotify playlist model only has 
// an array of links (href: string) and not the full track information which is required by SpotifyDedup
export type PlaylistModel = {
  index: number; // The location of this playlist in the playlists store
  playlist: SpotifyPlaylistType;
  duplicates: Array<{
    index: number;
    //reason: string;  // An reason is required for each occurance in another playlist, hence reason is moved to the Playlists array
    track: SpotifyTrackType;
    inPlaylists: Array<InPlaylistsModel>;
  }>;
  tracks: Array<SpotifyTrackType>; // Additional array as we now need to store the unprocessed tracks inside so they can be processed later on
  status: string;
  processed: boolean;
  downloaded: boolean; // New status because we are downloading and processing separately
};

// New model for storing a list of the playlists that the track can be found it
// We save the reason, whether it is 'same-id' or 'same-name-artist'
export type InPlaylistsModel = {
  trackIndex: number;  // The location of the duplicate track in the foreign playlist
  playlistIndex: number; // The location of the foreign playlist in the store
  reason: string;
  playlist: SpotifyPlaylistType;
  similarTrack: SpotifyTrackType; // If the track is not identical, store the similar track so we can delete it
}