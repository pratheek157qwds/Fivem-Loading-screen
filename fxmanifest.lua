-- ppr-dev loading screen
fx_version 'cerulean'
game 'gta5'
lua54 'yes'
author 'ppr-dev'
description 'ppr-dev Loading Screen'
version '1.3.0'

server_script 'server.lua'

files {
  'assets/**',
  'html/*',
  'config.lua'
}

loadscreen {
  'html/index.html'
}

loadscreen_cursor 'yes'
loadscreen_manual_shutdown 'yes'
dependency '/assetpacks'