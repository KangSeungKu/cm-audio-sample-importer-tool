declare module 'wav-decoder' {
  interface AudioBuffer {
    sampleRate: number;
    length: number;
    duration: number;
    numberOfChannels: number;
    getChannelData(channel: number): Float32Array;
    channelData: Float32Array[];
  }

  export function decode(buffer: ArrayBuffer): Promise<AudioBuffer>;
}
