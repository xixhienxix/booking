import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export interface IHabitacionImage {
  key: string;
  thumbKey: string;    // 300×200 webp — thumbnail strips
  mediumKey: string;   // 800×533 webp  — carousel main view
  largeKey: string;    // 1920×1280 webp — lightbox / full-screen
  isCover: boolean;
  uploadedAt?: string;
  _id?: string;
}

export type ImageSize = 'thumb' | 'medium' | 'large' | 'original';

@Injectable({ providedIn: 'root' })
export class BookingRoomImageService {

      /** Base CDN URL — e.g. https://d1234abcd.cloudfront.net  (no trailing slash) */
  readonly cdnUrl: string = environment.cdnUrl;

  /**
   * Returns the full CDN URL for a given image at the requested size.
   *
   * Falls back to the original jpeg key when:
   *   - the requested variant key is empty/missing
   *   - the variant key equals the original (Lambda never ran)
   *   - called with size 'original'
   *
   * Template usage:
   *   [src]="roomImageService.getUrl(image, 'medium')"
   *   (error)="roomImageService.onImgError($event, image)"
   */
  getUrl(image: IHabitacionImage | null | undefined, size: ImageSize): string {
    if (!image) return '';
 
    const original = image.key || '';
    let key: string;
 
    switch (size) {
      case 'thumb':  key = this._resolveKey(image.thumbKey,  original); break;
      case 'medium': key = this._resolveKey(image.mediumKey, original); break;
      case 'large':  key = this._resolveKey(image.largeKey,  original); break;
      default:       key = original;
    }
 
    if (!key) return '';
    if (key.startsWith('http')) return key;
    return `${this.cdnUrl}/${key}`;
  }

  /**
   * Use as (error) handler on <img> tags.
   * If the webp variant 403s/404s, falls back to the original jpeg once.
   * A data-attribute flag prevents infinite error loops.
   *
   *   <img [src]="getImageUrl(img, 'medium')"
   *        (error)="roomImageService.onImgError($event, img)" />
   */
  onImgError(event: Event, image: IHabitacionImage | null | undefined): void {
    const el = event.target as HTMLImageElement;
    if (!image || el.dataset['fallback'] === 'true') return;
    el.dataset['fallback'] = 'true';
    const fallbackUrl = this.getUrl(image, 'original');
    if (fallbackUrl && el.src !== fallbackUrl) {
      el.src = fallbackUrl;
    }
  }
 
  /**
   * Returns the cover image for a room, or the first image if none is flagged.
   */
  getCoverImage(images: IHabitacionImage[] | undefined): IHabitacionImage | null {
    if (!images?.length) return null;
    return images.find(img => img.isCover) ?? images[0];
  }
 
  getCoverUrl(images: IHabitacionImage[] | undefined, size: ImageSize = 'medium'): string {
    return this.getUrl(this.getCoverImage(images), size);
  }
 
  /** Returns variant key if it exists and differs from original, otherwise falls back. */
  private _resolveKey(variantKey: string | undefined, original: string): string {
    if (!variantKey || variantKey === original) return original;
    return variantKey;
  }
}