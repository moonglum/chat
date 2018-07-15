FROM node:latest

RUN mkdir /mypp

WORKDIR /myapp

COPY package*.json /myapp/

RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
