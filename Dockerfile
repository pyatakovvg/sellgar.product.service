FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS builder
WORKDIR /app
COPY code/ ./
RUN node .yarn/releases/yarn-4.18.0.cjs install --immutable \
    && node .yarn/releases/yarn-4.18.0.cjs build:product_srv

FROM postgres:16.16-bookworm@sha256:ce3efec6bc404f6b15ebf5d9bed6b45a9d4655aea238d7dacc3467ccb05a1175 AS verifier
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
COPY --from=builder --chown=postgres:postgres /app /app
WORKDIR /app
ENV PG_BIN=/usr/lib/postgresql/16/bin
USER postgres
RUN node .yarn/releases/yarn-4.18.0.cjs workspace @service/product test --runInBand \
    && touch /tmp/product-tests-passed

FROM builder AS production-dependencies
COPY --from=verifier /tmp/product-tests-passed /tmp/product-tests-passed
RUN node .yarn/releases/yarn-4.18.0.cjs workspaces focus @service/product --production

FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS server
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/library/sellgar.outbox.library/package.json ./library/sellgar.outbox.library/package.json
COPY --from=builder --chown=node:node /app/library/sellgar.outbox.library/dist ./library/sellgar.outbox.library/dist
COPY --from=builder --chown=node:node /app/service/dist ./service/dist
COPY --from=builder --chown=node:node /app/service/package.json ./service/package.json
COPY --from=builder --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 8080
CMD ["node", "--env-file=.env", "service/dist/main.js"]
