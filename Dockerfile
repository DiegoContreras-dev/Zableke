FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run prisma:generate

EXPOSE 3000

CMD ["sh", "-c", "npm run dev -- -H 0.0.0.0 -p 3000"]
