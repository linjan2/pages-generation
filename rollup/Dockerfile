FROM registry.access.redhat.com/ubi9/nodejs-18:1

USER 0
RUN \
    dnf install -y --nodocs --setopt=install_weak_deps=False jq
USER 1001:0

WORKDIR /app/src
COPY --chown=1001:0 src/ .

COPY --chown=1001:0 entrypoint.sh /usr/bin/entrypoint.sh

RUN \
    chmod ug+x /usr/bin/entrypoint.sh && \
    npm install --global rollup && \
    npm install --global eslint && \
    npm install

WORKDIR /app/files

ENTRYPOINT ["/usr/bin/entrypoint.sh"]

