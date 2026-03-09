FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY web/package*.json web/

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "--workspace", "web", "run", "start"]
