import promisesForPages from './promiseForPages';
import SpotifyWebApi from './spotifyApi';

export const fetchUserOwnedPlaylists = async (
  api: SpotifyWebApi,
  userId: string
) => {
  // console.log('library.ts:  fetchUserOwnedPlaylists is called, about to call promiseForPages and getUserPlaylists')
  const pages = await promisesForPages(
    api,
    api.getUserPlaylists(userId, { limit: 50 })
  );
  console.log('library.ts:  about to run pages.reduce')
  return pages.reduce(
    (array, currentPage) =>
      array.concat(
        currentPage.items.filter(
          (playlist) => playlist && playlist.owner.id === userId
        )
      ),
    []
  );
};
