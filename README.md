# bracketvote-comment-counter
Thing that counts things like [X] in the comments of YouTube videos.

## How to use
Setup:
1. Copy `key.example.ts` to `key.ts` and fill in your API key. Don't share it!
2. (optional) If you want the fancy graph and website system like mr, set up a webserver which serves these files and forwards the websocket port 8080 to /socket. I use [Caddy](https://caddyserver.com/download) and an example config file for running it on your own machine is included: just download it, drop into the bracketcounter folder, and type `name-of-caddy-executable run` to start it whenever you run bracketcounter.`
3. Copy `config.example.ts` to `config.ts`.
4. Check that `client/config.ts` is a symlink to the `config.ts` file. If it's not (it probably isn't if you are on Windows or you downloaded bracketcounter as a zip) run `cd client; del config.ts; mklink config.ts ..\config.ts` (Windows, you may need to use an admin prompt) or `ln -s ../config.ts config.ts` (UNIX)
5. `npm install --dev`. `npm i -g typescript`.

Using it:
1. Modify `config.ts` to point to the video ID and contestants you need.
2. `tsc; cd client; tsc; cd ..`
To run, `node yt-comments.js`. Once the results are done counting they should appear in the command prompt/terminal window. If your webserver is up, then visit it (probably `localhost` in your browser) and the votes will show up whenever it finishes counting.
