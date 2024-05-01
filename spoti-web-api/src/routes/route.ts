import express from "express";
import * as controller from '../controllers/controller'

const router = express.Router();

router.get('/', controller.authController);

router.get('/me', controller.meController);

router.get('/user-name', controller.getUsernameController);

router.get('/login', controller.loginController);

router.get('/callback', controller.callBackController);

router.get('/user-playlists', controller.getUserPlaylistsController);

router.get('/playlist', controller.getPlaylistController);

router.get('/playlist-tracks', controller.getPlaylistTracksController);

router.get('/saved-tracks', controller.getSavedTracksController);

router.post('/enqueue', controller.addToPartyQueueController);

router.post('/party-play', controller.partyPlayController);

router.get('/get-queue', controller.getQueueController);

router.post('/change-device', controller.changeDeviceController);

router.put('/set-shuffle', controller.toggleShuffleController);

router.get('/play', controller.playController);

router.put('/toggle-play', controller.playToggleController);

router.put('/pause', controller.pauseController);

router.put('/next', controller.nextController);

router.put('/prev', controller.prevController);

router.get('/devices', controller.getDevicesController);

router.get('/playback-state', controller.getPlaybackStateController);

router.get('/recent-tracks', controller.getRecentlyPlayedController);

router.post('/search', controller.searchController);

router.post('/replace-playlist-items', controller.replaceItemsController);

router.get('/refresh', controller.refreshController);


export default router;