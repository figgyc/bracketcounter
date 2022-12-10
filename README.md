# Bracketcounter
Thing that counts things like [X] in the comments of YouTube videos.

## How to setup
For any case, the first steps:
1. Install [Node.js](https://nodejs.org/en/download/)
1. [Download this code](https://github.com/figgyc/bracketcounter/archive/master.zip) (or git clone it if you know how and care).
1. [Create a Google API project](https://console.developers.google.com/projectcreate)
1. [Enable the YouTube Data API v3](https://console.developers.google.com/apis/library/youtube.googleapis.com).
1. Copy `config.example.toml` to `config.toml`.
1. Open `config.toml` in a text editor (eg Notepad, TextEdit, Visual Studio Code) and set the settings to what you need them to be (there are explanations in the file)
1. Run in a command prompt / terminal in the Bracketcounter folder (if you don't know what the command prompt is, Google it):
```sh
npm install --dev
npx tsc
```

The next setup stage depends on what you want to use Bracketcounter to do. If you want to count other people's videos, or if you want to count your own videos, but aren't bothered about counting votes caught in the "Held for review" section of YouTube Studio, go with the easy setup. If you need to count held comments on your own videos, you'll have to use the harder setup.

### Super easy setup (API key):
This is the easiest setup, and it should be accurate enough for most cases. This is also the best setup for counting on other people's videos since you can't look at other people's spam comments anyway.

However, the drawback of this API-key based setup is that it isn't authenticated, therefore it isn't able to count comments that are "Held for review" in YouTube Studio on your own videos. You might want this, but often this results in legitimate votes being caught in the filters, so it's best to go through them manually and approve real vote comments. If this isn't viable you should use the slightly less easy setup below which can count comments in all 3 tabs.
1. [Go here](https://console.developers.google.com/apis/api/youtube.googleapis.com/credentials), click Create Credentials and pick "API key".
2. Copy the API key into the `key` section of the config file. Make sure `isAuthenticated` is `false`.

### Advanced setup (OAuth):
This allows you to count "held for review" comments, but it is slightly harder to set up. **Note:** Do not use this method when you are counting videos not uploaded by you, or you will get errors!
1. [Go here](https://console.developers.google.com/apis/api/youtube.googleapis.com/credentials), click Create Credentials and pick "OAuth client ID". Set the type to "Desktop app".
2. Copy the client ID and secret into the `clientId` and `clientSecret` section of the config file, and set `isAuthenticated` to `true`.
3. The first time you run Bracketcounter you will be asked to paste in a link to your browser (or it might open automatically), where you can sign in with Google. Make sure to pick the YouTube channel where you uploaded the videos to. The result of this is saved to `authdata.json`, don't share it! **Note:** You may see a "Google hasn't verified this app" screen, you can ignore it by going to Advanced and then "Go to app (unsafe)**.

## How to use
**Once you've done the setup**,  run, `node dist/yt-comments.js` in the terminal. Once the results are done counting they should appear in the command prompt/terminal window. Press Ctrl+C to exit safely once the count is complete. For the most accurate numbers and data analysis, you should process `savestate.json` with [the data tools](https://github.com/figgyc/bracketcounter-datastuff).
If you're having any trouble feel free to ask me.

## Known issues
- If you pin a comment written by someone other than whoever uploaded the video, then live updating will not work. Videos with pinned comments by the uploader and no pinned comment work fine. This also doesn't cause any problems if you aren't using live counting functionality. (Technical explanation: The "fast reload" works by scanning comments until it finds one that it has already seen. Since pinned comments are... pinned, they will always appear first and therefore be seen and stop the scanning. There is a workaround in the code which doesn't stop scanning if the reply is by the uploader of the video, but there is no way to check if a comment is pinned in the YouTube API, so other pinned comments don't work and break the counter.)
- The code is very messy :P

## Live counting / website
This is completely optional, and you don't need to do it if you just want voting results, but if you want your own "live counting" style website like the old figgyc's Bracketcounter website, then you can set it up.
This **requires technical knowledge** of network administration.
1. Set `liveMode` to `true` in the config file.
1. Clone [bracketcounter-web](https://github.com/figgyc/bracketcounter-web).
1. Run `cd bracketcounter-web; npm i --dev; tsc` in a command prompt/terminal.
1. Set up a "reverse proxy" server, like Caddy or Nginx, as follows:
    - Proxy the websocket (default port 9764) to `/socket`.
    - Serve the bracketcounter-web `dist` folder at `/` (the web root)
1. Run your web server and `node dist/yt-comments.js` at the same time.
