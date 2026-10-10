export interface AvatarPreset {
  id: string;
  label: string;
  url: string;
}

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=250&auto=format&fit=crop&q=80';

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'preset-female-1',
    label: 'پەرستاری خانم (شین)',
    url: 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=250&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-female-2',
    label: 'پەرستاری خانم (تەندرێست)',
    url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=250&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-female-3',
    label: 'پەرستاری خانم (سەوز)',
    url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=250&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-female-4',
    label: 'پەرستاری باڵاپۆش',
    url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=250&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-male-1',
    label: 'پەرستاری پیاو (نیلی)',
    url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=250&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-male-2',
    label: 'پەرستاری پیاو (تەندرێست)',
    url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=250&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-male-3',
    label: 'پەرستاری پیاو (تیشک/تەکنیکار)',
    url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=250&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-male-4',
    label: 'پەرستاری جل سپی',
    url: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=250&auto=format&fit=crop&q=80'
  }
];

/**
 * Resizes and compresses an uploaded image file into a compact base64 JPEG data URL.
 * Keeps file size small (~15-30 KB) so it fits safely in localStorage and loads instantly.
 */
export const compressImageFile = (file: File, maxSize = 256): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('تکایە تەنها فایلی وێنە هەڵبژێرە'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('هەڵە ڕوویدا لە خوێندنەوەی فایلەکە'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('بارکردنی وێنەکە سەرکەوتوو نەبوو'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};
