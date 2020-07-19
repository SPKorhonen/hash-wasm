import WASMInterface, { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha512.wasm.json';
import lockedCreate from './lockedCreate';
import { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface = null;

export function sha512(data: IDataType): Promise<string> {
  if (wasmCache === null) {
    return lockedCreate(mutex, wasmJson, 64)
      .then((wasm) => {
        wasmCache = wasm;
        return wasmCache.calculate(data, 512);
      });
  }

  try {
    const hash = wasmCache.calculate(data, 512);
    return Promise.resolve(hash);
  } catch (err) {
    return Promise.reject(err);
  }
}

export function createSHA512(): Promise<IHasher> {
  return WASMInterface(wasmJson, 64).then((wasm) => {
    wasm.init(512);
    return {
      init: () => wasm.init(512),
      update: wasm.update,
      digest: () => wasm.digest(),
      blockSize: 128,
      digestSize: 64,
    };
  });
}

export default sha512;
