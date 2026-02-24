FROM node:20.19-slim

WORKDIR /sdl-backend-main

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
