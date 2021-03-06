const clientId = 'a2c308607e3d460686ee7523f9394a64';
const redirectUri =
  'location' in global && global['location']['host'] === 'localhost:3000'
    ? 'http://localhost:3000/callback'
    : 'https://spotify-dedup.com/callback/';

const host = /http[s]?:\/\/[^/]+/.exec(redirectUri)[0];

export default {
  clientId,
  redirectUri,
  host,
};
