import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { decode } from 'wav-decoder';

export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata.format.duration;
      resolve(duration ?? 0);
    });
  });
}

export async function analyzeAudio(inputPath: string): Promise<{ duration: number; channelDataBase64: string; peaks: any[] }> {
  const tempWavPath = './temp.wav';

  // 1. 변환: inputPath → temp.wav (모노)
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .output(tempWavPath)
      .audioChannels(1)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });

  // 2. duration 추출 (temp.wav에 대해)
  const duration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(tempWavPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });

  // 3. channelData 추출 및 인코딩
  const wavBuffer = await fs.readFile(tempWavPath);
  const audioBuffer = await decode(wavBuffer);
  const channelData = audioBuffer.channelData[0];
  const peaks = getPeaks(channelData.buffer, 1000);
  const float32Buffer = Buffer.from(channelData.buffer);
  const channelDataBase64 = float32Buffer.toString('base64');

  return { duration, channelDataBase64, peaks };
}

export const getPeaks = (pcm: ArrayBuffer | number[] | Uint8Array, samplesPerPeak: number) => {
  const channelData = new Float32Array(pcm);
  const peaks = [];

  for (let i = 0; i < channelData.length; i += samplesPerPeak) {
    let max = 0;
    for (let j = 0; j < samplesPerPeak && i + j < channelData.length; j++) {
      const val = Math.abs(channelData[i + j]);
      if (val > max) max = val;
    }
    peaks.push(max);
  }

  return peaks;
};