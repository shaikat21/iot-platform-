//src/app/platformDetection/platform-deetect.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DeviceService {

  private _isMobile = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const checkMobile = () => this._isMobile.set(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
    }
  }

  isMobile() {
    return this._isMobile();
  }
}
