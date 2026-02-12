let player = null;
    let ytApiReady = false;
    let bookmarkTime = 0;
    let loopId = null;

    // 2) API가 준비되면 호출됨 (YouTube가 전역 함수 이름을 요구)
    function onYouTubeIframeAPIReady() {
      ytApiReady = true;
    }

    function extractVideoId(input) {
      // 허용 예: 
      // - https://www.youtube.com/watch?v=VIDEOID
      // - https://youtu.be/VIDEOID
      // - https://www.youtube.com/shorts/VIDEOID
      // - VIDEOID만 붙여넣어도 허용(11자)
      const s = (input || "").trim();

      // videoId 단독(대개 11자)인 경우
      if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

      try {
        const url = new URL(s);

        // youtu.be/VIDEOID
        if (url.hostname.includes("youtu.be")) {
          const id = url.pathname.split("/").filter(Boolean)[0];
          if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
        }

        // youtube.com/watch?v=VIDEOID
        const v = url.searchParams.get("v");
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

        // youtube.com/shorts/VIDEOID
        const parts = url.pathname.split("/").filter(Boolean);
        const shortsIdx = parts.indexOf("shorts");
        if (shortsIdx >= 0 && parts[shortsIdx + 1]) {
          const id = parts[shortsIdx + 1];
          if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
        }
      } catch (e) {
        // URL 파싱 실패 → 아래에서 null 처리
      }
      return null;
    }

    function setBookmarkEnabled(enabled) {
      document.getElementById("setBookmarkBtn").disabled = !enabled;
    }

    function loadVideoByUrl() {
      if (!ytApiReady) {
        alert("YouTube API 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      
      let input = document.getElementById("urlInput").value;

      if (!input) {
        input = 'https://youtu.be/dwJqbzw6FKY?si=KKKbadkEFrGF2eN0';
      }
      const videoId = extractVideoId(input);

      if (!videoId) {
        alert("유효한 유튜브 링크(또는 videoId 11자)를 입력해 주세요.");
        return;
      }

      // 이미 player가 있으면 video만 교체
      if (player) {
        player.loadVideoById(videoId);
        setBookmarkEnabled(true);
        return;
      }

      // 최초 1회: 플레이어 생성
      player = new YT.Player("player", {
        videoId,
        playerVars: {
          // 필요 시 옵션 추가 가능
          // controls: 1,
          // modestbranding: 1
        },
        events: {
          onReady: () => setBookmarkEnabled(true),
          onError: (e) => {
            console.error("YT Player error:", e);
            alert("재생 오류가 발생했습니다. 영상이 임베드 허용인지 확인해 주세요.");
            setBookmarkEnabled(false);
          }
        }
      });
    }

    function setBookmark(){
        if (!player) return;
        player.pauseVideo();
        const currentTime = player.getCurrentTime();
        document.getElementById("bookmarkInfo").textContent = `북마크: ${formatTime(currentTime)}`;
        bookmarkTime = currentTime;
    }

    function formatTime(sec) {
        if (!Number.isFinite(sec)) return "--:--";
        const s = Math.max(0, sec);
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60);
        return `${m}:${String(r).padStart(2, "0")}`;
    }

    function setupLooping(){
        if (!player) return;
        // BPM 값 읽기
        const bpmInput = parseFloat(document.getElementById("BPM").value);
        const oneBarInterval = (60 / bpmInput) * 4 ;
        const loopSetting = document.getElementById("loopSetting").value;
        const loopBarnum = parseInt(document.getElementById("loopBarnum").value, 10) || 1;
        let loopStart = 0;
        let loopEnd = 0;

        if (loopSetting === "option1") {
            // 북마크 이전 마디로 루프
            loopEnd = bookmarkTime;
            loopStart = Math.max(0, loopEnd - (oneBarInterval * loopBarnum));
        } else if (loopSetting === "option2") {
            // 북마크 이후 마디로 루프
            loopStart = bookmarkTime;
            loopEnd = loopStart + (oneBarInterval * loopBarnum);
        }
        // 루프 시작시간으로 이동
        player.seekTo(loopStart, true);
        player.playVideo();

        // 루프 시작
        const checkInterval = 100; // 0.2초마다 체크
        loopId = setInterval(() => {
            const currentTime = player.getCurrentTime();
            if (currentTime >= loopEnd) {
                player.seekTo(loopStart, true);
            }
        }, checkInterval);
    }

    function breakLooping(){
        if (loopId) {
            clearInterval(loopId);
            loopId = null;
        }
    }



    document.getElementById("loadBtn").addEventListener("click", loadVideoByUrl);
    document.getElementById("urlInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadVideoByUrl();
    });

    // Set bookmark button
    document.getElementById("setBookmarkBtn").addEventListener("click", setBookmark);
    // Set loop button
    document.getElementById("loopOn").addEventListener("click", () => {
        if (!player) return;
        player.pauseVideo();
        setupLooping();
    });
    document.getElementById("loopOff").addEventListener("click", () => {
        if (!player) return;
        player.pauseVideo();
        breakLooping();
    });
