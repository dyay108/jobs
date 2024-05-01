// import express from "express";
// import * as controller from '../controllers/controller'

// const router = express.Router();

// router.get('/', controller.authController);

// router.get('/user-name', controller.getUsernameController);

// router.get('/login', controller.loginController);

// router.get('/callback', controller.callBackController);

// router.get('/playlists', controller.getPlaylistsController);

// router.get('/playlist-tracks', controller.getPlaylistTracksController);

// router.get('/saved-tracks', controller.getSavedTracksController);

// router.post('/enqueue', controller.addToPartyQueueController);

// router.post('/party-play', controller.partyPlayController);

// router.get('/get-queue', controller.getQueueController);

// router.post('/change-device', controller.changeDeviceController);

// router.put('/set-shuffle', controller.toggleShuffleController);

// router.get('/play', controller.playController);

// router.put('/toggle-play', controller.playToggleController);

// router.put('/pause', controller.pauseController);

// router.put('/next', controller.nextController);

// router.put('/prev', controller.prevController);

// router.get('/devices', controller.getDevicesController);

// router.get('/playback-state', controller.getPlaybackStateController);

// router.get('/recent-tracks', controller.getRecentlyPlayedController);

// router.post('/search', controller.searchController);

import { trpc } from '../trpc'
import * as service from '../services/service'
import { TRPCError } from '@trpc/server';
import { z } from 'zod'

export const appRouter = trpc.router(
  {
    login: trpc.procedure.query(async (req) => {
      // Create the authorization URL
      const authorizeURL: string = service.login();
      req.ctx.res.redirect(authorizeURL)
    }),
    callback: trpc.procedure
      .query(async (req) => {
        console.log(req)
        if (req.ctx.req.query.code) {
          req.ctx.res.redirect(301, process.env.CLIENT_URL ?? 'https://example.com/')
        }
        else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'An unexpected error occurred, please try again later.',
            // optional: pass the original error to retain stack trace
            cause: "Missing code",
          });
        }
      }),
    playlists: trpc.procedure.query(async () => {

      return await service.getPlaylists();
    }),

    'playlist-tracks': trpc.procedure
      .input(z.string())
      .query(async (req) => {
        const { input } = req;

        return await service.getPlaylistTracks(input)
      }),

    'saved-tracks': trpc.procedure.query(async () => {

      return await service.getSavedTracks()
    }),

    enqueue: trpc.procedure
      .input(z.object({ track: z.string(), next: z.boolean() }))
      .mutation(async (req) => {

        return await service.addToPartyQueue(req.input.track, req.input.next)
      }),

    search: trpc.procedure
      .input(z.string())
      .mutation(async (req) => {
        return await service.search(req.input)
      }),

    'playback-state': trpc.procedure.query(async () => {
      return await service.getPlaybackState()
    }),

    'toggle-play': trpc.procedure.mutation(async () => await service.playToggle()),

    'play': trpc.procedure
      .input(z.string())
      .mutation(async (req) => await service.play(false, req.input)),

    'prev': trpc.procedure
      .mutation(async (req) => await service.prev()),

    'next': trpc.procedure
      .mutation(async (req) => await service.next()),

    'party-play': trpc.procedure
    .input(z.object({ tracks: z.array(z.string()), startAt: z.string() }))
    .mutation(async (req) =>  await service.partyPlay(req.input.tracks, req.input.startAt)),


  }
);