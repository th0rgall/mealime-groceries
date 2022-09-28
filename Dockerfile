FROM node:16-alpine
# Env
WORKDIR /app
# Only copy the package.json file to work directory
COPY package.json .
# Install all Packages
RUN npm install
# Copy all other source code to work directory
COPY . .
# TypeScript
RUN npx tsc
# Start
CMD [ "npm", "start" ]
EXPOSE 3000