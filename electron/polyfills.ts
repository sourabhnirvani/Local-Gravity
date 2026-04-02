if (typeof globalThis.File === 'undefined') {
  class ElectronFilePolyfill {
    name: string;
    lastModified: number;
    size: number;
    type: string;

    constructor(_parts: unknown[] = [], name = 'file', options: { lastModified?: number; type?: string } = {}) {
      this.name = name;
      this.lastModified = options.lastModified ?? Date.now();
      this.type = options.type ?? '';
      this.size = 0;
    }
  }

  globalThis.File = ElectronFilePolyfill as unknown as typeof globalThis.File;
}

export {};
