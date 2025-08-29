// Lynx global API types
declare const lynx: {
  createSelectorQuery: () => {
    select: (selector: string) => {
      invoke: (params: {
        method: string;
        params: any;
        success?: (res: any) => void;
        fail?: (res: any) => void;
      }) => {
        exec: () => void;
      };
    };
  };
  querySelector: (selector: string) => Element | null;
  querySelectorAll: (selector: string) => Element[];
  getElementById: (id: string) => Element | null;
  requestResourcePrefetch?: (
    options: {
      data: Array<{
        uri: string;
        type: 'image' | 'video' | 'audio';
        params: {
          priority?: 'high' | 'medium' | 'low';
          cacheTarget?: 'disk' | 'bitmap';
          preloadKey?: string;
          size?: number;
        };
      }>;
    },
    callback: (res: {
      code: number;
      msg: string;
      details: Array<{
        code: number;
        msg: string;
        uri: string;
        type: string;
      }>;
    }) => void
  ) => void;
};

// JSX type definitions for Lynx elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'x-video-pro': {
        id?: string;
        src?: string;
        'preload-key'?: string;
        style?: any;
        ref?: any;
        [key: string]: any;
      };
    }
  }
}