declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string
      alt?: string
      ar?: boolean
      'ar-modes'?: string
      'ar-scale'?: string
      'camera-controls'?: boolean
      'auto-rotate'?: boolean
      'shadow-intensity'?: string
      'environment-image'?: string
      'ios-src'?: string
    }
  }
}
