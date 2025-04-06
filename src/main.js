import {
  bootstrapCameraKit,
  createMediaStreamSource,
  Transform2D,
} from '@snap/camera-kit';

// Elementos da interface
const liveRenderTarget = document.getElementById('canvasCam');
const videoContainer = document.getElementById('video-container');
const videoTarget = document.getElementById('video');
const isRecordingButton = document.getElementById('isRecording');
const downloadButton = document.getElementById('download');
const lensSelector = document.getElementById('lenses');
const cameraSelector = document.getElementById('cameras');

// Estado
let mediaRecorder;
let downloadUrl;
let session;
let currentMediaStream;
let isRecording = false;




async function init() {
  const cameraKit = await bootstrapCameraKit({
    apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzI2MTY3ODgwLCJzdWIiOiJhZTUwMjhjYy0yODY5LTRkZGItODA5YS01YTk0OWFhN2UxZjh-U1RBR0lOR35mMTRhYjAwMy0wNzliLTRmOTEtYTFjZi1iYWQ1MjhhN2NjNWIifQ.ab6GbBUpKPnfWpqp9DRW0C4HUfwk4laumSTCu8NetEQ',
  });

  session = await cameraKit.createSession({ liveRenderTarget });

  // Inicializa com câmera padrão
  await setCameraKitSource();

  // Carrega lentes e aplica a primeira
  const { lenses } = await cameraKit.lensRepository.loadLensGroups([
    '0cab842a-6538-4e76-b6d5-3b413c13ccec',
  ]);
  session.applyLens(lenses[0]);

  attachLensesToSelect(lenses, session);
  attachCamerasToSelect();

  bindRecorder(liveRenderTarget);
}

async function setCameraKitSource(deviceId) {
  // Para e limpa stream anterior, se houver
  if (currentMediaStream) {
    session.pause();
    currentMediaStream.getTracks().forEach((track) => track.stop());
  }

  // Obtém novo stream de câmera (e microfone se quiser)
  currentMediaStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: deviceId ? { exact: deviceId } : undefined },
  });

  const source = createMediaStreamSource(currentMediaStream);
  await session.setSource(source);
  source.setTransform(Transform2D.MirrorX);
  session.play();
}

function attachCamerasToSelect() {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const cameras = devices.filter((d) => d.kind === 'videoinput');

    cameraSelector.innerHTML = ''; // limpa

    cameras.forEach((camera) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.text = camera.label || `Camera ${cameraSelector.length + 1}`;
      cameraSelector.appendChild(option);
    });
  });

  cameraSelector.addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    await setCameraKitSource(deviceId);
  });
}

function attachLensesToSelect(lenses, session) {
  lenses.forEach((lens, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = lens.name;
    lensSelector.appendChild(option);
  });

  lensSelector.addEventListener('change', async (event) => {
    const selectedLens = lenses[event.target.value];
    await session.applyLens(selectedLens);
  });
}

function bindRecorder(canvas) {

  isRecordingButton.addEventListener("click", async () => {
    isRecording = !isRecording;
    isRecordingButton.classList.toggle("recording", isRecording);
  
    if (isRecording) {
      console.log("Gravando...");
      // iniciar gravação aqui
      downloadButton.disabled = true;
      videoContainer.style.display = 'none';
  
      const videoStream = canvas.captureStream(30);
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
  
      mediaRecorder = new MediaRecorder(combinedStream);
  
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (!event.data.size) return;
  
        const blob = new Blob([event.data], { type: 'video/webm' });
        downloadUrl = URL.createObjectURL(blob);
  
        videoTarget.src = downloadUrl;
        videoContainer.style.display = 'block';
        downloadButton.disabled = false;
      });
  
      mediaRecorder.start();

    }
    
    else {
      
      setTimeout(() => {
        console.log("Parou de gravar.");
        isRecordingButton.disabled = true;
        mediaRecorder?.stop();
      }, 500);
      
     
    }
  });



  downloadButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = downloadUrl;
    link.download = 'camera-kit-recording.webm';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

init();
