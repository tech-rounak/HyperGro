
FROM node:18-alpine

RUN mkdir -p /src
WORKDIR /src

COPY . .
RUN npm install

ENV PORT=3000
ENV MONGO_URI=mongodb+srv://hypergro:hypergro@cluster0.nmeioqk.mongodb.net/
ENV NODE_ENV=prod

CMD ["node", "/src/server.js"]
