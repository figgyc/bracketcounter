FROM node:alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json .
RUN npm install
COPY . .
RUN npx tsc
CMD [ "npm", "start" ]
EXPOSE 7001