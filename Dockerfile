FROM node:18-bullseye

# Environment:
# * We will put the app in /app
ENV APP_HOME="/app/"

# give the app to the non-root user and update NPM
RUN mkdir "$APP_HOME" && \
  chown -R node:node "$APP_HOME" && \
  npm install -g npm@latest

# Copy package.json and lock
COPY --chown=node:node package*.json "$APP_HOME"

# Execute all commands in the app directory with the non-root user from now on
WORKDIR $APP_HOME
USER node

# Install the Node dependencies
RUN npm install

# Copy all the files
COPY --chown=node:node . ./

EXPOSE 8000

CMD ["npm", "start"]
