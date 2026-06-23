type OnlineStatusCallback = (isOnline: boolean) => void;

class OfflineDetector {
  private callbacks: Set<OnlineStatusCallback> = new Set();
  private _isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => this.setStatus(true));
    window.addEventListener('offline', () => this.setStatus(false));
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  private setStatus(online: boolean): void {
    if (this._isOnline === online) return;
    this._isOnline = online;
    this.callbacks.forEach((cb) => cb(online));
  }

  subscribe(callback: OnlineStatusCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }
}

export const offlineDetector = new OfflineDetector();
