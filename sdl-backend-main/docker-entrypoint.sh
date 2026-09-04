#!/bin/sh
# 容器以非 root 身分執行應用程式。
#
# 映像啟動時仍是 root，只做一件事：確保 bind mount 進來的 /logs（宿主機目錄，
# 舊版容器以 root 寫入，檔案是 root 擁有）可由 node 使用者寫入，然後用 su-exec
# 降權為 node 執行實際指令（npm start、sequelize-cli、seed 腳本都走這裡）。
# 若容器已用 --user 指定非 root，直接執行。
set -e

if [ "$(id -u)" = "0" ]; then
    mkdir -p /logs/errors
    NODE_UID="$(id -u node)"
    if [ "$(stat -c %u /logs)" != "$NODE_UID" ] || [ "$(stat -c %u /logs/errors)" != "$NODE_UID" ]; then
        chown -R node:node /logs
    fi
    exec su-exec node "$@"
fi

exec "$@"
