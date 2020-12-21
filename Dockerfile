FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm install -g typescript
COPY . .
RUN npx tsc
CMD ["node", "yt-comments.js"]
EXPOSE 8080