FROM node:alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json .
RUN npm install
RUN npm install -g typescript
COPY . .
RUN npx tsc
EXPOSE 8080