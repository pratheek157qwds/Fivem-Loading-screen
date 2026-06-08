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

    // fetch config.json and apply it (replaces old lua regex parser)
    function fetchConfig() {
        // apply defaults immediately so ui doesnt sit blank
        applyConfig();

        fetch('config.json')
            .then(response => {
                if (!response.ok) throw new Error("config.json not found");
                return response.json();
            })
            .then(data => {
                // merge json values into Config
                Object.assign(Config, data);
                applyConfig();

                // update songs from config and reload player
                if (Config.Music && Config.Music.length > 0) {
                    songs = Config.Music;
                    currentSongIndex = 0;
                }

                // init music after config is applied so correct songs load
                initMusicPlayer();
            })
            .catch(err => {
                console.error("Config load failed, using defaults:", err);
                // still init music with fallback songs
                initMusicPlayer();
            });
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
        // --- returning vs new player detection ---
        const visitCount = parseInt(localStorage.getItem('visitCount') || '0');
        const isReturning = visitCount > 0;
        // save incremented count for next time
        localStorage.setItem('visitCount', visitCount + 1);

        // set welcome label based on visit history
        if (Config.ShowWelcome) {
            if (isReturning) {
                $('#welcome-text').text('Welcome back,');
            } else {
                const serverName = Config.ServerName || 'the city';
                $('#welcome-text').text('Welcome to ' + serverName + ',');
            }
        }

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
        updateVolumeIcon(volume);

        // check if user had paused before
        const savedPaused = localStorage.getItem('musicPaused');

        if (savedPaused === 'true') {
            isPlaying = false;
            $('.play-btn .material-icons').text('play_arrow');
            $('#equalizer').removeClass('playing');
        } else {
            audio.play().then(() => {
                isPlaying = true;
                $('.play-btn .material-icons').text('pause');
                $('#equalizer').addClass('playing');
            }).catch(e => {
                console.log("Auto-play blocked:", e);
                isPlaying = false;
                $('.play-btn .material-icons').text('play_arrow');
                $('#equalizer').removeClass('playing');
            });
        }

        // button click events
        $('.play-btn').off('click').on('click', togglePlayPause);
        $('.prev-btn').off('click').on('click', prevSong);
        $('.next-btn').off('click').on('click', nextSong);
        $('#volume-slider').off('input').on('input', changeVolume);
        $('.volume-icon').off('click').on('click', toggleMute);

        // when song end play next one
        audio.removeEventListener('ended', nextSong);
        audio.addEventListener('ended', nextSong);

        // update progress bar and elapsed time as song plays
        audio.addEventListener('timeupdate', function () {
            if (!audio.duration) return;
            const pct = (audio.currentTime / audio.duration) * 100;
            $('#music-progress-fill').css('width', pct + '%');
            $('#time-elapsed').text(formatTime(audio.currentTime));
        });

        // set total duration when audio metadata is ready
        audio.addEventListener('loadedmetadata', function () {
            $('#time-total').text(formatTime(audio.duration));
        });

        // click on progress bar to seek to that position
        $('#music-progress-bar').off('click').on('click', function (e) {
            if (!audio.duration) return;
            const rect = this.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            audio.currentTime = pct * audio.duration;
        });
    }

    // load song by its index
    function loadSong(index) {
        if (songs.length === 0) return;
        const song = songs[index];
        audio.src = fixPath(song.src);

        $('.song-title').text(song.title);
        $('.artist-name').text(song.artist);

        if (isPlaying) {
            audio.play().then(() => {
                $('#equalizer').addClass('playing');
            }).catch(e => {
                console.log("Auto-play prevented:", e);
                $('#equalizer').removeClass('playing');
            });
        }
    }

    // toggle between play and pause
    function togglePlayPause() {
        const $icon = $('.play-btn .material-icons');
        if (isPlaying) {
            audio.pause();
            $icon.text('play_arrow');
            $('#equalizer').removeClass('playing');
            localStorage.setItem('musicPaused', 'true');
            isPlaying = false;
        } else {
            audio.play().then(() => {
                $icon.text('pause');
                $('#equalizer').addClass('playing');
                localStorage.setItem('musicPaused', 'false');
                isPlaying = true;
            }).catch(e => {
                console.log("Play prevented:", e);
                $icon.text('play_arrow');
                $('#equalizer').removeClass('playing');
                isPlaying = false;
            });
        }
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
        updateVolumeIcon(volume);
    }

    let preMuteVolume = 0.15;
    // toggle mute state
    function toggleMute() {
        const $slider = $('#volume-slider');
        if (audio.volume > 0) {
            preMuteVolume = audio.volume;
            audio.volume = 0;
            $slider.val(0);
            updateVolumeIcon(0);
            localStorage.setItem('musicVolume', 0);
        } else {
            const targetVol = preMuteVolume > 0 ? preMuteVolume : 0.15;
            audio.volume = targetVol;
            $slider.val(targetVol * 100);
            updateVolumeIcon(targetVol);
            localStorage.setItem('musicVolume', targetVol);
        }
    }

    // update volume icon state based on volume level
    function updateVolumeIcon(vol) {
        const $icon = $('.volume-icon');
        if (vol === 0) {
            $icon.text('volume_off');
        } else if (vol < 0.35) {
            $icon.text('volume_mute');
        } else if (vol < 0.7) {
            $icon.text('volume_down');
        } else {
            $icon.text('volume_up');
        }
    }

    // format seconds into m:ss string
    function formatTime(secs) {
        if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
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
    function toggleCinemaMode() {
        const $container = $('#ui-container');
        const $toggleBtn = $('#ui-toggle');
        const $icon = $toggleBtn.find('.material-icons');

        if ($container.hasClass('hidden')) {
            $container.removeClass('hidden');
            $icon.text('visibility');
            $toggleBtn.css('opacity', '1');
        } else {
            $container.addClass('hidden');
            $icon.text('visibility_off');
            $toggleBtn.css('opacity', '0.5');
        }
    }

    // click handler for cinema mode
    $('#ui-toggle').on('click', toggleCinemaMode);

    // keydown listener for hotkeys
    $(document).on('keydown', function (e) {
        // Spacebar: Play/Pause music (only if music container is visible/enabled)
        if (e.code === 'Space') {
            e.preventDefault();
            if (Config.EnableMusic && songs.length > 0) {
                togglePlayPause();
            }
        }
        // 'M': Mute/Unmute
        else if (e.code === 'KeyM') {
            e.preventDefault();
            if (Config.EnableMusic && songs.length > 0) {
                toggleMute();
            }
        }
        // ArrowLeft: Previous track
        else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            if (Config.EnableMusic && songs.length > 1) {
                prevSong();
            }
        }
        // ArrowRight: Next track
        else if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (Config.EnableMusic && songs.length > 1) {
                nextSong();
            }
        }
        // 'C': Toggle Cinema mode
        else if (e.code === 'KeyC') {
            e.preventDefault();
            toggleCinemaMode();
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