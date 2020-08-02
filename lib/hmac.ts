/* eslint-disable no-bitwise */
import { IHasher } from './WASMInterface';
import { writeHexToUInt8, IDataType } from './util';

function calculateKeyBuffer(hasher: IHasher, key: IDataType): Uint8Array {
  const { blockSize } = hasher;

  const buf = Buffer.from(key);

  if (buf.length > blockSize) {
    hasher.update(buf);
    const uintArr = new Uint8Array(hasher.digestSize);
    writeHexToUInt8(uintArr, hasher.digest());
    hasher.init();
    return uintArr;
  }

  return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
}

function calculateHmac(hasher: IHasher, key: IDataType): IHasher {
  hasher.init();

  const { blockSize, digestSize } = hasher;
  const keyBuf = calculateKeyBuffer(hasher, key);
  const keyBuffer = new Uint8Array(blockSize);
  keyBuffer.set(keyBuf);

  const h = new Uint8Array(digestSize);
  const opad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    const v = keyBuffer[i];
    opad[i] = v ^ 0x5C;
    keyBuffer[i] = v ^ 0x36;
  }

  hasher.update(keyBuffer);

  return {
    init: () => {
      hasher.init();
      hasher.update(keyBuffer);
    },

    update: (data: IDataType) => {
      hasher.update(data);
    },
    digest: ((outputType) => {
      writeHexToUInt8(h, hasher.digest());
      hasher.init();
      hasher.update(opad);
      hasher.update(h);
      return hasher.digest(outputType);
    }) as any,

    blockSize: hasher.blockSize,
    digestSize: hasher.digestSize,
  };
}

export function createHMAC(hash: Promise<IHasher>, key: IDataType): Promise<IHasher> {
  if (!hash || !hash.then) {
    throw new Error('Invalid hash function is provided! Usage: createHMAC(createMD5(), "key").');
  }

  return hash.then((hasher) => calculateHmac(hasher, key));
}

export default createHMAC;
