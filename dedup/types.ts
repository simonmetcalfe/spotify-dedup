import { SpotifyTrackType, SpotifyPlaylistType } from './spotifyApi';
import { ReactElement } from 'react';

// SpotifyPlaylistType is the the model designed to hold the playlist object directy from the Spotify API
// PlaylistModel is used by SpotifyDedup and contains the Spotify playlist model, plus duplicate tracks and status info etc.
// Also added to PlaylistModel is an array of SpotifyTrackType to store the tracks.  This is because the Spotify playlist model only has 
// an array of links (href: string) and not the full track information which is required by SpotifyDedup
export type PlaylistModel = {
  playlist: SpotifyPlaylistType;
  duplicates: Array<{
    index: number;
    //reason: string;  // An reason is required for each occurance in another playlist, hence reason is moved to the Playlists array
    track: SpotifyTrackType;
    inPlaylists: Array<{
      reason: string;
      playlist: SpotifyPlaylistType
    }>;
  }>;
  tracks: SpotifyTrackType[]; // Additional array as we now need to store the unprocessed tracks inside so they can be processed later on
  status: string;
  processed: boolean;
  downloaded: boolean; // New status because we are downloading and processing separately
};
