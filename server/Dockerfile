FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY index.js ./

ENV PORT=3001
ENV DB_PATH=/data/groceries.db

EXPOSE 3001

CMD ["node", "index.js"]
