FROM node:16
ARG NODE_ENV=production
WORKDIR /usr/src/app
COPY package* ./
RUN npm ci --only=production
COPY . .
RUN npm run build:ts
EXPOSE 3001
CMD ["npm", "run", "deploy"]
