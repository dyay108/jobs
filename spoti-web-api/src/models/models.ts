export interface SpotifyPlaylist {
    name: string;
    image: string;
    type: string;
    id: string;
    description: string;
    url: string;
    uri: string;
    owner: string;
}
export interface SpotifyArtist {
    id: string;
    name: string;
    href: string;
}
export interface SpotifyTrack {
    local: boolean;
    name: string;
    artists: Array<SpotifyArtist>;
    album: { id: string; name: string; image: string; };
    id: string;
    uri: string;
    date_added: Date;
    href: string;
    url: string;
    play_context: { offset: { position: number } };
    duration_ms: number;
}

export interface SpotifyNowPlaying {
    current_type: string,
    device: string,
    is_playing: boolean,
    item: SpotifyTrack,
    repeat: string,
    shuffle: boolean,
    image: string,
  };

// export interface SpotifySearch {
//     id: string;
//     name: string;
//     artists: Array<SpotifyArtist>;
//     album: { id: string; name: string; image: string; };
//     href: string;
//     local: boolean;
//     uri: string;
//     url: string;
//     play_context: {
//         context_uri: string; offset: {
//             position: number;
//         };
//         position_ms: number;
//     };
//     image: string;

// }