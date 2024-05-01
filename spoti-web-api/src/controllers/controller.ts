import { Request, Response, response } from "express";
import {
  Auth,
  login,
  callBack,
  getUserPlaylists,
  getPlaylist,
  getPlaylistTracks,
  getSavedTracks,
  addToQueue,
  getQueue,
  changeDevice,
  getDevices,
  toggleShuffle,
  playToggle,
  play,
  pause,
  prev,
  next,
  getPlaybackState,
  getRecentlyPlayed,
  search,
  addToPartyQueue,
  partyPlay,
  getUsername,
  getMe,
  replaceItems,
  refreshToken
} from "../services/service";

const getAuth = (req: Request): Auth => {
  return { access_token: req.headers.access_token, refresh_token: req.headers.refresh_token } as Auth;
}

const handleError = (error, response: Response) => {
  response.status(error.cause?.statusCode ?? 500);
  response.send(error.body ?? '');
}

const meController = (req: Request, res: Response) => {
  const auth = getAuth(req);
  getMe(auth)
    .then((data) => res.json(data))
    .catch((e) => {
      handleError(e, res);
    });

}

const refreshController = (req: Request, res: Response) => {
  const auth = getAuth(req);
  refreshToken(auth)
    .then((data) => res.json(data))
    .catch((e) => {
      handleError(e, res);
    });

}

const authController = (req: Request, res: Response) => {
  if (req.query.status === "success") {
    res.status(200);
    res.send("Success! You can close this page.");
  } else {
    res.status(500);
    res.send("An error occured");
  }
};

const loginController = (req: Request, res: Response) => {
  // Create the authorization URL
  const authorizeURL: string = login();

  res.redirect(authorizeURL);
};

const callBackController = (req: Request, res: Response) => {
  const code = (req.query.code as string) || "";
  if (!code) {
    res.status(400);
    res.send("Error: missing code");
  }
  callBack(code)
    .then((data) => res.json({ ...data }))
    // .then((displayName) => res.redirect(301, process.env.CLIENT_URL ?? 'https://example.com/'))
    .catch((e) => {
      handleError(e, res);
    });
};

const getUsernameController = (req: Request, res: Response) => {
  const auth = getAuth(req);
  getUsername(auth)
    .then((displayName) => res.json({ displayName }))
    .catch((e) => {
      handleError(e, res);
    });
};

const getUserPlaylistsController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  getUserPlaylists(auth)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const getPlaylistController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const playlistId: string = (req.query.playlist as string) ?? "";
  if (!playlistId) {
    res.status(400);
    res.send("Error: Missing playlist id in query parameter");
  }
  getPlaylist(auth, playlistId)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const getPlaylistTracksController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const playlistId: string = (req.query.playlist as string) ?? "";
  if (!playlistId) {
    res.status(400);
    res.send("Error: Missing playlist id in query parameter");
  }
  getPlaylistTracks(auth, playlistId)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const getSavedTracksController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  getSavedTracks(auth)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const addToQueueController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const trackId = (req.query.track as string) ?? "";

  if (!trackId) {
    res.status(400);
    res.send("Error: Missing track uri in query parameter");
  }
  addToQueue(auth, trackId)
    .then(() => {
      res.status(200);
      res.end();
      // res.json({});
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const getQueueController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  getQueue(auth)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const changeDeviceController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const deviceId: string = (req.query.device as string) || "";
  if (!deviceId) {
    res.status(400);
    res.send("Error: Missing device id in query parameter");
  }
  else {
    changeDevice(auth, deviceId)
      .then(() => {
        res.status(200);
        res.end();
      })
      .catch((e) => {
        handleError(e, res);
      });
  }
};

const getDevicesController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  getDevices(auth)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const toggleShuffleController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const toggle: boolean =
    (req.query.shuffle as string) === "true" ? true : false;

  if (!toggle) {
    res.status(400);
    res.send("Error: Missing toggle flag in query parameter");
  }
  toggleShuffle(auth, toggle)
    .then(() => {
      res.status(200);
      res.end();
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const playToggleController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  playToggle(auth)
    .then(() => {
      res.status(200);
      res.end();
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const playController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  let query = req.query?.tracks as string;
  play(auth, false, query)
    .then(() => {
      res.status(200);
      res.end();
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const pauseController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  pause(auth)
    .then(() => {
      res.status(200);
      res.end();
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const nextController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  next(auth)
    .then(() => {
      res.status(200);
      res.end();
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const prevController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  prev(auth)
    .then(() => {
      res.status(200);
      res.end();
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const getPlaybackStateController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  getPlaybackState(auth)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const getRecentlyPlayedController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  getRecentlyPlayed(auth)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const searchController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const query = req.body.searchQuery;
  if (!query) {
    res.status(400);
    res.send("Error: Missing search term in query parameter");
  }
  search(auth, query)
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((e) => {
      handleError(e, res);
    });
};

const addToPartyQueueController = async (req: Request, res: Response) => {
  const trackId = req.body.track;
  const next = req.body.next;
  if (!trackId) {
    res.status(400);
    res.send("Error: Missing track id(s)");
  }
  else {
    addToPartyQueue(trackId, next)
      .then(() => {
        res.status(200);
        res.end();
      })
      .catch((e) => {
        handleError(e, res);
      });
  }
};

const replaceItemsController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const playlistId = req.body.playlistId;
  const uris = req.body.uris;
  if (!playlistId || !uris) {
    res.status(400);
    res.send("Error: Invalid request");
  }
  else {
    replaceItems(auth, playlistId, uris)
      .then((data) => {
        res.json(data);
        res.end();
      })
      .catch((e) => {
        handleError(e, res);
      });
  }
};

const partyPlayController = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const trackIds = req.body.tracks; // not needed when calling librespot api
  const startTrackId = req.body.startAt // not needed when calling librespot api
  // const playContext = req.body.context;
  if (trackIds?.length === 0 || !startTrackId) {
    // if (!playContext) {
    res.status(400);
    res.send("Error: Missing options in body");
  }
  else {
    partyPlay(auth, trackIds, startTrackId)
      .then(() => {
        res.status(200);
        res.end();
      })
      .catch((e) => {
        handleError(e, res);
      });
  }
};

export {
  authController,
  loginController,
  callBackController,
  getUserPlaylistsController,
  getPlaylistController,
  getPlaylistTracksController,
  getSavedTracksController,
  addToQueueController,
  getQueueController,
  changeDeviceController,
  getDevicesController,
  toggleShuffleController,
  playToggleController,
  playController,
  pauseController,
  prevController,
  nextController,
  getPlaybackStateController,
  getRecentlyPlayedController,
  searchController,
  addToPartyQueueController,
  partyPlayController,
  getUsernameController,
  meController,
  replaceItemsController,
  refreshController
};
