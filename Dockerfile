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
    && /usr/lib/postgresql/16/bin/initdb -D /tmp/product-test-pg -A trust > /tmp/product-test-init.log \
    && /usr/lib/postgresql/16/bin/pg_ctl -D /tmp/product-test-pg -l /tmp/product-test-pg.log -o '-h 127.0.0.1 -p 6543' -w start \
    && cd service \
    && PRODUCT_SNAPSHOT_DATABASE_TESTS=1 PRODUCT_DECIMAL_DATABASE_TESTS=1 PRODUCT_DATABASE_HOST=127.0.0.1 PRODUCT_DATABASE_PORT=6543 \
       PRODUCT_DATABASE_USERNAME=postgres PRODUCT_DATABASE_PASSWORD=integration PRODUCT_DATABASE_NAME=postgres \
       node --experimental-vm-modules --expose-gc ../node_modules/jest/bin/jest.js product-snapshot.integration.spec.ts decimal-scale.integration.spec.ts --runInBand \
    && /usr/lib/postgresql/16/bin/pg_ctl -D /tmp/product-test-pg -m fast -w stop \
    && touch /tmp/product-tests-passed

FROM builder AS production-dependencies
COPY --from=verifier /tmp/product-tests-passed /tmp/product-tests-passed
RUN node .yarn/releases/yarn-4.18.0.cjs workspaces focus @service/product --production

FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/library/sellgar.outbox.library/package.json ./library/sellgar.outbox.library/package.json
COPY --from=builder --chown=node:node /app/library/sellgar.outbox.library/dist ./library/sellgar.outbox.library/dist
COPY --from=builder --chown=node:node /app/service/dist ./service/dist
COPY --from=builder --chown=node:node /app/service/package.json ./service/package.json
COPY --from=builder --chown=node:node /app/package.json ./package.json
USER node

FROM runtime AS migration
LABEL io.sellgar.image-role=migration
CMD ["node", "--env-file=.env", "node_modules/typeorm/cli.js", "-d", "service/dist/database/data-source.js", "migration:run"]

FROM runtime AS application
LABEL io.sellgar.image-role=application
RUN rm -rf service/dist/database/migrations service/dist/database/data-source.*
EXPOSE 8080
CMD ["node", "--env-file=.env", "service/dist/main.js"]
