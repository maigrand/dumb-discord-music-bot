FROM node:18-alpine
RUN apk update

RUN mkdir -p /app
WORKDIR /app

RUN apk add --no-cache ffmpeg libtool make autoconf automake g++ python3

COPY ./package*.json /app/
RUN npm install
COPY ./ /app/

ENTRYPOINT ["npm", "run", "dev"]