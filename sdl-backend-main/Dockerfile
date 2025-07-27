FROM node:20.7.0

WORKDIR /sdl-backend-main

COPY package*.json ./

# COPY . /sdl-backend-main

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "dev"]
