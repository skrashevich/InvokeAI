# InvokeAI Web UI

The UI is a fairly straightforward Typescript React app. The only really fancy stuff is the Unified Canvas.

Code in `invokeai/frontend/web/` if you want to have a look.

## Details

State management is Redux via [Redux Toolkit](https://github.com/reduxjs/redux-toolkit). Communication with server is a mix of HTTP and [socket.io](https://github.com/socketio/socket.io-client) (with a custom redux middleware to help).

[Chakra-UI](https://github.com/chakra-ui/chakra-ui) for components and styling.

[Konva](https://github.com/konvajs/react-konva) for the canvas, but we are pushing the limits of what is feasible with it (and HTML canvas in general). We plan to rebuild it with [PixiJS](https://github.com/pixijs/pixijs) to take advantage of WebGL's improved raster handling.

[Vite](https://vitejs.dev/) for bundling.

Localisation is via [i18next](https://github.com/i18next/react-i18next), but translation happens on our [Weblate](https://hosted.weblate.org/engage/invokeai/) project. Only the English source strings should be changed on this repo.

## Contributing

Thanks for your interest in contributing to the InvokeAI Web UI!

We encourage you to ping @psychedelicious and @blessedcoolant on [Discord](https://discord.gg/ZmtBAhwWhy) if you want to contribute, just to touch base and ensure your work doesn't conflict with anything else going on. The project is very active.

### Dev Environment

Install [node](https://nodejs.org/en/download/) and [yarn classic](https://classic.yarnpkg.com/lang/en/).

From `invokeai/frontend/web/` run `yarn install` to get everything set up.

Start everything in dev mode:

1. Start the dev server: `yarn dev`
2. Start the InvokeAI UI per usual: `invokeai --web`
3. Point your browser to the dev server address e.g. `http://localhost:5173/`

### Production builds

For a number of technical and logistical reasons, we need to commit UI build artefacts to the repo.

If you submit a PR, there is a good chance we will ask you to include a separate commit with a build of the app.

To build for production, run `yarn build`.
