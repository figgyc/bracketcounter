# bracketvote-comment-counter
Thing that counts things like [X] in the comments of YouTube videos.

## How to use
1. Copy `key.example.ts` to `key.ts` and fill in your API key. Don't share it!
2. Set up a webserver which forwards the websocket port 8080 to /socket. I use Caddy and the config file is included here.
3. Modify `config.ts` to point to the video ID and contestants you need.
3. `npm install`. `npm i -g typescript`.
4. `tsc; cd client; tsc; cd ..`
To run, `node yt-comments.js`.
