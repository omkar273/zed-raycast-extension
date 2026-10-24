# Caygnus Recent Projects

Search and open recent projects in [Caygnus](https://github.com/omkar273/zed), a fork of Zed, from Raycast.

Adapted from Raycast's [Zed Recent Projects](https://github.com/raycast/extensions/tree/3048c09ba5dd2976b28ed74f9500c8e601a9113e/extensions/zed-recent-projects) extension (MIT), which targets stock Zed. This version:

- finds the app by its bundle id, `com.caygnus.Caygnus`, at `/Applications/Caygnus.app`
- reads recent projects from `~/Library/Application Support/Zed/db/0-dev`, since Caygnus is built from Zed's dev channel and keeps Zed's data folder
- opens projects with the CLI inside the Caygnus app bundle, so it never opens a stock Zed install
- is macOS only

## Install

```bash
npm install
npm run dev
```

`npm run dev` adds the extension to Raycast. It stays installed after you stop the command.
