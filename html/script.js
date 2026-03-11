// ppr-dev loading screen script
$(document).ready(function () {
    // default config if fetch is failing
    let Config = {
        ShowLogo: true,
        Logo: "../assets/ssrp.webp",
        Video: "../assets/loading-video.mov",
        EnableMusic: true,
        Music: [],
        ShowWelcome: true,
        ShowPlayerCount: true
    };

    // fallback song list
    let songs = [
        { title: "BAKA YONA", artist: "Unknown", src: "../assets/BAKA_YONA.mp3" }
    ];

    const audio = new Audio();
    audio.preload = "auto";
    let currentSongIndex = 0;
    let isPlaying = false;
    let volume = 0.50;

    // loading bar elements
    const $loadingFill = $('.loading-fill');
    const $loadingPercentage = $('.loading-percentage');
    const $loadingText2 = $('.loading-text-2');
    const $video = $('#video');

    // fix relative path from html folder
    function fixPath(path) {
        if (!path) return "";
        if (path.startsWith("http") || path.startsWith("data:")) return path;
        if (path.startsWith("assets/")) return "../" + path;
        if (path.startsWith("../assets/")) return path;
        return path;
    }

    // fetch config.lua and parse it
    function fetchConfig() {
        applyConfig();

        fetch('../config.lua')
            .then(response => {
                if (!response.ok) throw new Error("Config not found");
                return response.text();
            })
            .then(text => {
                parseLua(text);
                applyConfig();
                // update songs from config if there is any
                if (Config.Music && Config.Music.length > 0) {
                    songs = Config.Music;
                    currentSongIndex = 0;
                    loadSong(0);
                }
            })
            .catch(err => {
                console.error("Config load failed:", err);
            });

        initMusicPlayer();
    }

    // simple lua parser for the config values
    function parseLua(text) {
        // parse boolean toggles
        const showLogoMatch = text.match(/Config\.ShowLogo\s*=\s*(true|false)/);
        if (showLogoMatch) Config.ShowLogo = showLogoMatch[1] === 'true';

        const enableMusicMatch = text.match(/Config\.EnableMusic\s*=\s*(true|false)/);
        if (enableMusicMatch) Config.EnableMusic = enableMusicMatch[1] === 'true';

        const showWelcomeMatch = text.match(/Config\.ShowWelcome\s*=\s*(true|false)/);
        if (showWelcomeMatch) Config.ShowWelcome = showWelcomeMatch[1] === 'true';

        const showPlayerCountMatch = text.match(/Config\.ShowPlayerCount\s*=\s*(true|false)/);
        if (showPlayerCountMatch) Config.ShowPlayerCount = showPlayerCountMatch[1] === 'true';

        // get logo path
        const logoMatch = text.match(/Config\.Logo\s*=\s*["'](.*?)["']/);
        if (logoMatch) Config.Logo = logoMatch[1];

        // get video path
        const videoMatch = text.match(/Config\.Video\s*=\s*["'](.*?)["']/);
        if (videoMatch) Config.Video = videoMatch[1];

        // parse music table
        const musicBlock = text.match(/Config\.Music\s*=\s*\{([\s\S]*?)\}/);
        if (musicBlock) {
            const cleanBlock = musicBlock[1].replace(/--.*/g, '');
            const items = cleanBlock.match(/\{.*?\}/g);
            if (items) {
                songs = items.map(item => {
                    const title = item.match(/title\s*=\s*["'](.*?)["']/);
                    const artist = item.match(/artist\s*=\s*["'](.*?)["']/);
                    const src = item.match(/src\s*=\s*["'](.*?)["']/);
                    return {
                        title: title ? title[1] : "Unknown",
                        artist: artist ? artist[1] : "Unknown",
                        src: src ? src[1] : ""
                    };
                });
            }
        }
    }

    // apply config to the page elements
    function applyConfig() {
        // toggle logo visibility
        if (Config.ShowLogo) {
            $('.info').removeClass('element-hidden');
            const logoPath = fixPath(Config.Logo);
            if (logoPath) {
                $('.server-logo').attr('src', logoPath);
            }
        } else {
            $('.info').addClass('element-hidden');
        }

        // toggle music player visibility
        if (!Config.EnableMusic) {
            $('#music-container').addClass('element-hidden');
            audio.pause();
            isPlaying = false;
        } else {
            $('#music-container').removeClass('element-hidden');
        }

        // toggle welcome message
        if (!Config.ShowWelcome) {
            $('#welcome-container').addClass('element-hidden');
        } else {
            $('#welcome-container').removeClass('element-hidden');
        }

        // toggle player count
        if (!Config.ShowPlayerCount) {
            $('#player-count-container').addClass('element-hidden');
        } else {
            $('#player-count-container').removeClass('element-hidden');
        }

        // setup video
        const videoElement = $video[0];
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.autoplay = true;

        if (Config.Video) {
            const videoPath = fixPath(Config.Video);
            let $source = $video.find('source');

            if ($source.length === 0) {
                $source = $('<source>');
                $video.append($source);
            }

            if ($source.attr('src') !== videoPath) {
                $source.attr('src', videoPath);
                if (videoPath.endsWith('.mp4')) $source.attr('type', 'video/mp4');
                else if (videoPath.endsWith('.webm')) $source.attr('type', 'video/webm');
                else if (videoPath.endsWith('.mov')) $source.attr('type', 'video/mp4');

                videoElement.load();
                videoElement.play().catch(e => console.log("Autoplay caught:", e));
            }
        } else {
            videoElement.play().catch(e => console.log("Default autoplay caught:", e));
        }

        // video loop handlers
        $video.off('ended timeupdate');

        $video.on('ended', function () {
            this.currentTime = 0;
            this.play().catch(e => console.log("Loop play caught:", e));
        });

        // backup loop check incase ended event dont fire
        $video.on('timeupdate', function () {
            if (this.duration && this.currentTime >= this.duration - 0.1) {
                this.currentTime = 0;
                this.play().catch(e => { });
            }
        });

        // fallback if video source is not loading
        $video.find('source').off('error').on('error', function () {
            const currentSrc = $(this).attr('src');
            if (currentSrc.startsWith('../')) {
                const newSrc = currentSrc.replace('../', '');
                console.log("Video failed, trying fallback:", newSrc);
                $(this).attr('src', newSrc);
                videoElement.load();
                videoElement.loop = true;
                videoElement.play().catch(e => console.log("Fallback autoplay caught:", e));
            }
        });
    }

    // handle handover data from fivem server
    function handleHandover() {
        // check if fivem give us handover data
        if (window.nuiHandoverData) {
            const data = window.nuiHandoverData;

            // set player name if we got it
            if (data.playerName && Config.ShowWelcome) {
                $('#player-name').text(data.playerName);
            }

            // set player count if available
            if (Config.ShowPlayerCount) {
                const count = data.playerCount || 0;
                const max = data.maxPlayers || 64;
                $('#player-count-text').text(count + '/' + max + ' Online');
            }
        } else {
            // browser testing fallback
            if (Config.ShowWelcome) {
                $('#player-name').text('Pratheek');
            }
            if (Config.ShowPlayerCount) {
                $('#player-count-text').text('0/64');
            }
        }

        // hide welcome message after few seconds
        if (Config.ShowWelcome) {
            setTimeout(() => {
                $('#welcome-container').addClass('element-hidden');
            }, 7000);
        }
    }

    // setup the music player
    function initMusicPlayer() {
        // if music is disabled dont do nothing
        if (!Config.EnableMusic) return;

        if (songs.length === 0) {
            $('.song-title').text('No Music');
            $('.artist-name').text('Add mp3 to assets');
            return;
        }

        // pick random song if we have more then one
        if (currentSongIndex === 0 && songs.length > 1) {
            currentSongIndex = Math.floor(Math.random() * songs.length);
        }

        loadSong(currentSongIndex);

        // get saved volume or use default
        const savedVolume = localStorage.getItem('musicVolume');
        if (savedVolume !== null) {
            volume = parseFloat(savedVolume);
        }
        audio.volume = volume;
        if ($('#volume-slider').length) $('#volume-slider').val(volume * 100);

        // check if user had paused before
        const savedPaused = localStorage.getItem('musicPaused');

        if (savedPaused === 'true') {
            isPlaying = false;
            $('.play-btn .material-icons').text('play_arrow');
        } else {
            audio.play().then(() => {
                isPlaying = true;
                $('.play-btn .material-icons').text('pause');
            }).catch(e => {
                console.log("Auto-play blocked:", e);
                isPlaying = false;
                $('.play-btn .material-icons').text('play_arrow');
            });
        }

        // button click events
        $('.play-btn').off('click').on('click', togglePlayPause);
        $('.prev-btn').off('click').on('click', prevSong);
        $('.next-btn').off('click').on('click', nextSong);
        $('#volume-slider').off('input').on('input', changeVolume);

        // when song end play next one
        audio.removeEventListener('ended', nextSong);
        audio.addEventListener('ended', nextSong);
    }

    // load song by its index
    function loadSong(index) {
        if (songs.length === 0) return;
        const song = songs[index];
        audio.src = fixPath(song.src);

        $('.song-title').text(song.title);
        $('.artist-name').text(song.artist);

        if (isPlaying) {
            audio.play().catch(e => console.log("Auto-play prevented:", e));
        }
    }

    // toggle between play and pause
    function togglePlayPause() {
        const $icon = $('.play-btn .material-icons');
        if (isPlaying) {
            audio.pause();
            $icon.text('play_arrow');
            localStorage.setItem('musicPaused', 'true');
        } else {
            audio.play().catch(e => console.log("Play prevented:", e));
            $icon.text('pause');
            localStorage.setItem('musicPaused', 'false');
        }
        isPlaying = !isPlaying;
    }

    // go to previous song
    function prevSong() {
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(currentSongIndex);
        if (!isPlaying) togglePlayPause();
    }

    // go to next song
    function nextSong() {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        loadSong(currentSongIndex);
        if (!isPlaying) togglePlayPause();
    }

    // change the volume level
    function changeVolume() {
        volume = $(this).val() / 100;
        audio.volume = volume;
        localStorage.setItem('musicVolume', volume);
    }

    // update the loading bar and text
    function updateLoadingProgress(percent) {
        $loadingFill.css('width', percent + '%');
        $loadingPercentage.text(percent + '%');

        if (percent < 20) {
            $loadingText2.text('Initializing game...');
        } else if (percent < 40) {
            $loadingText2.text('Loading world data...');
        } else if (percent < 60) {
            $loadingText2.text('Loading character models...');
        } else if (percent < 80) {
            $loadingText2.text('Loading textures...');
        } else if (percent < 95) {
            $loadingText2.text('Finalizing...');
        } else {
            $loadingText2.text('Ready to play!');
        }
    }

    // cinema mode toggle for hiding ui
    $('#ui-toggle').on('click', function () {
        const $container = $('#ui-container');
        const $icon = $(this).find('.material-icons');

        if ($container.hasClass('hidden')) {
            $container.removeClass('hidden');
            $icon.text('visibility');
            $(this).css('opacity', '1');
        } else {
            $container.addClass('hidden');
            $icon.text('visibility_off');
            $(this).css('opacity', '0.5');
        }
    });

    // start everything
    fetchConfig();

    // small delay then apply handover data
    setTimeout(() => {
        handleHandover();
    }, 500);

    // fivem loading progress event
    window.addEventListener('message', (event) => {
        if (event.data.eventName !== 'loadProgress') return;

        const loadFraction = event.data.loadFraction;
        const percent = Math.round(loadFraction * 100);
        updateLoadingProgress(percent);
    });

    // fake loading for browser testing
    setTimeout(() => {
        if ($loadingPercentage.text() === '0%') {
            $loadingText2.text('Connecting to server...');
        }
        if (!window.invokeNative) {
            let p = 0;
            const interval = setInterval(() => {
                p++;
                updateLoadingProgress(p);
                if (p >= 100) clearInterval(interval);
            }, 100);
        }
    }, 3000);
});