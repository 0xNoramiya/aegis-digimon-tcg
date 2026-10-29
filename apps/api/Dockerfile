FROM node:26-alpine AS manifests
RUN npm install --global pnpm@10.30.1
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY patches ./patches
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

FROM manifests AS dependencies
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --prod

FROM manifests AS builder
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @aegis/shared build && pnpm --filter @aegis/api build

# Avatar screening carries the model inside the image, so it is built as its own target.
# onnxruntime-node loads a glibc binary that refuses to run under musl, which rules out alpine here.
FROM node:26-slim AS runtime-nsfw
WORKDIR /app

COPY --from=dependencies /app/package.json ./
COPY --from=dependencies /app/pnpm-lock.yaml ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/package.json ./packages/shared/
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/apps/api/package.json ./apps/api/
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY data/kb/banlist.json ./data/kb/banlist.json
COPY tools/deploy/fetch-nsfw-model.mjs ./tools/deploy/fetch-nsfw-model.mjs

# The package ships binaries for every OS; only this platform is reachable from the container.
RUN rm -rf node_modules/.pnpm/onnxruntime-node*/node_modules/onnxruntime-node/bin/napi-v6/darwin \
           node_modules/.pnpm/onnxruntime-node*/node_modules/onnxruntime-node/bin/napi-v6/win32 \
           node_modules/.pnpm/onnxruntime-node*/node_modules/onnxruntime-node/bin/napi-v6/linux/arm64 \
    && node tools/deploy/fetch-nsfw-model.mjs /models/nsfw.onnx

# Turned on by the presence of the model; see apps/api/src/accounts/avatarModeration.ts.
ENV AVATAR_NSFW_MODEL=/models/nsfw.onnx
ENV PORT=2567
EXPOSE 2567
CMD ["node", "apps/api/dist/index.js"]

# Default target, and deliberately last so a build that names no target keeps getting alpine.
# It has no model and therefore no moderation: uploads behave exactly as they did before.
FROM node:26-alpine AS runtime
WORKDIR /app

COPY --from=dependencies /app/package.json ./
COPY --from=dependencies /app/pnpm-lock.yaml ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/package.json ./packages/shared/
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/apps/api/package.json ./apps/api/
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY data/kb/banlist.json ./data/kb/banlist.json

ENV PORT=2567
EXPOSE 2567
CMD ["node", "apps/api/dist/index.js"]
