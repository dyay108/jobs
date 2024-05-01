import SpotifyWebApi from "spotify-web-api-node";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import dotenv from 'dotenv';

export interface Auth {
  access_token: string;
  refresh_token: string;
}

// Configure dotenv
dotenv.config({ path: '.env.local' });

var spotifyApi = new SpotifyWebApi();

const setAuth = (auth: Auth): void => {
  spotifyApi.setAccessToken(auth.access_token);
  spotifyApi.setRefreshToken(auth.refresh_token);
}

const getCacheAuth = (): Auth => {
  const { accessToken, refreshToken } = spotifyApi.getCredentials();
  return { access_token: accessToken, refresh_token: refreshToken };
}

const generateRandomString = (length): string => {
  const characters: string =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result: string = " ";
  const charactersLength: number = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};

const retry = async (fn: Function, fnName: string, args: Array<any>) => {
  let count = 0;
  let maxTries = 3;
  while (true) {
    try {
      return fnName.includes("queue")
        ? await fn.call(addToQueue, ...args)
        : await fn.call(spotifyApi, ...args);
    } catch (e) {
      console.log("retry error", e);
      if (++count === maxTries) {
        throw new Error(`${fnName}`, { cause: e });
      }
      if (e.body?.error?.message?.includes("expired") || e.status === 401) {
        await retry(refresh, "refresh", []);
        retry(fn, fnName, args);
      }
    }
  }
};

const refresh = async () => {
  console.log("Refreshing...");
  spotifyApi.setClientId(process.env.CLIENT_ID);
  spotifyApi.setClientSecret(process.env.CLIENT_SECRET)

  const res = await spotifyApi.refreshAccessToken()
  const access_token = res.body.access_token;
  setAuth({ access_token, refresh_token: spotifyApi.getRefreshToken() })
  console.log("Succesfull refresh");
};

export const refreshToken = async (auth: Auth) => {
  setAuth(auth);
  await refresh();
  return getCacheAuth();
};

const cleanUpPlaylists = (data: Array<any>) => {
  return data.map((item) => ({
    name: item?.name,
    image: item?.images.find((element) => element !== undefined)?.url,
    type: item?.type,
    id: item?.id,
    description: item?.description,
    url: item?.url,
    uri: item?.uri,
    owner: item?.owner?.display_name,
    snapshot_id: item?.snapshot_id
  }));
};

const cleanUpTracks = (data: Array<any>, playContext?: any) => {
  return data.map((item, index) => ({
    local: item?.is_local,
    name: item?.track?.name,
    artists: item?.track?.artists?.map((artist) => ({
      id: artist?.id,
      name: artist?.name,
      href: artist?.href,
    })),
    album: {
      id: item?.track?.album.id,
      name: item?.track?.album?.name,
      image: item?.track?.album?.images.find((element) => element !== undefined)
        ?.url,
    },
    id: item?.track?.id ?? uuidv4(),
    uri: item?.track?.uri,
    date_added: item?.added_at,
    href: item?.track?.href,
    url: item?.track?.external_urls,
    play_context: {
      context_uri: `spotify:playlist:${playContext?.playlistId}`, //item?.track?.album?.uri,
      offset: {
        position: index + playContext?.offset, //(item?.track?.track_number as number) - 1,
      },
      position_ms: 0,
    },
    duration_ms: item?.track?.duration_ms,
  }));
};

const cleanUpSearch = (data: Array<any>) => {
  return data.map((item, index) => ({
    id: item?.id,
    name: item?.name,
    artists: item?.artists?.map((artist) => ({
      id: artist?.id,
      name: artist?.name,
      href: artist?.href,
    })),
    album: {
      id: item?.album.id,
      name: item?.album?.name,
      image: item?.album?.images.find((element) => element !== undefined)?.url,
    },
    href: item?.href,
    local: item?.is_local,
    uri: item?.uri,
    url: item?.external_urls?.spotify,
    play_context: {
      context_uri: `spotify:album:${item?.album?.id}`, //item?.track?.album?.uri,
      offset: {
        position: item?.track_number - 1,
      },
      position_ms: 0,
    },
    image: item?.album?.images.find((element) => element !== undefined)?.url,
  }));
};

export const login = (): string => {
  spotifyApi.setCredentials({
    redirectUri: process.env.REDIRECT_URL,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  });
  const state: string = generateRandomString(16);

  const scopes: Array<string> = [
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state",
    "user-read-currently-playing",
    "user-read-recently-played",
    "user-read-playback-position",
    "playlist-read-collaborative",
    "playlist-read-private",
    "app-remote-control",
    "streaming",
    "user-library-read",
    "ugc-image-upload",
    "playlist-modify-public",
    "playlist-modify-private",
  ];

  // Create the authorization URL
  const authorizeURL: string = spotifyApi.createAuthorizeURL(scopes, state);

  return authorizeURL;
};

export const callBack = async (code: string): Promise<any> => {
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);

    return data?.body;
  } catch (e) {
    console.log(e);
    throw new Error('Callback error', { cause: e });
  }
};

export const getUsername = async (auth: Auth) => {
  setAuth(auth);
  const userData = await retry(spotifyApi.getMe, "getMe", []);

  return userData.body?.display_name ?? "unknown";
};

export const getUserPlaylists = async (auth: Auth): Promise<{ cacheAuth: Auth, data: Array<any> }> => {
  setAuth(auth);
  let total = 0;
  let offset = 0;
  const limit = 10;
  let playlists: Array<any> = [];
  do {
    offset = playlists.length;
    const args = [{ offset, limit }];
    const result = await retry(
      spotifyApi.getUserPlaylists,
      "getUserPlaylists",
      args
    );
    total = result?.body?.total;
    if (result?.body?.items) {
      playlists.push(...result?.body?.items);
    }
  } while (playlists.length < total);

  playlists = cleanUpPlaylists(playlists).filter((p) => p.name !== "zQueue");

  return { cacheAuth: getCacheAuth(), data: playlists };
};

export const getPlaylist = async (auth: Auth, playlistId: string): Promise<{ cacheAuth: Auth, data: any }> => {
  setAuth(auth);
  const args = [playlistId];
  const result = await retry(
    spotifyApi.getPlaylist,
    "getPlaylist",
    args
  );
  
  const playlist = result.body;
  return { cacheAuth: getCacheAuth(), data: playlist ? cleanUpPlaylists([playlist])[0] : {} };
};

export const getPlaylistTracks = async (
  auth: Auth,
  playlistId: string
): Promise<{ cacheAuth: Auth, data: Array<any> }> => {
  setAuth(auth);
  let total = 0;
  let offset = 0;
  const limit = 50;
  const tracks: Array<any> = [];
  do {
    offset = tracks.length;
    const args = [playlistId, { offset, limit }];
    const result = await retry(
      spotifyApi.getPlaylistTracks,
      "getPlaylistTracks",
      args
    );

    const items = result?.body?.items;
    total = result?.body?.total;
    if (items) {
      tracks.push(...cleanUpTracks(items, { playlistId, offset }));
    }
  } while (tracks.length < total);



  return { cacheAuth: getCacheAuth(), data: tracks.filter((t) => t.name && !t.local) };
};

export const getSavedTracks = async (auth: Auth): Promise<{ cacheAuth: Auth, data: Array<any> }> => {
  setAuth(auth);
  let total = 0;
  let offset = 0;
  const limit = 50;
  const tracks: Array<any> = [];
  do {
    offset = tracks.length;
    const args = [{ offset, limit }];
    const result = await retry(
      spotifyApi.getMySavedTracks,
      "getMySavedTracks",
      args
    );

    const items = result?.body?.items;
    total = items?.total ?? items.length;
    if (items) {
      tracks.push(...cleanUpTracks(items));
    }
  } while (tracks.length < total);

  return { cacheAuth: getCacheAuth(), data: tracks.filter((t) => t.name && !t.local) };
};

export const addToPartyQueue = async (auth: Auth, trackId: string, next?: boolean) => {
  setAuth(auth);
  // toggleShuffle(false);
  if (next) {
    const playbackState = await getPlaybackState(auth, true);
    const offsetUri = playbackState.data.item.uri;

    const currentQueue = await getPlaylistTracks(auth, "1cNAS8rrkM5a4HODopyP9B");

    const offsetItem = currentQueue?.data.find(
      (track) => track.uri === offsetUri
    );

    const offset = offsetItem?.play_context.offset.position + 1;

    trackId = `spotify:track:${trackId}`;
    const args = [
      "1cNAS8rrkM5a4HODopyP9B",
      [trackId],
      { position: isNaN(offset) ? 0 : offset },
    ];
    await retry(spotifyApi.addTracksToPlaylist, "addTracksToPlaylist", args);

    return;
  }

  trackId = `spotify:track:${trackId}`;
  const args = ["1cNAS8rrkM5a4HODopyP9B", [trackId]];
  await retry(spotifyApi.addTracksToPlaylist, "addTracksToPlaylist", args);
};

export const partyPlay = async (
  auth: Auth,
  trackIds: Array<string>,
  startTrackId: string,
  playContext?: any,
) => {
  setAuth(auth);

  let currentQueue = await getPlaylistTracks(auth, "1cNAS8rrkM5a4HODopyP9B");

  // can only rmeove 100 tracks at a time
  for (let index = 0; index < currentQueue.data.length - 1; index += 100) {
    let deleteArgs = [
      "1cNAS8rrkM5a4HODopyP9B",
      currentQueue.data
        .map((t) => ({ uri: t.uri }))
        .slice(index, index + 100),
    ];
    await retry(
      spotifyApi.removeTracksFromPlaylist,
      "removeTracksFromPlaylist",
      deleteArgs
    );

    await setTimeout(() => null, 300);
  }

  trackIds = trackIds.map((id) => `spotify:track:${id}`);
  const args = ["1cNAS8rrkM5a4HODopyP9B", trackIds];
  await retry(spotifyApi.addTracksToPlaylist, "addTracksToPlaylist", args);

  currentQueue = await getPlaylistTracks(auth, "1cNAS8rrkM5a4HODopyP9B");

  const startTrack = currentQueue.data.find((t) => t.id === startTrackId);

  await setTimeout(() => null, 500);

  console.log("partyplay");
  await play(auth,
    true,
    JSON.stringify({
      ...startTrack.play_context,
      device_id: "k52q6vu58eas8ghpundxebya6irx6ihd342u7bwi",
    })
  );
};

export const addToQueue = async (auth: Auth, trackId: string) => {
  try {
    setAuth(auth);
    const params = {
      uri: `spotify:track:${trackId}`,
      device_id: "k52q6vu58eas8ghpundxebya6irx6ihd342u7bwi",
    };
    const args = [params];
    await retry(addToQueueSpotifyCall, "addToQueue", args);
  } catch (e) {
    throw new Error(e);
  }
};

const addToQueueSpotifyCall = async (params) => {
  const options = {
    params,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getCacheAuth().access_token}`,
    },
  };

  try {
    await axios.post("https://api.spotify.com/v1/me/player/queue", {}, options);
  } catch (e) {
    return Promise.reject({
      error: `${e.response.data.error.message} - ${e.response.statusText}`,
      status: e.response.status,
    });
  }
};

export const getQueue = async (auth: Auth) => {
  setAuth(auth);
  const result = await retry(getQueueSpotifyCall, "getQueue", []);
  return { cacheAuth: getCacheAuth(), data: result };
};

const getQueueSpotifyCall = async (params) => {
  const options = {
    params,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getCacheAuth().access_token}`,
    },
  };
  const res = await axios.get(
    "https://api.spotify.com/v1/me/player/queue",
    options
  );
  return res.data.queue;
};

export const changeDevice = async (auth: Auth, deviceId: string) => {
  setAuth(auth);
  const args = [[deviceId]];
  await retry(spotifyApi.transferMyPlayback, "transferMyPlayback", args);
};

export const getDevices = async (auth: Auth) => {
  setAuth(auth);
  const args = [];
  const data = await retry(spotifyApi.getMyDevices, "getMyDevices", args);
  return { data: data?.body?.devices };
};

export const toggleShuffle = async (auth: Auth, toggle: boolean) => {
  setAuth(auth);
  const args = [toggle];
  await retry(spotifyApi.setShuffle, "setShuffle", args);
};

export const playToggle = async (auth: Auth) => {
  setAuth(auth);
  const playbackState = await getPlaybackState(auth, true);

  if (playbackState.data.is_playing) {
    await retry(spotifyApi.pause, "pause", []);
  } else {
    await retry(spotifyApi.play, "play", []);
  }
};

export const play = async (auth: Auth, skipInit: boolean, playContext?: string) => {
  if (!skipInit) {
    setAuth(auth);
  }
  const args = playContext ? [JSON.parse(playContext)] : [];
  await retry(spotifyApi.play, "play", args);
};

export const pause = async (auth: Auth) => {
  setAuth(auth);
  const args = [];
  await retry(spotifyApi.pause, "pause", args);
};

export const next = async (auth: Auth) => {
  setAuth(auth);
  await retry(spotifyApi.skipToNext, "skipToNext", []);
};

export const prev = async (auth: Auth) => {
  setAuth(auth);
  await retry(spotifyApi.skipToPrevious, "skipToPrevious", []);
};

export const getPlaybackState = async (auth: Auth, skipInit?: boolean) => {
  if (!skipInit) {
    setAuth(auth);
  }
  const data = await retry(
    spotifyApi.getMyCurrentPlaybackState,
    "getMyCurrentPlaybackState",
    []
  );
  const playbackState = {
    current_type: data?.body?.currently_playing_type,
    device: data?.body?.device,
    is_playing: data?.body?.is_playing,
    item: data?.body?.item ?? {
      name: "",
      artists: [{ id: "", name: "", href: "" }],
      album: { id: "", name: "", image: "" },
      id: "",
      uri: "",
      href: "",
      url: "",
      progress: 0,
    },
    repeat: data?.body?.repeat_state,
    shuffle: data?.body?.shuffle_state,
    image: data?.body?.item?.album?.images[0]?.url,
  };
  return { cacheAuth: getCacheAuth(), data: playbackState };
};

export const getRecentlyPlayed = async (auth: Auth) => {
  setAuth(auth);
  let offset = 0;
  const limit = 50;
  const tracks: Array<any> = [];
  const args = [{ offset, limit }];
  const result = await retry(
    spotifyApi.getMyRecentlyPlayedTracks,
    "getMyRecentlyPlayedTracks",
    args
  );

  const items = result?.body?.items;
  if (items) {
    tracks.push(...cleanUpTracks(items));
  }

  return { cacheAuth: getCacheAuth(), data: tracks };
};

export const search = async (auth: Auth, searchTerm): Promise<{ cacheAuth: Auth, data: Array<any> }> => {
  setAuth(auth);
  const tracks: Array<any> = [];
  const args = [searchTerm];
  const result = await retry(spotifyApi.searchTracks, "searchTracks", args);

  const items = result?.body?.tracks?.items;
  if (items) {
    tracks.push(...cleanUpSearch(items));
  }

  return { cacheAuth: getCacheAuth(), data: tracks.filter((t) => t.name && !t.local) };
};

export const getMe = async (auth: Auth) => {
  setAuth(auth);
  const userData = await retry(spotifyApi.getMe, "getMe", []);

  return { cacheAuth: getCacheAuth(), data: userData.body ?? {} };
};

export const replaceItems = async (auth: Auth, playlistId: string, uris: Array<string>) => {
  setAuth(auth);
  const args = [playlistId, uris]
  await retry(spotifyApi.replaceTracksInPlaylist, "replaceTracksInPlaylist", args);

  return { cacheAuth: getCacheAuth() };
};
