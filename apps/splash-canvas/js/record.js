function pickMime() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "video/webm";
  }
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";
}

export function createRecorder() {
  return {
    rec: null,
    chunks: [],
    mime: pickMime(),
    recording: false,
    lastBlob: null,
  };
}

export function canRecord() {
  return typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

export function startRecorder(recorder, canvas, fps = 30) {
  if (!canRecord()) {
    throw new Error("Recording needs MediaRecorder + canvas.captureStream");
  }
  if (!canvas) throw new Error("No canvas to record");
  stopRecorder(recorder);
  recorder.chunks = [];
  recorder.mime = pickMime();
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: recorder.mime });
  rec.ondataavailable = (event) => {
    if (event.data && event.data.size) recorder.chunks.push(event.data);
  };
  recorder.rec = rec;
  recorder.recording = true;
  rec.start(250);
  return recorder;
}

export function stopRecorder(recorder) {
  const rec = recorder.rec;
  recorder.recording = false;
  if (!rec || rec.state === "inactive") {
    recorder.rec = null;
    return Promise.resolve(recorder.lastBlob);
  }
  return new Promise((resolve) => {
    rec.onstop = () => {
      recorder.lastBlob = new Blob(recorder.chunks, { type: recorder.mime || "video/webm" });
      recorder.rec = null;
      resolve(recorder.lastBlob);
    };
    try {
      rec.stop();
    } catch {
      recorder.rec = null;
      resolve(recorder.lastBlob);
    }
  });
}

export function blobToVideo(blob) {
  if (!blob || typeof document === "undefined") return null;
  const video = document.createElement("video");
  video.src = URL.createObjectURL(blob);
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.play?.();
  return video;
}

export function downloadBlob(blob, name = "splash-canvas-loop.webm") {
  if (!blob || typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
