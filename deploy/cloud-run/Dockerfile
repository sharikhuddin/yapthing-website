FROM node:24-bookworm-slim
WORKDIR /app
COPY chat/yap-media-policy.js chat/yap-media-policy.js
COPY tests/yap-media-policy.cjs tests/yap-media-policy.cjs
COPY deploy/cloud-run/verify-task.cjs worker.cjs
USER node
ENV NODE_ENV=production
CMD ["node","worker.cjs"]
