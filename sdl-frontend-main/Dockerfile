FROM node:20.19-slim

WORKDIR /sdl-frontend-main

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD [ "npm", "run", "dev" ]