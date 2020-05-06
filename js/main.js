import initVideo from "./initVideo";

const streams = [
  "http://localhost:9191/master?url=http%3A%2F%2Flocalhost%3A3102%2Fstreams%2Fsosed%2Fmaster.m3u8",
  "http://localhost:9191/live?url=http%3A%2F%2Flocalhost%3A3102%2Fstreams%2Fstairs%2Fmaster.m3u8",
  "http://localhost:9191/master?url=http%3A%2F%2Flocalhost%3A3102%2Fstreams%2Fdog%2Fmaster.m3u8",
  "http://localhost:9191/live?url=http%3A%2F%2Flocalhost%3A3102%2Fstreams%2Fstreet%2Fmaster.m3u8",
];
const backButton = document.getElementById("back-button");
const videos = [];
const videosSettings = [];
const filters = [];
const volumes = [];
let fullscreenedVideoId = null;
for (let i = 0; i < 4; i++) {
  const video = document.getElementById(`video-${i}`);
  video.setAttribute("data-index", i);
  videos.push(video);
  initVideo(video, streams[i]);
  video.addEventListener("click", videoClickHandler);

  const videoSettings = document.getElementById(`video-settings-${i}`);
  videosSettings.push(videoSettings);

  const brightness = {
    input: document.getElementById(`brightness-input-${i}`),
    label: document.getElementById(`brightness-input-value-${i}`),
  };
  const contrast = {
    input: document.getElementById(`contrast-input-${i}`),
    label: document.getElementById(`contrast-input-value-${i}`),
  };
  const filter = {
    brightness,
    contrast,
  };
  brightness.input.setAttribute("data-index", i);
  brightness.label.setAttribute("data-index", i);
  contrast.input.setAttribute("data-index", i);
  contrast.label.setAttribute("data-index", i);
  filters.push(filter);

  brightness.input.addEventListener("input", updateFilter);
  contrast.input.addEventListener("input", updateFilter);

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 32;
  analyser.connect(audioCtx.destination);

  const streamData = new Uint8Array(analyser.frequencyBinCount);

  const volume = {
    text: document.getElementById(`volume-text-${i}`),
    bar: document.getElementById(`volume-bar-${i}`),
    audioCtx,
    analyser,
    streamData,
    value: 0,
    isConnected: false,
  };
  volumes.push(volume);
}

// start update loop for volume animation
requestAnimationFrame(updateVolume);

async function videoClickHandler(event) {
  document.body.classList.add("disabled");

  const video = event.target;
  video.removeEventListener("click", videoClickHandler);
  const isVideoClicked = video.dataset.index !== undefined;

  if (isVideoClicked) {
    fullscreenedVideoId = video.dataset.index;
    video.muted = false;

    if (!volumes[fullscreenedVideoId].isConnected) {
      volumes[fullscreenedVideoId].isConnected = true;
      const source = volumes[
        fullscreenedVideoId
      ].audioCtx.createMediaElementSource(video);
      source.connect(volumes[fullscreenedVideoId].analyser);
      volumes[fullscreenedVideoId].audioCtx.resume();
    }

    backButton.addEventListener("click", videoClickHandler);
    await animateToFullscreen(video);
  } else {
    videos[fullscreenedVideoId].muted = true;
    videos[fullscreenedVideoId].addEventListener("click", videoClickHandler);
    await animateFromFullscreen(videos[fullscreenedVideoId]);
    fullscreenedVideoId = null;
  }

  document.body.classList.remove("disabled");
}

async function animateToFullscreen(video) {
  animateAllOtherVideos(video, "fadeIn");
  backButton.classList.add("visible");
  const id = video.dataset.index;
  videosSettings[id].classList.add("visible");

  const { top, left, width, height } = video.getBoundingClientRect();

  video.style.top = `${top}px`;
  video.style.left = `${left}px`;
  video.style.width = `${width}px`;
  video.style.height = `${height}px`;
  video.style.position = "fixed";

  // force to update styles in dom
  void video.offsetHeight;

  video.classList.add("grid__video_animating");

  video.style.top = "0px";
  video.style.left = "0px";
  video.style.width = "100%";
  video.style.height = "calc(90vh - 120px - 48px)";

  await new Promise((r) => setTimeout(r, 500));

  video.classList.add("grid__video_fullscreen");
  video.classList.remove("grid__video_animating");

  video.setAttribute("controls", "");
}

async function animateFromFullscreen(video) {
  animateAllOtherVideos(video, "fadeOut");
  backButton.classList.remove("visible");
  const id = video.dataset.index;
  videosSettings[id].classList.remove("visible");

  video.classList.add("grid__video_animating");

  const { top, left, width, height } = video.parentNode.getBoundingClientRect();

  video.style.top = `${top}px`;
  video.style.left = `${left}px`;
  video.style.width = `${width}px`;
  video.style.height = `${height}px`;

  await new Promise((r) => setTimeout(r, 500));

  video.style.position = "";
  video.style.top = "";
  video.style.left = "";
  video.style.width = "";
  video.style.height = "";
  video.classList.remove("grid__video_fullscreen");
  video.classList.remove("grid__video_animating");

  video.removeAttribute("controls");
}

function animateAllOtherVideos(video, mode = "fadeIn") {
  videos.forEach((x) => {
    if (x === video) return;

    if (mode === "fadeOut") {
      x.style.pointerEvents = "";
      x.style.opacity = "";
    } else {
      x.style.pointerEvents = "none";
      x.style.opacity = 0;
    }
  });
}

function updateFilter(event) {
  const input = event.target;
  const id = input.dataset.index;

  const brightness = filters[id].brightness.input.value;
  const contrast = filters[id].contrast.input.value;

  videos[id].style.filter = `brightness(${brightness}) contrast(${contrast})`;
  filters[id].brightness.label.innerText = brightness;
  filters[id].contrast.label.innerText = contrast;
}

function getVolume() {
  volumes[fullscreenedVideoId].analyser.getByteFrequencyData(
    volumes[fullscreenedVideoId].streamData
  );

  return (
    volumes[fullscreenedVideoId].streamData.reduce((acc, val) => acc + val, 0) /
    255 /
    volumes[fullscreenedVideoId].streamData.length
  );
}

function updateVolume() {
  // animate only fullscreened video
  if (fullscreenedVideoId !== null) {
    const volume = getVolume();

    // animate only when new volume value differs from value before
    if (volumes[fullscreenedVideoId].value !== volume.toFixed(2)) {
      volumes[fullscreenedVideoId].value = volume.toFixed(2);
      volumes[fullscreenedVideoId].text.textContent = volume.toFixed(2);
      volumes[fullscreenedVideoId].bar.style.transform = `scaleX(${volume})`;
    }
  }

  requestAnimationFrame(updateVolume);
}
